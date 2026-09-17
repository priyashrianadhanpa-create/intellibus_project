from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import RouteResponse, RouteCreate, StopResponse, StopCreate
from app.crud import get_routes, create_route, get_stops, create_stop, get_route

router = APIRouter(tags=["routes"])

@router.get("/routes", response_model=List[RouteResponse])
def read_routes(db: Session = Depends(get_db)):
    return get_routes(db)

@router.post("/routes", response_model=RouteResponse)
def add_route(route: RouteCreate, db: Session = Depends(get_db)):
    return create_route(db, route)

@router.get("/routes/{route_id}", response_model=RouteResponse)
def read_route(route_id: int, db: Session = Depends(get_db)):
    db_route = get_route(db, route_id)
    if not db_route:
        raise HTTPException(status_code=404, detail="Route not found")
    return db_route

@router.get("/stops", response_model=List[StopResponse])
def read_stops(db: Session = Depends(get_db)):
    return get_stops(db)

@router.post("/stops", response_model=StopResponse)
def add_stop(stop: StopCreate, db: Session = Depends(get_db)):
    return create_stop(db, stop)
