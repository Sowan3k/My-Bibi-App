"""
My Bibi — Relationship Timeline router (Phase 2)

A chronological story of the relationship, built from data the couple
already deliberately created: memories, achieved dreams, opened capsules,
shared songs, delivered letters, and the day it all started.

No AI, no inference — pure date math over the shared vault.

Endpoints:
  GET /api/timeline — Merged, sorted timeline events
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from middleware.auth_middleware import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("")
async def get_timeline(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    events: list[dict] = []

    # The beginning — first account created (or configured start date)
    start = await db.execute(
        text("SELECT value FROM couple_settings WHERE key = 'relationship_start_date'")
    )
    start_row = start.fetchone()
    if start_row:
        events.append(
            {
                "type": "beginning",
                "date": start_row.value,
                "title": "Where it all began",
                "subtitle": "The day you count from",
                "emoji": "💞",
                "ref_id": None,
            }
        )
    else:
        first_user = await db.execute(
            text("SELECT MIN(created_at) as d FROM users")
        )
        row = first_user.fetchone()
        if row and row.d:
            events.append(
                {
                    "type": "beginning",
                    "date": row.d[:10],
                    "title": "Your space was born",
                    "subtitle": "First account created",
                    "emoji": "🏡",
                    "ref_id": None,
                }
            )

    # Memories
    memories = await db.execute(
        text("""
            SELECT m.id, m.title, m.content, m.media_path, m.memory_date,
                   u.name as by_name
            FROM memories m JOIN users u ON u.id = m.created_by
        """)
    )
    for row in memories.fetchall():
        events.append(
            {
                "type": "memory",
                "date": row.memory_date,
                "title": row.title,
                "subtitle": f"Saved by {row.by_name}",
                "emoji": "🌸",
                "media_path": row.media_path,
                "ref_id": row.id,
            }
        )

    # Achieved dreams
    dreams = await db.execute(
        text("""
            SELECT id, title, emoji, achieved_at FROM dreams
            WHERE status = 'achieved' AND achieved_at IS NOT NULL
        """)
    )
    for row in dreams.fetchall():
        events.append(
            {
                "type": "dream",
                "date": row.achieved_at[:10],
                "title": row.title,
                "subtitle": "Dream achieved together",
                "emoji": row.emoji or "⭐",
                "ref_id": row.id,
            }
        )

    # Opened capsules
    capsules = await db.execute(
        text("""
            SELECT c.id, c.title, c.opened_at, u.name as by_name
            FROM time_capsules c JOIN users u ON u.id = c.created_by
            WHERE c.opened_at IS NOT NULL
        """)
    )
    for row in capsules.fetchall():
        events.append(
            {
                "type": "capsule",
                "date": row.opened_at[:10],
                "title": row.title,
                "subtitle": f"Time capsule from {row.by_name}, opened",
                "emoji": "⏳",
                "ref_id": row.id,
            }
        )

    # Shared songs
    songs = await db.execute(
        text("""
            SELECT p.id, p.title, p.note, p.created_at, u.name as by_name
            FROM playlist_memories p JOIN users u ON u.id = p.shared_by
        """)
    )
    for row in songs.fetchall():
        events.append(
            {
                "type": "song",
                "date": row.created_at[:10],
                "title": row.title or "A song",
                "subtitle": f"Shared by {row.by_name}",
                "emoji": "🎵",
                "ref_id": row.id,
            }
        )

    # Delivered letters (metadata only — the words live in the inbox)
    letters = await db.execute(
        text("""
            SELECT l.id, l.title, l.deliver_at, u.name as author_name
            FROM letters l JOIN users u ON u.id = l.author_id
            WHERE l.deliver_at <= date('now')
        """)
    )
    for row in letters.fetchall():
        events.append(
            {
                "type": "letter",
                "date": row.deliver_at,
                "title": row.title or "A letter",
                "subtitle": f"From {row.author_name}, delivered",
                "emoji": "💌",
                "ref_id": row.id,
            }
        )

    events.sort(key=lambda e: e["date"])
    return events
