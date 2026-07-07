"""
Pydantic schemas for OCR results and processing status.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.document import DocumentStatus


class OCRResultResponse(BaseModel):
    """Full OCR result returned by GET /documents/{id}/text."""

    document_id: uuid.UUID
    status: DocumentStatus
    extracted_text: Optional[str] = None
    total_pages: Optional[int] = None
    detected_language: Optional[str] = None
    processing_time: Optional[float] = None
    ocr_engine: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ProcessingStatusResponse(BaseModel):
    """Lightweight status poll response for GET /documents/{id}/processing-status."""

    document_id: uuid.UUID
    status: DocumentStatus
    ocr_engine: Optional[str] = None
    processing_time: Optional[float] = None
    error_message: Optional[str] = None
    has_text: bool = False

    model_config = {"from_attributes": True}
