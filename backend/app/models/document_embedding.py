"""
DocumentEmbedding ORM model — stores the semantic embedding for each document.
One embedding per document (1:1 relationship).
Embedding is stored as a JSONB list of floats (all-MiniLM-L6-v2 = 384 dims).
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class DocumentEmbedding(Base):
    """
    Semantic embedding for a document.
    Regenerated whenever OCR or AI reprocessing completes.
    """

    __tablename__ = "document_embeddings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # 1:1 relationship enforced at schema level
        index=True,
    )
    # The embedding vector stored as a list of floats in JSONB
    # all-MiniLM-L6-v2 produces 384-dimensional vectors
    embedding: Mapped[list] = mapped_column(JSONB, nullable=False)
    embedding_model: Mapped[str] = mapped_column(
        String(100), nullable=False, default="all-MiniLM-L6-v2",
    )
    # Track what text was combined to produce this embedding (for debugging)
    source_text_preview: Mapped[str] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<DocumentEmbedding doc_id={self.document_id} model={self.embedding_model}>"
