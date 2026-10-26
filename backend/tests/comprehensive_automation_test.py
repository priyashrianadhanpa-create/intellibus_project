"""
IntelliBus AI Comprehensive Automated Function & API Verification Test Suite
Tests all system capabilities, databases, AI models, security auth, and endpoints.
"""
import urllib.request
import urllib.error
import json
import time

import os

BASE_URL = os.getenv("TEST_BASE_URL", "http://127.0.0.1:8000")
API_URL = f"{BASE_URL}/api/v1"

passed = []
failed = []

def http_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None:
        if isinstance(data, (dict, list)):
            encoded_data = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif isinstance(data, str):
            encoded_data = data.encode("utf-8")
        else:
            encoded_data = data
    else:
        encoded_data = None

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            body_bytes = resp.read()
            body_str = body_bytes.decode("utf-8")
            try:
                parsed = json.loads(body_str)
            except Exception:
                parsed = body_str
            return status, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return e.code, parsed

def test(name):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            try:
                fn(*args, **kwargs)
                passed.append(name)
                print(f" [PASS] {name}")
            except Exception as e:
                failed.append((name, str(e)))
                print(f" [FAIL] {name}: {e}")
        return wrapper
    return decorator

@test("1. Root & Health Check Endpoints")
def test_health():
    code, data = http_req(f"{BASE_URL}/")
    assert code == 200, f"Expected 200, got {code}"
    assert "IntelliBus" in data.get("message", "")

    code, data = http_req(f"{API_URL}/health")
    assert code == 200
    assert data.get("status") == "healthy"
    assert data.get("database") == "connected"

