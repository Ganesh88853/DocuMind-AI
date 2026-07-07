"""
RetrievalService — finds the most relevant documents for a user's question.

Pipeline:
  1. Embed the question using EmbeddingService.encode() (sentence-transformers, local)
  2. Search the user's document embeddings in NumpyVectorStore
  3. Fetch OCR text + document metadata for each match
  4. Return top-N RetrievedDoc objects

Security: all queries are scoped to owner_id — impossible to access other users' docs.
"""

import logging
import uuid
from dataclasses import dataclass
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.repositories.document_content_repository import DocumentContentRepository
from app.repositories.document_repository import DocumentRepository
from app.services.search.embedding_service import EmbeddingService
from app.vector.numpy_store import NumpyVectorStore

logger = logging.getLogger(__name__)

_TOP_K = 5          # max documents to retrieve
_MIN_SCORE = 0.10   # minimum cosine similarity to include


@dataclass
class RetrievedDoc:
    document: Document
    ocr_text: str
    similarity: float


class RetrievalService:
    """
    Retrieves the top-K most relevant documents for a given query.
    Uses cached embeddings — no AI API calls.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self._embed = EmbeddingService()
        self._store = NumpyVectorStore(session)
        self._doc_repo = DocumentRepository(session)
        self._content_repo = DocumentContentRepository(session)

    async def retrieve(
        self,
        user_id: uuid.UUID,
        question: str,
        top_k: int = _TOP_K,
    ) -> List[RetrievedDoc]:
        """
        Embed the question and find the most similar documents for this user.
        Returns at most top_k results with similarity >= _MIN_SCORE.
        """
        # 1. Embed query using EmbeddingService.encode() (local, no API call)
        query_embedding = await self._embed.encode(question)

        # 2. Vector search scoped to owner
        raw_results = await self._store.search(
            owner_id=user_id,
            query_embedding=query_embedding,
            top_k=top_k,
        )

        retrieved: List[RetrievedDoc] = []
        for doc_id, score in raw_results:
            if score < _MIN_SCORE:
                continue

            doc = await self._doc_repo.get_by_id(uuid.UUID(str(doc_id)))
            if not doc or doc.owner_id != user_id:
                continue  # paranoia: ownership double-check

            content = await self._content_repo.get_by_document_id(doc.id)
            ocr_text = (content.extracted_text or "") if content else ""

            retrieved.append(RetrievedDoc(
                document=doc,
                ocr_text=ocr_text,
                similarity=round(float(score), 4),
            ))

        logger.info(
            "Retrieved %d documents for user %s (question_len=%d)",
            len(retrieved), user_id, len(question),
        )
        return retrieved
