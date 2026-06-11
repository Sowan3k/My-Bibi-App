"""
My Bibi — SQLite async database engine
Uses aiosqlite via SQLAlchemy async.
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(
    settings.db_url,
    echo=False,
    connect_args={
        "check_same_thread": False,
        # Enable WAL mode for better concurrent read performance
    },
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base."""
    pass


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """
    Create all tables from schema.sql.
    Called once on application startup.
    """
    import os
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")

    with open(schema_path, "r") as f:
        schema = f.read()

    # SQLite pragmas for performance and integrity
    pragmas = """
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;
        PRAGMA synchronous=NORMAL;
    """

    async with engine.begin() as conn:
        # Enable pragmas
        for pragma in pragmas.strip().split(";"):
            pragma = pragma.strip()
            if pragma:
                await conn.execute(text(pragma))

        # Execute schema (all CREATE TABLE IF NOT EXISTS statements)
        for statement in schema.split(";"):
            statement = statement.strip()
            if statement:
                try:
                    await conn.execute(text(statement))
                except Exception as e:
                    # FTS5 virtual tables may give benign errors on re-creation
                    logger.debug(f"Schema statement skipped: {e}")

    logger.info("Database schema initialised.")
