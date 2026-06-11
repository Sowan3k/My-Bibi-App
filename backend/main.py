"""
My Bibi — FastAPI backend
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from db.database import init_db
from services.vault_service import init_vault
from config import settings
from routers import auth, chat, memory, bloom, journal, little_things

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Starting My Bibi backend…")

    # Initialise vault directory structure
    await init_vault(settings.vault_path)
    logger.info(f"Vault initialised at: {settings.vault_path}")

    # Initialise SQLite database (creates tables if not exists)
    await init_db()
    logger.info("Database ready.")

    yield

    logger.info("Shutting down My Bibi backend.")


app = FastAPI(
    title="My Bibi API",
    description="Private companion app API for two people.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
)

# CORS — strictly allow only the frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media files from vault (for serving uploaded photos/voice notes)
import os
media_dir = os.path.join(settings.vault_path, "media")
os.makedirs(media_dir, exist_ok=True)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(memory.router, prefix="/api/memory", tags=["memory"])
app.include_router(bloom.router, prefix="/api/bloom", tags=["bloom"])
app.include_router(journal.router, prefix="/api/journal", tags=["journal"])
app.include_router(little_things.router, prefix="/api/little-things", tags=["little-things"])


@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint for Docker and uptime monitors."""
    return {"status": "ok", "app": "my-bibi"}
