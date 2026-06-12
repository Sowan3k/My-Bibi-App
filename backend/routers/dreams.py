"""
My Bibi — Future Dreams router (Phase 2)

A shared board of goals with step milestones. When a dream is achieved it
is archived into the relationship timeline (status='achieved').

Endpoints:
  GET    /api/dreams                 — List dreams with steps + progress
  POST   /api/dreams                 — Add a dream
  PATCH  /api/dreams/{id}            — Edit title/description/emoji/target_date
  POST   /api/dreams/{id}/achieve    — Mark achieved (archives into timeline)
  DELETE /api/dreams/{id}            — Delete a dream (either partner)
  POST   /api/dreams/{id}/steps      — Add a step
  PATCH  /api/dreams/steps/{step_id} — Toggle a step done/undone
  DELETE /api/dreams/steps/{step_id} — Remove a step
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from middleware.auth_middleware import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


class DreamRequest(BaseModel):
    title: str
    description: Optional[str] = None
    emoji: Optional[str] = None
    target_date: Optional[str] = None


class UpdateDreamRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    emoji: Optional[str] = None
    target_date: Optional[str] = None


class StepRequest(BaseModel):
    title: str


class ToggleStepRequest(BaseModel):
    done: bool


async def _dream_with_steps(db: AsyncSession, dream_id: str) -> dict:
    result = await db.execute(
        text("""
            SELECT d.id, d.created_by, u.name as created_by_name, d.title,
                   d.description, d.emoji, d.target_date, d.status,
                   d.achieved_at, d.created_at
            FROM dreams d JOIN users u ON u.id = d.created_by
            WHERE d.id = :id
        """),
        {"id": dream_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Dream not found.")

    steps_result = await db.execute(
        text("""
            SELECT id, title, done, created_at FROM dream_steps
            WHERE dream_id = :id ORDER BY created_at ASC
        """),
        {"id": dream_id},
    )
    steps = [
        {"id": s.id, "title": s.title, "done": bool(s.done), "created_at": s.created_at}
        for s in steps_result.fetchall()
    ]
    done_count = sum(1 for s in steps if s["done"])

    return {
        "id": row.id,
        "created_by": row.created_by,
        "created_by_name": row.created_by_name,
        "title": row.title,
        "description": row.description,
        "emoji": row.emoji,
        "target_date": row.target_date,
        "status": row.status,
        "achieved_at": row.achieved_at,
        "created_at": row.created_at,
        "steps": steps,
        "progress": round(done_count / len(steps) * 100) if steps else 0,
    }


@router.get("")
async def list_dreams(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """All dreams, dreaming first, then achieved (newest achievement first)."""
    result = await db.execute(
        text("""
            SELECT id FROM dreams
            ORDER BY CASE status WHEN 'dreaming' THEN 0 ELSE 1 END,
                     COALESCE(achieved_at, created_at) DESC
        """)
    )
    return [await _dream_with_steps(db, row.id) for row in result.fetchall()]


@router.post("", status_code=201)
async def create_dream(
    request: DreamRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not request.title.strip():
        raise HTTPException(status_code=422, detail="A dream needs a name.")

    dream_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        text("""
            INSERT INTO dreams (id, created_by, title, description, emoji,
                                target_date, status, achieved_at, created_at)
            VALUES (:id, :by, :title, :desc, :emoji, :target, 'dreaming', NULL, :now)
        """),
        {
            "id": dream_id,
            "by": current_user["id"],
            "title": request.title.strip(),
            "desc": (request.description or "").strip() or None,
            "emoji": (request.emoji or "").strip() or None,
            "target": request.target_date,
            "now": now,
        },
    )
    await db.commit()
    return await _dream_with_steps(db, dream_id)


@router.patch("/{dream_id}")
async def update_dream(
    dream_id: str,
    request: UpdateDreamRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Either partner can edit — dreams are equally owned."""
    existing = await _dream_with_steps(db, dream_id)
    await db.execute(
        text("""
            UPDATE dreams SET title = :title, description = :desc,
                              emoji = :emoji, target_date = :target
            WHERE id = :id
        """),
        {
            "title": (request.title or existing["title"]).strip(),
            "desc": request.description if request.description is not None else existing["description"],
            "emoji": request.emoji if request.emoji is not None else existing["emoji"],
            "target": request.target_date if request.target_date is not None else existing["target_date"],
            "id": dream_id,
        },
    )
    await db.commit()
    return await _dream_with_steps(db, dream_id)


@router.post("/{dream_id}/achieve")
async def achieve_dream(
    dream_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a dream achieved — it becomes a milestone on the timeline."""
    await _dream_with_steps(db, dream_id)  # 404 check
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        text("""
            UPDATE dreams SET status = 'achieved', achieved_at = :now
            WHERE id = :id AND status != 'achieved'
        """),
        {"now": now, "id": dream_id},
    )
    await db.commit()
    return await _dream_with_steps(db, dream_id)


@router.delete("/{dream_id}", status_code=204)
async def delete_dream(
    dream_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _dream_with_steps(db, dream_id)  # 404 check
    await db.execute(text("DELETE FROM dream_steps WHERE dream_id = :id"), {"id": dream_id})
    await db.execute(text("DELETE FROM dreams WHERE id = :id"), {"id": dream_id})
    await db.commit()


@router.post("/{dream_id}/steps", status_code=201)
async def add_step(
    dream_id: str,
    request: StepRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _dream_with_steps(db, dream_id)  # 404 check
    if not request.title.strip():
        raise HTTPException(status_code=422, detail="Step needs a title.")

    step_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        text("""
            INSERT INTO dream_steps (id, dream_id, title, done, created_at)
            VALUES (:id, :dream, :title, 0, :now)
        """),
        {"id": step_id, "dream": dream_id, "title": request.title.strip(), "now": now},
    )
    await db.commit()
    return await _dream_with_steps(db, dream_id)


@router.patch("/steps/{step_id}")
async def toggle_step(
    step_id: str,
    request: ToggleStepRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("SELECT dream_id FROM dream_steps WHERE id = :id"), {"id": step_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Step not found.")

    await db.execute(
        text("UPDATE dream_steps SET done = :done WHERE id = :id"),
        {"done": 1 if request.done else 0, "id": step_id},
    )
    await db.commit()
    return await _dream_with_steps(db, row.dream_id)


@router.delete("/steps/{step_id}", status_code=204)
async def delete_step(
    step_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(text("DELETE FROM dream_steps WHERE id = :id"), {"id": step_id})
    await db.commit()
