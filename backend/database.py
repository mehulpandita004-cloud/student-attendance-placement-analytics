import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Ensure backend/data directory exists
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "college_analytics.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

# SQLite requires check_same_thread=False for FastAPI concurrency
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    """Create all tables and perform non-destructive schema migrations for SQLite."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        from sqlalchemy import text
        result = conn.execute(text("PRAGMA table_info(placement_drives);"))
        existing_cols = {row[1] for row in result.fetchall()}
        
        if existing_cols: # table exists
            if "required_skills" not in existing_cols:
                conn.execute(text("ALTER TABLE placement_drives ADD COLUMN required_skills VARCHAR(255) DEFAULT ''"))
            if "min_projects" not in existing_cols:
                conn.execute(text("ALTER TABLE placement_drives ADD COLUMN min_projects INTEGER DEFAULT 0"))
            if "min_certifications" not in existing_cols:
                conn.execute(text("ALTER TABLE placement_drives ADD COLUMN min_certifications INTEGER DEFAULT 0"))
            if "internship_required" not in existing_cols:
                conn.execute(text("ALTER TABLE placement_drives ADD COLUMN internship_required VARCHAR(50) DEFAULT 'No'"))
            conn.commit()

def get_db():
    """Dependency function to get a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
