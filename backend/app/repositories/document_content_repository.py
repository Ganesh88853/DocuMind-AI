"""
DocumentContentRepository — data-access layer for DocumentContent records.
Pure DB operations only. OCR logic belongs in OCRService.
"""

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_content import DocumentContent


class DocumentContentRepository:
    """Encapsulates all database operations for DocumentContent."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        document_id: uuid.UUID,
        extracted_text: Optional[str] = None,
        total_pages: Optional[int] = None,
        detected_language: Optional[str] = None,
        processing_time: Optional[float] = None,
        ocr_engine: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> DocumentContent:
        """Create a new DocumentContent record."""
        content = DocumentContent(
            document_id=document_id,
            extracted_text=extracted_text,
            total_pages=total_pages,
            detected_language=detected_language,
            processing_time=processing_time,
            ocr_engine=ocr_engine,
            error_message=error_message,
        )
        self.session.add(content)
        await self.session.flush()
        await self.session.refresh(content)
        return content

    async def get_by_document_id(self, document_id: uuid.UUID) -> Optional[DocumentContent]:
        """Fetch the content record for a document. Returns None if not yet processed."""
        result = await self.session.execute(
            select(DocumentContent).where(DocumentContent.document_id == document_id)
        )
        return result.scalar_one_or_none()

    async def update(self, content: DocumentContent, **fields) -> DocumentContent:
        """Apply field updates and flush to DB."""
        for key, value in fields.items():
            setattr(content, key, value)
        await self.session.flush()
        await self.session.refresh(content)
        return content

    async def upsert(
        self,
        document_id: uuid.UUID,
        **fields,
    ) -> DocumentContent:
        """Update existing content record or create one if it doesn't exist."""
        existing = await self.get_by_document_id(document_id)
        if existing:
            return await self.update(existing, **fields)
        return await self.create(document_id=document_id, **fields)
