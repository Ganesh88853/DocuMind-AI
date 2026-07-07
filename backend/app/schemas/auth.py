"""
Pydantic v2 schemas for authentication endpoints.
All password validation rules are enforced at this layer before reaching
the service or database layers.
"""

import re

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.user import UserResponse

# ─── Password Rules ───────────────────────────────────────────────────────────

_PASSWORD_RULES = [
    (r".{8,}", "at least 8 characters"),
    (r"[A-Z]", "at least one uppercase letter"),
    (r"[a-z]", "at least one lowercase letter"),
    (r"\d", "at least one number"),
    (r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]", "at least one special character"),
]


def _validate_password_strength(password: str) -> str:
    """Raise ValueError listing all unmet password requirements."""
    failures = [msg for pattern, msg in _PASSWORD_RULES if not re.search(pattern, password)]
    if failures:
        raise ValueError(f"Password must contain: {', '.join(failures)}")
    return password


# ─── Request Schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """Input schema for POST /api/v1/auth/register."""

    full_name: str = Field(..., min_length=2, max_length=255, examples=["Jane Doe"])
    email: EmailStr = Field(..., examples=["jane@example.com"])
    password: str = Field(..., min_length=8, examples=["Secret@123"])
    confirm_password: str = Field(..., examples=["Secret@123"])

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    """Input schema for POST /api/v1/auth/login."""

    email: EmailStr = Field(..., examples=["jane@example.com"])
    password: str = Field(..., examples=["Secret@123"])


class RefreshRequest(BaseModel):
    """Input schema for POST /api/v1/auth/refresh."""

    refresh_token: str = Field(..., description="A valid, non-expired refresh JWT")


# ─── Response Schemas ─────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    """Returned by /register and /login on success."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """Generic success/info message response."""

    message: str
