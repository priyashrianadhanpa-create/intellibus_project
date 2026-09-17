from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .database import engine, Base, SessionLocal
from .api.v1.router import api_router
from .websocket.endpoints import ws_router
from .seed import seed_database
from .models.user import User

# Initialize tables
Base.metadata.create_all(bind=engine)

# Auto seed if empty
db = SessionLocal()
try:
    if db.query(User).count() == 0:
        seed_database(db)
finally:
    db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Welcome to IntelliBus AI API", "status": "online", "version": "1.0.0"}

@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": "connected",
        "spatial_engine": "PostGIS/Haversine"
    }

# Include routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)

