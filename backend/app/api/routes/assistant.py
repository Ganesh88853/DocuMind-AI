"""
Assistant API routes — Milestone 7 (Grounded RAG).

Endpoints:
  POST   /api/v1/assistant/chat                         — send a message
  GET    /api/v1/assistant/conversations                — list user's conversations
  GET    /api/v1/assistant/conversations/{id}           — get conversation + messages
  DELETE /api/v1/assistant/conversations/{id}           — delete a conversation
  POST   /api/v1/assistant/conversations/{id}/rename    — rename a conversation

Security: all routes require authentication; all queries are owner-scoped.
"""

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.gemini_provider import GeminiProvider
from app.core.config import settings
from app.database.database import get_db
from app.dependencies.auth import CurrentUser
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository
from app.schemas.assistant import (
    ChatRequest,
    ChatResponse,
    ConversationDetail,
    ConversationListResponse,
    ConversationSummary,
    DeleteResponse,
    MessageResponse,
    RenameRequest,
)
from app.services.assistant.assistant_service import AssistantService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Assistant"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


# ── POST /chat ─────────────────────────────────────────────────────────────────

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Send a message to the AI assistant",
)
async def chat(
    body: ChatRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ChatResponse:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI assistant is not configured. Add GEMINI_API_KEY to .env.",
        )

    provider = GeminiProvider(
        api_key=settings.GEMINI_API_KEY,
        model=settings.GEMINI_MODEL,
    )
    svc = AssistantService(session=db, provider=provider)

    try:
        result = await svc.chat(
            user_id=current_user.id,
            question=body.question,
            conversation_id=body.conversation_id,
        )
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        await db.rollback()
        logger.error("Chat error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your question.",
        )

    return ChatResponse(
        conversation_id=result.conversation_id,
        user_message=result.user_message,
        assistant_message=result.assistant_message,
        follow_up_questions=result.follow_up_questions,
    )


# ── GET /conversations ─────────────────────────────────────────────────────────

@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    summary="List all conversations",
)
async def list_conversations(
    current_user: CurrentUser,
    db: DbSession,
) -> ConversationListResponse:
    repo = ConversationRepository(db)
    convs = await repo.list_user_conversations(current_user.id)

    msg_repo = MessageRepository(db)
    summaries = []
    for conv in convs:
        msgs = await msg_repo.get_conversation_messages(conv.id, limit=200)
        summaries.append(ConversationSummary(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=len(msgs),
        ))

    return ConversationListResponse(conversations=summaries, total=len(summaries))


# ── GET /conversations/{id} ────────────────────────────────────────────────────

@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetail,
    summary="Get conversation with all messages",
)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> ConversationDetail:
    conv_repo = ConversationRepository(db)
    conv = await conv_repo.get_by_id(conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    msg_repo = MessageRepository(db)
    messages = await msg_repo.get_conversation_messages(conv.id)

    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[
            MessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                citations=m.citations,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


# ── DELETE /conversations/{id} ─────────────────────────────────────────────────

@router.delete(
    "/conversations/{conversation_id}",
    response_model=DeleteResponse,
    summary="Delete a conversation",
)
async def delete_conversation(
    conversation_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> DeleteResponse:
    repo = ConversationRepository(db)
    deleted = await repo.delete(conversation_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    await db.commit()
    return DeleteResponse(message="Conversation deleted.")


# ── POST /conversations/{id}/rename ───────────────────────────────────────────

@router.post(
    "/conversations/{conversation_id}/rename",
    response_model=ConversationSummary,
    summary="Rename a conversation",
)
async def rename_conversation(
    conversation_id: uuid.UUID,
    body: RenameRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ConversationSummary:
    repo = ConversationRepository(db)
    conv = await repo.update_title(conversation_id, current_user.id, body.title)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    await db.commit()

    msg_repo = MessageRepository(db)
    msgs = await msg_repo.get_conversation_messages(conv.id, limit=200)
    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=len(msgs),
    )
