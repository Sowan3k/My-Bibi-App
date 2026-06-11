"""
My Bibi — Chat service
Handles message storage and retrieval, and media file saving to vault.
"""

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

import aiofiles
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from config import settings

logger = logging.getLogger(__name__)

ALLOWED_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "audio/webm", "audio/wav", "audio/mpeg"}
MAX_FILE_SIZE_MB = 20


async def get_messages(
    db: AsyncSession,
    limit: int = 50,
    before_id: Optional[str] = None,
    current_user_id: Optional[str] = None,
) -> list[dict]:
    """
    Fetch paginated messages, most recent last (chronological order).
    Joins with users table to get sender name.
    """
    if before_id:
        # Pagination: get messages before the given ID
        result = await db.execute(
            text("""
                SELECT m.id, m.sender_id, u.name as sender_name, m.content,
                       m.media_type, m.media_path, m.reply_to, m.created_at
                FROM messages m
                JOIN users u ON u.id = m.sender_id
                WHERE m.created_at < (
                    SELECT created_at FROM messages WHERE id = :before_id
                )
                ORDER BY m.created_at ASC
                LIMIT :limit
            """),
            {"before_id": before_id, "limit": limit},
        )
    else:
        result = await db.execute(
            text("""
                SELECT m.id, m.sender_id, u.name as sender_name, m.content,
                       m.media_type, m.media_path, m.reply_to, m.created_at
                FROM messages m
                JOIN users u ON u.id = m.sender_id
                ORDER BY m.created_at ASC
                LIMIT :limit
            """),
            {"limit": limit},
        )

    rows = result.fetchall()
    messages = []
    for row in rows:
        messages.append({
            "id": row.id,
            "sender_id": row.sender_id,
            "sender_name": row.sender_name,
            "content": row.content,
            "media_type": row.media_type,
            "media_path": row.media_path,
            "reply_to": row.reply_to,
            "created_at": row.created_at,
            "is_mine": row.sender_id == current_user_id,
        })
    return messages


async def send_message(
    db: AsyncSession,
    sender_id: str,
    content: Optional[str] = None,
    media_type: Optional[str] = None,
    media_path: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> dict:
    """
    Insert a new message into the database.
    At least one of content or media_path must be provided.
    """
    if not content and not media_path:
        raise ValueError("Message must have content or media.")

    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        text("""
            INSERT INTO messages (id, sender_id, content, media_type, media_path, reply_to, created_at)
            VALUES (:id, :sender_id, :content, :media_type, :media_path, :reply_to, :created_at)
        """),
        {
            "id": msg_id,
            "sender_id": sender_id,
            "content": content,
            "media_type": media_type,
            "media_path": media_path,
            "reply_to": reply_to,
            "created_at": now,
        },
    )
    await db.commit()

    # Log activity for streak
    await _log_activity(db, sender_id, now[:10])

    return {
        "id": msg_id,
        "sender_id": sender_id,
        "content": content,
        "media_type": media_type,
        "media_path": media_path,
        "reply_to": reply_to,
        "created_at": now,
    }


async def save_media(
    file: UploadFile,
    media_type: str,
    sender_id: str,
) -> str:
    """
    Save an uploaded file (photo or voice note) to vault/media/.
    Returns the relative path within the vault for storage in the DB.
    Validates file type and size.
    """
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MEDIA_TYPES:
        raise ValueError(f"File type '{content_type}' not allowed.")

    # Read file content and check size
    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise ValueError(f"File too large ({size_mb:.1f} MB). Max {MAX_FILE_SIZE_MB} MB.")

    # Determine extension from content type
    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "audio/webm": ".webm",
        "audio/wav": ".wav",
        "audio/mpeg": ".mp3",
    }
    ext = ext_map.get(content_type, ".bin")

    # Create a unique filename
    filename = f"{sender_id[:8]}-{uuid.uuid4().hex[:12]}{ext}"
    media_dir = os.path.join(settings.vault_path, "media")
    os.makedirs(media_dir, exist_ok=True)

    filepath = os.path.join(media_dir, filename)
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(data)

    logger.info(f"Saved media: {filename} ({size_mb:.2f} MB)")
    return filename  # Return just the filename — frontend constructs full URL


async def _log_activity(db: AsyncSession, user_id: str, date_str: str) -> None:
    """
    Log user activity for streak tracking.
    Uses INSERT OR IGNORE to avoid duplicates.
    """
    try:
        entry_id = str(uuid.uuid4())
        await db.execute(
            text("""
                INSERT OR IGNORE INTO streak_log (id, user_id, activity_date)
                VALUES (:id, :user_id, :date)
            """),
            {"id": entry_id, "user_id": user_id, "date": date_str},
        )
        await db.commit()
    except Exception as e:
        logger.debug(f"Activity log insert error (non-critical): {e}")
