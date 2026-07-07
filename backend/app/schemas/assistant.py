"""
Pydantic schemas for the AI Assistant API (Milestone 7).
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ─── Request ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[uuid.UUID] = None  # None → create new conversation


class RenameRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


# ─── Citation ─────────────────────────────────────────────────────────────────

class Citation(BaseModel):
    document_id: uuid.UUID
    filename: str
    relevance_score: float
    excerpt: str


# ─── Message ──────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    citations: Optional[list[Citation]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Conversation ─────────────────────────────────────────────────────────────

class ConversationSummary(BaseModel):
    id: uuid.UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: uuid.UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse]

    model_config = {"from_attributes": True}


# ─── Responses ────────────────────────────────────────────────────────────────

class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    user_message: MessageResponse
    assistant_message: MessageResponse
    follow_up_questions: list[str] = []


class ConversationListResponse(BaseModel):
    conversations: list[ConversationSummary]
    total: int


class DeleteResponse(BaseModel):
    message: str
