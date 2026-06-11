"""
My Bibi — User Pydantic models
"""

from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
