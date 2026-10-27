#!/bin/sh
# IntelliBus AI – Production Entrypoint
# Works on: Docker Compose (local), Render.com, Railway, Fly.io, etc.
# Key design: NEVER exit with non-zero status before uvicorn starts.
#             Database unavailability = SQLite fallback, not a crash.

echo "======================================================================="
echo "   INTELLIBUS AI ENTERPRISE PRODUCTION CONTAINER INITIALIZATION"
echo "======================================================================="

echo "[1/3] Checking Database Connection..."
python -c "
import sys, time, os
from app.database import engine
from sqlalchemy import text

# Determine which DB engine is active
db_url = str(engine.url)
is_postgres = 'postgresql' in db_url or 'postgres' in db_url
is_sqlite = 'sqlite' in db_url

if is_sqlite:
    print('[INFO] Running with SQLite local database (no PostgreSQL configured).')
elif is_postgres:
    # Try to reach PostgreSQL (Render injects DATABASE_URL env var automatically)
    connected = False
    for attempt in range(1, 8):
        try:
            with engine.connect() as conn:
                # Try PostGIS extension (may not be available on all managed DBs)
                try:
                    conn.execute(text('CREATE EXTENSION IF NOT EXISTS postgis;'))
                    conn.commit()
                    print('[OK] PostGIS spatial extension verified.')
                except Exception:
                    # PostGIS unavailable on this managed DB — that is OK
                    print('[INFO] PostGIS extension not available, continuing without it.')
            connected = True
            print(f'[OK] PostgreSQL connection established on attempt {attempt}.')
            break
        except Exception as e:
            print(f'[Waiting for DB] Attempt {attempt}/7: {e}')
            time.sleep(3)

    if not connected:
        print('[WARN] PostgreSQL unreachable after 7 attempts — app will use SQLite fallback.')
        print('[WARN] Set DATABASE_URL env var on Render to connect to Render Postgres.')

# Always create tables (works for both PostgreSQL and SQLite)
try:
    from app.database import Base
    Base.metadata.create_all(bind=engine)
    print('[OK] Database schema verified / tables created.')
except Exception as e:
    print(f'[WARN] Table creation skipped: {e}')
"

echo "[2/3] Seeding Initial Transit Data & Admin/Driver Credentials..."
python -c "
from app.database import SessionLocal
from app.models.user import User
try:
    from app.seed import seed_database
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            seed_database(db)
            print('[OK] Initial database seed completed.')
        else:
            print('[OK] Database already initialized with active fleet data.')
    finally:
        db.close()
except Exception as e:
    print(f'[WARN] Seed step skipped: {e}')
" || true

echo "[3/3] Launching FastAPI ASGI Server on port ${PORT:-8000}..."
echo "      DATABASE_URL: ${DATABASE_URL:-sqlite fallback}"
echo "      WORKERS: ${WORKERS:-1}"
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers "${WORKERS:-1}" \
    --proxy-headers \
    --forwarded-allow-ips '*'
