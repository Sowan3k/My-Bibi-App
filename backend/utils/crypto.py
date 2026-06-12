"""
My Bibi — Per-user encryption (Phase 4)

Private journal entries and gift-vault wishes are encrypted at rest with a
key derived from the author's password. The server owner cannot casually
read them: the key only exists in process memory after that user logs in.

Design:
  - PBKDF2-HMAC-SHA256 (200k iterations) derives a Fernet key from the
    user's password. Salt = SHA256(user_id + app-level salt), so each user
    gets a distinct, stable salt without storing one.
  - Keys live in an in-memory cache keyed by user_id, populated at
    setup/join/login. A server restart locks all journals until the next
    login — that is intentional, honest behaviour.
  - Ciphertext is stored with an "enc:v1:" prefix. Anything without the
    prefix is treated as legacy plaintext (pre-Phase-4 rows), which gets
    migrated to ciphertext on the user's next login.
"""

import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from config import settings

logger = logging.getLogger(__name__)

ENC_PREFIX = "enc:v1:"
_PBKDF2_ITERATIONS = 200_000

# user_id -> Fernet key. Process-memory only; never persisted.
_key_cache: dict[str, bytes] = {}


def derive_key(password: str, user_id: str) -> bytes:
    """Derive a stable per-user Fernet key from password + user_id."""
    salt = hashlib.sha256(
        (user_id + settings.invite_secret).encode("utf-8")
    ).digest()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=_PBKDF2_ITERATIONS,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode("utf-8")))


def unlock_user(user_id: str, password: str) -> None:
    """Cache the user's encryption key. Called at setup/join/login."""
    _key_cache[user_id] = derive_key(password, user_id)
    logger.info(f"Encryption key unlocked for user {user_id[:8]}…")


def lock_user(user_id: str) -> None:
    """Drop a user's key from memory."""
    _key_cache.pop(user_id, None)


def is_unlocked(user_id: str) -> bool:
    return user_id in _key_cache


def encrypt_for_user(user_id: str, plaintext: str) -> str:
    """
    Encrypt text for a user. Raises KeyError if the user's key is not
    in memory (caller should return 423 Locked).
    """
    key = _key_cache[user_id]
    token = Fernet(key).encrypt(plaintext.encode("utf-8"))
    return ENC_PREFIX + token.decode("ascii")


def decrypt_for_user(user_id: str, stored: str) -> str:
    """
    Decrypt stored text for a user.
    - Legacy plaintext (no prefix) is returned as-is.
    - Raises KeyError if the key is not in memory.
    - Raises InvalidToken if the ciphertext doesn't match the key.
    """
    if not stored.startswith(ENC_PREFIX):
        return stored
    key = _key_cache[user_id]
    token = stored[len(ENC_PREFIX):].encode("ascii")
    return Fernet(key).decrypt(token).decode("utf-8")


def is_encrypted(stored: str) -> bool:
    return stored.startswith(ENC_PREFIX)


__all__ = [
    "ENC_PREFIX",
    "derive_key",
    "unlock_user",
    "lock_user",
    "is_unlocked",
    "encrypt_for_user",
    "decrypt_for_user",
    "is_encrypted",
    "InvalidToken",
]
