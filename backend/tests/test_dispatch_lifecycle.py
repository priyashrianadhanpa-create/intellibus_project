import urllib.request
import json
import asyncio
import websockets
import sys

API_BASE = "http://localhost:8000/api/v1"
WS_BASE = "ws://localhost:8000/ws/live-location/1"

def http_patch(url, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="PATCH")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def http_get(url):
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

async def test_full_dispatch_flow():
    print("=====================================================================")
    print("       DISPATCH LIFECYCLE & LIVE BUS VISIBILITY AUTOMATED VERIFICATION")
    print("=====================================================================")

    # 1. Reset trip 1 to scheduled
    status_code, trip = http_patch(f"{API_BASE}/trips/1/status", {"status": "scheduled"})
    assert status_code == 200, f"Reset failed: {trip}"
    print("[1] Reset Trip 1 to 'scheduled' status: SUCCESS")

    # 2. Check active trips endpoint (Student Dashboard queries this on mount)
    code, active_trips = http_get(f"{API_BASE}/trips?active_only=true")
    assert code == 200
    active_ids = [t["id"] for t in active_trips]
    assert 1 not in active_ids, f"Trip 1 should not be active: {active_trips}"
    print(f"[2] Query active trips: Trip 1 NOT active (active_ids: {active_ids}) -> Student Dashboard suppresses live bus: SUCCESS")

    # 3. Connect student WebSocket client to trip 1
    async with websockets.connect(WS_BASE) as student_ws:
        init_msg = json.loads(await student_ws.recv())
        print(f"[3] Student WebSocket initial handshake message: {init_msg}")
        assert init_msg["type"] == "TRIP_STATUS"
        assert init_msg["is_active"] is False, f"Expected is_active=False on connect: {init_msg}"
        print("    -> Student client received 'is_active: False' -> Shows 'Awaiting Driver Dispatch'")

        # 4. Driver starts dispatch trip
        print("[4] Driver starts dispatch trip via PATCH /trips/1/status (status='active')...")
        patch_code, patch_resp = http_patch(f"{API_BASE}/trips/1/status", {"status": "active"})
        assert patch_code == 200
        assert patch_resp["status"] == "active"

        # 5. Student WebSocket should immediately receive TRIP_STATUS with is_active: True
        status_event = json.loads(await student_ws.recv())
        print(f"[5] Student WebSocket received broadcast: {status_event}")
        assert status_event["type"] == "TRIP_STATUS"
        assert status_event["is_active"] is True
        print("    -> Student client received 'is_active: True' -> Activates live bus display & countdown!")

        # 6. Driver streams a live GPS telemetry point
        driver_gps_payload = {
            "type": "LOCATION_UPDATE",
            "bus_id": 1,
            "trip_id": 1,
            "latitude": 11.9285,
            "longitude": 79.5450,
            "speed": 32.0,
            "bearing": 90.0,
            "route_code": "BUS-101"
        }
        await student_ws.send(json.dumps(driver_gps_payload))
        loc_event = json.loads(await student_ws.recv())
        print(f"[6] Student WebSocket received live location: lat={loc_event['latitude']}, lng={loc_event['longitude']}, ETA={loc_event.get('eta', {}).get('eta_minutes')} mins")
        assert loc_event["type"] == "LOCATION_UPDATE"
        assert loc_event["is_active"] is True

        # 7. Driver ends trip
        print("[7] Driver concludes trip via PATCH /trips/1/status (status='completed')...")
        end_code, end_resp = http_patch(f"{API_BASE}/trips/1/status", {"status": "completed"})
        assert end_code == 200
        assert end_resp["status"] == "completed"

        # 8. Student WebSocket should immediately receive TRIP_STATUS with is_active: False
        end_event = json.loads(await student_ws.recv())
        print(f"[8] Student WebSocket received end broadcast: {end_event}")
        assert end_event["type"] == "TRIP_STATUS"
        assert end_event["is_active"] is False
        print("    -> Student client received 'is_active: False' -> Reverts to 'Bus Parked at Depot • Awaiting Driver Dispatch'!")

    print("\n=====================================================================")
    print(" *** DISPATCH LIFECYCLE VERIFICATION 100% PASSED! ***")
    print(" - Without driver dispatch: Student dashboard shows NO live buses (is_active: false)")
    print(" - When driver starts dispatch: Student dashboard shows live bus (is_active: true)")
    print(" - When driver ends dispatch: Student dashboard hides live bus (is_active: false)")
    print("=====================================================================")

if __name__ == "__main__":
    asyncio.run(test_full_dispatch_flow())
