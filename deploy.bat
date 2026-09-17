@echo off
title IntelliBus AI Platform Automated Production Deployer
color 0A
cls
echo =======================================================================
echo        INTELLIBUS AI PLATFORM AUTOMATED PRODUCTION DEPLOYMENT
echo =======================================================================
echo.

echo [1/4] Verifying Environment Configuration...
if not exist .env (
    copy .env.production .env
    echo Created .env from .env.production
)

echo.
echo [2/4] Building Container Stack (PostGIS, FastAPI Backend, Nginx Frontend)...
docker-compose build

echo.
echo [3/4] Launching Production Services...
docker-compose up -d

echo.
echo [4/4] Checking Container Status...
docker-compose ps

echo.
echo =======================================================================
echo    PRODUCTION DEPLOYMENT COMPLETED!
echo    - Production Web App: http://localhost
echo    - FastAPI Swagger Docs: http://localhost:8000/api/v1/openapi.json
echo    - API Health Endpoint: http://localhost:8000/health
echo =======================================================================
echo.
pause
