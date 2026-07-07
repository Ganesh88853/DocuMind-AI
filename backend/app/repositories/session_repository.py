"""
SessionRepository — manages UserSession records.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_session import UserSession


class SessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        user_id: uuid.UUID,
        refresh_jti: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_hint: Optional[str] = None,
        expires_at: Optional[datetime] = None,
    ) -> UserSession:
        s = UserSession(
            user_id=user_id,
            refresh_jti=refresh_jti,
            ip_address=ip_address,
            user_agent=user_agent,
            device_hint=device_hint,
            expires_at=expires_at,
        )
        self.session.add(s)
        await self.session.flush()
        await self.session.refresh(s)
        return s

    async def get_by_refresh_jti(self, jti: str) -> Optional[UserSession]:
        result = await self.session.execute(
            select(UserSession).where(UserSession.refresh_jti == jti)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, session_id: uuid.UUID) -> Optional[UserSession]:
        result = await self.session.execute(
            select(UserSession).where(UserSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def list_active_for_user(self, user_id: uuid.UUID) -> List[UserSession]:
        result = await self.session.execute(
            select(UserSession)
            .where(UserSession.user_id == user_id, UserSession.is_active == True)
            .order_by(UserSession.last_activity.desc())
        )
        return list(result.scalars().all())

    async def deactivate(self, session_id: uuid.UUID) -> None:
        await self.session.execute(
            update(UserSession)
            .where(UserSession.id == session_id)
            .values(is_active=False)
        )

    async def deactivate_by_jti(self, jti: str) -> None:
        await self.session.execute(
            update(UserSession)
            .where(UserSession.refresh_jti == jti)
            .values(is_active=False)
        )

    async def deactivate_all_for_user(self, user_id: uuid.UUID) -> int:
        """Deactivate all sessions for a user. Returns count."""
        from sqlalchemy import func as sqlfunc
        result = await self.session.execute(
            update(UserSession)
            .where(UserSession.user_id == user_id, UserSession.is_active == True)
            .values(is_active=False)
        )
        return result.rowcount

    async def touch(self, refresh_jti: str) -> None:
        """Update last_activity timestamp."""
        from sqlalchemy import func as sqlfunc
        await self.session.execute(
            update(UserSession)
            .where(UserSession.refresh_jti == refresh_jti)
            .values(last_activity=sqlfunc.now())
        )
