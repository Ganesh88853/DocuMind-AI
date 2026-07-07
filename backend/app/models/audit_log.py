"""
AuditLog — immutable append-only record of important user actions.

Never updated or deleted — only inserted. Provides a complete audit trail
for compliance, debugging, and security investigations.

Column types match the PostgreSQL schema exactly:
  - id, user_id: native UUID (not String) — asyncpg requires this to match
  - extra_data: JSON (works on both PostgreSQL prod and test environments)
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, JSON, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    # id is a native UUID column — asyncpg will reject a VARCHAR insert
    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Who — nullable so system/anonymous events can be logged
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True, index=True
    )

    # What
    action: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    # Examples: LOGIN, LOGOUT, UPLOAD, DELETE, DOWNLOAD, AI_CHAT,
    #           PASSWORD_RESET, EMAIL_VERIFIED, SETTINGS_CHANGED,
    #           ROLE_CHANGED, SESSION_REVOKED

    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # Examples: user, document, conversation, session

    resource_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # The UUID or identifier of the affected resource (kept as String — mixed types)

    # Context
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Extra structured data (status code, error message, filename, etc.)
    # JSON (not JSONB) works on both PostgreSQL prod and the test DB
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
