"""
Security-related Pydantic schemas (Milestone 9).
"""

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, EmailStr, Field


class SessionResponse(BaseModel):
    id: uuid.UUID
    ip_address: Optional[str] = None
    device_hint: Optional[str] = None
    created_at: datetime
    last_activity: datetime
    is_active: bool

    model_config = {"from_attributes": True}


class PasswordResetRequestSchema(BaseModel):
    email: EmailStr


class PasswordResetConfirmSchema(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8)


class EmailVerifySchema(BaseModel):
    token: str = Field(..., min_length=10)


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class ChangePasswordSchema(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
