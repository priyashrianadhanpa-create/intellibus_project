from typing import List, Dict

class SafetyDetector:
    def __init__(self, speed_limit_kmh: float = 35.0):
        self.speed_limit = speed_limit_kmh

    def audit_telemetry_logs(self, gps_logs: List[Dict]) -> Dict:
        """
        Audits driver telemetry logs for speed violations, sudden acceleration, and hard braking.
        Returns safety score out of 100 and list of flagged anomalies.
        """
        if not gps_logs:
            return {"safety_score": 100, "anomalies_detected": [], "status": "Clean Drive"}

        speed_violations = 0
        hard_brakes = 0
        sudden_accels = 0
        anomalies = []

        prev_speed = None

        for idx, point in enumerate(gps_logs):
            speed = point.get("speed", 0.0)
            
            # Speed limit violation check
            if speed > self.speed_limit:
                speed_violations += 1
                anomalies.append({
                    "type": "SPEED_VIOLATION",
                    "severity": "HIGH" if speed > self.speed_limit + 15 else "MEDIUM",
                    "speed_recorded": speed,
                    "speed_limit": self.speed_limit,
                    "index": idx
                })

            # Acceleration / Braking delta check
            if prev_speed is not None:
                delta = speed - prev_speed
                if delta < -18.0:
                    hard_brakes += 1
                    anomalies.append({"type": "HARD_BRAKE", "severity": "MEDIUM", "speed_delta": round(delta, 1), "index": idx})
                elif delta > 20.0:
                    sudden_accels += 1
                    anomalies.append({"type": "SUDDEN_ACCEL", "severity": "LOW", "speed_delta": round(delta, 1), "index": idx})

            prev_speed = speed

        # Calculate safety score out of 100
        penalty = (speed_violations * 8) + (hard_brakes * 5) + (sudden_accels * 3)
        safety_score = max(0, 100 - penalty)

        rating = "EXCELLENT" if safety_score >= 90 else ("GOOD" if safety_score >= 75 else "NEEDS_IMPROVEMENT")

        return {
            "safety_score": safety_score,
            "rating": rating,
            "speed_violations_count": speed_violations,
            "hard_brakes_count": hard_brakes,
            "sudden_accels_count": sudden_accels,
            "anomalies_detected": anomalies
        }

safety_detector = SafetyDetector()

if __name__ == "__main__":
    test_logs = [
        {"speed": 22.0}, {"speed": 28.0}, {"speed": 42.0}, {"speed": 18.0}, {"speed": 25.0}
    ]
    res = safety_detector.audit_telemetry_logs(test_logs)
    print("Safety Audit Result:", res)
