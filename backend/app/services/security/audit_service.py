"""
AuditService — thin wrapper that makes audit logging easy from routes/services.

Usage:
    audit = AuditService(db)
    await audit.log("LOGIN", user_id=user.id, ip_address=request.client.host)
"""

import uuid
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.audit_repository import AuditRepository


class AuditService:
    """Provides a simple interface for logging audit events."""

    def __init__(self, session: AsyncSession) -> None:
        self._repo = AuditRepository(session)

    async def log(
        self,
        action: str,
        user_id: Optional[uuid.UUID] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Fire-and-forget audit event. Errors are silently logged, not raised."""
        try:
            await self._repo.log(
                action=action,
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata=metadata,
            )
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error("Audit log failed: %s", exc)

    async def list_for_user(self, user_id: uuid.UUID, limit: int = 50):
        return await self._repo.list_for_user(user_id, limit)

    async def list_all(self, limit: int = 100, offset: int = 0):
        return await self._repo.list_all(limit, offset)
