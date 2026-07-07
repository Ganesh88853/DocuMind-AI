"""
SearchService — orchestrates the full semantic search pipeline.

Pipeline:
  1. Normalise + tokenise query
  2. Encode query → embedding vector
  3. VectorRepository.search() → (doc_id, semantic_sim) pairs
  4. Apply metadata filters (category, tags, date, favorites, file type)
  5. RankingService.score() → composite score per result
  6. Sort by final_score DESC
  7. Paginate
  8. Generate match explanation per result
  9. Persist to search_history
  10. Return SearchResponse

Security:
  - All searches are owner-scoped (NumpyVectorStore joins on documents.owner_id)
  - Filters are validated by Pydantic before reaching this service
"""

import logging
import re
import time
import uuid
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.repositories.document_repository import DocumentRepository
from app.repositories.search_history_repository import SearchHistoryRepository
from app.repositories.tag_repository import TagRepository
from app.schemas.search import (
    SearchFilters,
    SearchRequest,
    SearchResponse,
    SearchResult,
    SearchResultTag,
    SearchSuggestionsResponse,
)
from app.services.search.embedding_service import EmbeddingService
from app.services.search.ranking_service import RankingService
from app.vector.base import VectorRepository

logger = logging.getLogger(__name__)

# Minimum semantic similarity to include a result at all
_MIN_SIMILARITY_THRESHOLD = 0.15


