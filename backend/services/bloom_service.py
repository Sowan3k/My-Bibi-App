"""
My Bibi — Daily Bloom service
One shared prompt per day. Answers revealed only after both partners reply.

MIRROR PRINCIPLE: partner_answer is ONLY included in the response when
both_answered=True. The service never reveals one partner's answer to the
other before they've answered themselves.
"""

import logging
import random
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

# Prompt pool — one is selected each day based on a deterministic hash of the date.
# Add more prompts to increase variety.
PROMPT_POOL = [
    "What's something you've been meaning to tell me?",
    "What's your happiest memory from this week?",
    "If you could relive one moment from our relationship, which would it be?",
    "What's something small I do that you really appreciate?",
    "What are you most looking forward to in the next month?",
    "What's a dream you haven't told me about?",
    "What's something new you want us to try together?",
    "What does a perfect day look like to you right now?",
    "What's something you learned about yourself recently?",
    "What's a song that makes you think of me?",
    "What's something you've been grateful for this week?",
    "What do you wish more people knew about you?",
    "What's something you want to get better at?",
    "If we could go anywhere tomorrow, where would you choose?",
    "What's the kindest thing someone has done for you lately?",
    "What's one thing you're proud of from this week?",
    "What's a little thing that made you smile today?",
    "What's something you've been curious about lately?",
    "What's a value that feels really important to you right now?",
    "What would your ideal weekend look like?",
    "What's something you find beautiful that most people overlook?",
    "What's a skill you've always wanted to learn?",
    "What's something you're looking forward to about getting older?",
    "What's a book, show, or song you want to share with me?",
    "What's something that scared you that you're glad you did anyway?",
    "What's a tradition you'd want to start or keep with me?",
    "What made you laugh recently?",
    "What's one thing you'd tell your younger self?",
    "What does home mean to you right now?",
    "What's something you hope never changes between us?",
]


def _pick_prompt_for_date(d: date) -> str:
    """
    Deterministically pick a prompt for a given date.
    The same date always returns the same prompt — no DB needed for selection.
    """
    # Simple hash: ordinal of date mod pool size
    idx = d.toordinal() % len(PROMPT_POOL)
    return PROMPT_POOL[idx]


async def get_or_create_today_prompt(db: AsyncSession) -> dict:
    """
    Get today's bloom prompt row, creating it if it doesn't exist yet.
    Returns {"id": ..., "prompt_text": ..., "prompt_date": ...}
    """
    today = date.today().isoformat()

    result = await db.execute(
        text("SELECT id, prompt_text, prompt_date FROM bloom_prompts WHERE prompt_date = :d"),
        {"d": today},
    )
    row = result.fetchone()

    if row:
        return {"id": row.id, "prompt_text": row.prompt_text, "prompt_date": row.prompt_date}

    # Create today's prompt
    prompt_text = _pick_prompt_for_date(date.today())
    prompt_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        text("""
            INSERT OR IGNORE INTO bloom_prompts (id, prompt_text, prompt_date, created_at)
            VALUES (:id, :text, :date, :now)
        """),
        {"id": prompt_id, "text": prompt_text, "date": today, "now": now},
    )
    await db.commit()

    # Re-fetch (handles race condition with INSERT OR IGNORE)
    result = await db.execute(
        text("SELECT id, prompt_text, prompt_date FROM bloom_prompts WHERE prompt_date = :d"),
        {"d": today},
    )
    row = result.fetchone()
    return {"id": row.id, "prompt_text": row.prompt_text, "prompt_date": row.prompt_date}


