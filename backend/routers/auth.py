"""
My Bibi — Auth router

Endpoints:
  POST /api/auth/setup   — First-user registration (only if 0 users in DB)
  POST /api/auth/join    — Partner join via invite token (only if 1 user)
  POST /api/auth/login   — Returns JWT (OAuth2 form-encoded)
  GET  /api/auth/me      — Current user info
  POST /api/auth/invite  — Generate a new invite link (authenticated)
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from middleware.auth_middleware import get_current_user
from services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    generate_invite_token,
    hash_invite_token,
)
from config import settings
from utils import crypto

router = APIRouter()
logger = logging.getLogger(__name__)


class SetupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class JoinRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    invite_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class SetupResponse(TokenResponse):
    invite_link: str


async def _get_user_count(db: AsyncSession) -> int:
    result = await db.execute(text("SELECT COUNT(*) as cnt FROM users"))
    return result.fetchone().cnt


async def _get_partner(db: AsyncSession, user_id: str) -> dict | None:
    """Get the other user (the partner)."""
    result = await db.execute(
        text("SELECT id, name, email FROM users WHERE id != :uid LIMIT 1"),
        {"uid": user_id},
    )
    row = result.fetchone()
    if not row:
        return None
    return {"id": row.id, "name": row.name, "email": row.email}


@router.post("/setup", response_model=SetupResponse, status_code=201)
async def setup(request: SetupRequest, db: AsyncSession = Depends(get_db)):
    """
    Register the first user. Only works if no users exist in the DB yet.
    Returns JWT + a one-time invite link to share with partner.
    """
    # Validate: only works for the very first user
    count = await _get_user_count(db)
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This instance is already set up. Use the invite link to join.",
        )

    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters.",
        )

    # Check email not already taken (redundant here but defensive)
    result = await db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": request.email.lower()},
    )
    if result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    password_hash = hash_password(request.password)

    await db.execute(
        text("""
            INSERT INTO users (id, email, name, password_hash, role, created_at)
            VALUES (:id, :email, :name, :hash, 'owner', :now)
        """),
        {
            "id": user_id,
            "email": request.email.lower().strip(),
            "name": request.name.strip(),
            "hash": password_hash,
            "now": now,
        },
    )

    # Generate invite token
    raw_token = generate_invite_token()
    token_hash = hash_invite_token(raw_token)
    expires_at = (
        datetime.now(timezone.utc) + timedelta(days=settings.invite_expire_days)
    ).isoformat()

    await db.execute(
        text("""
            INSERT INTO invite_tokens (token, created_by, used, created_at, expires_at)
            VALUES (:token, :by, 0, :now, :expires)
        """),
        {"token": token_hash, "by": user_id, "now": now, "expires": expires_at},
    )

    await db.commit()

    # Create JWT + unlock the user's encryption key (Phase 4)
    access_token = create_access_token({"sub": user_id})
    crypto.unlock_user(user_id, request.password)
    invite_link = f"{settings.frontend_url}/join?token={raw_token}"

    logger.info(f"First user registered: {request.email}")

    return SetupResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=request.email.lower(),
            name=request.name.strip(),
            role="owner",
            created_at=now,
        ),
        invite_link=invite_link,
    )


@router.post("/join", response_model=TokenResponse, status_code=201)
async def join(request: JoinRequest, db: AsyncSession = Depends(get_db)):
    """
    Partner registration via invite token. Only works if exactly 1 user exists.
    """
    count = await _get_user_count(db)
    if count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No instance set up yet. Visit /setup first.",
        )
    if count >= 2:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This instance already has two users. No more can join.",
        )

    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters.",
        )

    # Validate invite token
    token_hash = hash_invite_token(request.invite_token)
    now = datetime.now(timezone.utc).isoformat()

    result = await db.execute(
        text("""
            SELECT token, used, expires_at FROM invite_tokens
            WHERE token = :hash
        """),
        {"hash": token_hash},
    )
    invite_row = result.fetchone()

    if not invite_row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invite link.",
        )
    if invite_row.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invite link has already been used.",
        )
    if invite_row.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invite link has expired. Ask your partner for a new one.",
        )

    # Check email not already taken
    result = await db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": request.email.lower()},
    )
    if result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    user_id = str(uuid.uuid4())
    password_hash = hash_password(request.password)

    await db.execute(
        text("""
            INSERT INTO users (id, email, name, password_hash, role, created_at)
            VALUES (:id, :email, :name, :hash, 'partner', :now)
        """),
        {
            "id": user_id,
            "email": request.email.lower().strip(),
            "name": request.name.strip(),
            "hash": password_hash,
            "now": now,
        },
    )

    # Mark invite as used
    await db.execute(
        text("UPDATE invite_tokens SET used = 1 WHERE token = :hash"),
        {"hash": token_hash},
    )
    await db.commit()

    access_token = create_access_token({"sub": user_id})
    crypto.unlock_user(user_id, request.password)
    logger.info(f"Partner joined: {request.email}")

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=request.email.lower(),
            name=request.name.strip(),
            role="partner",
            created_at=now,
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email + password (OAuth2 form-encoded).
    FastAPI's OAuth2PasswordRequestForm uses 'username' field for email.
    """
    email = form_data.username.lower().strip()

    result = await db.execute(
        text("""
            SELECT id, email, name, role, password_hash, created_at
            FROM users WHERE email = :email
        """),
        {"email": email},
    )
    user = result.fetchone()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({"sub": user.id})

    # Phase 4: unlock this user's encryption key for journal/gift vault,
    # and encrypt any legacy plaintext entries now that we can.
    crypto.unlock_user(user.id, form_data.password)
    try:
        from services.journal_service import migrate_plaintext_entries
        await migrate_plaintext_entries(db, user.id)
    except Exception as e:
        logger.warning(f"Journal migration skipped: {e}")

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            created_at=user.created_at,
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return current authenticated user's info."""
    return UserResponse(**current_user)


@router.post("/invite")
async def generate_invite(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a new invite link. Requires authentication.
    Previous unused invite tokens are invalidated (only one active at a time).
    """
    count = await _get_user_count(db)
    if count >= 2:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Partner has already joined. No invite needed.",
        )

    raw_token = generate_invite_token()
    token_hash = hash_invite_token(raw_token)
    now = datetime.now(timezone.utc).isoformat()
    expires_at = (
        datetime.now(timezone.utc) + timedelta(days=settings.invite_expire_days)
    ).isoformat()

    # Mark all previous unused invites as used
    await db.execute(
        text("""
            UPDATE invite_tokens SET used = 1
            WHERE created_by = :uid AND used = 0
        """),
        {"uid": current_user["id"]},
    )

    await db.execute(
        text("""
            INSERT INTO invite_tokens (token, created_by, used, created_at, expires_at)
            VALUES (:token, :by, 0, :now, :expires)
        """),
        {
            "token": token_hash,
            "by": current_user["id"],
            "now": now,
            "expires": expires_at,
        },
    )
    await db.commit()

    invite_link = f"{settings.frontend_url}/join?token={raw_token}"
    return {"invite_link": invite_link, "expires_at": expires_at}
