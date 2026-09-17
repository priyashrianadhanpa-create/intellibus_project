import time
import json
import random
import sys
import os

# Add root path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from backend.app.mqtt_broker import mqtt_bridge

CAMPUS_ROUTE_STOPS = [
  {"name": "North Campus Hub", "lat": 40.7128, "lng": -74.0060},
  {"name": "Science & Tech Building", "lat": 40.7150, "lng": -74.0020},
  {"name": "Central Library", "lat": 40.7180, "lng": -73.9980},
  {"name": "Student Recreation Center", "lat": 40.7210, "lng": -73.9940},
  {"name": "South Residence Quad", "lat": 40.7240, "lng": -73.9900}
]

def simulate_hardware_obd2_stream(iterations: int = 5):
    """
    Simulates hardware OBD-II / IoT GPS tracker publishing MQTT telemetry stream.
    """
    print("Starting IoT Hardware OBD-II Telemetry Simulator...")
    curr_lat = CAMPUS_ROUTE_STOPS[0]["lat"]
    curr_lng = CAMPUS_ROUTE_STOPS[0]["lng"]
    target_stop_idx = 1
    
    for i in range(iterations):
        target = CAMPUS_ROUTE_STOPS[target_stop_idx]
        curr_lat += (target["lat"] - curr_lat) * 0.25
        curr_lng += (target["lng"] - curr_lng) * 0.25
        
        telemetry_payload = {
            "bus_id": 1,
            "trip_id": 1,
            "latitude": round(curr_lat, 6),
            "longitude": round(curr_lng, 6),
            "speed": round(22.0 + random.uniform(0, 8), 1),
            "bearing": 45.0,
            "engine_temp_c": round(88.0 + random.uniform(0, 5), 1),
            "fuel_level_percent": round(78.5 - (i * 0.1), 1),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        
        raw_json = json.dumps(telemetry_payload)
        parsed = mqtt_bridge.process_hardware_telemetry_payload(raw_json)
        print(f"[{i+1}/{iterations}] Simulated Hardware IoT Packet -> Bus #{parsed['bus_id']} Lat: {parsed['latitude']}, Lng: {parsed['longitude']}, Temp: {parsed['engine_temp_c']}°C, Fuel: {parsed['fuel_level_percent']}%")
        
        if Math_dist := (abs(target["lat"] - curr_lat) + abs(target["lng"] - curr_lng)) < 0.0005:
            target_stop_idx = (target_stop_idx + 1) % len(CAMPUS_ROUTE_STOPS)
            
        time.sleep(1)

if __name__ == "__main__":
    simulate_hardware_obd2_stream(5)
