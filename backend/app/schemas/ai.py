"""
Pydantic schemas for AI processing results — Milestone 5.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.models.document import DocumentStatus


class TagResponse(BaseModel):
    id: uuid.UUID
    name: str
    model_config = {"from_attributes": True}


class AISummaryResponse(BaseModel):
    """Returned by GET /documents/{id}/summary."""
    document_id: uuid.UUID
    status: DocumentStatus
    category: Optional[str] = None
    subcategory: Optional[str] = None
    summary: Optional[str] = None
    ai_confidence: Optional[float] = None
    processed_at: Optional[datetime] = None
    tags: List[TagResponse] = []
    ai_error: Optional[str] = None
    model_config = {"from_attributes": True}


class AIMetadataResponse(BaseModel):
    """Returned by GET /documents/{id}/metadata."""
    document_id: uuid.UUID
    status: DocumentStatus
    category: Optional[str] = None
    ai_metadata: Optional[Dict[str, Any]] = None
    ai_confidence: Optional[float] = None
    ai_error: Optional[str] = None
    model_config = {"from_attributes": True}


class AITagsResponse(BaseModel):
    """Returned by GET /documents/{id}/tags."""
    document_id: uuid.UUID
    tags: List[TagResponse] = []
    model_config = {"from_attributes": True}


class ReprocessResponse(BaseModel):
    """Returned by POST /documents/{id}/reprocess-ai."""
    document_id: uuid.UUID
    message: str
    model_config = {"from_attributes": True}
