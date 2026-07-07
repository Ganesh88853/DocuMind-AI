"""
Search API routes — Milestone 6: Semantic Document Search.

Endpoints:
  POST /api/v1/search              — full semantic search
  GET  /api/v1/search/suggestions  — recent searches + categories + tags
  DELETE /api/v1/search/history    — clear user search history
"""

import logging
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies.auth import CurrentUser
from app.repositories.document_repository import DocumentRepository
from app.repositories.search_history_repository import SearchHistoryRepository
from app.repositories.tag_repository import TagRepository
from app.schemas.search import SearchRequest, SearchResponse, SearchSuggestionsResponse
from app.services.search.embedding_service import EmbeddingService
from app.services.search.ranking_service import RankingService
from app.services.search.search_service import SearchService
from app.vector.numpy_store import NumpyVectorStore

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Search"])

DbSession = Annotated[AsyncSession, Depends(get_db)]

# Single shared instances (stateless services)
_embedding_svc = EmbeddingService()
_ranking_svc = RankingService()


def _get_search_service(db: DbSession) -> SearchService:
    return SearchService(
        session=db,
        vector_repo=NumpyVectorStore(db),
        doc_repo=DocumentRepository(db),
        tag_repo=TagRepository(db),
        history_repo=SearchHistoryRepository(db),
        embedding_svc=_embedding_svc,
        ranking_svc=_ranking_svc,
    )


SearchSvc = Annotated[SearchService, Depends(_get_search_service)]


@router.post(
    "",
    response_model=SearchResponse,
    summary="Semantic document search",
    description=(
        "Search documents using natural language. "
        "Uses sentence embeddings (all-MiniLM-L6-v2) + multi-factor ranking. "
        "Results include match explanation and confidence score."
    ),
)
async def search_documents(
    request: SearchRequest,
    current_user: CurrentUser,
    service: SearchSvc,
) -> SearchResponse:
    return await service.search(request, current_user.id)


@router.get(
    "/suggestions",
    response_model=SearchSuggestionsResponse,
    summary="Search suggestions",
    description="Returns recent searches, available categories, and popular tags.",
)
async def get_suggestions(
    current_user: CurrentUser,
    service: SearchSvc,
    q: Optional[str] = Query(None, max_length=100),
) -> SearchSuggestionsResponse:
    return await service.get_suggestions(current_user.id, q)


@router.delete(
    "/history",
    status_code=204,
    summary="Clear search history",
)
async def clear_search_history(
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    repo = SearchHistoryRepository(db)
    await repo.clear_history(current_user.id)
    await db.commit()
