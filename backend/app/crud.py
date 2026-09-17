from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from .models.user import User
from .models.bus import Bus
from .models.route import Route, Stop, RouteStop
from .models.trip import Trip, TripStatus
from .models.gps_point import GPSPoint
from .models.alert import Alert
from .models.student_stop import StudentBusStop
from .schemas import UserCreate, BusCreate, RouteCreate, StopCreate, TripCreate, GPSPointCreate, AlertCreate, StudentBusStopCreate
from .core.security import get_password_hash

# --- User CRUD ---
def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate) -> User:
    hashed_pwd = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_pwd,
        role=user.role,
        full_name=user.full_name,
        student_id=user.student_id,
        driver_license=user.driver_license
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def _get_dict(model) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()

# --- Stop CRUD ---
def get_stops(db: Session) -> List[Stop]:
    return db.query(Stop).all()

def create_stop(db: Session, stop: StopCreate) -> Stop:
    db_stop = Stop(**_get_dict(stop))
    db.add(db_stop)
    db.commit()
    db.refresh(db_stop)
    return db_stop

# --- Route CRUD ---
def get_routes(db: Session) -> List[Route]:
    return db.query(Route).all()

def get_route(db: Session, route_id: int) -> Optional[Route]:
    return db.query(Route).filter(Route.id == route_id).first()

def create_route(db: Session, route: RouteCreate) -> Route:
    db_route = Route(
        name=route.name,
        start_location=route.start_location,
        end_location=route.end_location
    )
    db.add(db_route)
    db.commit()
    db.refresh(db_route)

    if route.stop_ids:
        for seq, stop_id in enumerate(route.stop_ids, start=1):
            route_stop = RouteStop(
                route_id=db_route.id,
                stop_id=stop_id,
                stop_sequence=seq
            )
            db.add(route_stop)
        db.commit()
        db.refresh(db_route)

    return db_route

# --- Bus CRUD ---
def get_buses(db: Session) -> List[Bus]:
    return db.query(Bus).all()

def create_bus(db: Session, bus: BusCreate) -> Bus:
    db_bus = Bus(**_get_dict(bus))
    db.add(db_bus)
    db.commit()
    db.refresh(db_bus)
    return db_bus

# --- Trip CRUD ---
def get_trips(db: Session) -> List[Trip]:
    return db.query(Trip).all()

def get_active_trips(db: Session) -> List[Trip]:
    return db.query(Trip).filter(Trip.status == TripStatus.ACTIVE).all()

def get_trip(db: Session, trip_id: int) -> Optional[Trip]:
    return db.query(Trip).filter(Trip.id == trip_id).first()

def create_trip(db: Session, trip: TripCreate) -> Trip:
    db_trip = Trip(
        bus_id=trip.bus_id,
        driver_id=trip.driver_id,
        route_id=trip.route_id,
        status=TripStatus.SCHEDULED
    )
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip

def update_trip_status(db: Session, trip_id: int, status: TripStatus) -> Optional[Trip]:
    db_trip = get_trip(db, trip_id)
    if not db_trip:
        return None
    db_trip.status = status
    if status == TripStatus.ACTIVE and not db_trip.start_time:
        db_trip.start_time = datetime.utcnow()
    elif status == TripStatus.COMPLETED and not db_trip.end_time:
        db_trip.end_time = datetime.utcnow()
    db.commit()
    db.refresh(db_trip)
    return db_trip

# --- GPS Point CRUD ---
def log_gps_point(db: Session, gps: GPSPointCreate) -> GPSPoint:
    db_gps = GPSPoint(**_get_dict(gps))
    db.add(db_gps)
    db.commit()
    db.refresh(db_gps)
    return db_gps

def get_latest_gps(db: Session, trip_id: int) -> Optional[GPSPoint]:
    return db.query(GPSPoint).filter(GPSPoint.trip_id == trip_id).order_by(GPSPoint.id.desc()).first()

# --- Alert CRUD ---
def get_alerts(db: Session, active_only: bool = True) -> List[Alert]:
    query = db.query(Alert)
    if active_only:
        query = query.filter(Alert.is_active == True)
    return query.order_by(Alert.id.desc()).all()

def create_alert(db: Session, alert: AlertCreate) -> Alert:
    db_alert = Alert(**_get_dict(alert))
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

# --- Student Bus Stop CRUD ---
def get_student_stop(db: Session, student_id: int) -> Optional[StudentBusStop]:
    return db.query(StudentBusStop).filter(StudentBusStop.student_id == student_id, StudentBusStop.is_active == True).first()

def create_or_update_student_stop(db: Session, student_id: int, stop: StudentBusStopCreate) -> StudentBusStop:
    existing = get_student_stop(db, student_id)
    if existing:
        existing.stop_name = stop.stop_name
        existing.latitude = stop.latitude
        existing.longitude = stop.longitude
        existing.address = stop.address
        existing.route_id = stop.route_id or 1
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing
    
    db_stop = StudentBusStop(
        student_id=student_id,
        route_id=stop.route_id or 1,
        stop_name=stop.stop_name,
        latitude=stop.latitude,
        longitude=stop.longitude,
        address=stop.address,
        is_active=True
    )
    db.add(db_stop)
    db.commit()
    db.refresh(db_stop)
    return db_stop

def delete_student_stop(db: Session, student_id: int) -> bool:
    existing = get_student_stop(db, student_id)
    if existing:
        existing.is_active = False
        db.commit()
        return True
    return False

