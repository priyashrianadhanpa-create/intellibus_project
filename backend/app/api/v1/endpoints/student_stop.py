from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import math
from ....database import get_db
from ....models.user import User
from ....crud import get_student_stop, create_or_update_student_stop, delete_student_stop, get_latest_gps, get_stops
from ....schemas import StudentBusStopCreate, StudentBusStopResponse, StudentBusStopUpdate
from .auth import get_current_user

router = APIRouter()

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.get("/student/bus-stop", response_model=Optional[StudentBusStopResponse])
def read_student_stop(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch current student's saved personal boarding stop
    """
    stop = get_student_stop(db, student_id=current_user.id)
    return stop

@router.post("/student/bus-stop", response_model=StudentBusStopResponse)
def save_student_stop(
    stop_data: StudentBusStopCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save or update student's permanent boarding stop
    """
    # Off-route check: Ensure stop is within 5km of IFET route
    route_stops = get_stops(db)
    if route_stops:
        min_dist = min(haversine_km(stop_data.latitude, stop_data.longitude, s.latitude, s.longitude) for s in route_stops)
        if min_dist > 5.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected pickup location is outside the current bus route service area (>5 km)."
            )

    saved_stop = create_or_update_student_stop(db, student_id=current_user.id, stop=stop_data)
    
    # Also update user model fields for fast lookup
    current_user.preferred_stop_id = saved_stop.id
    current_user.preferred_stop_name = saved_stop.stop_name
    current_user.preferred_lat = saved_stop.latitude
    current_user.preferred_lng = saved_stop.longitude
    db.commit()

    return saved_stop

@router.put("/student/bus-stop", response_model=StudentBusStopResponse)
def update_student_stop(
    stop_data: StudentBusStopUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update existing student stop details
    """
    existing = get_student_stop(db, student_id=current_user.id)
    if not existing:
        raise HTTPException(status_code=404, detail="Student stop not found")

    create_data = StudentBusStopCreate(
        stop_name=stop_data.stop_name or existing.stop_name,
        latitude=stop_data.latitude if stop_data.latitude is not None else existing.latitude,
        longitude=stop_data.longitude if stop_data.longitude is not None else existing.longitude,
        address=stop_data.address if stop_data.address is not None else existing.address,
        route_id=existing.route_id
    )
    return save_student_stop(create_data, db, current_user)

@router.delete("/student/bus-stop")
def remove_student_stop(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove saved student stop
    """
    success = delete_student_stop(db, student_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="No active stop to delete")
    return {"message": "Student stop deleted successfully"}

@router.get("/student/bus/eta")
def get_student_bus_eta(
    trip_id: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Calculate dynamic ETA from driver live GPS to student's saved stop
    """
    student_stop = get_student_stop(db, student_id=current_user.id)
    if not student_stop:
        return {
            "hasSavedStop": False,
            "message": "No saved student boarding stop found"
        }

    latest_gps = get_latest_gps(db, trip_id=trip_id)
    driver_lat = latest_gps.latitude if latest_gps else 11.9392
    driver_lng = latest_gps.longitude if latest_gps else 79.4975
    speed_kmh = max(latest_gps.speed if latest_gps else 25.0, 15.0)

    dist_km = haversine_km(driver_lat, driver_lng, student_stop.latitude, student_stop.longitude)
    eta_mins = max(1, round((dist_km / speed_kmh) * 60))

    # Determine proximity status
    status_str = "ON_ROUTE"
    dist_m = dist_km * 1000.0
    if dist_m < 100:
        status_str = "ARRIVED"
    elif dist_m < 500:
        status_str = "NEAR_STOP"
    elif dist_m < 1000:
        status_str = "APPROACHING"

    return {
        "hasSavedStop": True,
        "busId": "BUS-101",
        "currentLocation": {
            "latitude": driver_lat,
            "longitude": driver_lng
        },
        "studentStop": {
            "name": student_stop.stop_name,
            "address": student_stop.address,
            "latitude": student_stop.latitude,
            "longitude": student_stop.longitude
        },
        "distanceRemainingKm": round(dist_km, 2),
        "etaMinutes": eta_mins,
        "status": status_str,
        "lastUpdated": latest_gps.timestamp.isoformat() if latest_gps and latest_gps.timestamp else None
    }
