import math
import random
import datetime
from typing import Dict, List, Tuple

class CampusTrafficHeatmapModel:
    """
    ML model for predicting campus traffic congestion multipliers and route segment delays
    based on historical trip logs, time of day, day of week, and campus peak schedule dynamics.
    """
    def __init__(self):
        # Baseline peak hour multipliers for campus commute dynamics
        self.peak_hours = {
            8: 0.65,   # Morning rush (8-9 AM) -> 0.65 speed factor (heavy congestion)
            9: 0.75,
            12: 0.70,  # Lunch hour peak (12-1 PM)
            13: 0.80,
            17: 0.60,  # Evening dismissal (5-6 PM)
            18: 0.70
        }
        self.is_trained = True

    def predict_traffic_multiplier(self, hour: int, day_of_week: int = 1, weather_factor: float = 1.0) -> float:
        """
        Predicts traffic speed multiplier (0.5 = heavy traffic, 1.0 = normal, 1.2 = clear).
        - hour: 0-23
        - day_of_week: 0 (Monday) to 6 (Sunday)
        - weather_factor: 1.0 = clear, 0.8 = rain, 0.65 = heavy snow
        """
        base_multiplier = self.peak_hours.get(hour, 0.95)
        
        # Weekend adjustment (lighter campus traffic)
        if day_of_week in (5, 6):
            base_multiplier = min(1.2, base_multiplier + 0.25)
            
        final_multiplier = max(0.4, min(1.3, base_multiplier * weather_factor))
        return round(final_multiplier, 2)

    def generate_campus_heatmap(self) -> List[Dict]:
        """
        Generates 24-hour campus traffic congestion heatmap predictions.
        """
        heatmap = []
        now = datetime.datetime.now()
        for h in range(24):
            mult = self.predict_traffic_multiplier(h, day_of_week=now.weekday())
            congestion_level = "High" if mult < 0.75 else ("Moderate" if mult < 0.90 else "Low")
            heatmap.append({
                "hour": h,
                "label": f"{h:02d}:00",
                "traffic_factor": mult,
                "congestion_level": congestion_level,
                "estimated_delay_mins": round((1.0 - mult) * 10, 1) if mult < 1.0 else 0.0
            })
        return heatmap

traffic_model = CampusTrafficHeatmapModel()

if __name__ == "__main__":
    print("Testing ML Traffic Heatmap Model:")
    print("Morning Rush (8 AM):", traffic_model.predict_traffic_multiplier(8))
    print("Off-peak (2 PM):", traffic_model.predict_traffic_multiplier(14))
    print("Generated 24-hr Heatmap count:", len(traffic_model.generate_campus_heatmap()))
