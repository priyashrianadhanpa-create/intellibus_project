from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Bus(Base):
    __tablename__ = "buses"

    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String, unique=True, index=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True)
    
    is_active = Column(Boolean, default=True)
    
    # relationships
    driver = relationship("User", foreign_keys=[driver_id])
    route = relationship("Route", foreign_keys=[route_id])
