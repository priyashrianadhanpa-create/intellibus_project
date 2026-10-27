import logging
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = None

if db_url.startswith("postgresql"):
    try:
        temp_engine = create_engine(
            db_url,
            connect_args=connect_args,
            pool_size=15,
            max_overflow=25,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_timeout=3
        )
        # Verify connection quickly
        with temp_engine.connect() as conn:
            pass
        engine = temp_engine
        logger.info("[Database] Connected successfully to PostgreSQL database.")
    except Exception as e:
        logger.warning(f"[Database] PostgreSQL connection unavailable ({e}). Activating SQLite local fallback engine.")
        sqlite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "intellibus_dev.db"))
        db_url = f"sqlite:///{sqlite_path}"
        engine = create_engine(db_url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(db_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