class SearchService:
    """
    Orchestrates the complete semantic search pipeline.
    One instance per request (constructed with per-request dependencies).
    """

    def __init__(
        self,
        session: AsyncSession,
        vector_repo: VectorRepository,
        doc_repo: DocumentRepository,
        tag_repo: TagRepository,
        history_repo: SearchHistoryRepository,
        embedding_svc: EmbeddingService,
        ranking_svc: RankingService,
    ) -> None:
        self.session = session
        self.vector_repo = vector_repo
        self.doc_repo = doc_repo
        self.tag_repo = tag_repo
        self.history_repo = history_repo
        self.embedding_svc = embedding_svc
        self.ranking_svc = ranking_svc

    async def search(
        self, request: SearchRequest, owner_id: uuid.UUID,
    ) -> SearchResponse:
        """Run the full search pipeline and return paginated results."""
        t_start = time.perf_counter()
        query = request.query.strip()
        filters = request.filters or SearchFilters()

        # 1. Tokenise query for ranking/explanation
        query_terms = _tokenise(query)
        logger.info("Search query=%r terms=%r owner=%s", query, query_terms, owner_id)

        # 2. Encode query
        t_embed = time.perf_counter()
        query_embedding = await self.embedding_svc.encode(query)
        embed_ms = (time.perf_counter() - t_embed) * 1000

        # 3. Vector search (owner-scoped, returns up to 50 candidates)
        t_vec = time.perf_counter()
        candidates: List[Tuple[uuid.UUID, float]] = await self.vector_repo.search(
            query_embedding, owner_id, top_k=50,
        )
        vec_ms = (time.perf_counter() - t_vec) * 1000

        if not candidates:
            await self._save_history(owner_id, query, filters, 0)
            return _empty_response(query, request.page, request.page_size)

        # 4. Fetch documents + tags in batch
        doc_ids = [doc_id for doc_id, _ in candidates]
        docs_map: dict[uuid.UUID, Document] = {}
        tags_map: dict[uuid.UUID, list] = {}

        for doc_id in doc_ids:
            doc = await self.doc_repo.get_by_id(doc_id)
            if doc and doc.owner_id == owner_id:
                docs_map[doc_id] = doc
                tags_map[doc_id] = await self.tag_repo.get_document_tags(doc_id)

        # 5. Apply metadata filters + rank
        t_rank = time.perf_counter()
        scored: List[Tuple[float, float, Document, list]] = []  # (final_score, sem_sim, doc, tags)

        for doc_id, sem_sim in candidates:
            doc = docs_map.get(doc_id)
            if not doc:
                continue
            if sem_sim < _MIN_SIMILARITY_THRESHOLD:
                continue

            tags = tags_map.get(doc_id, [])
            tag_names = [t.name for t in tags]

            # Apply filters
            if not _passes_filters(doc, tag_names, filters):
                continue

            final = self.ranking_svc.score(
                semantic_sim=sem_sim,
                category=doc.category,
                tags=tag_names,
                ai_metadata=doc.ai_metadata,
                created_at=doc.created_at,
                is_favorite=doc.is_favorite,
                query_terms=query_terms,
            )
            scored.append((final, sem_sim, doc, tags))

        # Sort by final score descending
        scored.sort(key=lambda x: x[0], reverse=True)
        rank_ms = (time.perf_counter() - t_rank) * 1000

        total = len(scored)

        # 6. Paginate
        offset = (request.page - 1) * request.page_size
        page_items = scored[offset : offset + request.page_size]

        # 7. Build result objects with explanations
        results: List[SearchResult] = []
        for final_score, sem_sim, doc, tags in page_items:
            tag_names = [t.name for t in tags]
            explanation = self.ranking_svc.explain(
                semantic_sim=sem_sim,
                category=doc.category,
                tags=tag_names,
                ai_metadata=doc.ai_metadata,
                is_favorite=doc.is_favorite,
                query_terms=query_terms,
            )
            results.append(SearchResult(
                document_id=doc.id,
                original_filename=doc.original_filename,
                file_extension=doc.file_extension,
                file_size=doc.file_size,
                category=doc.category,
                subcategory=doc.subcategory,
                summary=doc.summary,
                ai_confidence=doc.ai_confidence,
                tags=[SearchResultTag(id=t.id, name=t.name) for t in tags],
                is_favorite=doc.is_favorite,
                created_at=doc.created_at,
                status=doc.status.value if hasattr(doc.status, "value") else str(doc.status),
                semantic_score=round(sem_sim, 4),
                final_score=round(final_score, 4),
                confidence_pct=int(final_score * 100),
                match_explanation=explanation,
                ai_metadata=doc.ai_metadata,
            ))

        total_pages = max(1, -(-total // request.page_size))
        elapsed_ms = (time.perf_counter() - t_start) * 1000

        logger.info(
            "Search complete query=%r total=%d page=%d/%d "
            "embed=%.0fms vec=%.0fms rank=%.0fms total=%.0fms",
            query, total, request.page, total_pages,
            embed_ms, vec_ms, rank_ms, elapsed_ms,
        )

        await self._save_history(owner_id, query, filters, total)

        return SearchResponse(
            query=query,
            total=total,
            page=request.page,
            page_size=request.page_size,
            total_pages=total_pages,
            results=results,
            search_time_ms=round(elapsed_ms, 2),
        )

    async def get_suggestions(
        self, owner_id: uuid.UUID, q: Optional[str] = None,
    ) -> SearchSuggestionsResponse:
        """Return recent searches, available categories, and popular tags."""
        recent = await self.history_repo.get_recent_queries(owner_id, limit=8, prefix=q)
        docs, _ = await self.doc_repo.get_paginated(
            owner_id=owner_id, page=1, page_size=200,
        )
        categories = list({d.category for d in docs if d.category})[:10]
        tag_counts: dict[str, int] = {}
        for doc in docs:
            for tag in await self.tag_repo.get_document_tags(doc.id):
                tag_counts[tag.name] = tag_counts.get(tag.name, 0) + 1
        top_tags = sorted(tag_counts, key=lambda k: tag_counts[k], reverse=True)[:12]

        return SearchSuggestionsResponse(
            recent=recent,
            categories=categories,
            tags=top_tags,
        )

    async def _save_history(
        self,
        owner_id: uuid.UUID,
        query: str,
        filters: SearchFilters,
        result_count: int,
    ) -> None:
        try:
            await self.history_repo.create(
                user_id=owner_id,
                query=query,
                filters=filters.model_dump(exclude_none=True),
                result_count=result_count,
            )
        except Exception:
            logger.exception("Failed to save search history")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _tokenise(query: str) -> List[str]:
    """Lowercase alpha tokens with length ≥ 3, deduplicated."""
    tokens = re.findall(r"[a-z]{3,}", query.lower())
    seen: set[str] = set()
    result: List[str] = []
    for t in tokens:
        if t not in seen:
            seen.add(t)
            result.append(t)
    return result


def _passes_filters(doc: Document, tag_names: List[str], filters: SearchFilters) -> bool:
    """Return False if the document fails any active filter."""
    if filters.category and (not doc.category or doc.category.lower() != filters.category.lower()):
        return False
    if filters.tags:
        required = {t.lower() for t in filters.tags}
        present = {t.lower() for t in tag_names}
        if not required.issubset(present):
            return False
    if filters.favorites_only and not doc.is_favorite:
        return False
    if filters.file_type and not doc.file_extension.lstrip(".").lower() == filters.file_type.lower():
        return False
    if filters.status and (
        (doc.status.value if hasattr(doc.status, "value") else str(doc.status)) != filters.status
    ):
        return False
    if filters.date_from and doc.created_at < filters.date_from:
        return False
    if filters.date_to and doc.created_at > filters.date_to:
        return False
    return True


def _empty_response(query: str, page: int, page_size: int) -> SearchResponse:
    return SearchResponse(
        query=query,
        total=0, page=page, page_size=page_size,
        total_pages=0, results=[], search_time_ms=0,
    )
