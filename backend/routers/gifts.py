"""
My Bibi — Gift Vault router (Phase 4)

A private per-user wishlist: wishes, ring sizes, favourite things.
- Encrypted at rest with the author's key (utils/crypto.py).
- NEVER visible to the partner. There is no sharing endpoint on purpose:
  the partner is supposed to peek nowhere and still get it right. This
  vault is for YOUR OWN notes about what you'd love.

MIRROR PRINCIPLE: every query filters user_id = me. 423 = locked (re-login).

Endpoints:
  GET    /api/gifts      — My wishes (decrypted)
  POST   /api/gifts      — Add a wish
  PATCH  /api/gifts/{id} — Edit a wish
  DELETE /api/gifts/{id} — Remove a wish
"""

import json
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
from utils import crypto
from utils.mirror_guard import assert_own_data_only

router = APIRouter()
logger = logging.getLogger(__name__)


class WishRequest(BaseModel):
    title: str
    note: Optional[str] = None
    url: Optional[str] = None


def _require_unlocked(user_id: str) -> None:
    if not crypto.is_unlocked(user_id):
        raise HTTPException(
            status_code=423,
            detail="Your vault is locked. Log in again to unlock it.",
        )


def _decrypt_wish(user_id: str, row) -> dict:
    payload = json.loads(crypto.decrypt_for_user(user_id, row.content_encrypted))
    return {
        "id": row.id,
        "title": payload.get("title", ""),
        "note": payload.get("note"),
        "url": payload.get("url"),
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


@router.get("")
async def list_wishes(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    me = current_user["id"]
    _require_unlocked(me)

    result = await db.execute(
        text("""
            SELECT id, user_id, content_encrypted, created_at, updated_at
            FROM gift_wishes WHERE user_id = :uid ORDER BY created_at DESC
        """),
        {"uid": me},
    )
    wishes = []
    for row in result.fetchall():
        assert_own_data_only(me, row.user_id)
        try:
            wishes.append(_decrypt_wish(me, row))
        except crypto.InvalidToken:
            logger.error(f"Gift wish {row.id} failed to decrypt — wrong key?")
    return wishes


@router.post("", status_code=201)
async def add_wish(
    request: WishRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    me = current_user["id"]
    _require_unlocked(me)

    if not request.title.strip():
        raise HTTPException(status_code=422, detail="A wish needs a name.")

    wish_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    payload = json.dumps(
        {
            "title": request.title.strip(),
            "note": (request.note or "").strip() or None,
            "url": (request.url or "").strip() or None,
        }
    )

    await db.execute(
        text("""
            INSERT INTO gift_wishes (id, user_id, content_encrypted, created_at, updated_at)
            VALUES (:id, :uid, :content, :now, :now)
        """),
        {
            "id": wish_id,
            "uid": me,
            "content": crypto.encrypt_for_user(me, payload),
            "now": now,
        },
    )
    await db.commit()

    return {
        "id": wish_id,
        "title": request.title.strip(),
        "note": request.note,
        "url": request.url,
        "created_at": now,
        "updated_at": now,
    }


@router.patch("/{wish_id}")
async def update_wish(
    wish_id: str,
    request: WishRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    me = current_user["id"]
    _require_unlocked(me)

    result = await db.execute(
        text("SELECT id, user_id, content_encrypted, created_at, updated_at FROM gift_wishes WHERE id = :id"),
        {"id": wish_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Wish not found.")
    assert_own_data_only(me, row.user_id)

    now = datetime.now(timezone.utc).isoformat()
    payload = json.dumps(
        {
            "title": request.title.strip(),
            "note": (request.note or "").strip() or None,
            "url": (request.url or "").strip() or None,
        }
    )
    await db.execute(
        text("""
            UPDATE gift_wishes SET content_encrypted = :content, updated_at = :now
            WHERE id = :id AND user_id = :uid
        """),
        {"content": crypto.encrypt_for_user(me, payload), "now": now, "id": wish_id, "uid": me},
    )
    await db.commit()

    return {
        "id": wish_id,
        "title": request.title.strip(),
        "note": request.note,
        "url": request.url,
        "created_at": row.created_at,
        "updated_at": now,
    }


@router.delete("/{wish_id}", status_code=204)
async def delete_wish(
    wish_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    me = current_user["id"]
    result = await db.execute(
        text("SELECT user_id FROM gift_wishes WHERE id = :id"), {"id": wish_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Wish not found.")
    assert_own_data_only(me, row.user_id)

    await db.execute(
        text("DELETE FROM gift_wishes WHERE id = :id AND user_id = :uid"),
        {"id": wish_id, "uid": me},
    )
    await db.commit()
