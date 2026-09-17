import math
import datetime
from ml.traffic_model import traffic_model

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
        stop_count_remaining: int = 1
    ) -> dict:
        """
        Predicts ETA in minutes based on distance, current vehicle speed, ML traffic congestion, and intermediate stops.
        """
        dist_km = haversine_distance_km(current_lat, current_lng, target_lat, target_lng)
        
        # Determine dynamic traffic factor if not specified
        if traffic_congestion_factor is None or traffic_congestion_factor == 1.0:
            now = datetime.datetime.now()
            traffic_congestion_factor = traffic_model.predict_traffic_multiplier(now.hour, now.weekday())

        # Effective speed considering vehicle telemetry and traffic multiplier (0.5 = heavy traffic, 1.2 = clear roads)
        effective_speed = max(10.0, current_speed_kmh) * traffic_congestion_factor
        
        # Travel time in hours and minutes
        travel_time_hours = dist_km / effective_speed
        travel_time_mins = travel_time_hours * 60.0
        
        # Add 1.5 mins dwell time per intermediate stop
        dwell_time_mins = max(0, stop_count_remaining - 1) * 1.5
        
        total_eta_mins = round(max(1.0, travel_time_mins + dwell_time_mins), 1)
        
        # Calculate confidence metric
        confidence = round(min(0.98, max(0.70, 0.95 - (dist_km * 0.05))), 2)

        return {
            "distance_km": round(dist_km, 2),
            "eta_minutes": total_eta_mins,
            "confidence_score": confidence,
            "traffic_factor": traffic_congestion_factor,
            "estimated_speed_kmh": round(effective_speed, 1),
            "ml_model_version": "v2.1-TrafficHeatmap"
        }

predictor = ETAPredictor()

if __name__ == "__main__":
    # Quick model test: North Campus Hub to Central Library
    res = predictor.predict_eta(40.7128, -74.0060, 40.7180, -73.9980, current_speed_kmh=24.0, stop_count_remaining=2)
    print("AI ETA Prediction Result:", res)

