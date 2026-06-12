"""
My Bibi — Link previews router (Phase 2)

Server-side OpenGraph fetch for URLs a partner pasted into chat.
- Fetches ONLY the user-provided URL (no third-party preview API).
- No message content is sent anywhere; we GET the page like a browser would.
- Results cached in SQLite so each URL is fetched once.

Endpoints:
  GET /api/links/preview?url=… — OpenGraph metadata for a URL
"""

import ipaddress
import logging
import re
import socket
from datetime import datetime, timezone
from html import unescape
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from middleware.auth_middleware import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

_META_RE = re.compile(
    r'<meta[^>]+(?:property|name)=["\'](og:title|og:description|og:image|og:site_name|description)["\'][^>]+content=["\']([^"\']*)["\']',
    re.IGNORECASE,
)
_META_RE_REVERSED = re.compile(
    r'<meta[^>]+content=["\']([^"\']*)["\'][^>]+(?:property|name)=["\'](og:title|og:description|og:image|og:site_name|description)["\']',
    re.IGNORECASE,
)
_TITLE_RE = re.compile(r"<title[^>]*>([^<]{1,300})</title>", re.IGNORECASE)


def _is_private_host(hostname: str) -> bool:
    """SSRF guard: refuse to fetch private/internal addresses."""
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return True
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            return True
    return False


@router.get("/preview")
async def link_preview(
    url: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise HTTPException(status_code=422, detail="Invalid URL.")
    if _is_private_host(parsed.hostname):
        raise HTTPException(status_code=422, detail="Refusing to fetch internal addresses.")

    # Cache hit?
    cached = await db.execute(
        text("SELECT title, description, image_url, site_name FROM link_previews WHERE url = :u"),
        {"u": url},
    )
    row = cached.fetchone()
    if row:
        return {
            "url": url,
            "title": row.title,
            "description": row.description,
            "image_url": row.image_url,
            "site_name": row.site_name,
        }

    title = description = image_url = site_name = None
    try:
        async with httpx.AsyncClient(
            timeout=6.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; MyBibi/1.0; link-preview)"},
        ) as client:
            res = await client.get(url)
            if "text/html" in res.headers.get("content-type", ""):
                head = res.text[:120_000]
                fields: dict[str, str] = {}
                for prop, content in _META_RE.findall(head):
                    fields.setdefault(prop.lower(), unescape(content))
                for content, prop in _META_RE_REVERSED.findall(head):
                    fields.setdefault(prop.lower(), unescape(content))
                title = fields.get("og:title")
                description = fields.get("og:description") or fields.get("description")
                image_url = fields.get("og:image")
                site_name = fields.get("og:site_name")
                if not title:
                    m = _TITLE_RE.search(head)
                    if m:
                        title = unescape(m.group(1).strip())
    except Exception as e:
        logger.info(f"Link preview fetch failed for {url}: {e}")

    # Cache (even empty results, to avoid refetch loops)
    await db.execute(
        text("""
            INSERT OR REPLACE INTO link_previews (url, title, description, image_url, site_name, fetched_at)
            VALUES (:u, :t, :d, :i, :s, :now)
        """),
        {
            "u": url,
            "t": title,
            "d": description[:300] if description else None,
            "i": image_url,
            "s": site_name,
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )
    await db.commit()

    return {
        "url": url,
        "title": title,
        "description": description,
        "image_url": image_url,
        "site_name": site_name,
    }
