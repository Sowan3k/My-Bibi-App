"""
My Bibi — Time Capsules router (Phase 2)

Either partner locks a message (+ optional media) until a future date.
NEITHER partner can open it early — enforced server-side, not just UI.

Endpoints:
  GET    /api/capsules           — List capsules (locked ones hide their content)
  POST   /api/capsules           — Create a capsule
  POST   /api/capsules/{id}/open — Open a capsule (only after unlock_at)
  DELETE /api/capsules/{id}      — Author may delete an UNOPENED capsule
"""

import logging
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from middleware.auth_middleware import get_current_user
from services.chat_service import save_media

router = APIRouter()
logger = logging.getLogger(__name__)


def _today() -> str:
    return date.today().isoformat()


def _row_to_dict(row, include_content: bool) -> dict:
    """Locked capsules never expose message or media — server-enforced."""
    base = {
        "id": row.id,
        "created_by": row.created_by,
        "created_by_name": row.created_by_name,
        "title": row.title,
        "unlock_at": row.unlock_at,
        "opened_at": row.opened_at,
        "created_at": row.created_at,
        "is_unlockable": row.unlock_at <= _today(),
    }
    if include_content:
        base["message"] = row.message
        base["media_path"] = row.media_path
    else:
        base["message"] = None
        base["media_path"] = None
    return base


@router.get("")
async def list_capsules(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all capsules. Content is included ONLY for opened capsules.
    Sealed capsules show title + unlock date only — even to their author.
    """
    result = await db.execute(
        text("""
            SELECT c.id, c.created_by, u.name as created_by_name, c.title,
                   c.message, c.media_path, c.unlock_at, c.opened_at, c.created_at
            FROM time_capsules c
            JOIN users u ON u.id = c.created_by
            ORDER BY c.unlock_at ASC
        """)
    )
    return [
        _row_to_dict(row, include_content=row.opened_at is not None)
        for row in result.fetchall()
    ]


@router.post("", status_code=201)
async def create_capsule(
    title: str = Form(...),
    message: str = Form(...),
    unlock_at: str = Form(...),
    media: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Seal a new time capsule. unlock_at must be a future date."""
    try:
        unlock_date = date.fromisoformat(unlock_at)
    except ValueError:
        raise HTTPException(status_code=422, detail="unlock_at must be YYYY-MM-DD.")

    if unlock_date <= date.today():
        raise HTTPException(
            status_code=422,
            detail="A capsule must be locked until a future date.",
        )
    if not title.strip() or not message.strip():
        raise HTTPException(status_code=422, detail="Title and message are required.")

    media_path = None
    if media and media.filename:
        try:
            media_path = await save_media(media, "photo", current_user["id"])
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

    capsule_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        text("""
            INSERT INTO time_capsules
                (id, created_by, title, message, media_path, unlock_at, opened_at, created_at)
            VALUES (:id, :by, :title, :message, :media, :unlock, NULL, :now)
        """),
        {
            "id": capsule_id,
            "by": current_user["id"],
            "title": title.strip(),
            "message": message.strip(),
            "media": media_path,
            "unlock": unlock_at,
            "now": now,
        },
    )
    await db.commit()

    return {
        "id": capsule_id,
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "title": title.strip(),
        "message": None,  # sealed immediately — author cannot re-read either
        "media_path": None,
        "unlock_at": unlock_at,
        "opened_at": None,
        "created_at": now,
        "is_unlockable": False,
    }


@router.post("/{capsule_id}/open")
async def open_capsule(
    capsule_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Open a capsule. Server-side enforcement: refuses before unlock_at,
    for BOTH partners. No early peeking, no exceptions.
    """
    result = await db.execute(
        text("""
            SELECT c.id, c.created_by, u.name as created_by_name, c.title,
                   c.message, c.media_path, c.unlock_at, c.opened_at, c.created_at
            FROM time_capsules c
            JOIN users u ON u.id = c.created_by
            WHERE c.id = :id
        """),
        {"id": capsule_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Capsule not found.")

    if row.unlock_at > _today():
        raise HTTPException(
            status_code=423,
            detail=f"This capsule is sealed until {row.unlock_at}. No early peeking — that's the point.",
        )

    if not row.opened_at:
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            text("UPDATE time_capsules SET opened_at = :now WHERE id = :id"),
            {"now": now, "id": capsule_id},
        )
        await db.commit()
        # Re-read for the response
        row = (await db.execute(
            text("""
                SELECT c.id, c.created_by, u.name as created_by_name, c.title,
                       c.message, c.media_path, c.unlock_at, c.opened_at, c.created_at
                FROM time_capsules c
                JOIN users u ON u.id = c.created_by
                WHERE c.id = :id
            """),
            {"id": capsule_id},
        )).fetchone()

    return _row_to_dict(row, include_content=True)


@router.delete("/{capsule_id}", status_code=204)
async def delete_capsule(
    capsule_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Only the author may delete, and only while still sealed & unopened."""
    result = await db.execute(
        text("SELECT created_by, opened_at FROM time_capsules WHERE id = :id"),
        {"id": capsule_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Capsule not found.")
    if row.created_by != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the author can delete a sealed capsule.")
    if row.opened_at:
        raise HTTPException(status_code=409, detail="Opened capsules are part of your shared history.")

    await db.execute(
        text("DELETE FROM time_capsules WHERE id = :id"), {"id": capsule_id}
    )
    await db.commit()
