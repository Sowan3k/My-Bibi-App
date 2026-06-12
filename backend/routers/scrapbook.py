"""
My Bibi — Monthly Scrapbook router (Phase 4)

Auto-generated from the vault: that month's memories, photos, completed
blooms, achieved dreams, opened capsules, and a few counts. Generated
locally, rendered by the frontend as a printable page (browser print →
PDF export, no external service).

Endpoints:
  GET /api/scrapbook/months        — Months that have content
  GET /api/scrapbook/{year_month}  — Scrapbook data for YYYY-MM
"""

import logging
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from middleware.auth_middleware import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

_YM_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


@router.get("/months")
async def list_months(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Months (YYYY-MM) that have at least one memory, photo, or bloom."""
    result = await db.execute(
        text("""
            SELECT DISTINCT substr(memory_date, 1, 7) as ym FROM memories
            UNION
            SELECT DISTINCT substr(created_at, 1, 7) FROM messages WHERE media_type = 'photo'
            UNION
            SELECT DISTINCT substr(prompt_date, 1, 7) FROM bloom_prompts
                WHERE id IN (SELECT prompt_id FROM bloom_answers)
            ORDER BY ym DESC
        """)
    )
    return [row.ym for row in result.fetchall() if row.ym]


@router.get("/{year_month}")
async def get_scrapbook(
    year_month: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _YM_RE.match(year_month):
        raise HTTPException(status_code=422, detail="Use YYYY-MM format.")

    like = f"{year_month}-%"

    memories = await db.execute(
        text("""
            SELECT m.id, m.title, m.content, m.media_path, m.memory_date,
                   u.name as by_name
            FROM memories m JOIN users u ON u.id = m.created_by
            WHERE m.memory_date LIKE :like
            ORDER BY m.memory_date ASC
        """),
        {"like": like},
    )
    memory_list = [
        {
            "id": r.id,
            "title": r.title,
            "content": r.content,
            "media_path": r.media_path,
            "memory_date": r.memory_date,
            "by_name": r.by_name,
        }
        for r in memories.fetchall()
    ]

    photos = await db.execute(
        text("""
            SELECT m.media_path, m.created_at, u.name as by_name
            FROM messages m JOIN users u ON u.id = m.sender_id
            WHERE m.media_type = 'photo' AND m.created_at LIKE :like
            ORDER BY m.created_at ASC LIMIT 12
        """),
        {"like": like},
    )
    photo_list = [
        {"media_path": r.media_path, "created_at": r.created_at, "by_name": r.by_name}
        for r in photos.fetchall()
    ]

    # Completed blooms (both answered) — a shared record, shown to both
    blooms = await db.execute(
        text("""
            SELECT p.prompt_date, p.prompt_text,
                   a.answer, u.name as answered_by
            FROM bloom_prompts p
            JOIN bloom_answers a ON a.prompt_id = p.id
            JOIN users u ON u.id = a.user_id
            WHERE p.prompt_date LIKE :like
              AND (SELECT COUNT(*) FROM bloom_answers WHERE prompt_id = p.id) = 2
            ORDER BY p.prompt_date ASC
        """),
        {"like": like},
    )
    bloom_map: dict[str, dict] = {}
    for r in blooms.fetchall():
        entry = bloom_map.setdefault(
            r.prompt_date, {"date": r.prompt_date, "prompt": r.prompt_text, "answers": []}
        )
        entry["answers"].append({"name": r.answered_by, "answer": r.answer})

    dreams = await db.execute(
        text("""
            SELECT id, title, emoji, achieved_at FROM dreams
            WHERE status = 'achieved' AND achieved_at LIKE :like
        """),
        {"like": like},
    )
    dream_list = [
        {"id": r.id, "title": r.title, "emoji": r.emoji or "⭐", "achieved_at": r.achieved_at}
        for r in dreams.fetchall()
    ]

    capsules = await db.execute(
        text("""
            SELECT c.id, c.title, c.opened_at, u.name as by_name
            FROM time_capsules c JOIN users u ON u.id = c.created_by
            WHERE c.opened_at IS NOT NULL AND c.opened_at LIKE :like
        """),
        {"like": like},
    )
    capsule_list = [
        {"id": r.id, "title": r.title, "opened_at": r.opened_at, "by_name": r.by_name}
        for r in capsules.fetchall()
    ]

    counts = await db.execute(
        text("""
            SELECT
                (SELECT COUNT(*) FROM messages WHERE created_at LIKE :like) as messages,
                (SELECT COUNT(*) FROM pings WHERE created_at LIKE :like) as pings,
                (SELECT COUNT(*) FROM playlist_memories WHERE created_at LIKE :like) as songs
        """),
        {"like": like},
    )
    stats = counts.fetchone()

    return {
        "month": year_month,
        "memories": memory_list,
        "photos": photo_list,
        "blooms": list(bloom_map.values()),
        "dreams_achieved": dream_list,
        "capsules_opened": capsule_list,
        "stats": {
            "messages": stats.messages,
            "pings": stats.pings,
            "songs": stats.songs,
            "memories": len(memory_list),
            "blooms": len(bloom_map),
        },
    }
