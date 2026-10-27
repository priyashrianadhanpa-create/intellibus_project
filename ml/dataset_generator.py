import os
import math
import random
from datetime import datetime, timedelta
import csv

IFET_DESTINATION_LAT = 11.9207389
IFET_DESTINATION_LNG = 79.6107319

ROUTE_STOPS = {
    "BUS-101": [
        {"lat": 11.9392, "lng": 79.4975, "name": "Villupuram Main Bus Stand"},
        {"lat": 11.9340, "lng": 79.5050, "name": "Old Bus Stand / Hospital Corner"},
        {"lat": 11.9285, "lng": 79.5450, "name": "Koliyanur Junction Stop"},
        {"lat": 11.9215, "lng": 79.5850, "name": "Valavanur Bus Stop"},
        {"lat": 11.9207, "lng": 79.6095, "name": "IFET Main Entrance Gate"},
        {"lat": IFET_DESTINATION_LAT, "lng": IFET_DESTINATION_LNG, "name": "IFET Campus"},
    ],
    "BUS-102": [
        {"lat": 11.9560, "lng": 79.7970, "name": "Pondicherry JIPMER Circle"},
        {"lat": 11.9240, "lng": 79.6920, "name": "Kandamangalam Bus Stop"},
        {"lat": 11.9230, "lng": 79.6500, "name": "Siruvanthadu Junction"},
        {"lat": 11.9220, "lng": 79.5920, "name": "Valavanur East Stop"},
        {"lat": 11.9207, "lng": 79.6095, "name": "IFET Main Entrance Gate"},
        {"lat": IFET_DESTINATION_LAT, "lng": IFET_DESTINATION_LNG, "name": "IFET Campus"},
    ],
}

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def generate_campus_trip_dataset(num_trips_per_route: int = 50, output_path: str = "ml/data/campus_bus_trips.csv") -> str:
    """
    Generates realistic historical GPS telemetry trip dataset for IFET College campus bus routes.
    Includes time-of-day traffic congestion, realistic driver speed dynamics, intermediate stop dwell times,
    and ground-truth remaining travel times.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    random.seed(42)
    
    rows = []
    headers = [
        "trip_id",
        "route_code",
        "timestamp",
        "latitude",
        "longitude",
        "speed_kmph",
        "remaining_distance_km",
        "elapsed_trip_min",
        "traffic_factor",
        "stops_remaining",
        "remaining_time_min"
    ]
    
    trip_counter = 1
    
    for route_code, stops in ROUTE_STOPS.items():
        dest = stops[-1]
        
        for t_idx in range(num_trips_per_route):
            trip_id = f"TRIP-{route_code}-{t_idx+1:03d}"
            
            # Simulate start time: morning rush (7:30 - 9:00 AM) or evening rush (4:30 - 6:00 PM) or midday
            hour_choice = random.choice([7, 8, 8, 9, 13, 16, 17])
            minute_choice = random.randint(0, 59)
            base_date = datetime(2026, 9, 1) + timedelta(days=t_idx % 45)
            trip_start = base_date.replace(hour=hour_choice, minute=minute_choice, second=0)
            
            # Traffic factor: peak hours (0.6 - 0.8 = heavy traffic), normal (0.9 - 1.15)
            is_peak = (7 <= hour_choice <= 9) or (16 <= hour_choice <= 18)
            base_traffic = random.uniform(0.65, 0.85) if is_peak else random.uniform(0.95, 1.20)
            
            # Build list of points for this trip
            trip_points = []
            elapsed_seconds = 0.0
            
            # Step through each segment between stops
            for seg_idx in range(len(stops) - 1):
                start_node = stops[seg_idx]
                end_node = stops[seg_idx + 1]
                
                seg_dist = haversine_km(start_node["lat"], start_node["lng"], end_node["lat"], end_node["lng"])
                # Discretize into small GPS ticks (e.g., every 50-100 meters or ~15-20 seconds)
                num_ticks = max(5, int(seg_dist / 0.15))
                
                # Stop dwell time at starting node (except very start)
                if seg_idx > 0:
                    dwell_seconds = random.uniform(30.0, 90.0) # 30s to 1.5 min passenger boarding
                    elapsed_seconds += dwell_seconds
                
                for step in range(num_ticks):
                    frac = step / float(num_ticks)
                    cur_lat = start_node["lat"] + (end_node["lat"] - start_node["lat"]) * frac
                    cur_lng = start_node["lng"] + (end_node["lng"] - start_node["lng"]) * frac
                    
                    # Speed variation with slight random noise and traffic influence
                    speed_base = 32.0 * base_traffic
                    speed = max(8.0, random.gauss(speed_base, 4.0))
                    
                    dist_to_dest = haversine_km(cur_lat, cur_lng, dest["lat"], dest["lng"])
                    stops_rem = len(stops) - 1 - seg_idx
                    
                    curr_time = trip_start + timedelta(seconds=elapsed_seconds)
                    
                    trip_points.append({
                        "trip_id": trip_id,
                        "route_code": route_code,
                        "timestamp": curr_time.isoformat(),
                        "latitude": round(cur_lat, 6),
                        "longitude": round(cur_lng, 6),
                        "speed_kmph": round(speed, 2),
                        "remaining_distance_km": round(dist_to_dest, 3),
                        "elapsed_trip_min": round(elapsed_seconds / 60.0, 2),
                        "traffic_factor": round(base_traffic, 2),
                        "stops_remaining": stops_rem,
                        "_elapsed_seconds": elapsed_seconds
                    })
                    
                    # Advance time based on step distance & speed
                    step_km = seg_dist / float(num_ticks)
                    dt_hours = step_km / max(5.0, speed)
                    dt_sec = dt_hours * 3600.0
                    elapsed_seconds += dt_sec
            
            # Destination reached: compute ground-truth remaining travel time for each observation
            total_duration_sec = elapsed_seconds
            for pt in trip_points:
                rem_sec = max(0.0, total_duration_sec - pt["_elapsed_seconds"])
                pt["remaining_time_min"] = round(rem_sec / 60.0, 2)
                del pt["_elapsed_seconds"]
                rows.append(pt)
                
            trip_counter += 1

    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
        
    print(f"[Dataset Generator] Successfully generated {len(rows)} telemetry points across {trip_counter-1} trips into '{output_path}'.")
    return output_path

if __name__ == "__main__":
    generate_campus_trip_dataset()
