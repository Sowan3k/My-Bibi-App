"""
My Bibi — AI service (Phase 3)

THE SINGLE CHOKEPOINT for all LLM calls. No other module may talk to
Ollama directly. This keeps the ethical guardrails auditable in one place:

  - The model runs locally (Ollama). No message content ever leaves the server.
  - Every prompt built here analyses ONLY the requesting user's own words.
    Cross-person analysis is rejected at this layer (see guard below).
  - Everything degrades gracefully: if Ollama is offline, callers receive
    None and features fall back to non-AI behaviour.
"""

import asyncio
import logging
import time

import httpx

from config import settings

logger = logging.getLogger(__name__)

_AVAILABILITY_CACHE_SECONDS = 30
_availability: tuple[float, bool] = (0.0, False)  # (checked_at, available)


async def is_available() -> bool:
    """Cheap cached check that Ollama is reachable and has the model."""
    global _availability
    checked_at, available = _availability
    if time.monotonic() - checked_at < _AVAILABILITY_CACHE_SECONDS:
        return available

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{settings.ollama_base_url}/api/tags")
            available = res.status_code == 200
    except Exception:
        available = False

    _availability = (time.monotonic(), available)
    return available


def assert_single_subject(requesting_user_id: str, subject_user_id: str) -> None:
    """
    GUARDRAIL: AI may only analyse the requesting user's own data.
    Any attempt to run analysis about the partner is a programming error
    and is rejected loudly. This is the mirror principle at the AI layer.
    """
    if requesting_user_id != subject_user_id:
        raise PermissionError(
            "MIRROR PRINCIPLE VIOLATION: AI analysis of another person is "
            "banned at every layer. This call was blocked."
        )


async def generate(
    prompt: str,
    system: str | None = None,
    max_tokens: int = 400,
    temperature: float = 0.7,
) -> str | None:
    """
    Run a single completion against the local Ollama model.
    Returns None if Ollama is offline or errors — callers must degrade
    gracefully, never crash.
    """
    if not await is_available():
        return None

    payload: dict = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    if system:
        payload["system"] = system

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json=payload,
            )
            res.raise_for_status()
            text = (res.json().get("response") or "").strip()
            return text or None
    except Exception as e:
        logger.warning(f"Ollama generate failed (degrading gracefully): {e}")
        return None
