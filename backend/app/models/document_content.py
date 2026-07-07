"""
DocumentContent ORM model — stores OCR-extracted text for a document.
One Document has at most one DocumentContent record (1:1 relationship).
This model is intentionally separate from Document to keep the upload
domain clean and allow lazy loading of potentially large text content.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class DocumentContent(Base):
    """
    Stores the result of OCR processing for a Document.

    Kept in a separate table because:
    - extracted_text can be very large (MB of text)
    - Not always needed — avoids loading text when listing documents
    - Makes the processing pipeline independently testable
    """

    __tablename__ = "document_contents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # 1:1 relationship enforced at DB level
        index=True,
    )

    # OCR output
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    detected_language: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Performance & provenance
    processing_time: Mapped[float | None] = mapped_column(Float, nullable=True)   # seconds
    ocr_engine: Mapped[str | None] = mapped_column(String(50), nullable=True)     # e.g. "pdf_embedded", "docx", "tesseract"
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)         # set on OCR_FAILED

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationship back to Document
    document: Mapped["Document"] = relationship(  # type: ignore[name-defined]
        "Document", back_populates="content"
    )

    def __repr__(self) -> str:
        words = len(self.extracted_text.split()) if self.extracted_text else 0
        return f"<DocumentContent doc={self.document_id} words={words} engine={self.ocr_engine!r}>"
