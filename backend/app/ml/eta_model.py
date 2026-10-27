import math
import datetime
import os
import sys
from typing import Optional, Union, List, Dict

_CURR_DIR = os.path.dirname(os.path.abspath(__file__))
if _CURR_DIR not in sys.path:
    sys.path.insert(0, _CURR_DIR)
_PARENT_DIR = os.path.dirname(_CURR_DIR)
if _PARENT_DIR not in sys.path:
    sys.path.insert(0, _PARENT_DIR)

try:
    from ml.traffic_model import traffic_model
    from ml.lstm_eta_predictor import lstm_predictor
except ImportError:
    try:
        from app.ml.traffic_model import traffic_model
        from app.ml.lstm_eta_predictor import lstm_predictor
    except ImportError:
        try:
            from traffic_model import traffic_model
            from lstm_eta_predictor import lstm_predictor
        except ImportError:
            from .traffic_model import traffic_model
            from .lstm_eta_predictor import lstm_predictor

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in kilometers between two GPS coordinates using Haversine formula."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class ETAPredictor:
    def __init__(self, base_campus_speed_kmh: float = 25.0):
        self.base_speed = base_campus_speed_kmh

    def predict_eta(
        self, 
        current_lat: float, 
        current_lng: float, 
        target_lat: float, 
        target_lng: float, 
        current_speed_kmh: float = 25.0,
        traffic_congestion_factor: float = None,
        stop_count_remaining: int = 1,
        trip_id: Optional[Union[int, str]] = None,
        elapsed_trip_min: float = 0.0,
        sequence_history: Optional[List[Dict]] = None
    ) -> dict:
        """
        Predicts ETA in minutes using a Hybrid Engine:
        1. When >= 10 sequential GPS observations are available (via sequence_history or trip_id buffer):
           Uses IntelliBus Deep Learning LSTM sequence model (v3.0-LSTM-DeepSequence).
        2. When fewer than 10 points are available (e.g. at trip start):
           Gracefully falls back to calibrated Haversine baseline with traffic multiplier.
        """
        dist_km = haversine_distance_km(current_lat, current_lng, target_lat, target_lng)
        
        # Determine dynamic traffic factor if not specified
        if traffic_congestion_factor is None or traffic_congestion_factor == 1.0:
            now = datetime.datetime.now()
            traffic_congestion_factor = traffic_model.predict_traffic_multiplier(now.hour, now.weekday())

        effective_speed = max(10.0, current_speed_kmh) * traffic_congestion_factor

        # ── 1. Check for explicit 10-point sequence history ──
        if sequence_history and len(sequence_history) >= 10 and lstm_predictor.is_loaded:
            try:
                lstm_res = lstm_predictor.predict_from_sequence(sequence_history[-10:])
                return {
                    "distance_km": round(dist_km, 2),
                    "eta_minutes": lstm_res["eta_minutes"],
                    "confidence_score": lstm_res["confidence_score"],
                    "traffic_factor": round(traffic_congestion_factor, 2),
                    "estimated_speed_kmh": round(effective_speed, 1),
                    "ml_model_version": "v3.0-LSTM-DeepSequence",
                    "inference_type": "LSTM_SEQUENCE_EXPLICIT"
                }
            except Exception:
                pass

        # ── 2. Check rolling trip buffer if trip_id provided ──
        if trip_id is not None and lstm_predictor.is_loaded:
            try:
                lstm_res = lstm_predictor.record_and_predict(
                    trip_id=trip_id,
                    speed_kmph=current_speed_kmh,
                    remaining_distance_km=dist_km,
                    elapsed_trip_min=elapsed_trip_min,
                    traffic_factor=traffic_congestion_factor,
                    stops_remaining=stop_count_remaining
                )
                if lstm_res:
                    return {
                        "distance_km": round(dist_km, 2),
                        "eta_minutes": lstm_res["eta_minutes"],
                        "confidence_score": lstm_res["confidence_score"],
                        "traffic_factor": round(traffic_congestion_factor, 2),
                        "estimated_speed_kmh": round(effective_speed, 1),
                        "ml_model_version": "v3.0-LSTM-DeepSequence",
                        "inference_type": "LSTM_ROLLING_BUFFER"
                    }
            except Exception:
                pass

        # ── 3. Calibrated Baseline Fallback ──
        travel_time_hours = dist_km / effective_speed
        travel_time_mins = travel_time_hours * 60.0
        dwell_time_mins = max(0, stop_count_remaining - 1) * 1.5
        total_eta_mins = round(max(1.0, travel_time_mins + dwell_time_mins), 1)
        confidence = round(min(0.98, max(0.70, 0.95 - (dist_km * 0.05))), 2)

        return {
            "distance_km": round(dist_km, 2),
            "eta_minutes": total_eta_mins,
            "confidence_score": confidence,
            "traffic_factor": round(traffic_congestion_factor, 2),
            "estimated_speed_kmh": round(effective_speed, 1),
            "ml_model_version": "v2.1-Baseline-Haversine",
            "inference_type": "BASELINE_HAVERSINE_FALLBACK"
        }

predictor = ETAPredictor()
eta_predictor = predictor

if __name__ == "__main__":
    print("[*] Testing ETAPredictor Baseline Fallback:")
    res_base = predictor.predict_eta(11.9392, 79.4975, 11.9207389, 79.6107319, current_speed_kmh=24.0, stop_count_remaining=2)
    print("Baseline Result:", res_base)

    print("\n[*] Testing ETAPredictor with 10-step sequence (LSTM Activation):")
    sim_seq = [
        {"speed_kmph": 28.0 - i*0.5, "remaining_distance_km": 10.0 - i*0.8, "elapsed_trip_min": i*1.0, "traffic_factor": 0.85, "stops_remaining": 3 - int(i/4)}
        for i in range(10)
    ]
    res_lstm = predictor.predict_eta(
        11.9392, 79.4975, 11.9207389, 79.6107319,
        current_speed_kmh=23.5,
        sequence_history=sim_seq
    )
    print("LSTM Result:", res_lstm)
