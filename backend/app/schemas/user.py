"""
Pydantic v2 schemas for User resources.
These are used for serialisation and deserialisation of user data.
password_hash is NEVER included in any response schema.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Shared fields across all user schemas."""

    full_name: str = Field(..., min_length=2, max_length=255, examples=["Jane Doe"])
    email: EmailStr = Field(..., examples=["jane@example.com"])


class UserResponse(UserBase):
    """
    Safe public representation of a User.
    Excludes password_hash and any other sensitive fields.
    """

    id: uuid.UUID
    profile_image: str | None = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: datetime | None = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Partial schema for updating user profile fields."""

    full_name: str | None = Field(None, min_length=2, max_length=255)
    profile_image: str | None = None

    model_config = {"from_attributes": True}
