from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import datetime
from app.websocket.manager import ws_manager
from app.database import SessionLocal
from app.models.gps_point import GPSPoint
from app.models.trip import Trip, TripStatus

try:
    from app.ml.eta_model import predictor
except ImportError:
    from ml.eta_model import predictor

# IFET College destination coordinates (all routes converge here)
IFET_DESTINATION_LAT = 11.9207389
IFET_DESTINATION_LNG = 79.6107319

# Per-route stop data for remaining-stop-count ETA refinement
ROUTE_STOPS = {
    "BUS-101": [
        {"lat": 11.9392, "lng": 79.4975, "name": "Villupuram Main Bus Stand"},
        {"lat": 11.9340, "lng": 79.5050, "name": "Old Bus Stand / Hospital Corner"},
        {"lat": 11.9285, "lng": 79.5450, "name": "Koliyanur Junction Stop"},
        {"lat": 11.9215, "lng": 79.5850, "name": "Valavanur Bus Stop"},
        {"lat": 11.9207, "lng": 79.6095, "name": "IFET Main Entrance Gate"},
        {"lat": IFET_DESTINATION_LAT, "lng": IFET_DESTINATION_LNG, "name": "IFET Campus"},
    ],
    "BUS-102": [
        {"lat": 11.9560, "lng": 79.7970, "name": "Pondicherry JIPMER Circle"},
        {"lat": 11.9240, "lng": 79.6920, "name": "Kandamangalam Bus Stop"},
        {"lat": 11.9230, "lng": 79.6500, "name": "Siruvanthadu Junction"},
        {"lat": 11.9220, "lng": 79.5920, "name": "Valavanur East Stop"},
        {"lat": 11.9207, "lng": 79.6095, "name": "IFET Main Entrance Gate"},
        {"lat": IFET_DESTINATION_LAT, "lng": IFET_DESTINATION_LNG, "name": "IFET Campus"},
    ],
}

def _haversine_km(lat1, lon1, lat2, lon2):
    import math
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def _count_remaining_stops(bus_lat: float, bus_lng: float, route_code: str) -> int:
    """Count how many stops the bus hasn't passed yet on this route."""
    stops = ROUTE_STOPS.get(route_code, ROUTE_STOPS.get("BUS-101", []))
    min_dist = float('inf')
    nearest_idx = 0
    for idx, stop in enumerate(stops):
        d = _haversine_km(bus_lat, bus_lng, stop["lat"], stop["lng"])
        if d < min_dist:
            min_dist = d
            nearest_idx = idx
    return max(1, len(stops) - nearest_idx - 1)

ws_router = APIRouter(tags=["websockets"])

