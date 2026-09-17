from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    STUDENT = "student"
    DRIVER = "driver"
    STAFF = "staff"
    ADMIN = "admin"

class TripStatus(str, Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    role: UserRole
    student_id: Optional[str] = None
    driver_license: Optional[str] = None
    preferred_stop_id: Optional[int] = None
    preferred_stop_name: Optional[str] = None
    preferred_lat: Optional[float] = None
    preferred_lng: Optional[float] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UpdatePreferredStopRequest(BaseModel):
    stop_id: int
    stop_name: str
    latitude: float
    longitude: float

class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Stop Schemas ---
class StopBase(BaseModel):
    name: str
    latitude: float
    longitude: float

class StopCreate(StopBase):
    pass

class StopResponse(StopBase):
    id: int

    class Config:
        from_attributes = True

# --- Student Personal Bus Stop Schemas ---
class StudentBusStopBase(BaseModel):
    stop_name: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    route_id: Optional[int] = 1

class StudentBusStopCreate(StudentBusStopBase):
    pass

class StudentBusStopUpdate(BaseModel):
    stop_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    is_active: Optional[bool] = True

class StudentBusStopResponse(StudentBusStopBase):
    id: int
    student_id: int
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        orm_mode = True

# --- Route Schemas ---
class RouteStopResponse(BaseModel):
    id: int
    stop_sequence: int
    stop: StopResponse

    class Config:
        from_attributes = True

class RouteBase(BaseModel):
    name: str
    start_location: str
    end_location: str

class RouteCreate(RouteBase):
    stop_ids: Optional[List[int]] = []

class RouteResponse(RouteBase):
    id: int
    route_stops: List[RouteStopResponse] = []

    class Config:
        from_attributes = True

# --- Bus Schemas ---
class BusBase(BaseModel):
    registration_number: str
    capacity: int
    driver_id: Optional[int] = None
    route_id: Optional[int] = None
    is_active: bool = True

class BusCreate(BusBase):
    pass

class BusResponse(BusBase):
    id: int
    driver: Optional[UserResponse] = None
    route: Optional[RouteResponse] = None

    class Config:
        from_attributes = True

# --- Trip Schemas ---
class TripBase(BaseModel):
    bus_id: int
    driver_id: int
    route_id: int

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    status: Optional[TripStatus] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class TripResponse(TripBase):
    id: int
    status: TripStatus
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    created_at: Optional[datetime] = None
    bus: Optional[BusResponse] = None
    driver: Optional[UserResponse] = None
    route: Optional[RouteResponse] = None

    class Config:
        from_attributes = True

# --- GPS Point Schemas ---
class GPSPointCreate(BaseModel):
    trip_id: int
    bus_id: int
    latitude: float
    longitude: float
    speed: Optional[float] = 0.0
    bearing: Optional[float] = 0.0
    accuracy: Optional[float] = 0.0

class GPSPointResponse(GPSPointCreate):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# --- Alert Schemas ---
class AlertCategory(str, Enum):
    DELAY = "delay"
    MAINTENANCE = "maintenance"
    GENERAL = "general"
    EMERGENCY = "emergency"

class AlertBase(BaseModel):
    title: str
    message: str
    category: AlertCategory = AlertCategory.GENERAL

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

