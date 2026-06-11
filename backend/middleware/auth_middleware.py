"""
My Bibi — Auth middleware / FastAPI dependencies
"""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from services.auth_service import decode_token

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    FastAPI dependency — validates JWT and returns the current user dict.
    Raises 401 if token is missing, invalid, or expired.
    """
    token = credentials.credentials
    payload = decode_token(token)

    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]

    # Fetch user from DB to ensure they still exist and are active
    result = await db.execute(
        text("SELECT id, email, name, role, created_at FROM users WHERE id = :id"),
        {"id": user_id},
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last_active_at (fire and forget — don't block on this)
    try:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            text("UPDATE users SET last_active_at = :now WHERE id = :id"),
            {"now": now, "id": user_id},
        )
        await db.commit()
    except Exception:
        pass  # Non-critical

    return {
        "id": row.id,
        "email": row.email,
        "name": row.name,
        "role": row.role,
        "created_at": row.created_at,
    }


def require_same_user(current_user: dict, target_user_id: str) -> None:
    """
    Mirror principle enforcement.
    Raises 403 if the requesting user is not the same as the data owner.
    Use before returning any personal data (journal, AI insights, etc.)
    """
    if current_user["id"] != target_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mirror principle: cannot access another user's personal data.",
        )
