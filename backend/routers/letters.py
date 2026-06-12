"""
My Bibi — Letters router (Phase 2)

Deliberate delayed messages with scheduled delivery — a slower inbox
alongside chat. The recipient cannot read a letter before deliver_at
(server-enforced). The author can see their sent letters listed but the
words stay sealed until delivery, keeping the ritual honest.

Endpoints:
  GET    /api/letters/inbox  — Letters delivered to me (partner-authored)
  GET    /api/letters/sent   — My letters (sealed ones show status only)
  POST   /api/letters        — Write a letter with a delivery date
  POST   /api/letters/{id}/read — Mark a delivered letter as read
  DELETE /api/letters/{id}   — Author may delete an UNDELIVERED letter
"""

import logging
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from middleware.auth_middleware import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


class WriteLetterRequest(BaseModel):
    title: Optional[str] = None
    body: str
    deliver_at: str  # YYYY-MM-DD


def _today() -> str:
    return date.today().isoformat()


@router.get("/inbox")
async def inbox(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Letters written by my partner that have reached their delivery date.
    Undelivered letters are invisible here — not teased, not counted.
    """
    result = await db.execute(
        text("""
            SELECT l.id, l.author_id, u.name as author_name, l.title, l.body,
                   l.deliver_at, l.read_at, l.created_at
            FROM letters l
            JOIN users u ON u.id = l.author_id
            WHERE l.author_id != :uid AND l.deliver_at <= :today
            ORDER BY l.deliver_at DESC
        """),
        {"uid": current_user["id"], "today": _today()},
    )
    return [
        {
            "id": row.id,
            "author_id": row.author_id,
            "author_name": row.author_name,
            "title": row.title,
            "body": row.body,
            "deliver_at": row.deliver_at,
            "read_at": row.read_at,
            "created_at": row.created_at,
        }
        for row in result.fetchall()
    ]


@router.get("/sent")
async def sent(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """My own letters. Sealed (undelivered) ones show metadata only."""
    result = await db.execute(
        text("""
            SELECT id, title, body, deliver_at, read_at, created_at
            FROM letters
            WHERE author_id = :uid
            ORDER BY deliver_at DESC
        """),
        {"uid": current_user["id"]},
    )
    today = _today()
    out = []
    for row in result.fetchall():
        delivered = row.deliver_at <= today
        out.append(
            {
                "id": row.id,
                "title": row.title,
                "body": row.body if delivered else None,  # sealed until delivery
                "deliver_at": row.deliver_at,
                "delivered": delivered,
                "read_at": row.read_at,
                "created_at": row.created_at,
            }
        )
    return out


@router.post("", status_code=201)
async def write_letter(
    request: WriteLetterRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Write a letter to your partner, delivered on a chosen future date."""
    try:
        deliver_date = date.fromisoformat(request.deliver_at)
    except ValueError:
        raise HTTPException(status_code=422, detail="deliver_at must be YYYY-MM-DD.")

    if deliver_date <= date.today():
        raise HTTPException(
            status_code=422,
            detail="Pick a future date — that's what makes it a letter, not a text.",
        )
    if not request.body.strip():
        raise HTTPException(status_code=422, detail="A letter needs words.")
    if len(request.body) > 20000:
        raise HTTPException(status_code=422, detail="Letter too long (max 20,000 chars).")

    letter_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        text("""
            INSERT INTO letters (id, author_id, title, body, deliver_at, read_at, created_at)
            VALUES (:id, :author, :title, :body, :deliver, NULL, :now)
        """),
        {
            "id": letter_id,
            "author": current_user["id"],
            "title": (request.title or "").strip() or None,
            "body": request.body.strip(),
            "deliver": request.deliver_at,
            "now": now,
        },
    )
    await db.commit()

    return {
        "id": letter_id,
        "title": request.title,
        "body": None,
        "deliver_at": request.deliver_at,
        "delivered": False,
        "read_at": None,
        "created_at": now,
    }


@router.post("/{letter_id}/read")
async def mark_read(
    letter_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Recipient marks a delivered letter as read."""
    result = await db.execute(
        text("SELECT author_id, deliver_at, read_at FROM letters WHERE id = :id"),
        {"id": letter_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Letter not found.")
    if row.author_id == current_user["id"]:
        raise HTTPException(status_code=403, detail="You can't mark your own letter as read.")
    if row.deliver_at > _today():
        raise HTTPException(status_code=423, detail="This letter hasn't been delivered yet.")

    if not row.read_at:
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            text("UPDATE letters SET read_at = :now WHERE id = :id"),
            {"now": now, "id": letter_id},
        )
        await db.commit()
    return {"read": True}


@router.delete("/{letter_id}", status_code=204)
async def delete_letter(
    letter_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Author may take back a letter only while it is still undelivered."""
    result = await db.execute(
        text("SELECT author_id, deliver_at FROM letters WHERE id = :id"),
        {"id": letter_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Letter not found.")
    if row.author_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the author can take back a letter.")
    if row.deliver_at <= _today():
        raise HTTPException(status_code=409, detail="Delivered letters belong to their reader now.")

    await db.execute(text("DELETE FROM letters WHERE id = :id"), {"id": letter_id})
    await db.commit()
