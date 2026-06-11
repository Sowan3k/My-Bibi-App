"""
My Bibi — Chat Pydantic models
"""

from pydantic import BaseModel
from typing import Optional


class MessageCreate(BaseModel):
    content: Optional[str] = None
    media_type: Optional[str] = None
    reply_to: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    sender_id: str
    sender_name: str
    content: Optional[str]
    media_type: Optional[str]
    media_path: Optional[str]
    reply_to: Optional[str]
    created_at: str
    is_mine: bool = False
