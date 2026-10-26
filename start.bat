@echo off
title IntelliBus AI Platform - Master Instant Launcher
color 0B
cls

echo =======================================================================
echo          INTELLIBUS AI ENTERPRISE PLATFORM INSTANT LAUNCHER           
echo =======================================================================
echo.

set PROJECT_ROOT=%~dp0

:: Check if Docker daemon is already running
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Docker Desktop engine is running and active!
    goto LAUNCH_DOCKER
)

:: Docker is not running: Automatically start Docker Desktop from laptop!
echo [INFO] Docker Desktop is not running yet.
if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    echo [*] Automatically launching Docker Desktop from your laptop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo [*] Waiting for Docker engine to boot up (typically 15-25 seconds)...
    echo.
    
    set /a RETRY=0
    :WAIT_FOR_DOCKER
    ping -n 4 127.0.0.1 >nul
    docker info >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Docker Desktop is now fully online and ready!
        echo.
        goto LAUNCH_DOCKER
    )
    set /a RETRY+=1
    echo     Initializing Docker engine... [%RETRY%/15]
    if %RETRY% LSS 15 goto WAIT_FOR_DOCKER

    echo.
    echo [WARNING] Docker Desktop is taking longer than expected.
) else (
    echo [INFO] Docker Desktop executable not found at standard path.
)

echo.
choice /c 12 /n /t 8 /d 1 /m "Press 1 to Retry Docker or 2 to Launch Local Dev Mode: "
if %ERRORLEVEL% EQU 1 (
    set /a RETRY=0
    goto WAIT_FOR_DOCKER
)
goto LAUNCH_LOCAL

:LAUNCH_DOCKER
echo =======================================================================
echo     LAUNCHING ENTERPRISE PRODUCTION CONTAINER STACK (DOCKER)
echo =======================================================================
echo.
echo [1/3] Checking environment configuration...
if not exist "%PROJECT_ROOT%.env" (
    copy "%PROJECT_ROOT%.env.production" "%PROJECT_ROOT%.env" >nul
)

echo [2/3] Starting Docker Services Stack (PostGIS + MQTT + Backend + Nginx)...
cd /d "%PROJECT_ROOT%"
docker compose up -d

echo [3/3] Verifying container health...
ping -n 3 127.0.0.1 >nul
docker compose ps

echo.
echo =======================================================================
echo   INTELLIBUS AI ENTERPRISE PLATFORM IS LIVE!
echo   - Web App UI:        http://localhost (Port 80 via Nginx)
echo   - FastAPI API:       http://localhost:8000
echo   - API Swagger Docs:  http://localhost:8000/api/v1/openapi.json
echo   - PostGIS 15 DB:     localhost:5432 (intellibus)
echo   - MQTT IoT Broker:   localhost:1883
echo =======================================================================
echo.
echo Opening browser to IntelliBus AI Dashboard...
start http://localhost
goto END

:LAUNCH_LOCAL
cls
echo =======================================================================
echo          LAUNCHING FAST LOCAL DEVELOPMENT ENVIRONMENT
echo =======================================================================
echo.
echo [1/3] Preparing Database & Fleet Seed Data...
cd /d "%PROJECT_ROOT%backend"
uv run python app/seed.py

echo.
echo [2/3] Launching FastAPI Backend Server (Port 8000)...
start "IntelliBus Backend API [Port 8000]" cmd /k "cd /d "%PROJECT_ROOT%backend" && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo.
echo [3/3] Launching Vite React Frontend UI (Port 5173)...
start "IntelliBus Frontend UI [Port 5173]" cmd /k "cd /d "%PROJECT_ROOT%frontend" && npm run dev"

echo.
echo =======================================================================
echo   LOCAL PLATFORM LAUNCHED SUCCESSFULLY!
echo   - Web App UI:        https://localhost:5173
echo   - Backend API Docs:  http://127.0.0.1:8000/api/v1/openapi.json
echo   - Health Check:      http://127.0.0.1:8000/health
echo =======================================================================
echo.
echo Opening browser to IntelliBus AI UI...
ping -n 3 127.0.0.1 >nul
start https://localhost:5173

:END
echo.
echo Press any key to exit this launcher window (services keep running).
pause >nul
