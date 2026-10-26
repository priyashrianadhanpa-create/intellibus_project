import os
import json
from typing import List, Union
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings  # type: ignore

class Settings(BaseSettings):
    PROJECT_NAME: str = "IntelliBus AI Platform"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "7eddf14a6aa65ea84c389c4db02d2ce6fdce18e98a6a4b57fb4c00ec1870974d")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7)))  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg2://postgres:ptsye9wBds3lrRPrj_eRsQ@localhost:5432/intellibus"
    )
    
    # CORS Origins (accepts JSON list or comma-separated string)
    CORS_ORIGINS: Union[List[str], str] = os.getenv("CORS_ORIGINS", '["*"]')

    # Telemetry & MQTT Broker
    MQTT_BROKER_HOST: str = os.getenv("MQTT_BROKER_HOST", "localhost")
    MQTT_BROKER_PORT: int = int(os.getenv("MQTT_BROKER_PORT", "1883"))
    MQTT_TOPIC_PREFIX: str = os.getenv("MQTT_TOPIC_PREFIX", "intellibus/telemetry")

    # Rate Limiting
    MAX_LOGIN_ATTEMPTS_PER_MIN: int = int(os.getenv("MAX_LOGIN_ATTEMPTS_PER_MIN", "15"))

    def get_cors_origins(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        try:
            parsed = json.loads(self.CORS_ORIGINS)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
