"""
My Bibi — Memory router

Endpoints:
  GET    /api/memory            — List all memories
  POST   /api/memory            — Save a new memory (with optional photo)
  GET    /api/memory/on-this-day — Memories from same date in past years
  GET    /api/memory/{id}       — Single memory
  DELETE /api/memory/{id}       — Delete (either partner can delete shared memories)
"""

import logging
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from middleware.auth_middleware import get_current_user
from services.vault_service import save_memory_as_markdown
from services.chat_service import save_media
from config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


def _row_to_dict(row) -> dict:
    return {
        "id": row.id,
        "created_by": row.created_by,
        "created_by_name": row.created_by_name,
        "title": row.title,
        "content": row.content,
        "media_path": row.media_path,
        "memory_date": row.memory_date,
        "created_at": row.created_at,
    }


@router.get("")
async def list_memories(
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all memories visible to both partners, optionally filtered by search query.
    Uses SQLite FTS5 for full-text search when q is provided.
    """
    if q and q.strip():
        # FTS5 search
        result = await db.execute(
            text("""
                SELECT m.id, m.created_by, u.name as created_by_name,
                       m.title, m.content, m.media_path, m.memory_date, m.created_at
                FROM memories m
                JOIN users u ON u.id = m.created_by
                JOIN memories_fts fts ON fts.rowid = m.rowid
                WHERE memories_fts MATCH :query
                ORDER BY rank
                LIMIT :limit OFFSET :offset
            """),
            {"query": q.strip(), "limit": limit, "offset": offset},
        )
    else:
        result = await db.execute(
            text("""
                SELECT m.id, m.created_by, u.name as created_by_name,
                       m.title, m.content, m.media_path, m.memory_date, m.created_at
                FROM memories m
                JOIN users u ON u.id = m.created_by
                ORDER BY m.memory_date DESC, m.created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            {"limit": limit, "offset": offset},
        )

    return [_row_to_dict(row) for row in result.fetchall()]


@router.get("/on-this-day")
async def on_this_day(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return memories from the same month-day in past years.
    E.g., today is June 11 → return memories from June 11 of any previous year.
    """
    today = date.today()
    month_day = today.strftime("-%m-%d")  # e.g., "-06-11"

    result = await db.execute(
        text("""
            SELECT m.id, m.created_by, u.name as created_by_name,
                   m.title, m.content, m.media_path, m.memory_date, m.created_at
            FROM memories m
            JOIN users u ON u.id = m.created_by
            WHERE m.memory_date LIKE :pattern
              AND m.memory_date < :today_str
            ORDER BY m.memory_date DESC
            LIMIT 10
        """),
        {"pattern": f"%{month_day}", "today_str": today.isoformat()},
    )
    return [_row_to_dict(row) for row in result.fetchall()]


@router.post("", status_code=201)
async def create_memory(
    title: str = Form(...),
    content: str = Form(""),
    memory_date: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save a new memory. Optionally includes a photo.
    Saves markdown to vault and row to DB.
    """
    # Validate date format
    try:
        date.fromisoformat(memory_date)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="memory_date must be in YYYY-MM-DD format.",
        )

    if not title.strip():
        raise HTTPException(status_code=422, detail="Title cannot be empty.")

    media_path = None
    if photo and photo.filename:
        try:
            media_path = await save_media(photo, "photo", current_user["id"])
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

    memory_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        text("""
            INSERT INTO memories (id, created_by, title, content, media_path, memory_date, created_at)
            VALUES (:id, :created_by, :title, :content, :media_path, :memory_date, :now)
        """),
        {
            "id": memory_id,
            "created_by": current_user["id"],
            "title": title.strip(),
            "content": content.strip(),
            "media_path": media_path,
            "memory_date": memory_date,
            "now": now,
        },
    )

    # Update FTS index
    await db.execute(
        text("""
            INSERT INTO memories_fts(rowid, title, content)
            SELECT rowid, title, content FROM memories WHERE id = :id
        """),
        {"id": memory_id},
    )

    await db.commit()

    # Save markdown to vault
    try:
        await save_memory_as_markdown(
            vault_path=settings.vault_path,
            memory_id=memory_id,
            title=title.strip(),
            content=content.strip(),
            memory_date=memory_date,
            created_by_name=current_user["name"],
        )
    except Exception as e:
        logger.error(f"Failed to write memory to vault: {e}")

    return {
        "id": memory_id,
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "title": title.strip(),
        "content": content.strip(),
        "media_path": media_path,
        "memory_date": memory_date,
        "created_at": now,
    }


@router.get("/{memory_id}")
async def get_memory(
    memory_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single memory by ID."""
    result = await db.execute(
        text("""
            SELECT m.id, m.created_by, u.name as created_by_name,
                   m.title, m.content, m.media_path, m.memory_date, m.created_at
            FROM memories m
            JOIN users u ON u.id = m.created_by
            WHERE m.id = :id
        """),
        {"id": memory_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return _row_to_dict(row)


@router.delete("/{memory_id}", status_code=204)
async def delete_memory(
    memory_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a memory. Either partner can delete any memory —
    shared memories are equally owned.
    """
    result = await db.execute(
        text("SELECT id FROM memories WHERE id = :id"),
        {"id": memory_id},
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Memory not found.")

    # Remove from FTS index
    await db.execute(
        text("DELETE FROM memories_fts WHERE rowid = (SELECT rowid FROM memories WHERE id = :id)"),
        {"id": memory_id},
    )

    await db.execute(
        text("DELETE FROM memories WHERE id = :id"),
        {"id": memory_id},
    )
    await db.commit()
