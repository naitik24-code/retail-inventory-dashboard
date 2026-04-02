from contextlib import asynccontextmanager

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("inventory-api")

from backend.database import Base, engine, ensure_indexes
from backend.ml_service import get_models
from backend.routes import analytics, inventory, predict, upload
from backend.routes.alerts import router as alerts_router
from backend.routes.suggestions import router as suggestions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables
    logger.info("Initializing database...")
    Base.metadata.create_all(bind=engine)
    ensure_indexes()
    # Pre-load ML models so the first request isn't slow.
    # In dev setups, the model artifacts may be missing; don't fail hard.
    try:
        logger.info("Loading ML models...")
        models = get_models()
        if models:
            logger.info("ML models loaded successfully.")
        else:
            logger.warning("No ML models found. Running in deterministic mode.")
    except Exception as e:
        logger.error(
            "ML model loading failed during startup (continuing without ML): %s",
            e,
        )
    yield


app = FastAPI(title="Inventory Management API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inventory.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(predict.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(suggestions_router, prefix="/api")


@app.get("/")
def health_check():
    return {"status": "ok"}
