"""
AssistantService — orchestrates the full Grounded RAG pipeline.

Pipeline per chat turn:
  1. Load or create conversation
  2. Save user message
  3. Load recent history
  4. IntentService.analyze(question)
  5. RetrievalService.retrieve(user_id, question)
  6. ContextBuilder.build(retrieved_docs)
  7. PromptBuilder.build(intent, context, history, question)
  8. GeminiProvider.generate(prompt) → parse JSON
  9. CitationFormatter.format(retrieved_docs)
  10. Save assistant message (with citations)
  11. Touch conversation updated_at
  12. Return ChatResult

If LLM fails: save a graceful error message so the conversation is not broken.
"""

import json
import logging
import time
import uuid
from dataclasses import dataclass
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.base import AIProvider, AIProviderError
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository
from app.schemas.assistant import Citation, MessageResponse
from app.services.assistant.citation_formatter import CitationFormatter
from app.services.assistant.context_builder import ContextBuilder
from app.services.assistant.intent_service import IntentService
from app.services.assistant.prompt_builder import PromptBuilder
from app.services.assistant.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)

_NO_DOCS_RESPONSE = (
    "I couldn't find any relevant documents in your collection for this question. "
    "Try uploading documents first, or ask about something covered in your existing documents."
)


@dataclass
class ChatResult:
    conversation_id: uuid.UUID
    user_message: MessageResponse
    assistant_message: MessageResponse
    follow_up_questions: List[str]


class AssistantService:
    """
    Orchestrates the full RAG pipeline for one chat turn.
    Constructed once per request with a shared DB session.
    """

    def __init__(self, session: AsyncSession, provider: AIProvider) -> None:
        self.session = session
        self.provider = provider
        self._conv_repo = ConversationRepository(session)
        self._msg_repo = MessageRepository(session)
        self._intent_svc = IntentService()
        self._retrieval_svc = RetrievalService(session)
        self._context_builder = ContextBuilder()
        self._prompt_builder = PromptBuilder()
        self._citation_fmt = CitationFormatter()

    async def chat(
        self,
        user_id: uuid.UUID,
        question: str,
        conversation_id: Optional[uuid.UUID] = None,
    ) -> ChatResult:
        start = time.perf_counter()

        # ── 1. Load or create conversation ───────────────────────────────────
        if conversation_id:
            conv = await self._conv_repo.get_by_id(conversation_id, user_id)
            if not conv:
                raise ValueError(f"Conversation {conversation_id} not found.")
        else:
            # Auto-title from the first question (first 60 chars)
            title = question[:60] + ("…" if len(question) > 60 else "")
            conv = await self._conv_repo.create(user_id=user_id, title=title)

        # ── 2. Save user message ──────────────────────────────────────────────
        user_msg = await self._msg_repo.create(
            conversation_id=conv.id,
            role="user",
            content=question,
        )

        # ── 3. Load recent history (last 10 messages) ─────────────────────────
        all_messages = await self._msg_repo.get_conversation_messages(conv.id, limit=20)
        # Exclude the message we just saved (it's the last one)
        history_msgs = all_messages[:-1][-10:]
        history: List[Tuple[str, str]] = [(m.role, m.content) for m in history_msgs]

        # ── 4. Analyze intent ─────────────────────────────────────────────────
        intent = self._intent_svc.analyze(question)
        logger.info("Intent: %s for question: %.60s", intent.type, question)

        # ── 5. Retrieve relevant documents ────────────────────────────────────
        retrieved_docs = await self._retrieval_svc.retrieve(user_id, question)

        citations: List[Citation] = []
        follow_up: List[str] = []
        answer_text: str

        if not retrieved_docs:
            # No documents found — answer without LLM to save quota
            answer_text = _NO_DOCS_RESPONSE
        else:
            # ── 6. Build context ──────────────────────────────────────────────
            context = self._context_builder.build(retrieved_docs)

            # ── 7. Build prompt ───────────────────────────────────────────────
            prompt = self._prompt_builder.build(
                question=question,
                context=context,
                intent=intent,
                history=history,
            )
            logger.info(
                "Prompt built: %d chars, %d docs in context",
                len(prompt), context.doc_count,
            )

            # ── 8. Call LLM ───────────────────────────────────────────────────
            try:
                llm_start = time.perf_counter()
                raw = await self.provider.generate(prompt, json_mode=True)
                llm_elapsed = round(time.perf_counter() - llm_start, 2)
                logger.info("LLM responded in %.2fs", llm_elapsed)

                parsed = json.loads(raw)
                answer_text = str(parsed.get("answer", "")).strip()
                follow_up = [
                    str(q) for q in parsed.get("follow_up_questions", [])
                    if isinstance(q, str) and q.strip()
                ][:3]

                if not answer_text:
                    answer_text = "I couldn't generate a response. Please try again."

            except AIProviderError as exc:
                logger.error("LLM call failed: %s", exc)
                answer_text = (
                    "I'm temporarily unable to answer — the AI service returned an error. "
                    "Please try again in a few moments."
                )
            except (json.JSONDecodeError, ValueError) as exc:
                logger.error("LLM response parse error: %s", exc)
                answer_text = "I received an unexpected response. Please try again."

            # ── 9. Format citations ───────────────────────────────────────────
            citations = self._citation_fmt.format(retrieved_docs)

        # ── 10. Save assistant message ────────────────────────────────────────
        citation_dicts = [c.model_dump(mode="json") for c in citations]
        retrieved_ids = [str(rd.document.id) for rd in retrieved_docs]

        assistant_msg = await self._msg_repo.create(
            conversation_id=conv.id,
            role="assistant",
            content=answer_text,
            citations=citation_dicts if citation_dicts else None,
            retrieved_doc_ids=retrieved_ids if retrieved_ids else None,
        )

        # ── 11. Touch conversation ────────────────────────────────────────────
        await self._conv_repo.touch(conv.id)

        elapsed = round(time.perf_counter() - start, 2)
        logger.info(
            "Chat turn complete in %.2fs — conv=%s, docs=%d",
            elapsed, conv.id, len(retrieved_docs),
        )

        return ChatResult(
            conversation_id=conv.id,
            user_message=MessageResponse(
                id=user_msg.id,
                role=user_msg.role,
                content=user_msg.content,
                citations=None,
                created_at=user_msg.created_at,
            ),
            assistant_message=MessageResponse(
                id=assistant_msg.id,
                role=assistant_msg.role,
                content=assistant_msg.content,
                citations=citations if citations else None,
                created_at=assistant_msg.created_at,
            ),
            follow_up_questions=follow_up,
        )