@test("2. Multi-Role Authentication (Student, Driver, Staff, Admin)")
def test_auth():
    roles = [
        ("student@campus.edu", "password123", "student"),
        ("driver@campus.edu", "password123", "driver"),
        ("staff@campus.edu", "password123", "staff"),
        ("admin@campus.edu", "password123", "admin"),
    ]
    for email, pwd, expected_role in roles:
        code, body = http_req(f"{API_URL}/auth/login", method="POST", data={"email": email, "password": pwd})
        assert code == 200, f"Login failed for {email}: {body}"
        assert "access_token" in body, f"No token in response for {email}"
        assert body["user"]["role"] == expected_role, f"Role mismatch for {email}"
        
        # Test me endpoint
        me_code, me_data = http_req(f"{API_URL}/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
        assert me_code == 200
        assert me_data["email"] == email

@test("3. Bus Routes and Campus Stops Query")
def test_routes_and_stops():
    code_r, routes = http_req(f"{API_URL}/routes")
    assert code_r == 200
    assert len(routes) > 0, "No routes returned"
    
    code_s, stops = http_req(f"{API_URL}/stops")
    assert code_s == 200
    assert len(stops) > 0, "No stops returned"

@test("4. Fleet Management (Buses & Active Trips)")
def test_fleet_and_trips():
    code_b, buses = http_req(f"{API_URL}/buses")
    assert code_b == 200
    assert len(buses) > 0, "No buses found"

    code_t, trips = http_req(f"{API_URL}/trips")
    assert code_t == 200
    assert len(trips) > 0, "No trips found"

@test("5. AI Model: Dynamic ETA Predictor with Traffic Multiplier")
def test_ai_eta():
    payload = {
        "current_lat": 11.9392,
        "current_lng": 79.4975,
        "target_lat": 11.9207,
        "target_lng": 79.6107,
        "current_speed_kmh": 35.0,
        "traffic_factor": 1.2
    }
    code, data = http_req(f"{API_URL}/ai/predict-eta", method="POST", data=payload)
    assert code == 200, f"ETA failed: {data}"
    assert "distance_km" in data
    assert "eta_minutes" in data
    assert data["eta_minutes"] > 0
    assert data["confidence_score"] > 0.5

@test("6. AI Model: Route Optimizer & TSP Shortest Path")
def test_ai_route_optimizer():
    payload = {
        "origin_stop_id": 1,
        "dest_stop_id": 5
    }
    code, data = http_req(f"{API_URL}/ai/optimize-route", method="POST", data=payload)
    assert code == 200, f"Route optimizer failed: {data}"
    assert "optimal_stop_path" in data
    assert len(data["optimal_stop_path"]) >= 2
    assert "total_distance_km" in data

@test("7. AI Model: Telemetry Safety Detector & Driver Scoring")
def test_ai_safety_detector():
    payload = {
        "gps_logs": [
            {"speed": 25.0},
            {"speed": 55.0},
            {"speed": 30.0}
        ]
    }
    code, data = http_req(f"{API_URL}/ai/safety-audit", method="POST", data=payload)
    assert code == 200, f"Safety audit failed: {data}"
    assert "safety_score" in data
    assert "rating" in data
    assert "speed_violations_count" in data

@test("8. AI Model: 24-Hour Traffic Congestion Heatmap")
def test_ai_traffic_heatmap():
    code, data = http_req(f"{API_URL}/ai/traffic-heatmap")
    assert code == 200
    assert "heatmap" in data
    assert len(data["heatmap"]) == 24

@test("9. System Alerts Query & Creation")
def test_alerts():
    code, alerts = http_req(f"{API_URL}/alerts")
    assert code == 200
    assert isinstance(alerts, list)

    new_alert = {
        "title": "Automated Test Alert",
        "message": "Continuous Integration automated check executed.",
        "category": "general"
    }
    c_code, created = http_req(f"{API_URL}/alerts", method="POST", data=new_alert)
    assert c_code in [200, 201], f"Alert creation failed: {created}"
    assert created["title"] == "Automated Test Alert"

@test("10. Student Custom Boarding Stop Persistence & Retrieval")
def test_student_boarding_stop():
    code, res = http_req(f"{API_URL}/auth/login", method="POST", data={"email": "student@campus.edu", "password": "password123"})
    token = res["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    save_payload = {
        "stop_name": "Villupuram Main Junction Auto-Stop",
        "address": "NH-45 Highway Point",
        "latitude": 11.9392,
        "longitude": 79.4975,
        "route_id": 1
    }
    p_code, p_data = http_req(f"{API_URL}/student/bus-stop", method="POST", data=save_payload, headers=headers)
    assert p_code == 200, f"Save student stop failed: {p_data}"

    g_code, stop_data = http_req(f"{API_URL}/student/bus-stop", headers=headers)
    assert g_code == 200
    assert stop_data.get("stop_name") == "Villupuram Main Junction Auto-Stop"

@test("11. Student Live Bus Proximity & Geofencing Trigger")
def test_proximity_geofencing():
    payload = {
        "bus_code": "BUS-101",
        "current_lat": 11.9285,
        "current_lng": 79.5450,
        "stop_lat": 11.9215,
        "stop_lng": 79.5850,
        "speed_kmh": 35.0,
        "phone_number": "+919876543210",
        "channel": "whatsapp",
        "lead_time_mins": 15
    }
    code, data = http_req(f"{API_URL}/alerts/trigger-proximity", method="POST", data=payload)
    assert code == 200, f"Proximity trigger failed: {data}"
    assert "dist_km" in data
    assert "eta_mins" in data
    assert "triggered" in data
    assert data["triggered"] is True

@test("12. Driver Real-Time Telemetry GPS Logging & Retrieval")
def test_gps_logging_and_retrieval():
    gps_payload = {
        "trip_id": 1,
        "bus_id": 1,
        "latitude": 11.9285,
        "longitude": 79.5450,
        "speed": 32.5,
        "bearing": 88.0
    }
    post_code, post_data = http_req(f"{API_URL}/trips/1/gps", method="POST", data=gps_payload)
    assert post_code == 200, f"Record GPS failed: {post_data}"
    assert post_data["latitude"] == 11.9285

    get_code, get_data = http_req(f"{API_URL}/trips/1/latest-gps")
    assert get_code == 200, f"Get latest GPS failed: {get_data}"
    assert get_data["latitude"] == 11.9285
    assert get_data["speed"] == 32.5

@test("13. Student Live Bus AI ETA Calculation to Saved Stop")
def test_student_bus_eta():
    code, res = http_req(f"{API_URL}/auth/login", method="POST", data={"email": "student@campus.edu", "password": "password123"})
    token = res["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    eta_code, eta_data = http_req(f"{API_URL}/student/bus/eta?trip_id=1", headers=headers)
    assert eta_code == 200, f"Student bus ETA failed: {eta_data}"
    assert eta_data["hasSavedStop"] is True
    assert "distanceRemainingKm" in eta_data
    assert "etaMinutes" in eta_data
    assert eta_data["isLiveGps"] is True

if __name__ == "__main__":
    print("=" * 75)
    print("     INTELLIBUS AI - AUTOMATED END-TO-END FUNCTION TEST SUITE")
    print("=" * 75)
    test_health()
    test_auth()
    test_routes_and_stops()
    test_fleet_and_trips()
    test_ai_eta()
    test_ai_route_optimizer()
    test_ai_safety_detector()
    test_ai_traffic_heatmap()
    test_alerts()
    test_student_boarding_stop()
    test_proximity_geofencing()
    test_gps_logging_and_retrieval()
    test_student_bus_eta()

    print("\n" + "=" * 75)
    print(f"  TOTAL TESTS RUN: {len(passed) + len(failed)}")
    print(f"  PASSED: {len(passed)}")
    print(f"  FAILED: {len(failed)}")
    print("=" * 75)
    if failed:
        print("\nFailures:")
        for name, err in failed:
            print(f" - {name}: {err}")
        exit(1)
    else:
        print("\n *** ALL 13/13 SYSTEM FUNCTIONS & APIS ARE 100% OPERATIONAL! ***\n")
        exit(0)
