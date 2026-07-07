"""
TagRepository — database operations for Tags and DocumentTag associations.
Key design: tags are global and reused. get_or_create ensures no duplicates.
"""

import uuid
from typing import List, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import DocumentTag, Tag


class TagRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create(self, name: str) -> Tag:
        """Return existing tag by name (case-insensitive) or create a new one."""
        normalised = name.lower().strip()
        result = await self.session.execute(
            select(Tag).where(Tag.name == normalised)
        )
        tag = result.scalar_one_or_none()
        if tag:
            return tag
        tag = Tag(name=normalised)
        self.session.add(tag)
        await self.session.flush()
        await self.session.refresh(tag)
        return tag

    async def get_or_create_many(self, names: List[str]) -> List[Tag]:
        """Bulk get-or-create for a list of tag names."""
        return [await self.get_or_create(n) for n in names if n.strip()]

    async def get_document_tags(self, document_id: uuid.UUID) -> List[Tag]:
        """Return all tags for a document."""
        result = await self.session.execute(
            select(Tag)
            .join(DocumentTag, DocumentTag.tag_id == Tag.id)
            .where(DocumentTag.document_id == document_id)
        )
        return list(result.scalars().all())

    async def set_document_tags(self, document_id: uuid.UUID, tags: List[Tag]) -> None:
        """Replace all tags on a document (delete old, insert new)."""
        # Remove existing associations
        await self.session.execute(
            delete(DocumentTag).where(DocumentTag.document_id == document_id)
        )
        # Insert new associations
        for tag in tags:
            self.session.add(DocumentTag(document_id=document_id, tag_id=tag.id))
        await self.session.flush()

    async def get_top_tags(self, limit: int = 10) -> List[dict]:
        """Return most-used tags with usage counts."""
        from sqlalchemy import func as sqlfunc
        result = await self.session.execute(
            select(Tag.name, sqlfunc.count(DocumentTag.document_id).label("count"))
            .join(DocumentTag, DocumentTag.tag_id == Tag.id)
            .group_by(Tag.name)
            .order_by(sqlfunc.count(DocumentTag.document_id).desc())
            .limit(limit)
        )
        return [{"name": row.name, "count": row.count} for row in result.all()]
