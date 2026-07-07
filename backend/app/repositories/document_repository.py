"""
Document repository — data-access layer for Document operations.
Pure SQL/ORM logic only. No business rules here.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentStatus


class DocumentRepository:
    """Encapsulates all database operations for the Document model."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ─── Create ───────────────────────────────────────────────────────────────

    async def create(
        self,
        owner_id: uuid.UUID,
        original_filename: str,
        stored_filename: str,
        file_extension: str,
        mime_type: str,
        file_size: int,
        storage_path: str,
        status: DocumentStatus = DocumentStatus.UPLOADING,
        file_hash: Optional[str] = None,
    ) -> Document:
        """Persist a new Document record. Returns the saved instance with its UUID."""
        doc = Document(
            owner_id=owner_id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_extension=file_extension,
            mime_type=mime_type,
            file_size=file_size,
            storage_path=storage_path,
            status=status,
            file_hash=file_hash,
        )
        self.session.add(doc)
        await self.session.flush()
        await self.session.refresh(doc)
        return doc

    # ─── Read ─────────────────────────────────────────────────────────────────

    async def get_by_id(self, doc_id: uuid.UUID) -> Optional[Document]:
        """Fetch a single document by UUID. Returns None if not found."""
        result = await self.session.execute(
            select(Document).where(Document.id == doc_id)
        )
        return result.scalar_one_or_none()

    async def get_paginated(
        self,
        owner_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        favorites_only: bool = False,
    ) -> Tuple[List[Document], int]:
        """
        Fetch a paginated list of documents for a given owner.
        Optionally filter by filename search or favorites flag.
        Returns (items, total_count).
        """
        base_filter = Document.owner_id == owner_id

        filters = [base_filter]
        if search:
            filters.append(Document.original_filename.ilike(f"%{search}%"))
        if favorites_only:
            filters.append(Document.is_favorite.is_(True))

        where_clause = and_(*filters)

        # Total count
        count_result = await self.session.execute(
            select(func.count()).select_from(Document).where(where_clause)
        )
        total: int = count_result.scalar_one()

        # Paginated results — newest first
        offset = (page - 1) * page_size
        docs_result = await self.session.execute(
            select(Document)
            .where(where_clause)
            .order_by(Document.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        docs = list(docs_result.scalars().all())

        return docs, total

    # ─── Update ───────────────────────────────────────────────────────────────

    async def update(self, doc: Document, **fields) -> Document:
        """Apply arbitrary field updates to a Document and flush to DB."""
        for key, value in fields.items():
            setattr(doc, key, value)
        await self.session.flush()
        await self.session.refresh(doc)
        return doc

    # ─── Delete ───────────────────────────────────────────────────────────────

    async def delete(self, doc: Document) -> None:
        """Remove the Document record from the database."""
        await self.session.delete(doc)
        await self.session.flush()

    # ─── Duplicate Check ──────────────────────────────────────────────────────

    async def is_duplicate(self, owner_id: uuid.UUID, filename: str) -> bool:
        """Returns True if the same owner uploaded this filename within 60 seconds."""
        one_minute_ago = datetime.now(timezone.utc) - timedelta(seconds=60)
        result = await self.session.execute(
            select(Document).where(
                and_(
                    Document.owner_id == owner_id,
                    Document.original_filename == filename,
                    Document.created_at >= one_minute_ago,
                )
            )
        )
        return result.scalar_one_or_none() is not None

    async def is_duplicate_by_hash(self, owner_id: uuid.UUID, file_hash: str) -> bool:
        """Returns True if the same owner already has a file with this SHA-256 hash."""
        result = await self.session.execute(
            select(Document).where(
                and_(
                    Document.owner_id == owner_id,
                    Document.file_hash == file_hash,
                )
            )
        )
        return result.scalar_one_or_none() is not None
