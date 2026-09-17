from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import BusResponse, BusCreate
from app.crud import get_buses, create_bus

router = APIRouter(prefix="/buses", tags=["buses"])

@router.get("", response_model=List[BusResponse])
def read_buses(db: Session = Depends(get_db)):
    return get_buses(db)

@router.post("", response_model=BusResponse)
def add_bus(bus: BusCreate, db: Session = Depends(get_db)):
    return create_bus(db, bus)
