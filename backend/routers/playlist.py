"""
My Bibi — Shared Playlist Memories router (Phase 2)

Store a song URL + a note + who shared it. The frontend renders official
embeds (YouTube/Spotify iframes). We NEVER proxy or download audio —
only the couple's note and the link live on the server.

Endpoints:
  GET    /api/playlist      — List shared songs
  POST   /api/playlist      — Share a song (URL + note)
  DELETE /api/playlist/{id} — Remove a song (either partner)
"""

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from middleware.auth_middleware import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

_YOUTUBE_RE = re.compile(
    r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([\w-]{11})"
)
_SPOTIFY_RE = re.compile(
    r"open\.spotify\.com/(track|album|playlist)/([A-Za-z0-9]+)"
)


def detect_provider(url: str) -> tuple[str, Optional[str]]:
    """Return (provider, embed_id) for known providers."""
    yt = _YOUTUBE_RE.search(url)
    if yt:
        return "youtube", yt.group(1)
    sp = _SPOTIFY_RE.search(url)
    if sp:
        return "spotify", f"{sp.group(1)}/{sp.group(2)}"
    return "other", None


class ShareSongRequest(BaseModel):
    url: str
    title: Optional[str] = None
    note: Optional[str] = None


@router.get("")
async def list_songs(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            SELECT p.id, p.shared_by, u.name as shared_by_name, p.url,
                   p.provider, p.title, p.note, p.created_at
            FROM playlist_memories p
            JOIN users u ON u.id = p.shared_by
            ORDER BY p.created_at DESC
        """)
    )
    out = []
    for row in result.fetchall():
        provider, embed_id = detect_provider(row.url)
        out.append(
            {
                "id": row.id,
                "shared_by": row.shared_by,
                "shared_by_name": row.shared_by_name,
                "url": row.url,
                "provider": provider,
                "embed_id": embed_id,
                "title": row.title,
                "note": row.note,
                "created_at": row.created_at,
            }
        )
    return out


@router.post("", status_code=201)
async def share_song(
    request: ShareSongRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    url = request.url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=422, detail="That doesn't look like a link.")

    provider, embed_id = detect_provider(url)
    song_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        text("""
            INSERT INTO playlist_memories (id, shared_by, url, provider, title, note, created_at)
            VALUES (:id, :by, :url, :provider, :title, :note, :now)
        """),
        {
            "id": song_id,
            "by": current_user["id"],
            "url": url,
            "provider": provider,
            "title": (request.title or "").strip() or None,
            "note": (request.note or "").strip() or None,
            "now": now,
        },
    )
    await db.commit()

    return {
        "id": song_id,
        "shared_by": current_user["id"],
        "shared_by_name": current_user["name"],
        "url": url,
        "provider": provider,
        "embed_id": embed_id,
        "title": request.title,
        "note": request.note,
        "created_at": now,
    }


@router.delete("/{song_id}", status_code=204)
async def delete_song(
    song_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("SELECT id FROM playlist_memories WHERE id = :id"), {"id": song_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Song not found.")
    await db.execute(text("DELETE FROM playlist_memories WHERE id = :id"), {"id": song_id})
    await db.commit()
