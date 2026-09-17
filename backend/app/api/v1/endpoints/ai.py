from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import sys
import os

# Add workspace root to sys.path to import ml package
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
parent_root = os.path.abspath(os.path.join(project_root, ".."))
if parent_root not in sys.path:
    sys.path.insert(0, parent_root)

from ml.eta_model import predictor
from ml.route_optimizer import optimizer
from ml.safety_detector import safety_detector
from ml.traffic_model import traffic_model

router = APIRouter(prefix="/ai", tags=["ai"])

class ETARequest(BaseModel):
    current_lat: float
    current_lng: float
    target_lat: float
    target_lng: float
    current_speed_kmh: Optional[float] = 25.0
    traffic_factor: Optional[float] = 1.0
    stop_count_remaining: Optional[int] = 1

class RouteOptimizeRequest(BaseModel):
    origin_stop_id: int
    dest_stop_id: int

class SafetyAuditRequest(BaseModel):
    gps_logs: List[dict]

@router.post("/predict-eta")
def predict_eta(req: ETARequest):
    try:
        res = predictor.predict_eta(
            current_lat=req.current_lat,
            current_lng=req.current_lng,
            target_lat=req.target_lat,
            target_lng=req.target_lng,
            current_speed_kmh=req.current_speed_kmh,
            traffic_congestion_factor=req.traffic_factor,
            stop_count_remaining=req.stop_count_remaining
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/traffic-heatmap")
def get_traffic_heatmap():
    return {
        "status": "success",
        "heatmap": traffic_model.generate_campus_heatmap()
    }

@router.post("/optimize-route")
def optimize_route(req: RouteOptimizeRequest):
    res = optimizer.optimize_route(req.origin_stop_id, req.dest_stop_id)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.post("/safety-audit")
def safety_audit(req: SafetyAuditRequest):
    return safety_detector.audit_telemetry_logs(req.gps_logs)

