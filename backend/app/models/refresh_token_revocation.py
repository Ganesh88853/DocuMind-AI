"""
RefreshTokenRevocation — token deny-list stored in PostgreSQL.

When a refresh token is revoked (logout, logout-all, password change),
its JTI is written here. The auth dependency checks this table before
accepting a refresh token.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class RefreshTokenRevocation(Base):
    __tablename__ = "refresh_token_revocations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    jti: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    revoked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    reason: Mapped[str] = mapped_column(
        Text, nullable=False, default="logout"
    )  # logout | logout_all | password_change | admin
