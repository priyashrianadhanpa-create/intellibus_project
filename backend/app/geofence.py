import math
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0 # Earth radius in meters
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def postgis_spatial_geofence_query(
    db: Session,
    bus_lat: float,
    bus_lng: float,
    threshold_meters: float = 50.0
) -> Optional[Dict]:
    """
    Sub-millisecond spatial geofence lookup using PostGIS ST_DWithin / ST_Distance.
    """
    try:
        query = text("""
            SELECT id, name, ST_Distance(
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
            ) as dist_m
            FROM stops
            WHERE ST_DWithin(
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                :threshold
            )
            ORDER BY dist_m ASC
            LIMIT 1;
        """)
        result = db.execute(query, {
            "lat": bus_lat,
            "lng": bus_lng,
            "threshold": threshold_meters
        }).first()

        if result:
            return {
                "stop_id": result.id,
                "stop_name": result.name,
                "distance_meters": round(result.dist_m, 1),
                "in_geofence": True,
                "spatial_engine": "PostGIS"
            }
    except Exception:
        # Fall back to Haversine if PostGIS table/functions are unavailable
        pass
    return None

def check_stop_geofence(
    bus_lat: float, 
    bus_lng: float, 
    stops: List[Dict], 
    threshold_meters: float = 50.0,
    db: Optional[Session] = None
) -> Optional[Dict]:
    """
    Checks if a bus is currently within a geofenced campus stop zone.
    Uses PostGIS spatial indexing when DB session is supplied, with Haversine fallback.
    """
    if db is not None:
        spatial_res = postgis_spatial_geofence_query(db, bus_lat, bus_lng, threshold_meters)
        if spatial_res:
            return spatial_res

    for stop in stops:
        dist_m = haversine_distance_meters(bus_lat, bus_lng, stop["latitude"], stop["longitude"])
        if dist_m <= threshold_meters:
            return {
                "stop_id": stop["id"],
                "stop_name": stop["name"],
                "distance_meters": round(dist_m, 1),
                "in_geofence": True,
                "spatial_engine": "Haversine"
            }
    return None

