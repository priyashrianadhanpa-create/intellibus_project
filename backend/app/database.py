import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

if db_url.startswith("postgresql"):
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_size=15,
        max_overflow=25,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_timeout=30
    )
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
