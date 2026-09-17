@echo off
echo ===================================================
echo     Starting IntelliBus AI Platform (Full Stack)
echo ===================================================

:: Check if .env exists, if not create from .env.example
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
)

echo [1/2] Launching Backend API (Port 8000)...
start "IntelliBus Backend API" cmd /k "cd backend && (if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat) && python -m uvicorn app.main:app --reload --port 8000"

echo [2/2] Launching Frontend UI (Port 5173)...
start "IntelliBus Frontend UI" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo   IntelliBus Platform Started Successfully!
echo   - Frontend App: http://localhost:5173
echo   - Backend API:  http://localhost:8000/docs
echo ===================================================
pause
