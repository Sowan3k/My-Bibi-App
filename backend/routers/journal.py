"""
My Bibi — Journal router

MIRROR PRINCIPLE strictly enforced at every endpoint.
No endpoint returns data belonging to a different user.

Endpoints:
  GET    /api/journal       — List own entries
  POST   /api/journal       — Create entry
  GET    /api/journal/{id}  — Get own entry
  PATCH  /api/journal/{id}  — Update own entry
  DELETE /api/journal/{id}  — Delete own entry
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from middleware.auth_middleware import get_current_user
from services.journal_service import (
    get_entries,
    create_entry,
    get_entry,
    update_entry,
    delete_entry,
)

router = APIRouter()
logger = logging.getLogger(__name__)


class CreateEntryRequest(BaseModel):
    title: Optional[str] = None
    content: str


class UpdateEntryRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


@router.get("")
async def list_entries(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all journal entries for the current user only.
    MIRROR PRINCIPLE: never returns another user's entries.
    """
    return await get_entries(db, current_user["id"])


@router.post("", status_code=201)
async def create(
    request: CreateEntryRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new journal entry. Saved to DB and markdown vault."""
    return await create_entry(
        db=db,
        user_id=current_user["id"],
        title=request.title,
        content=request.content,
    )


@router.get("/{entry_id}")
async def get_one(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single journal entry.
    MIRROR PRINCIPLE: raises 403 if entry belongs to another user.
    """
    return await get_entry(db, current_user["id"], entry_id)


@router.patch("/{entry_id}")
async def update(
    entry_id: str,
    request: UpdateEntryRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a journal entry.
    MIRROR PRINCIPLE: only the author can update their entry.
    """
    return await update_entry(
        db=db,
        user_id=current_user["id"],
        entry_id=entry_id,
        title=request.title,
        content=request.content,
    )


@router.delete("/{entry_id}", status_code=204)
async def delete(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a journal entry. Also removes the markdown file from vault.
    MIRROR PRINCIPLE: only the author can delete their entry.
    """
    await delete_entry(db, current_user["id"], entry_id)
