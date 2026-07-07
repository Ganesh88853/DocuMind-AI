"""
Authentication service — Milestone 9 hardened.

Changes from previous version:
- login() creates a UserSession and logs LOGIN audit event
- logout() revokes refresh token JTI + deactivates session
- logout_all() revokes all sessions for the user
- refresh_tokens() validates JTI is not revoked, rotates session
- Added: request_password_reset(), confirm_password_reset()
- Added: verify_email(), resend_verification_email()
- All token functions now return (token, jti) tuples
"""

import logging
import uuid
from datetime import timedelta, timezone, datetime
from typing import Optional

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_secure_token,
    get_token_jti,
    get_token_type,
    extract_subject,
    hash_password,
    verify_password,
)
from app.repositories.audit_repository import AuditRepository
from app.repositories.revocation_repository import RevocationRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserResponse
from app.models.user import User
from app.services.security.email_service import EmailService
from app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory store for password reset tokens (production: use DB or Redis)
# Format: {token: {"user_id": str, "expires": datetime}}
_reset_tokens: dict = {}
# Format: {token: {"user_id": str, "expires": datetime}}
_verify_tokens: dict = {}


def _get_client_ip(request: Optional[Request]) -> Optional[str]:
    if request is None:
        return None
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _get_user_agent(request: Optional[Request]) -> Optional[str]:
    if request is None:
        return None
    return request.headers.get("User-Agent", "")


def _parse_device_hint(user_agent_str: Optional[str]) -> str:
    """Build a human-readable device hint from the user-agent string."""
    if not user_agent_str:
        return "Unknown device"
    try:
        from user_agents import parse
        ua = parse(user_agent_str)
        browser = ua.browser.family or "Unknown"
        os_name = ua.os.family or "Unknown"
        return f"{browser} on {os_name}"
    except Exception:
        return user_agent_str[:100]


