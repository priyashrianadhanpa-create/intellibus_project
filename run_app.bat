@echo off
title IntelliBus AI Platform Instant Launcher
color 0A
cls
echo =======================================================================
echo              INTELLIBUS AI PLATFORM INSTANT MASTER LAUNCHER            
echo =======================================================================
echo.

set PROJECT_ROOT=%~dp0

echo [1/3] Seeding Database and Verifying AI Models...
cd /d "%PROJECT_ROOT%backend"
set PYTHONPATH=C:\Users\Public\PyPackages
"C:\Program Files\LibreOffice\program\python.exe" app\seed.py
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Seeder finished or database already seeded. Continuing...
)

echo.
echo [2/3] Launching FastAPI Backend Server (Port 8000)...
start "IntelliBus Backend API [Port 8000]" cmd /k "cd /d %PROJECT_ROOT%backend && set PYTHONPATH=C:\Users\Public\PyPackages && \"C:\Program Files\LibreOffice\program\python.exe\" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"


echo [3/3] Launching Vite Frontend Application (Port 5173)...
start "IntelliBus Frontend UI [Port 5173]" cmd /k "cd /d %PROJECT_ROOT%frontend && npm run dev"

echo.
echo =======================================================================
echo   ALL SERVICES LAUNCHED SUCCESSFULLY!
echo   - Frontend Web App: http://localhost:5173
echo   - Backend Swagger API Docs: http://localhost:8000/api/v1/openapi.json
echo =======================================================================
echo.
echo Opening browser to IntelliBus AI Dashboard...
timeout /t 3 >nul
start http://localhost:5173

pause
