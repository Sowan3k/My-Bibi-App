"""
My Bibi — Daily Bloom router

Endpoints:
  GET  /api/bloom/today   — Today's prompt + both answer status
  POST /api/bloom/answer  — Submit answer
  GET  /api/bloom/history — Past bloom entries where both answered
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from middleware.auth_middleware import get_current_user
from services.bloom_service import (
    get_today_status,
    submit_answer,
    get_history,
)

router = APIRouter()
logger = logging.getLogger(__name__)


async def _get_partner_id(db: AsyncSession, user_id: str) -> Optional[str]:
    """Get the partner's user ID."""
    result = await db.execute(
        text("SELECT id FROM users WHERE id != :uid LIMIT 1"),
        {"uid": user_id},
    )
    row = result.fetchone()
    return row.id if row else None


async def _get_partner_name(db: AsyncSession, user_id: str) -> str:
    """Get the partner's display name."""
    result = await db.execute(
        text("SELECT name FROM users WHERE id != :uid LIMIT 1"),
        {"uid": user_id},
    )
    row = result.fetchone()
    return row.name if row else "your partner"


class AnswerRequest(BaseModel):
    prompt_id: str
    answer: str


@router.get("/today")
async def today(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get today's bloom prompt and answer status.

    Returns:
      - prompt_id, prompt_text
      - my_answer (null if not answered yet)
      - partner_name
      - partner_answered (bool)
      - both_answered (bool)
      - partner_answer (only if both_answered=True)
    """
    partner_id = await _get_partner_id(db, current_user["id"])
    partner_name = await _get_partner_name(db, current_user["id"])

    status_data = await get_today_status(db, current_user["id"], partner_id)
    status_data["partner_name"] = partner_name
    return status_data


@router.post("/answer")
async def answer(
    request: AnswerRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit an answer for today's bloom prompt.
    Returns updated status (may now include partner's answer if they also answered).
    """
    if not request.answer.strip():
        raise HTTPException(status_code=422, detail="Answer cannot be empty.")
    if len(request.answer) > 2000:
        raise HTTPException(status_code=422, detail="Answer too long. Max 2000 characters.")

    partner_id = await _get_partner_id(db, current_user["id"])
    partner_name = await _get_partner_name(db, current_user["id"])

    result = await submit_answer(
        db=db,
        user_id=current_user["id"],
        prompt_id=request.prompt_id,
        answer=request.answer.strip(),
        partner_id=partner_id,
        partner_name=partner_name,
    )
    result["partner_name"] = partner_name
    return result


@router.get("/history")
async def history(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get past bloom entries where both partners answered.
    Each entry contains both answers — this is shared data both chose to contribute.
    """
    partner_id = await _get_partner_id(db, current_user["id"])
    partner_name = await _get_partner_name(db, current_user["id"])

    entries = await get_history(db, current_user["id"], partner_id)
    for entry in entries:
        entry["partner_name"] = partner_name
    return entries