class AuthService:
    """Handles all authentication workflows."""

    def __init__(self, session: AsyncSession, request: Optional[Request] = None) -> None:
        self.session = session
        self.request = request
        self.repo = UserRepository(session)
        self._sessions = SessionRepository(session)
        self._revocations = RevocationRepository(session)
        self._audit = AuditRepository(session)
        self._email = EmailService()

    # ─── Register ─────────────────────────────────────────────────────────────

    async def register(self, data: RegisterRequest) -> TokenResponse:
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )

        user = await self.repo.create(data)
        logger.info("New user registered: %s", user.email)

        # Send verification email (non-blocking — failure doesn't break registration)
        try:
            await self._send_verification_email(user)
        except Exception as exc:
            logger.warning("Verification email failed for %s: %s", user.email, exc)

        token_response = await self._create_session_and_tokens(user)

        await self._audit.log(
            action="REGISTER",
            user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            ip_address=_get_client_ip(self.request),
            user_agent=_get_user_agent(self.request),
        )
        return token_response

    # ─── Login ────────────────────────────────────────────────────────────────

    async def login(self, data: LoginRequest) -> TokenResponse:
        user = await self.repo.get_by_email(data.email)

        if not user or not verify_password(data.password, user.password_hash):
            await self._audit.log(
                action="LOGIN_FAILED",
                ip_address=_get_client_ip(self.request),
                user_agent=_get_user_agent(self.request),
                metadata={"email": data.email},
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated.",
            )

        await self.repo.update_last_login(user)
        token_response = await self._create_session_and_tokens(user)

        await self._audit.log(
            action="LOGIN",
            user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            ip_address=_get_client_ip(self.request),
            user_agent=_get_user_agent(self.request),
        )
        logger.info("User logged in: %s", user.email)
        return token_response

    # ─── Logout ───────────────────────────────────────────────────────────────

    async def logout(self, refresh_token: str, user: User) -> None:
        """Revoke the refresh token JTI and deactivate the session."""
        try:
            jti = get_token_jti(refresh_token)
            await self._revocations.revoke(jti, reason="logout")
            await self._sessions.deactivate_by_jti(jti)
        except Exception as exc:
            logger.warning("Logout cleanup error (non-fatal): %s", exc)

        await self._audit.log(
            action="LOGOUT",
            user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            ip_address=_get_client_ip(self.request),
            user_agent=_get_user_agent(self.request),
        )

    async def logout_all(self, user: User) -> int:
        """Revoke all active sessions. Returns session count revoked."""
        sessions = await self._sessions.list_active_for_user(user.id)
        count = 0
        for s in sessions:
            await self._revocations.revoke(s.refresh_jti, reason="logout_all")
            count += 1

        await self._sessions.deactivate_all_for_user(user.id)

        await self._audit.log(
            action="LOGOUT_ALL",
            user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            ip_address=_get_client_ip(self.request),
            user_agent=_get_user_agent(self.request),
            metadata={"sessions_revoked": count},
        )
        return count

    # ─── Refresh ──────────────────────────────────────────────────────────────

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        """Rotate token pair. Validates JTI not revoked."""
        try:
            token_type = get_token_type(refresh_token)
            if token_type != "refresh":
                raise ValueError("Not a refresh token")
            subject = extract_subject(refresh_token)
            jti = get_token_jti(refresh_token)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check revocation
        if await self._revocations.is_revoked(jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked.",
            )

        try:
            user_id = uuid.UUID(subject)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")

        user = await self.repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

        # Revoke old refresh token and create new session
        await self._revocations.revoke(jti, reason="rotated")
        await self._sessions.deactivate_by_jti(jti)
        return await self._create_session_and_tokens(user)

    # ─── Sessions ─────────────────────────────────────────────────────────────

    async def get_active_sessions(self, user: User):
        return await self._sessions.list_active_for_user(user.id)

    async def revoke_session(self, session_id: uuid.UUID, user: User) -> None:
        session = await self._sessions.get_by_id(session_id)
        if not session or session.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
        await self._revocations.revoke(session.refresh_jti, reason="user_revoked")
        await self._sessions.deactivate(session_id)
        await self._audit.log(
            action="SESSION_REVOKED",
            user_id=user.id,
            resource_type="session",
            resource_id=str(session_id),
            ip_address=_get_client_ip(self.request),
        )

    # ─── Password Reset ───────────────────────────────────────────────────────

    async def request_password_reset(self, email: str) -> None:
        """Always returns success to prevent email enumeration."""
        user = await self.repo.get_by_email(email)
        if not user:
            return  # Intentionally silent

        token = generate_secure_token()
        _reset_tokens[token] = {
            "user_id": str(user.id),
            "expires": datetime.now(timezone.utc) + timedelta(hours=1),
        }

        await self._email.send_password_reset(user.email, token, user.full_name)
        await self._audit.log(
            action="PASSWORD_RESET_REQUESTED",
            user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            ip_address=_get_client_ip(self.request),
        )

    async def confirm_password_reset(self, token: str, new_password: str) -> None:
        entry = _reset_tokens.get(token)
        if not entry or datetime.now(timezone.utc) > entry["expires"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token.")

        user = await self.repo.get_by_id(uuid.UUID(entry["user_id"]))
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        await self.repo.update_password(user, new_password)
        _reset_tokens.pop(token, None)

        # Revoke all sessions on password change
        await self.logout_all(user)

        await self._audit.log(
            action="PASSWORD_RESET_COMPLETED",
            user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            ip_address=_get_client_ip(self.request),
        )

    # ─── Email Verification ───────────────────────────────────────────────────

    async def verify_email(self, token: str) -> None:
        entry = _verify_tokens.get(token)
        if not entry or datetime.now(timezone.utc) > entry["expires"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token.")

        user = await self.repo.get_by_id(uuid.UUID(entry["user_id"]))
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        await self.repo.update_verified(user, verified=True)
        _verify_tokens.pop(token, None)

        await self._audit.log(
            action="EMAIL_VERIFIED",
            user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
        )

    async def resend_verification_email(self, user: User) -> None:
        await self._send_verification_email(user)
        await self._audit.log(
            action="EMAIL_VERIFY_RESENT",
            user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
        )

    # ─── Token subject resolution (used by auth dependency) ──────────────────

    async def get_user_by_token_subject(self, subject: str) -> User:
        try:
            user_id = uuid.UUID(subject)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")

        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")
        return user

    # ─── Internal helpers ─────────────────────────────────────────────────────

    async def _create_session_and_tokens(self, user: User) -> TokenResponse:
        access_token, _access_jti = create_access_token(
            subject=str(user.id), role=user.role
        )
        refresh_token, refresh_jti = create_refresh_token(subject=str(user.id))

        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        await self._sessions.create(
            user_id=user.id,
            refresh_jti=refresh_jti,
            ip_address=_get_client_ip(self.request),
            user_agent=_get_user_agent(self.request),
            device_hint=_parse_device_hint(_get_user_agent(self.request)),
            expires_at=expires_at,
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user),
        )

    async def _send_verification_email(self, user: User) -> None:
        token = generate_secure_token()
        _verify_tokens[token] = {
            "user_id": str(user.id),
            "expires": datetime.now(timezone.utc) + timedelta(hours=24),
        }
        await self._email.send_email_verification(user.email, token, user.full_name)
