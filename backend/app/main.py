import time
from collections import defaultdict
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .core.config import settings
from .database import engine, Base, SessionLocal, db_url
from .api.v1.router import api_router
from .websocket.endpoints import ws_router
from .seed import seed_database
from .models.user import User



app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if settings.ENVIRONMENT != "production" else None,
)

# 1. Rate Limiting Middleware for Auth Endpoints (Brute-Force Protection)
login_attempts = defaultdict(list)

@app.middleware("http")
async def rate_limit_auth_middleware(request: Request, call_next):
    if request.url.path.endswith("/auth/login") and request.method == "POST":
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        # Keep attempts within the last 60 seconds
        attempts = [t for t in login_attempts[client_ip] if now - t < 60]
        login_attempts[client_ip] = attempts
        if len(attempts) >= settings.MAX_LOGIN_ATTEMPTS_PER_MIN:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many login attempts. Please wait 1 minute before trying again."}
            )
        login_attempts[client_ip].append(now)

    response = await call_next(request)
    return response

# 2. Production Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# 3. Dynamic CORS Configuration
cors_origins = settings.get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if "*" not in cors_origins else ["*"],
    allow_origin_regex=r"https?://.*" if "*" in cors_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "status": "online",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    is_postgres = str(engine.url).startswith("postgresql")
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "database": "connected",
        "database_engine": "PostgreSQL 15 (PostGIS 3.3)" if is_postgres else "SQLite (Dev Fallback)",
        "spatial_engine": "PostGIS" if is_postgres else "Haversine"
    }

# Include routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)
