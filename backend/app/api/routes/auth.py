"""
Authentication routes — Milestone 9 hardened.
Prefixed with /api/v1/auth by the central router.

New endpoints:
  POST /logout          — revokes refresh token, deactivates session
  POST /logout-all      — revokes all sessions for current user
  GET  /sessions        — list active sessions
  DELETE /sessions/{id} — revoke specific session
  POST /password-reset/request   — send reset email
  POST /password-reset/confirm   — apply reset with token
  POST /email/verify             — verify email with token
  POST /email/resend             — resend verification email
  POST /password/change          — change password (authenticated)
"""

import logging
import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.security import (
    AuditLogResponse,
    ChangePasswordSchema,
    EmailVerifySchema,
    PasswordResetConfirmSchema,
    PasswordResetRequestSchema,
    SessionResponse,
)
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.services.security.audit_service import AuditService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])
DbSession = Annotated[AsyncSession, Depends(get_db)]


# ─── Register / Login / Refresh / Me ─────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, request: Request, session: DbSession) -> TokenResponse:
    return await AuthService(session, request).register(body)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, session: DbSession) -> TokenResponse:
    return await AuthService(session, request).login(body)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, request: Request, session: DbSession) -> TokenResponse:
    return await AuthService(session, request).refresh_tokens(body.refresh_token)


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)


# ─── Logout ───────────────────────────────────────────────────────────────────

@router.post("/logout", response_model=MessageResponse)
async def logout(
    body: RefreshRequest,
    current_user: CurrentUser,
    request: Request,
    session: DbSession,
) -> MessageResponse:
    """Logout: revoke this refresh token and deactivate its session."""
    await AuthService(session, request).logout(body.refresh_token, current_user)
    return MessageResponse(message="Successfully logged out.")


@router.post("/logout-all", response_model=MessageResponse)
async def logout_all(
    current_user: CurrentUser,
    request: Request,
    session: DbSession,
) -> MessageResponse:
    """Revoke all active sessions — logout from every device."""
    count = await AuthService(session, request).logout_all(current_user)
    return MessageResponse(message=f"Logged out from {count} session(s).")


# ─── Sessions ─────────────────────────────────────────────────────────────────

@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(current_user: CurrentUser, session: DbSession) -> List[SessionResponse]:
    """List all active sessions for the current user."""
    svc = AuthService(session)
    sessions = await svc.get_active_sessions(current_user)
    return [SessionResponse.model_validate(s) for s in sessions]


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    request: Request,
    session: DbSession,
) -> MessageResponse:
    """Revoke a specific session by ID."""
    await AuthService(session, request).revoke_session(session_id, current_user)
    return MessageResponse(message="Session revoked.")


# ─── Password Reset ───────────────────────────────────────────────────────────

@router.post("/password-reset/request", response_model=MessageResponse)
async def request_password_reset(
    body: PasswordResetRequestSchema,
    request: Request,
    session: DbSession,
) -> MessageResponse:
    """Request a password reset email. Always returns 200 (no email enumeration)."""
    await AuthService(session, request).request_password_reset(body.email)
    return MessageResponse(message="If an account exists, a reset email has been sent.")


@router.post("/password-reset/confirm", response_model=MessageResponse)
async def confirm_password_reset(
    body: PasswordResetConfirmSchema,
    request: Request,
    session: DbSession,
) -> MessageResponse:
    """Confirm password reset with token from email."""
    await AuthService(session, request).confirm_password_reset(body.token, body.new_password)
    return MessageResponse(message="Password reset successfully. Please log in.")


# ─── Email Verification ───────────────────────────────────────────────────────

@router.post("/email/verify", response_model=MessageResponse)
async def verify_email(
    body: EmailVerifySchema,
    request: Request,
    session: DbSession,
) -> MessageResponse:
    """Verify email address with token from verification email."""
    await AuthService(session, request).verify_email(body.token)
    return MessageResponse(message="Email verified successfully.")


@router.post("/email/resend", response_model=MessageResponse)
async def resend_verification(
    current_user: CurrentUser,
    request: Request,
    session: DbSession,
) -> MessageResponse:
    """Resend email verification email."""
    await AuthService(session, request).resend_verification_email(current_user)
    return MessageResponse(message="Verification email sent.")


# ─── Password Change (authenticated) ─────────────────────────────────────────

@router.post("/password/change", response_model=MessageResponse)
async def change_password(
    body: ChangePasswordSchema,
    current_user: CurrentUser,
    request: Request,
    session: DbSession,
) -> MessageResponse:
    """Change password for the currently authenticated user."""
    from app.core.security import verify_password
    if not verify_password(body.current_password, current_user.password_hash):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    from app.repositories.user_repository import UserRepository
    repo = UserRepository(session)
    await repo.update_password(current_user, body.new_password)

    # Revoke all sessions on password change for security
    svc = AuthService(session, request)
    await svc.logout_all(current_user)

    audit = AuditService(session)
    await audit.log(
        action="PASSWORD_CHANGED",
        user_id=current_user.id,
        resource_type="user",
        resource_id=str(current_user.id),
        ip_address=request.client.host if request.client else None,
    )
    return MessageResponse(message="Password changed. Please log in again.")


# ─── Audit Log (own events) ───────────────────────────────────────────────────

@router.get("/audit-log", response_model=List[AuditLogResponse])
async def my_audit_log(
    current_user: CurrentUser,
    session: DbSession,
) -> List[AuditLogResponse]:
    """Return the last 50 security events for the current user."""
    audit = AuditService(session)
    events = await audit.list_for_user(current_user.id, limit=50)
    return [AuditLogResponse.model_validate(e) for e in events]
