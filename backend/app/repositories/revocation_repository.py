"""
RevocationRepository — token deny-list backed by PostgreSQL.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.refresh_token_revocation import RefreshTokenRevocation


class RevocationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def revoke(self, jti: str, reason: str = "logout") -> None:
        """Add a JTI to the revocation list. No-op if already revoked."""
        existing = await self.is_revoked(jti)
        if not existing:
            row = RefreshTokenRevocation(jti=jti, reason=reason)
            self.session.add(row)
            await self.session.flush()

    async def is_revoked(self, jti: str) -> bool:
        result = await self.session.execute(
            select(RefreshTokenRevocation).where(RefreshTokenRevocation.jti == jti)
        )
        return result.scalar_one_or_none() is not None
