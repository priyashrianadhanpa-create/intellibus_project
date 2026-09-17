from fastapi import APIRouter
from .endpoints import auth, routes, buses, trips, ai, alerts, student_stop

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(routes.router)
api_router.include_router(buses.router)
api_router.include_router(trips.router)
api_router.include_router(ai.router)
api_router.include_router(alerts.router)
api_router.include_router(student_stop.router)
