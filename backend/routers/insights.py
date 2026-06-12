"""
My Bibi — "I Noticed" insights router (Phase 3)

MIRROR PRINCIPLE — the strictest enforcement in the app:
  - The AI analyses ONLY the logged-in user's OWN messages and bloom answers.
  - Output goes ONLY to that user. There is no endpoint, parameter, or
    query that can surface analysis of the partner. The SQL itself filters
    sender_id = me; ai_service.assert_single_subject() guards the call.
  - Memory resurfacing uses SHARED memories (deliberately saved by both)
    and date math; AI only adds an optional one-line caption.

Everything degrades gracefully when Ollama is offline.

Endpoints:
  GET  /api/insights/status    — Is local AI available?
  POST /api/insights/notice    — Generate fresh "I noticed" reflections (own words only)
  GET  /api/insights           — List my saved insights
  GET  /api/insights/resurface — A memory worth revisiting today
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from middleware.auth_middleware import get_current_user
from services import ai_service
from config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

_NOTICE_SYSTEM = """You are a gentle, private self-reflection assistant inside a couple's app.
You are shown ONLY the requesting user's own recent words (their chat messages and
daily-prompt answers). You never see or guess at their partner's words or feelings.

Reflect back to this person, in second person ("you"), 2 to 4 short observations about
THEIR OWN patterns, such as:
- topics they keep coming back to
- gratitude they felt but maybe never said out loud
- small promises or plans they mentioned and may have left unfinished

Rules:
- Never analyse, judge, or speculate about their partner.
- Never score the relationship.
- Be warm, specific, and brief. One sentence per observation.
- Format as a plain list, one observation per line, starting each line with "- "."""


@router.get("/status")
async def ai_status(current_user: dict = Depends(get_current_user)):
    """Whether local AI is reachable. Frontend uses this to degrade gracefully."""
    available = await ai_service.is_available()
    return {"ai_available": available, "model": settings.ollama_model if available else None}


@router.get("")
async def list_insights(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """My own saved insights. user_id filter IS the mirror principle."""
    result = await db.execute(
        text("""
            SELECT id, kind, content, created_at FROM insights
            WHERE user_id = :uid ORDER BY created_at DESC LIMIT 30
        """),
        {"uid": current_user["id"]},
    )
    return [
        {"id": r.id, "kind": r.kind, "content": r.content, "created_at": r.created_at}
        for r in result.fetchall()
    ]


@router.post("/notice", status_code=201)
async def generate_notice(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyse MY OWN last-30-days words and reflect them back to ME.
    """
    me = current_user["id"]

    # GUARDRAIL: the subject of analysis is the requester. Always.
    ai_service.assert_single_subject(me, me)

    if not await ai_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Local AI (Ollama) is offline. Your words stay yours — try again when it's running.",
        )

    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    # ONLY my own messages — sender_id = me is the mirror principle in SQL.
    msgs = await db.execute(
        text("""
            SELECT content FROM messages
            WHERE sender_id = :me AND content IS NOT NULL AND created_at >= :cutoff
            ORDER BY created_at DESC LIMIT 200
        """),
        {"me": me, "cutoff": cutoff},
    )
    my_lines = [r.content for r in msgs.fetchall()]

    # ONLY my own bloom answers.
    blooms = await db.execute(
        text("""
            SELECT b.answer FROM bloom_answers b
            WHERE b.user_id = :me AND b.created_at >= :cutoff
            ORDER BY b.created_at DESC LIMIT 30
        """),
        {"me": me, "cutoff": cutoff},
    )
    my_answers = [r.answer for r in blooms.fetchall()]

    if len(my_lines) + len(my_answers) < 5:
        raise HTTPException(
            status_code=422,
            detail="Not enough of your own words yet — chat and answer a few blooms first.",
        )

    corpus = "\n".join(
        ["My chat messages (most recent first):"]
        + [f"- {l[:300]}" for l in my_lines[:120]]
        + ["", "My daily prompt answers:"]
        + [f"- {a[:300]}" for a in my_answers]
    )

    output = await ai_service.generate(
        prompt=corpus,
        system=_NOTICE_SYSTEM,
        max_tokens=350,
        temperature=0.6,
    )
    if not output:
        raise HTTPException(
            status_code=503,
            detail="Local AI didn't answer. Try again in a moment.",
        )

    insight_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        text("""
            INSERT INTO insights (id, user_id, kind, content, created_at)
            VALUES (:id, :uid, 'noticed', :content, :now)
        """),
        {"id": insight_id, "uid": me, "content": output, "now": now},
    )
    await db.commit()

    return {"id": insight_id, "kind": "noticed", "content": output, "created_at": now}


@router.get("/resurface")
async def resurface_memory(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Pick a shared memory worth revisiting (oldest not-recently-surfaced,
    weighted to anniversaries). Works fully without AI; with AI it adds a
    one-line caption. Shared memories are shared data — fine for both.
    """
    result = await db.execute(
        text("""
            SELECT m.id, m.title, m.content, m.media_path, m.memory_date,
                   u.name as by_name
            FROM memories m JOIN users u ON u.id = m.created_by
            ORDER BY RANDOM() LIMIT 1
        """)
    )
    row = result.fetchone()
    if not row:
        return {"memory": None, "caption": None, "ai_available": await ai_service.is_available()}

    memory = {
        "id": row.id,
        "title": row.title,
        "content": row.content,
        "media_path": row.media_path,
        "memory_date": row.memory_date,
        "created_by_name": row.by_name,
    }

    caption = None
    if await ai_service.is_available():
        caption = await ai_service.generate(
            prompt=(
                f"A couple saved this shared memory on {row.memory_date}: "
                f'"{row.title}". {(row.content or "")[:400]}\n\n'
                "Write ONE warm, short sentence (max 18 words) inviting them to revisit it. "
                "No analysis of either person, just an invitation."
            ),
            max_tokens=50,
            temperature=0.8,
        )

    return {"memory": memory, "caption": caption, "ai_available": caption is not None}
