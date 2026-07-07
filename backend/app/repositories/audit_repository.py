"""
AuditRepository — append-only audit log writer.
"""

import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def log(
        self,
        action: str,
        user_id: Optional[uuid.UUID] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        entry = AuditLog(
            action=action,
            # user_id column is now UUID — pass the UUID object directly
            user_id=user_id,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=metadata,  # 'metadata' is reserved by SQLAlchemy
        )
        self.session.add(entry)
        await self.session.flush()
        return entry

    async def list_for_user(
        self, user_id: uuid.UUID, limit: int = 50
    ) -> List[AuditLog]:
        result = await self.session.execute(
            select(AuditLog)
            # user_id column is UUID — compare with UUID object directly
            .where(AuditLog.user_id == user_id)
            .order_by(AuditLog.timestamp.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_all(self, limit: int = 100, offset: int = 0) -> List[AuditLog]:
        result = await self.session.execute(
            select(AuditLog)
            .order_by(AuditLog.timestamp.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())
