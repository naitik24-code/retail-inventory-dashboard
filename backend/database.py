import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./inventory.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_indexes() -> None:
    """
    SQLite-friendly "idempotent" index creation for already-existing DBs.

    SQLAlchemy's `create_all()` doesn't add indexes to existing tables, so we
    create them explicitly here.
    """
    # Works for SQLite (this project default) and is safe for other DBs that
    # support IF NOT EXISTS.
    index_sql = [
        "CREATE INDEX IF NOT EXISTS idx_inventory_items_last_updated ON inventory_items (last_updated)",
        "CREATE INDEX IF NOT EXISTS idx_inventory_predictions_updated_at ON inventory_predictions (updated_at)",
        "CREATE INDEX IF NOT EXISTS idx_inventory_alerts_timestamp ON inventory_alerts (timestamp)",
    ]
    with engine.begin() as conn:
        for sql in index_sql:
            conn.exec_driver_sql(sql)

        # Backfill missing columns in existing `inventory_items` tables.
        # This keeps local dev/test DBs from breaking after schema evolution.
        table_info = conn.exec_driver_sql("PRAGMA table_info(inventory_items)").fetchall()
        existing_cols = {row[1] for row in table_info}  # row: (cid, name, type, ...)

        required = {
            "abc_xyz_class": "VARCHAR",
            "anomaly_flag": "BOOLEAN",
            "ml_status": "VARCHAR",
            "confidence_score": "FLOAT",
        }

        for col, col_type in required.items():
            if col not in existing_cols:
                conn.exec_driver_sql(f"ALTER TABLE inventory_items ADD COLUMN {col} {col_type}")
