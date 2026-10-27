import logging
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .core.config import settings

logger = logging.getLogger(__name__)

# ── Normalize DATABASE_URL ──────────────────────────────────────────────────
# Render injects DATABASE_URL as "postgres://..." (legacy scheme).
# SQLAlchemy 2.x requires "postgresql+psycopg2://..." or "postgresql://..."
# We fix this transparently here so no manual env var editing is needed.
def _normalize_db_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and "+psycopg2" not in url and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url

db_url = _normalize_db_url(settings.DATABASE_URL)

# ── Engine creation with automatic SQLite fallback ─────────────────────────
def _make_sqlite_engine():
    sqlite_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "intellibus_dev.db")
    )
    logger.info(f"[Database] Using SQLite fallback at {sqlite_path}")
    return create_engine(
        f"sqlite:///{sqlite_path}",
        connect_args={"check_same_thread": False}
    )

engine = None

if db_url.startswith("postgresql"):
    try:
        temp_engine = create_engine(
            db_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_timeout=5
        )
        # Quick connection test — if it fails, fall through to SQLite
        with temp_engine.connect() as conn:
            pass
        engine = temp_engine
        logger.info("[Database] Connected successfully to PostgreSQL database.")
    except Exception as e:
        logger.warning(
            f"[Database] PostgreSQL connection unavailable ({e}). "
            "Activating SQLite local fallback engine."
        )
        print(
            f"[Database] PostgreSQL connection unavailable ({e}). "
            "Activating SQLite local fallback engine."
        )
        engine = _make_sqlite_engine()
elif db_url.startswith("sqlite"):
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    logger.info(f"[Database] Using SQLite: {db_url}")
else:
    logger.warning(f"[Database] Unknown DB scheme in URL: {db_url}. Using SQLite fallback.")
    engine = _make_sqlite_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
