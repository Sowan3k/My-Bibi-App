"""
My Bibi — Journal service

MIRROR PRINCIPLE strictly enforced: every query filters by user_id.
No endpoint in this service can return another user's entries.

Phase 4: entries are encrypted at rest with a key derived from the
author's password (utils/crypto.py). The key exists only in process
memory after login — the self-hosting partner cannot casually read
the other's journal, in the DB or in the vault markdown.
A 423 response means "locked — log in again to unlock".
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from config import settings
from services.vault_service import save_journal_entry, delete_journal_file
from utils.mirror_guard import assert_own_data_only
from utils import crypto

logger = logging.getLogger(__name__)


def _locked_error() -> HTTPException:
    return HTTPException(
        status_code=423,
        detail="Your journal is locked. Log in again to unlock it.",
    )


def _read_content(user_id: str, stored: str) -> str:
    """
    Decrypt stored content for its owner.
    Legacy plaintext rows pass through unchanged.
    """
    if not crypto.is_encrypted(stored):
        return stored
    if not crypto.is_unlocked(user_id):
        raise _locked_error()
    try:
        return crypto.decrypt_for_user(user_id, stored)
    except crypto.InvalidToken:
        logger.error("Journal entry failed to decrypt — key mismatch.")
        raise HTTPException(
            status_code=500,
            detail="Entry could not be decrypted with your current password.",
        )


async def migrate_plaintext_entries(db: AsyncSession, user_id: str) -> int:
    """
    Encrypt any legacy plaintext entries for this user. Called right after
    login, when the key is freshly unlocked. Returns count migrated.
    """
    if not crypto.is_unlocked(user_id):
        return 0

    result = await db.execute(
        text("""
            SELECT id, content_encrypted FROM journal_entries
            WHERE user_id = :uid
        """),
        {"uid": user_id},
    )
    migrated = 0
    for row in result.fetchall():
        if not crypto.is_encrypted(row.content_encrypted):
            await db.execute(
                text("""
                    UPDATE journal_entries SET content_encrypted = :content
                    WHERE id = :id AND user_id = :uid
                """),
                {
                    "content": crypto.encrypt_for_user(user_id, row.content_encrypted),
                    "id": row.id,
                    "uid": user_id,
                },
            )
            migrated += 1
    if migrated:
        await db.commit()
        logger.info(f"Encrypted {migrated} legacy journal entries for user {user_id[:8]}…")
    return migrated


async def get_entries(db: AsyncSession, user_id: str) -> list[dict]:
    """
    List all journal entries for the given user.
    MIRROR PRINCIPLE: always filters by user_id — never returns another user's entries.
    """
    result = await db.execute(
        text("""
            SELECT id, user_id, title, content_encrypted as content,
                   is_shared, created_at, updated_at
            FROM journal_entries
            WHERE user_id = :uid
            ORDER BY created_at DESC
        """),
        {"uid": user_id},
    )
    rows = result.fetchall()
    return [
        {
            "id": row.id,
            "user_id": row.user_id,
            "title": row.title,
            "content": _read_content(user_id, row.content),
            "is_shared": bool(row.is_shared),
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]


async def create_entry(
    db: AsyncSession,
    user_id: str,
    title: Optional[str],
    content: str,
) -> dict:
    """
    Create a new journal entry. Saves encrypted to DB and writes an
    encrypted markdown file to vault.
    """
    if not content.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Journal entry cannot be empty.",
        )
    if not crypto.is_unlocked(user_id):
        raise _locked_error()

    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    stored = crypto.encrypt_for_user(user_id, content)

    await db.execute(
        text("""
            INSERT INTO journal_entries (id, user_id, title, content_encrypted, is_shared, created_at, updated_at)
            VALUES (:id, :uid, :title, :content, 0, :now, :now)
        """),
        {
            "id": entry_id,
            "uid": user_id,
            "title": title,
            "content": stored,
            "now": now,
        },
    )
    await db.commit()

    # Vault gets the CIPHERTEXT — the server owner cannot casually read it.
    try:
        await save_journal_entry(
            vault_path=settings.vault_path,
            user_id=user_id,
            entry_id=entry_id,
            title=title,
            content=stored,
            created_at=now,
            encrypted=True,
        )
    except Exception as e:
        logger.error(f"Failed to write journal entry to vault: {e}")

    return {
        "id": entry_id,
        "user_id": user_id,
        "title": title,
        "content": content,
        "is_shared": False,
        "created_at": now,
        "updated_at": now,
    }


async def get_entry(db: AsyncSession, user_id: str, entry_id: str) -> dict:
    """
    Get a single journal entry. Verifies ownership before returning.
    MIRROR PRINCIPLE: raises 403 if entry belongs to another user.
    """
    result = await db.execute(
        text("""
            SELECT id, user_id, title, content_encrypted as content,
                   is_shared, created_at, updated_at
            FROM journal_entries
            WHERE id = :id
        """),
        {"id": entry_id},
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Entry not found.")

    # Mirror principle check BEFORE any decryption attempt
    assert_own_data_only(user_id, row.user_id)

    return {
        "id": row.id,
        "user_id": row.user_id,
        "title": row.title,
        "content": _read_content(user_id, row.content),
        "is_shared": bool(row.is_shared),
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


async def update_entry(
    db: AsyncSession,
    user_id: str,
    entry_id: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
) -> dict:
    """
    Update a journal entry. Verifies ownership.
    MIRROR PRINCIPLE: only the author can edit their entry.
    """
    existing = await get_entry(db, user_id, entry_id)  # raises 403 if not owner

    new_title = title if title is not None else existing["title"]
    new_content = content if content is not None else existing["content"]
    now = datetime.now(timezone.utc).isoformat()

    if not crypto.is_unlocked(user_id):
        raise _locked_error()

    await db.execute(
        text("""
            UPDATE journal_entries
            SET title = :title, content_encrypted = :content, updated_at = :now
            WHERE id = :id AND user_id = :uid
        """),
        {
            "title": new_title,
            "content": crypto.encrypt_for_user(user_id, new_content),
            "now": now,
            "id": entry_id,
            "uid": user_id,
        },
    )
    await db.commit()

    return {**existing, "title": new_title, "content": new_content, "updated_at": now}


async def delete_entry(db: AsyncSession, user_id: str, entry_id: str) -> None:
    """
    Delete a journal entry. Verifies ownership.
    Also deletes the markdown file from vault.
    """
    await get_entry(db, user_id, entry_id)  # raises 403 if not owner

    await db.execute(
        text("DELETE FROM journal_entries WHERE id = :id AND user_id = :uid"),
        {"id": entry_id, "uid": user_id},
    )
    await db.commit()

    try:
        await delete_journal_file(settings.vault_path, user_id, entry_id)
    except Exception as e:
        logger.error(f"Failed to delete journal file from vault: {e}")
