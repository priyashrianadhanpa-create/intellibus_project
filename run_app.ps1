# IntelliBus AI Platform Master PowerShell Instant Launcher

Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "             INTELLIBUS AI PLATFORM INSTANT MASTER LAUNCHER            " -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = $PSScriptRoot

# 1. Database Seeder
Write-Host "[1/3] Seeding Database & Checking Schemas..." -ForegroundColor Yellow
Set-Location -Path "$ProjectRoot\backend"
$env:PYTHONPATH = "C:\Users\Public\PyPackages"
& "C:\Program Files\LibreOffice\program\python.exe" "app\seed.py"

Write-Host ""
# 2. Start Backend
Write-Host "[2/3] Starting FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/k cd /d `"$ProjectRoot\backend`" && set PYTHONPATH=C:\Users\Public\PyPackages && `"`"C:\Program Files\LibreOffice\program\python.exe`"`" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" -WindowStyle Normal


# 3. Start Frontend
Write-Host "[3/3] Starting Vite React Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/k cd /d `"$ProjectRoot\frontend`" && npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "  ALL SERVICES LAUNCHED SUCCESSFULLY!" -ForegroundColor Cyan
Write-Host "  - Frontend Web App: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  - Backend Swagger API Docs: http://localhost:8000/api/v1/openapi.json" -ForegroundColor Yellow
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"
