#!/bin/sh
set -e

echo "======================================================================="
echo "   INTELLIBUS AI ENTERPRISE PRODUCTION CONTAINER INITIALIZATION"
echo "======================================================================="

echo "[1/3] Verifying PostgreSQL / PostGIS Spatial Database Connection..."
python -c "
import sys, time
from app.database import engine, Base
from sqlalchemy import text

for attempt in range(1, 15):
    try:
        with engine.connect() as conn:
            conn.execute(text('CREATE EXTENSION IF NOT EXISTS postgis;'))
            conn.commit()
            print('[OK] PostGIS spatial extension verified active on PostgreSQL.')
            break
    except Exception as e:
        print(f'[Waiting for DB] Attempt {attempt}/15: {e}')
        time.sleep(2)
else:
    print('[ERROR] Could not connect to database after 15 attempts.')
    sys.exit(1)

# Create tables
Base.metadata.create_all(bind=engine)
print('[OK] Database tables verified.')
"

echo "[2/3] Seeding Initial Transit Data & Admin/Driver Credentials..."
python -c "
from app.database import SessionLocal
from app.models.user import User
from app.seed import seed_database

db = SessionLocal()
try:
    if db.query(User).count() == 0:
        seed_database(db)
        print('[OK] Initial database seed completed.')
    else:
        print('[OK] Database already initialized with active fleet.')
finally:
    db.close()
"

echo "[3/3] Launching FastAPI High-Concurrency Uvicorn ASGI Server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WORKERS:-4} --proxy-headers --forwarded-allow-ips '*'
