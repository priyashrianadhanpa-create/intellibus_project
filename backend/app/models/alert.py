from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
import enum
from ..database import Base

class AlertCategory(str, enum.Enum):
    DELAY = "delay"
    MAINTENANCE = "maintenance"
    GENERAL = "general"
    EMERGENCY = "emergency"

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    category = Column(Enum(AlertCategory), default=AlertCategory.GENERAL, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
