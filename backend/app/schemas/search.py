"""
Pydantic schemas for the semantic search API — Milestone 6.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SearchFilters(BaseModel):
    """Optional filters to narrow search results."""
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    favorites_only: bool = False
    file_type: Optional[str] = None    # e.g. "pdf", "docx"
    status: Optional[str] = None       # e.g. "COMPLETED"


class SearchRequest(BaseModel):
    """Body for POST /api/v1/search."""
    query: str = Field(..., min_length=1, max_length=500)
    filters: Optional[SearchFilters] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(10, ge=1, le=50)


class SearchResultTag(BaseModel):
    id: uuid.UUID
    name: str


class SearchResult(BaseModel):
    """Single document result in a search response."""
    document_id: uuid.UUID
    original_filename: str
    file_extension: str
    file_size: int
    category: Optional[str] = None
    subcategory: Optional[str] = None
    summary: Optional[str] = None
    ai_confidence: Optional[float] = None
    tags: List[SearchResultTag] = []
    is_favorite: bool = False
    created_at: datetime
    status: str

    # Search-specific fields
    semantic_score: float               # 0.0–1.0 cosine similarity
    final_score: float                  # 0.0–1.0 ranked score
    confidence_pct: int                 # final_score * 100, for display
    match_explanation: str              # human-readable explanation
    ai_metadata: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}


class SearchResponse(BaseModel):
    """Response from POST /api/v1/search."""
    query: str
    total: int
    page: int
    page_size: int
    total_pages: int
    results: List[SearchResult]
    search_time_ms: float


class SearchSuggestion(BaseModel):
    text: str
    type: str              # "recent" | "popular" | "filter"
    filter_key: Optional[str] = None
    filter_value: Optional[str] = None


class SearchSuggestionsResponse(BaseModel):
    """Response from GET /api/v1/search/suggestions."""
    recent: List[str]
    categories: List[str]
    tags: List[str]


class SearchHistoryItem(BaseModel):
    id: uuid.UUID
    query: str
    result_count: int
    created_at: datetime
    model_config = {"from_attributes": True}