async def get_today_status(db: AsyncSession, user_id: str, partner_id: Optional[str]) -> dict:
    """
    Get today's bloom status for the requesting user.

    MIRROR PRINCIPLE: partner_answer is only included if both users have answered.
    """
    prompt = await get_or_create_today_prompt(db)

    # Get my answer
    result = await db.execute(
        text("""
            SELECT answer FROM bloom_answers
            WHERE prompt_id = :pid AND user_id = :uid
        """),
        {"pid": prompt["id"], "uid": user_id},
    )
    my_row = result.fetchone()
    my_answer = my_row.answer if my_row else None

    partner_answered = False
    partner_answer = None

    if partner_id:
        # Check if partner answered
        result = await db.execute(
            text("""
                SELECT answer FROM bloom_answers
                WHERE prompt_id = :pid AND user_id = :uid
            """),
            {"pid": prompt["id"], "uid": partner_id},
        )
        partner_row = result.fetchone()
        partner_answered = partner_row is not None

        # MIRROR PRINCIPLE: only reveal partner's answer if BOTH answered
        if partner_answered and my_answer is not None:
            partner_answer = partner_row.answer

    both_answered = my_answer is not None and partner_answered

    return {
        "prompt_id": prompt["id"],
        "prompt_text": prompt["prompt_text"],
        "my_answer": my_answer,
        "partner_answered": partner_answered,
        "both_answered": both_answered,
        "partner_answer": partner_answer,  # None unless both answered
    }


async def submit_answer(
    db: AsyncSession,
    user_id: str,
    prompt_id: str,
    answer: str,
    partner_id: Optional[str] = None,
    partner_name: str = "your partner",
) -> dict:
    """
    Submit a bloom answer for today's prompt.
    Returns the updated status (may now reveal partner's answer if both answered).
    """
    answer_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Check this is today's prompt
    result = await db.execute(
        text("SELECT prompt_date FROM bloom_prompts WHERE id = :id"),
        {"id": prompt_id},
    )
    prompt_row = result.fetchone()
    if not prompt_row:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=404, detail="Prompt not found.")

    today = date.today().isoformat()
    if prompt_row.prompt_date != today:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=400, detail="This prompt is not for today.")

    # Insert or update answer
    await db.execute(
        text("""
            INSERT INTO bloom_answers (id, prompt_id, user_id, answer, created_at)
            VALUES (:id, :pid, :uid, :answer, :now)
            ON CONFLICT(prompt_id, user_id) DO UPDATE SET answer = excluded.answer
        """),
        {"id": answer_id, "pid": prompt_id, "uid": user_id, "answer": answer, "now": now},
    )
    await db.commit()

    # Log activity for streak
    try:
        log_id = str(uuid.uuid4())
        await db.execute(
            text("""
                INSERT OR IGNORE INTO streak_log (id, user_id, activity_date)
                VALUES (:id, :user_id, :date)
            """),
            {"id": log_id, "user_id": user_id, "date": today},
        )
        await db.commit()
    except Exception:
        pass

    return await get_today_status(db, user_id, partner_id)


async def get_history(db: AsyncSession, user_id: str, partner_id: Optional[str]) -> list[dict]:
    """
    Get all past bloom entries where BOTH partners answered.
    Only returns entries where both_answered=True.

    MIRROR PRINCIPLE: Only reveals shared entries where both consented by answering.
    """
    if not partner_id:
        return []

    result = await db.execute(
        text("""
            SELECT p.id as prompt_id, p.prompt_text, p.prompt_date,
                   a1.answer as my_answer, a2.answer as partner_answer
            FROM bloom_prompts p
            JOIN bloom_answers a1 ON a1.prompt_id = p.id AND a1.user_id = :uid
            JOIN bloom_answers a2 ON a2.prompt_id = p.id AND a2.user_id = :pid
            WHERE p.prompt_date < :today
            ORDER BY p.prompt_date DESC
            LIMIT 30
        """),
        {"uid": user_id, "pid": partner_id, "today": date.today().isoformat()},
    )

    entries = []
    for row in result.fetchall():
        entries.append({
            "prompt_id": row.prompt_id,
            "prompt_text": row.prompt_text,
            "date": row.prompt_date,
            "my_answer": row.my_answer,
            "partner_answer": row.partner_answer,
        })
    return entries
