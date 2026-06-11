"""
My Bibi — Memory Pydantic models
"""

from pydantic import BaseModel
from typing import Optional


class MemoryCreate(BaseModel):
    title: str
    content: Optional[str] = None
    memory_date: str  # YYYY-MM-DD


class MemoryResponse(BaseModel):
    id: str
    created_by: str
    created_by_name: str
    title: str
    content: Optional[str]
    media_path: Optional[str]
    memory_date: str
    created_at: str
