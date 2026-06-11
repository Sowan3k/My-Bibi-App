"""
My Bibi — Little Things router

Endpoints:
  GET  /api/little-things/status — Streak, days together, partner mood, online status
  POST /api/little-things/ping   — Send thinking-of-you ping to partner
  POST /api/little-things/mood   — Set own mood weather

MIRROR PRINCIPLE: partner_mood is shown only because the partner chose to
share it. Mood weather is self-disclosure, not surveillance. The app never
infers or analyses emotional state.
"""

import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from middleware.auth_middleware import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

PING_COOLDOWN_SECONDS = 300  # 5 minutes between pings
ONLINE_THRESHOLD_SECONDS = 300  # Active within last 5 minutes = "online"
RELATIONSHIP_START_DATE: Optional[str] = None  # Can be set via config in future


async def _get_partner(db: AsyncSession, user_id: str) -> Optional[dict]:
    result = await db.execute(
        text("""
            SELECT id, name, last_active_at FROM users
            WHERE id != :uid LIMIT 1
        """),
        {"uid": user_id},
    )
    row = result.fetchone()
    if not row:
        return None
    return {"id": row.id, "name": row.name, "last_active_at": row.last_active_at}


async def _get_streak(db: AsyncSession) -> int:
    """
    Calculate the combined streak — consecutive days where BOTH users were active.
    If only one user is registered, count that user's streak.
    """
    result = await db.execute(
        text("""
            SELECT COUNT(DISTINCT user_id) as user_count FROM users
        """)
    )
    user_count = result.fetchone().user_count

    if user_count == 2:
        # Both users must have been active on the same day
        # Find consecutive days (from today backwards) where both were active
        result = await db.execute(
            text("""
                SELECT activity_date
                FROM streak_log
                GROUP BY activity_date
                HAVING COUNT(DISTINCT user_id) = 2
                ORDER BY activity_date DESC
                LIMIT 365
            """)
        )
    else:
        result = await db.execute(
            text("""
                SELECT DISTINCT activity_date
                FROM streak_log
                ORDER BY activity_date DESC
                LIMIT 365
            """)
        )

    dates = [row.activity_date for row in result.fetchall()]
    if not dates:
        return 0

    streak = 0
    today = date.today()
    expected_date = today

    for d_str in dates:
        d = date.fromisoformat(d_str)
        if d == expected_date or d == expected_date - timedelta(days=1):
            # Allow one day gap (grace period)
            if d == expected_date - timedelta(days=1):
                expected_date = d
            streak += 1
            expected_date = d - timedelta(days=1)
        else:
            break

    return streak


async def _get_days_together(db: AsyncSession) -> int:
    """
    Days since the first user registered (a proxy for 'days together' if
    relationship_start_date is not configured).
    """
    result = await db.execute(
        text("SELECT MIN(created_at) as first_date FROM users")
    )
    row = result.fetchone()
    if not row or not row.first_date:
        return 0

    first_date = datetime.fromisoformat(row.first_date.replace("Z", "+00:00"))
    delta = datetime.now(timezone.utc) - first_date
    return max(0, delta.days)


async def _get_my_mood(db: AsyncSession, user_id: str) -> Optional[str]:
    """Get the user's most recently set mood."""
    result = await db.execute(
        text("""
            SELECT mood FROM mood_weather
            WHERE user_id = :uid
            ORDER BY set_at DESC LIMIT 1
        """),
        {"uid": user_id},
    )
    row = result.fetchone()
    return row.mood if row else None


async def _get_last_ping_seconds_ago(db: AsyncSession, from_user: str, to_user: str) -> int:
    """Get how many seconds ago the last ping was sent from from_user to to_user."""
    result = await db.execute(
        text("""
            SELECT created_at FROM pings
            WHERE from_user = :from_user AND to_user = :to_user
            ORDER BY created_at DESC LIMIT 1
        """),
        {"from_user": from_user, "to_user": to_user},
    )
    row = result.fetchone()
    if not row:
        return 999999  # No ping ever sent

    last_ping = datetime.fromisoformat(row.created_at.replace("Z", "+00:00"))
    elapsed = (datetime.now(timezone.utc) - last_ping).total_seconds()
    return int(elapsed)


