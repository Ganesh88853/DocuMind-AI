"""
Document ORM model for DocuMind AI — Milestone 5 update.
Added: AI processing columns (summary, subcategory, confidence, metadata, error)
       + many-to-many tags relationship.
"""

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    BigInteger, Boolean, DateTime, Enum, Float, ForeignKey,
    String, Text, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base

if TYPE_CHECKING:
    from app.models.document_content import DocumentContent
    from app.models.tag import Tag
    from app.models.user import User


class DocumentStatus(str, enum.Enum):
    """
    Full document processing lifecycle.

    Upload:         UPLOADING → READY (or FAILED)
    OCR:            OCR_PROCESSING → OCR_COMPLETED (or OCR_FAILED)
    AI:             AI_PROCESSING → COMPLETED
    Legacy/Admin:   PROCESSING, ARCHIVED
    """
    UPLOADING = "UPLOADING"
    READY = "READY"
    PROCESSING = "PROCESSING"      # legacy / backwards compat
    FAILED = "FAILED"
    ARCHIVED = "ARCHIVED"
    OCR_PROCESSING = "OCR_PROCESSING"
    OCR_COMPLETED = "OCR_COMPLETED"
    OCR_FAILED = "OCR_FAILED"
    AI_PROCESSING = "AI_PROCESSING"
    COMPLETED = "COMPLETED"


class Document(Base):
    """
    Represents an uploaded document owned by a User.
    Storage paths are never returned by the API.
    AI fields are populated asynchronously after OCR.
    """

    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    # File identity
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    file_extension: Mapped[str] = mapped_column(String(20), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)  # NEVER exposed via API
    file_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)  # SHA-256

    # User-editable metadata
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── AI-populated fields (Milestone 5) ─────────────────────────────────────
    subcategory: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)     # 0.0–100.0
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)         # structured extraction
    ai_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)              # failure reason
    # ──────────────────────────────────────────────────────────────────────────

    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="documentstatus"),
        default=DocumentStatus.UPLOADING, nullable=False, index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="documents")
    content: Mapped[Optional["DocumentContent"]] = relationship(
        "DocumentContent", back_populates="document",
        uselist=False, cascade="all, delete-orphan", lazy="select",
    )
    tags: Mapped[List["Tag"]] = relationship(
        "Tag", secondary="document_tags",
        back_populates="documents", lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Document id={self.id} filename={self.original_filename!r} status={self.status}>"
