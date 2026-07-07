"""
Tag and DocumentTag ORM models for DocuMind AI.

Tag:         global reusable label (e.g. "invoice", "python", "finance")
DocumentTag: many-to-many join between Document and Tag
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class Tag(Base):
    """
    A reusable tag that can be applied to many documents.
    Tags are always lowercase and deduplicated in the database.
    """

    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    # Relationship back to documents
    documents: Mapped[list["Document"]] = relationship(  # type: ignore[name-defined]
        "Document",
        secondary="document_tags",
        back_populates="tags",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Tag name={self.name!r}>"


class DocumentTag(Base):
    """
    Explicit join table for the Document ↔ Tag many-to-many relationship.
    Using a model (not just a Table) so we can query it directly if needed.
    """

    __tablename__ = "document_tags"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )
