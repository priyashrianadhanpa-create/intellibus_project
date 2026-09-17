import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.main import root, health_check
from app.database import SessionLocal
from app.api.v1.endpoints.routes import read_routes, read_stops
from app.api.v1.endpoints.buses import read_buses
from app.api.v1.endpoints.trips import read_trips
from app.api.v1.endpoints.ai import predict_eta, optimize_route, safety_audit, get_traffic_heatmap, ETARequest, RouteOptimizeRequest, SafetyAuditRequest
from app.api.v1.endpoints.alerts import read_alerts, trigger_proximity_alert, ProximityCheckRequest
from app.crud import get_user_by_email, create_or_update_student_stop, get_student_stop
from app.schemas import StudentBusStopCreate

def test_root():
    res_root = root()
    assert res_root["message"] == "Welcome to IntelliBus AI API"

def test_health():
    res = health_check()
    assert res["status"] == "healthy"

def test_db_endpoints():
    db = SessionLocal()
    try:
        routes = read_routes(db)
        assert len(routes) > 0

        stops = read_stops(db)
        assert len(stops) > 0

        buses = read_buses(db)
        assert len(buses) > 0

        trips = read_trips(False, db)
        assert len(trips) > 0

        alerts = read_alerts(False, db)
        assert len(alerts) >= 0
    finally:
        db.close()

def test_student_stop_crud():
    db = SessionLocal()
    try:
        student = get_user_by_email(db, "student@campus.edu")
        assert student is not None
        
        stop_in = StudentBusStopCreate(
            stop_name="Valavanur Bus Stop",
            latitude=11.9215,
            longitude=79.5850,
            address="NH 45, Valavanur, Villupuram",
            route_id=1
        )
        saved = create_or_update_student_stop(db, student_id=student.id, stop=stop_in)
        assert saved.stop_name == "Valavanur Bus Stop"
        
        fetched = get_student_stop(db, student_id=student.id)
        assert fetched is not None
        assert fetched.latitude == 11.9215
    finally:
        db.close()

def test_proximity_alert():
    res = trigger_proximity_alert(ProximityCheckRequest(
        bus_code="BUS-101",
        current_lat=11.9285,
        current_lng=79.5450,
        stop_lat=11.9215,
        stop_lng=79.5850,
        speed_kmh=35.0,
        lead_time_mins=10
    ))
    assert "triggered" in res
    assert "eta_mins" in res
    assert res["dist_km"] > 0

def test_ai_endpoints():
    eta_res = predict_eta(ETARequest(
        current_lat=40.7128,
        current_lng=-74.0060,
        target_lat=40.7240,
        target_lng=-73.9900
    ))
    assert "eta_minutes" in eta_res

    opt_res = optimize_route(RouteOptimizeRequest(origin_stop_id=1, dest_stop_id=5))
    assert "optimal_stop_path" in opt_res

    audit_res = safety_audit(SafetyAuditRequest(gps_logs=[{"speed": 22.0}, {"speed": 40.0}]))
    assert "safety_score" in audit_res

    heatmap_res = get_traffic_heatmap()
    assert "heatmap" in heatmap_res
    assert len(heatmap_res["heatmap"]) == 24

def run_all_tests():
    print("Beginning IntelliBus AI Integration Test Suite...")
    test_root()
    print("[OK] Root endpoint test passed")
    test_health()
    print("[OK] Health check test passed")
    test_db_endpoints()
    print("[OK] DB endpoints test passed")
    test_student_stop_crud()
    print("[OK] Student Boarding Stop CRUD test passed")
    test_proximity_alert()
    print("[OK] Proximity Alert math & trigger test passed")
    test_ai_endpoints()
    print("[OK] AI & Traffic endpoints test passed")
    print("\nALL BACKEND INTEGRATION TESTS PASSED 100% SUCCESS!")

if __name__ == "__main__":
    run_all_tests()

