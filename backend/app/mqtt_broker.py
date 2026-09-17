import json
import logging
import asyncio
from typing import Optional, Dict, Any
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

class MQTTTelemetryBridge:
    """
    IoT Hardware OBD-II / MQTT Telemetry Ingestion Bridge.
    Receives MQTT telemetry messages from hardware GPS devices (e.g. Teltonika, Ruptela, OBD-II dongles)
    and broadcasts them to active sub-second WebSocket subscribers.
    """
    def __init__(self, topic_prefix: str = "intellibus/telemetry"):
        self.topic_prefix = topic_prefix
        self.is_connected = False

    def process_hardware_telemetry_payload(self, raw_payload: str) -> Optional[Dict[str, Any]]:
        """
        Parses and validates raw hardware MQTT payload.
        Expected format:
        {
            "bus_id": 1,
            "trip_id": 1,
            "latitude": 40.7128,
            "longitude": -74.0060,
            "speed": 28.5,
            "bearing": 180.0,
            "engine_temp_c": 92.0,
            "fuel_level_percent": 84.5,
            "timestamp": "2026-09-17T10:30:00Z"
        }
        """
        try:
            data = json.loads(raw_payload)
            if "latitude" not in data or "longitude" not in data:
                return None

            processed = {
                "type": "LOCATION_UPDATE",
                "source": "IoT_MQTT_OBD2",
                "trip_id": data.get("trip_id", 1),
                "bus_id": data.get("bus_id", 1),
                "latitude": float(data.get("latitude")),
                "longitude": float(data.get("longitude")),
                "speed": float(data.get("speed", 0.0)),
                "bearing": float(data.get("bearing", 0.0)),
                "engine_temp_c": data.get("engine_temp_c"),
                "fuel_level_percent": data.get("fuel_level_percent"),
                "timestamp": data.get("timestamp")
            }
            return processed
        except Exception as e:
            logger.error(f"Error parsing MQTT hardware telemetry payload: {e}")
            return None

    async def handle_mqtt_message(self, topic: str, payload_str: str):
        """
        Handles incoming MQTT message and broadcasts payload via WebSocket manager.
        """
        parsed = self.process_hardware_telemetry_payload(payload_str)
        if parsed:
            trip_id = parsed["trip_id"]
            await ws_manager.broadcast_to_trip(trip_id, parsed)
            logger.info(f"Broadcasted IoT MQTT telemetry for Bus #{parsed['bus_id']} on Trip #{trip_id}")
            return parsed
        return None

mqtt_bridge = MQTTTelemetryBridge()