@ws_router.websocket("/ws/live-location/{trip_id}")
@ws_router.websocket("/ws/driver/{trip_id}")
async def live_location_websocket(websocket: WebSocket, trip_id: int):
    await ws_manager.connect(websocket, trip_id)
    
    # ── Initial Connect: Check if Trip is actively dispatched by driver ──
    try:
        db = SessionLocal()
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        is_active = (trip is not None and trip.status == TripStatus.ACTIVE)
        
        if not is_active:
            # Trip is NOT active (scheduled, completed, or awaiting driver dispatch)
            trip_status_val = trip.status.value if (trip and hasattr(trip.status, 'value')) else (str(trip.status) if trip else "scheduled")
            await websocket.send_json({
                "type": "TRIP_STATUS",
                "trip_id": trip_id,
                "status": trip_status_val,
                "is_active": False,
                "message": "Trip has not been dispatched yet. Awaiting driver dispatch."
            })
        else:
            # Trip is active -> Send latest known GPS point if available
            latest = db.query(GPSPoint).filter(GPSPoint.trip_id == trip_id).order_by(GPSPoint.timestamp.desc()).first()
            if latest:
                remaining_stops = _count_remaining_stops(latest.latitude, latest.longitude, "BUS-101")
                eta_result = predictor.predict_eta(
                    current_lat=latest.latitude,
                    current_lng=latest.longitude,
                    target_lat=IFET_DESTINATION_LAT,
                    target_lng=IFET_DESTINATION_LNG,
                    current_speed_kmh=latest.speed if latest.speed > 5 else 25.0,
                    stop_count_remaining=remaining_stops,
                    trip_id=trip_id
                )
                init_payload = {
                    "type": "LOCATION_UPDATE",
                    "trip_id": trip_id,
                    "bus_id": latest.bus_id,
                    "latitude": latest.latitude,
                    "longitude": latest.longitude,
                    "speed": latest.speed,
                    "bearing": latest.bearing,
                    "timestamp": latest.timestamp.isoformat() if latest.timestamp else datetime.datetime.utcnow().isoformat(),
                    "source": "LATEST_RECORDED_GPS",
                    "is_active": True,
                    "eta": {
                        "eta_minutes": eta_result["eta_minutes"],
                        "distance_km": eta_result["distance_km"],
                        "confidence_score": eta_result["confidence_score"],
                        "traffic_factor": eta_result["traffic_factor"],
                        "estimated_speed_kmh": eta_result["estimated_speed_kmh"],
                        "stops_remaining": remaining_stops,
                        "destination": "IFET College of Engineering",
                        "ml_model_version": eta_result["ml_model_version"],
                        "computed_at": datetime.datetime.utcnow().isoformat()
                    }
                }
                await websocket.send_json(init_payload)
        db.close()
    except Exception:
        pass

    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                data = json.loads(data_text)
                msg_type = data.get("type", "LOCATION_UPDATE")

                # ── Handle Trip Dispatch lifecycle events from Driver Console ──
                if msg_type in ["TRIP_START", "TRIP_END", "TRIP_STATUS"]:
                    new_status = TripStatus.ACTIVE if msg_type == "TRIP_START" else (TripStatus.COMPLETED if msg_type == "TRIP_END" else data.get("status", TripStatus.SCHEDULED))
                    db = SessionLocal()
                    try:
                        t = db.query(Trip).filter(Trip.id == trip_id).first()
                        if t:
                            t.status = new_status
                            db.commit()
                    finally:
                        db.close()

                    status_str = new_status.value if hasattr(new_status, 'value') else str(new_status)
                    status_payload = {
                        "type": "TRIP_STATUS",
                        "trip_id": trip_id,
                        "status": status_str,
                        "is_active": (new_status == TripStatus.ACTIVE),
                        "message": "Driver started dispatch." if new_status == TripStatus.ACTIVE else "Driver concluded trip."
                    }
                    await ws_manager.broadcast_to_trip(trip_id, status_payload)
                    continue

                if "latitude" not in data or "longitude" not in data:
                    continue

                bus_lat = float(data["latitude"])
                bus_lng = float(data["longitude"])
                bus_speed = float(data.get("speed", 0))
                bus_id = data.get("bus_id", 1)
                bearing = float(data.get("bearing", 0))
                timestamp_str = data.get("timestamp")

                # ── 1. Persist GPS point to database and ensure trip is ACTIVE ──
                db = SessionLocal()
                try:
                    t = db.query(Trip).filter(Trip.id == trip_id).first()
                    if t and t.status != TripStatus.ACTIVE:
                        t.status = TripStatus.ACTIVE
                    
                    gps_point = GPSPoint(
                        trip_id=trip_id,
                        bus_id=bus_id,
                        latitude=bus_lat,
                        longitude=bus_lng,
                        speed=bus_speed,
                        bearing=bearing,
                        accuracy=float(data.get("accuracy", 0))
                    )
                    db.add(gps_point)
                    db.commit()
                    db.refresh(gps_point)
                    persisted_timestamp = gps_point.timestamp.isoformat() if gps_point.timestamp else datetime.datetime.utcnow().isoformat()
                except Exception:
                    db.rollback()
                    persisted_timestamp = timestamp_str or datetime.datetime.utcnow().isoformat()
                finally:
                    db.close()

                # ── 2. Compute AI ETA to IFET destination ──
                route_code = data.get("route_code", "BUS-101")
                remaining_stops = _count_remaining_stops(bus_lat, bus_lng, route_code)

                eta_result = predictor.predict_eta(
                    current_lat=bus_lat,
                    current_lng=bus_lng,
                    target_lat=IFET_DESTINATION_LAT,
                    target_lng=IFET_DESTINATION_LNG,
                    current_speed_kmh=bus_speed if bus_speed > 5 else 25.0,
                    stop_count_remaining=remaining_stops,
                    trip_id=trip_id
                )

                # ── 3. Broadcast enriched payload with is_active: True ──
                broadcast_payload = {
                    "type": "LOCATION_UPDATE",
                    "trip_id": trip_id,
                    "bus_id": bus_id,
                    "latitude": bus_lat,
                    "longitude": bus_lng,
                    "speed": bus_speed,
                    "bearing": bearing,
                    "timestamp": persisted_timestamp,
                    "source": data.get("source", "DRIVER_GPS"),
                    "is_active": True,
                    # Real-time AI ETA data
                    "eta": {
                        "eta_minutes": eta_result["eta_minutes"],
                        "distance_km": eta_result["distance_km"],
                        "confidence_score": eta_result["confidence_score"],
                        "traffic_factor": eta_result["traffic_factor"],
                        "estimated_speed_kmh": eta_result["estimated_speed_kmh"],
                        "stops_remaining": remaining_stops,
                        "destination": "IFET College of Engineering",
                        "ml_model_version": eta_result["ml_model_version"],
                        "computed_at": datetime.datetime.utcnow().isoformat()
                    }
                }
                await ws_manager.broadcast_to_trip(trip_id, broadcast_payload)
            except Exception as e:
                await websocket.send_json({"type": "ERROR", "message": str(e)})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, trip_id)
