"""
Admin-only routes — protected by RBAC (role == 'admin').
Prefixed with /api/v1/admin by the central router.
"""

import logging
from typing import Annotated, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies.rbac import AdminUser
from app.schemas.security import AuditLogResponse
from app.schemas.user import UserResponse
from app.services.security.audit_service import AuditService
from app.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin"])
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    _: AdminUser,
    session: DbSession,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
) -> List[UserResponse]:
    """List all registered users. Admin only."""
    repo = UserRepository(session)
    users = await repo.list_all(limit=limit, offset=offset)
    return [UserResponse.model_validate(u) for u in users]


@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    _: AdminUser,
    session: DbSession,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
) -> List[AuditLogResponse]:
    """View all audit log entries. Admin only."""
    audit = AuditService(session)
    events = await audit.list_all(limit=limit, offset=offset)
    return [AuditLogResponse.model_validate(e) for e in events]


@router.post("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    admin: AdminUser,
    session: DbSession,
) -> dict:
    """Deactivate a user account. Admin only."""
    import uuid
    from fastapi import HTTPException
    repo = UserRepository(session)
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID.")

    user = await repo.get_by_id(uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account.")

    user.is_active = False
    audit = AuditService(session)
    await audit.log(
        action="USER_DEACTIVATED",
        user_id=admin.id,
        resource_type="user",
        resource_id=user_id,
        metadata={"target_email": user.email},
    )
    return {"message": f"User {user.email} deactivated."}
