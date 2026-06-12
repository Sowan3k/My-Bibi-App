"""
My Bibi — Chat router

Endpoints:
  GET  /api/chat/messages            — Paginated message list (marks partner msgs delivered)
  POST /api/chat/messages            — Send text message
  POST /api/chat/messages/seen       — Mark all partner messages as seen
  POST /api/chat/messages/{id}/react — Toggle an emoji reaction
  POST /api/chat/media               — Upload photo/voice/file (saves as message)
  GET  /api/chat/messages/stream     — SSE stream for real-time messages

Receipts and reactions are symmetric shared-chat state — both partners
see the same thing. No mirror-principle concern: nothing here is an
inference about anyone, only explicit actions.
"""

import asyncio
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from middleware.auth_middleware import get_current_user
from services.chat_service import (
    get_messages,
    send_message,
    save_media,
    mark_seen,
    toggle_reaction,
)
from config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Fixed palette keeps storage clean and the picker simple
ALLOWED_REACTIONS = ("❤️", "😂", "😮", "😢", "🙏", "👍")


class SendMessageRequest(BaseModel):
    content: Optional[str] = None
    media_type: Optional[str] = None
    reply_to: Optional[str] = None


class ReactRequest(BaseModel):
    emoji: str


@router.get("/messages")
async def list_messages(
    limit: int = 50,
    before_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated messages in chronological order.
    Returns the most recent `limit` messages.
    Use before_id for pagination (load older messages).
    """
    messages = await get_messages(
        db=db,
        limit=min(limit, 200),
        before_id=before_id,
        current_user_id=current_user["id"],
    )
    return messages


@router.post("/messages", status_code=201)
async def create_message(
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a text message."""
    if not request.content or not request.content.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message content cannot be empty.",
        )

    if len(request.content) > 4000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message too long. Max 4000 characters.",
        )

    msg = await send_message(
        db=db,
        sender_id=current_user["id"],
        content=request.content.strip(),
        media_type=None,
        media_path=None,
        reply_to=request.reply_to,
    )
    msg["sender_name"] = current_user["name"]
    msg["is_mine"] = True
    return msg


@router.post("/messages/seen")
async def mark_messages_seen(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark every partner message as seen. Called by the client when the
    chat is actually on screen — an explicit, mutual receipt, same for
    both partners.
    """
    marked = await mark_seen(db, current_user["id"])
    return {"marked": marked}


@router.post("/messages/{message_id}/react")
async def react_to_message(
    message_id: str,
    request: ReactRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Toggle an emoji reaction on a message. Same emoji removes, a
    different one replaces — one reaction per person per message.
    """
    if request.emoji not in ALLOWED_REACTIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"emoji must be one of: {' '.join(ALLOWED_REACTIONS)}",
        )

    result = await db.execute(
        text("SELECT id FROM messages WHERE id = :id"), {"id": message_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Message not found.")

    emoji = await toggle_reaction(db, message_id, current_user["id"], request.emoji)
    return {"message_id": message_id, "emoji": emoji}  # emoji=None → removed


@router.post("/media", status_code=201)
async def upload_media(
    file: UploadFile = File(...),
    media_type: str = Form(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a photo or voice note. Creates a message with the media reference.
    The file is saved to vault/media/.
    """
    if media_type not in ("photo", "voice", "file"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="media_type must be 'photo', 'voice', or 'file'.",
        )

    try:
        media_path = await save_media(
            file=file,
            media_type=media_type,
            sender_id=current_user["id"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    msg = await send_message(
        db=db,
        sender_id=current_user["id"],
        content=None,
        media_type=media_type,
        media_path=media_path,
    )
    msg["sender_name"] = current_user["name"]
    msg["is_mine"] = True
    return msg


@router.get("/media/{filename}")
async def serve_media(
    filename: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Serve a media file from vault/media/.
    Requires authentication — media is private.
    """
    # Sanitise filename to prevent path traversal
    safe_filename = os.path.basename(filename)
    if safe_filename != filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    media_path = os.path.join(settings.vault_path, "media", safe_filename)
    if not os.path.exists(media_path):
        raise HTTPException(status_code=404, detail="File not found.")

    return FileResponse(media_path)


@router.get("/messages/stream")
async def stream_messages(
    last_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    SSE stream — delivers new messages as they arrive.
    Poll-based implementation for Phase 1; full SSE in Phase 2.
    """
    async def event_generator():
        """Yield SSE events."""
        from services.chat_service import get_messages as _get
        from sqlalchemy import text

        # Send a heartbeat immediately to confirm connection
        yield "data: {\"type\": \"connected\"}\n\n"

        last_seen = last_id
        check_interval = 2  # seconds

        for _ in range(150):  # 5 minutes max (150 * 2s)
            await asyncio.sleep(check_interval)
            try:
                async with db as session:
                    if last_seen:
                        result = await session.execute(
                            text("""
                                SELECT m.id, m.sender_id, u.name as sender_name,
                                       m.content, m.media_type, m.media_path,
                                       m.reply_to, m.created_at
                                FROM messages m
                                JOIN users u ON u.id = m.sender_id
                                WHERE m.created_at > (
                                    SELECT created_at FROM messages WHERE id = :lid
                                )
                                ORDER BY m.created_at ASC
                                LIMIT 20
                            """),
                            {"lid": last_seen},
                        )
                    else:
                        # No last_id — just send a heartbeat
                        yield "data: {\"type\": \"heartbeat\"}\n\n"
                        continue

                    rows = result.fetchall()
                    for row in rows:
                        msg = {
                            "type": "message",
                            "id": row.id,
                            "sender_id": row.sender_id,
                            "sender_name": row.sender_name,
                            "content": row.content,
                            "media_type": row.media_type,
                            "media_path": row.media_path,
                            "reply_to": row.reply_to,
                            "created_at": row.created_at,
                            "is_mine": row.sender_id == current_user["id"],
                        }
                        last_seen = row.id
                        yield f"data: {json.dumps(msg)}\n\n"

            except Exception as e:
                logger.error(f"SSE stream error: {e}")
                yield "data: {\"type\": \"error\"}\n\n"
                break

        yield "data: {\"type\": \"closed\"}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering
        },
    )
