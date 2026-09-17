from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
from app.websocket.manager import ws_manager

ws_router = APIRouter(tags=["websockets"])

@ws_router.websocket("/ws/live-location/{trip_id}")
@ws_router.websocket("/ws/driver/{trip_id}")
async def live_location_websocket(websocket: WebSocket, trip_id: int):
    await ws_manager.connect(websocket, trip_id)
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                data = json.loads(data_text)
                # Broadcast payload to all subscribers listening to this trip_id
                broadcast_payload = {
                    "type": "LOCATION_UPDATE",
                    "trip_id": trip_id,
                    "bus_id": data.get("bus_id", 1),
                    "latitude": float(data["latitude"]),
                    "longitude": float(data["longitude"]),
                    "speed": float(data.get("speed", 0)),
                    "bearing": float(data.get("bearing", 0)),
                    "timestamp": data.get("timestamp")
                }
                await ws_manager.broadcast_to_trip(trip_id, broadcast_payload)
            except Exception as e:
                await websocket.send_json({"type": "ERROR", "message": str(e)})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, trip_id)
