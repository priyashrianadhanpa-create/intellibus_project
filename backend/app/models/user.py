from sqlalchemy import Column, Integer, String, Boolean, Enum, Float
import enum
from ..database import Base

class UserRole(str, enum.Enum):
    STUDENT = "student"
    DRIVER = "driver"
    STAFF = "staff"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    full_name = Column(String, nullable=True)
    
    # role specific IDs
    student_id = Column(String, unique=True, nullable=True) # for students
    driver_license = Column(String, unique=True, nullable=True) # for drivers

    # student preferred boarding stop
    preferred_stop_id = Column(Integer, nullable=True)
    preferred_stop_name = Column(String, nullable=True)
    preferred_lat = Column(Float, nullable=True)
    preferred_lng = Column(Float, nullable=True)
