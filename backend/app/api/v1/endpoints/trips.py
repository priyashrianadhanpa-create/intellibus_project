from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import TripResponse, TripCreate, TripUpdate, GPSPointResponse, GPSPointCreate
from app.crud import get_trips, get_active_trips, get_trip, create_trip, update_trip_status, log_gps_point, get_latest_gps

router = APIRouter(prefix="/trips", tags=["trips"])

@router.get("", response_model=List[TripResponse])
def read_trips(active_only: bool = False, db: Session = Depends(get_db)):
    if active_only:
        return get_active_trips(db)
    return get_trips(db)

@router.post("", response_model=TripResponse)
def add_trip(trip: TripCreate, db: Session = Depends(get_db)):
    return create_trip(db, trip)

@router.get("/{trip_id}", response_model=TripResponse)
def read_trip(trip_id: int, db: Session = Depends(get_db)):
    db_trip = get_trip(db, trip_id)
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return db_trip

@router.patch("/{trip_id}/status", response_model=TripResponse)
def change_trip_status(trip_id: int, trip_update: TripUpdate, db: Session = Depends(get_db)):
    if not trip_update.status:
        raise HTTPException(status_code=400, detail="Status required")
    updated = update_trip_status(db, trip_id, trip_update.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Trip not found")
    return updated

@router.get("/{trip_id}/latest-gps", response_model=GPSPointResponse)
def read_latest_gps(trip_id: int, db: Session = Depends(get_db)):
    gps = get_latest_gps(db, trip_id)
    if not gps:
        raise HTTPException(status_code=404, detail="No GPS data recorded for this trip yet")
    return gps

@router.post("/{trip_id}/gps", response_model=GPSPointResponse)
def record_gps_point(trip_id: int, gps_in: GPSPointCreate, db: Session = Depends(get_db)):
    if gps_in.trip_id != trip_id:
        raise HTTPException(status_code=400, detail="Trip ID mismatch")
    return log_gps_point(db, gps_in)
