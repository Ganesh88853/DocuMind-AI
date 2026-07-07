"""
FastAPI dependency functions for authentication.
These are injected into route handlers via Depends() to enforce
that a valid Bearer token is present and belongs to an active user.
"""

import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.database.database import get_db
from app.models.user import User
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

# HTTPBearer extracts the Authorization: Bearer <token> header automatically
_bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer_scheme)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Dependency: extract and validate the Bearer token, return the User.
    Raises HTTP 401 if the token is missing, invalid, or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(credentials.credentials)
        subject: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")

        if subject is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    service = AuthService(session)
    return await service.get_user_by_token_subject(subject)


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Dependency: like get_current_user but additionally checks is_active.
    Use this for all endpoints that require a non-deactivated account.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )
    return current_user


# Annotated shortcuts for cleaner route signatures
CurrentUser = Annotated[User, Depends(get_current_active_user)]
