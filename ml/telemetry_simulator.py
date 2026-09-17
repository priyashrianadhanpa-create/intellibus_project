import asyncio
import json
import random
import time

CAMPUS_BUS_ROUTES = {
    1: [
        {"lat": 40.7128, "lng": -74.0060, "name": "North Campus Hub"},
        {"lat": 40.7150, "lng": -74.0020, "name": "Science & Tech Building"},
        {"lat": 40.7180, "lng": -73.9980, "name": "Central Library"},
        {"lat": 40.7210, "lng": -73.9940, "name": "Student Recreation Center"},
        {"lat": 40.7240, "lng": -73.9900, "name": "South Residence Quad"}
    ],
    2: [
        {"lat": 40.7180, "lng": -73.9980, "name": "Central Library"},
        {"lat": 40.7150, "lng": -74.0020, "name": "Science & Tech Building"},
        {"lat": 40.7128, "lng": -74.0060, "name": "North Campus Hub"}
    ]
}

def generate_interpolated_gps(trip_id: int, progress_ratio: float) -> dict:
    stops = CAMPUS_BUS_ROUTES.get(trip_id, CAMPUS_BUS_ROUTES[1])
    num_segments = len(stops) - 1
    
    scaled_progress = progress_ratio * num_segments
    segment_idx = int(scaled_progress) % num_segments
    segment_t = scaled_progress - int(scaled_progress)
    
    start_stop = stops[segment_idx]
    end_stop = stops[segment_idx + 1]
    
    current_lat = start_stop["lat"] + (end_stop["lat"] - start_stop["lat"]) * segment_t
    current_lng = start_stop["lng"] + (end_stop["lng"] - start_stop["lng"]) * segment_t
    speed = round(random.uniform(22.0, 32.0), 1)

    return {
        "type": "LOCATION_UPDATE",
        "trip_id": trip_id,
        "bus_id": 100 + trip_id,
        "latitude": round(current_lat, 6),
        "longitude": round(current_lng, 6),
        "speed": speed,
        "bearing": 180.0,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

if __name__ == "__main__":
    print("Testing Telemetry Simulator Generator...")
    for t in [0.1, 0.5, 0.9]:
        gps = generate_interpolated_gps(1, t)
        print("Generated Telemetry:", gps)
