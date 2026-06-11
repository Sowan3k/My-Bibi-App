"""
My Bibi — Auth service
Handles password hashing, JWT creation/validation, and invite token generation.
Uses bcrypt directly (not passlib) to avoid bcrypt>=4.x compatibility issues.
"""

import logging
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from config import settings

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt. Returns the hash as a string."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_expire_minutes)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})

    return jwt.encode(to_encode, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.
    Returns the payload dict, or None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.debug(f"JWT decode failed: {e}")
        return None


def generate_invite_token() -> str:
    """
    Generate a cryptographically secure invite token.
    Returns a 32-byte hex string (64 chars).
    """
    return secrets.token_urlsafe(32)


def hash_invite_token(token: str) -> str:
    """
    Hash an invite token with HMAC-SHA256 for storage.
    We store the hash, not the raw token.
    """
    return hashlib.sha256(
        f"{token}:{settings.invite_secret}".encode()
    ).hexdigest()
