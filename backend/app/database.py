from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import logging
from .core.config import settings

logger = logging.getLogger(__name__)

# Fallback to SQLite if PostgreSQL connection fails during local dev without Docker
db_url = settings.DATABASE_URL
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

try:
    engine = create_engine(db_url, connect_args=connect_args)
    # Test connection
    with engine.connect() as conn:
        if db_url.startswith("postgresql"):
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                conn.commit()
                logger.info("PostGIS spatial extension enabled successfully.")
            except Exception as e:
                logger.warning(f"Could not enable PostGIS extension automatically: {e}")
except Exception as e:
    logger.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite dev database.")
    db_url = "sqlite:///./intellibus.db"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