class MoodRequest(BaseModel):
    mood: str


@router.get("/status")
async def get_status(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the little-things dashboard:
    - streak (consecutive active days)
    - days_together (since first user registered)
    - partner_name and online status
    - partner_mood (what they chose to share)
    - my_mood
    - ping_cooldown_seconds (0 = can ping)
    """
    partner = await _get_partner(db, current_user["id"])
    streak = await _get_streak(db)
    days_together = await _get_days_together(db)
    my_mood = await _get_my_mood(db, current_user["id"])

    partner_online = False
    partner_mood = None
    ping_cooldown = 0

    if partner:
        # Check if partner was active recently
        if partner.get("last_active_at"):
            try:
                last_active = datetime.fromisoformat(
                    partner["last_active_at"].replace("Z", "+00:00")
                )
                seconds_ago = (datetime.now(timezone.utc) - last_active).total_seconds()
                partner_online = seconds_ago < ONLINE_THRESHOLD_SECONDS
            except Exception:
                pass

        # Partner's mood (they chose to share this)
        partner_mood = await _get_my_mood(db, partner["id"])

        # Ping cooldown
        seconds_since_ping = await _get_last_ping_seconds_ago(
            db, current_user["id"], partner["id"]
        )
        remaining = PING_COOLDOWN_SECONDS - seconds_since_ping
        ping_cooldown = max(0, int(remaining))

    return {
        "streak": streak,
        "days_together": days_together,
        "relationship_started": None,  # Phase 2: make this configurable
        "partner_name": partner["name"] if partner else "your partner",
        "partner_online": partner_online,
        "partner_mood": partner_mood,  # self-disclosure, never inferred
        "my_mood": my_mood,
        "ping_cooldown_seconds": ping_cooldown,
    }


@router.post("/ping", status_code=201)
async def send_ping(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a 'thinking of you' ping to the partner.
    Enforces a 5-minute cooldown.
    """
    partner = await _get_partner(db, current_user["id"])
    if not partner:
        raise HTTPException(
            status_code=404,
            detail="No partner found. Share your invite link first.",
        )

    # Check cooldown
    seconds_since_ping = await _get_last_ping_seconds_ago(
        db, current_user["id"], partner["id"]
    )
    remaining = PING_COOLDOWN_SECONDS - seconds_since_ping

    if remaining > 0:
        raise HTTPException(
            status_code=429,
            detail=f"Wait {int(remaining)} more seconds before pinging again.",
        )

    ping_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        text("""
            INSERT INTO pings (id, from_user, to_user, seen, created_at)
            VALUES (:id, :from_user, :to_user, 0, :now)
        """),
        {
            "id": ping_id,
            "from_user": current_user["id"],
            "to_user": partner["id"],
            "now": now,
        },
    )
    await db.commit()

    return {
        "sent": True,
        "to": partner["name"],
        "sent_at": now,
    }


@router.post("/mood", status_code=200)
async def set_mood(
    request: MoodRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Set own mood weather. This is self-disclosure — the user is choosing
    to share their current mood.

    MIRROR PRINCIPLE: This records the USER's OWN mood choice only.
    The app never infers, analyses, or tracks emotional state without consent.
    """
    if request.mood not in ("sunny", "cloudy", "stormy"):
        raise HTTPException(
            status_code=422,
            detail="mood must be 'sunny', 'cloudy', or 'stormy'.",
        )

    mood_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        text("""
            INSERT INTO mood_weather (id, user_id, mood, set_at)
            VALUES (:id, :uid, :mood, :now)
        """),
        {"id": mood_id, "uid": current_user["id"], "mood": request.mood, "now": now},
    )
    await db.commit()

    return {"mood": request.mood, "set_at": now}
