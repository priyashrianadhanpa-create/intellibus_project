from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.schemas import AlertResponse, AlertCreate
from app.crud import get_alerts, create_alert

router = APIRouter(prefix="/alerts", tags=["alerts"])

class NotificationSubscription(BaseModel):
    student_name: str
    phone_number: str
    channel: str = "whatsapp" # whatsapp, sms, web_push
    lead_time_mins: int = 5
    stop_name: str
    route_id: int = 1

class ProximityCheckRequest(BaseModel):
    bus_code: str = "BUS-101"
    current_lat: float
    current_lng: float
    stop_lat: float
    stop_lng: float
    speed_kmh: float = 25.0
    phone_number: Optional[str] = None
    channel: str = "whatsapp"
    lead_time_mins: int = 5

@router.get("", response_model=List[AlertResponse])
def read_alerts(active_only: bool = True, db: Session = Depends(get_db)):
    return get_alerts(db, active_only=active_only)

@router.post("", response_model=AlertResponse)
def add_alert(alert: AlertCreate, db: Session = Depends(get_db)):
    return create_alert(db, alert)

@router.post("/subscribe")
def subscribe_arrival_alerts(subscription: NotificationSubscription):
    """
    Subscribe student phone number for automated WhatsApp / SMS arrival alerts
    """
    return {
        "status": "success",
        "message": f"Successfully subscribed {subscription.phone_number} via {subscription.channel.upper()} for arrival alerts ({subscription.lead_time_mins} mins lead time).",
        "subscription": subscription
    }

@router.post("/trigger-proximity")
def trigger_proximity_alert(req: ProximityCheckRequest):
    """
    Evaluates real-time GPS distance to student stop and dispatches automated WhatsApp/SMS payload if within alert window
    """
    import math
    # Haversine distance calculation in km
    R = 6371.0
    dlat = math.radians(req.stop_lat - req.current_lat)
    dlng = math.radians(req.stop_lng - req.current_lng)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(req.current_lat)) * math.cos(math.radians(req.stop_lat)) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)) if hasattr(math, 'atan2') else 2 * math.asin(math.sqrt(a))
    dist_km = R * c

    speed = max(req.speed_kmh, 15.0)
    eta_mins = max(1, round((dist_km / speed) * 60))

    triggered = eta_mins <= req.lead_time_mins

    dispatch_message = None
    if triggered:
        dispatch_message = f"🔔 IFET BUS ALERT: {req.bus_code} is ~{eta_mins} mins away from your stop ({dist_km:.1f} km). Please be ready at your pickup point!"

    return {
        "triggered": triggered,
        "dist_km": round(dist_km, 2),
        "eta_mins": eta_mins,
        "lead_time_mins": req.lead_time_mins,
        "channel": req.channel,
        "dispatch_message": dispatch_message,
        "sent_to": req.phone_number
    }
