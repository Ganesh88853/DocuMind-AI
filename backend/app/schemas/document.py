"""
Pydantic v2 schemas for Document API.
storage_path is intentionally excluded from all response schemas — never exposed to clients.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.document import DocumentStatus


# ─── Response Schemas ─────────────────────────────────────────────────────────


class DocumentResponse(BaseModel):
    """Safe serialisation of a Document — excludes storage_path."""

    id: uuid.UUID
    owner_id: uuid.UUID
    original_filename: str
    file_extension: str
    mime_type: str
    file_size: int
    category: Optional[str] = None
    description: Optional[str] = None
    is_favorite: bool
    status: DocumentStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    """Paginated list of documents with metadata."""

    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ─── Request / Update Schemas ─────────────────────────────────────────────────


class DocumentUpdate(BaseModel):
    """Partial update schema — all fields optional."""

    category: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)


class FavoriteResponse(BaseModel):
    """Response after toggling favorite."""

    id: uuid.UUID
    is_favorite: bool

    model_config = {"from_attributes": True}
