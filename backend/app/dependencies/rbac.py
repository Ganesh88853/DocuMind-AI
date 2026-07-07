"""
RBAC dependency — role-based access control.

Usage in routes:
    @router.get("/admin/users")
    async def list_users(user: AdminUser):  # 403 if not admin
        ...
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.dependencies.auth import CurrentUser
from app.models.user import User


def require_role(required_role: str):
    """Factory that returns a dependency requiring a specific role."""
    async def _check(current_user: CurrentUser) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires the '{required_role}' role.",
            )
        return current_user
    return _check


async def _require_admin(current_user: CurrentUser) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


# Annotated shortcut
AdminUser = Annotated[User, Depends(_require_admin)]
