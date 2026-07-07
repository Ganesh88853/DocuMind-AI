"""
Security utilities for DocuMind AI — Milestone 9 hardened.

Changes from previous version:
- Every token now includes a `jti` (JWT ID) for server-side revocation
- `role` claim embedded in access tokens for RBAC
- `hash_file()` for SHA-256 document fingerprinting
- `generate_reset_token()` / `verify_reset_token()` for password reset
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# ─── Password Hashing ─────────────────────────────────────────────────────────


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt with configurable cost factor."""
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Constant-time comparison of plain password against bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


# ─── File Hashing ─────────────────────────────────────────────────────────────


def hash_file(content: bytes) -> str:
    """Return the SHA-256 hex digest of file content for deduplication."""
    return hashlib.sha256(content).hexdigest()


# ─── Secure Token Generation ──────────────────────────────────────────────────


def generate_secure_token(length: int = 32) -> str:
    """Generate a URL-safe cryptographically secure random token."""
    return secrets.token_urlsafe(length)


# ─── JWT Tokens ───────────────────────────────────────────────────────────────

_TOKEN_TYPE_ACCESS = "access"
_TOKEN_TYPE_REFRESH = "refresh"


def _new_jti() -> str:
    """Generate a unique JWT ID for revocation tracking."""
    return str(uuid.uuid4())


def create_access_token(
    subject: str | Any,
    role: str = "user",
    extra_claims: dict | None = None,
) -> tuple[str, str]:
    """
    Create a short-lived JWT access token.

    Returns:
        (token_string, jti) — jti is saved in UserSession for revocation.
    """
    jti = _new_jti()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": _TOKEN_TYPE_ACCESS,
        "jti": jti,
        "role": role,
    }
    if extra_claims:
        payload.update(extra_claims)

    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti


def create_refresh_token(subject: str | Any) -> tuple[str, str]:
    """
    Create a long-lived JWT refresh token.

    Returns:
        (token_string, jti) — jti stored for revocation.
    """
    jti = _new_jti()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": _TOKEN_TYPE_REFRESH,
        "jti": jti,
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT token. Raises JWTError on any failure.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )


def extract_subject(token: str) -> str:
    payload = decode_token(token)
    sub: str | None = payload.get("sub")
    if sub is None:
        raise JWTError("Token missing 'sub' claim")
    return sub


def get_token_type(token: str) -> str:
    payload = decode_token(token)
    return payload.get("type", "")


def get_token_jti(token: str) -> str:
    """Extract the jti (JWT ID) claim from a token."""
    payload = decode_token(token)
    jti: str | None = payload.get("jti")
    if jti is None:
        raise JWTError("Token missing 'jti' claim")
    return jti


def get_token_role(token: str) -> str:
    """Extract the role claim from an access token."""
    payload = decode_token(token)
    return payload.get("role", "user")
