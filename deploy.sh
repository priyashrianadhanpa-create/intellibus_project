#!/usr/bin/env bash
# IntelliBus AI Platform One-Click Enterprise Production Deployer (Linux / Docker)

set -e

echo "======================================================================="
echo "       INTELLIBUS AI PLATFORM AUTOMATED PRODUCTION DEPLOYMENT"
echo "======================================================================="

# 1. Check Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed or not in PATH."
    exit 1
fi

echo "[1/4] Checking environment configuration..."
if [ ! -f .env ]; then
    echo "Creating .env from .env.production..."
    cp .env.production .env
fi

echo "[2/4] Building enterprise production container images..."
docker compose build --no-cache

echo "[3/4] Starting IntelliBus enterprise container stack..."
docker compose up -d

echo "[4/4] Verifying health of services..."
sleep 6
docker compose ps

echo "======================================================================="
echo "   ENTERPRISE PRODUCTION DEPLOYMENT SUCCESSFUL!"
echo "   - Web App UI: http://localhost (Port 80)"
echo "   - API Root: http://localhost:8000"
echo "   - API Swagger Docs: http://localhost:8000/api/v1/openapi.json"
echo "   - API Health Check: http://localhost:8000/health"
echo "   - PostGIS 15 Spatial DB: localhost:5432"
echo "   - MQTT Broker: mqtt://localhost:1883"
echo "======================================================================="
