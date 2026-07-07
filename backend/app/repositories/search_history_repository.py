"""
SearchHistoryRepository — stores and retrieves per-user search history.
"""

import uuid
from typing import List, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.search_history import SearchHistory


class SearchHistoryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        user_id: uuid.UUID,
        query: str,
        filters: Optional[dict],
        result_count: int,
    ) -> SearchHistory:
        record = SearchHistory(
            user_id=user_id,
            query=query,
            filters=filters,
            result_count=result_count,
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def get_recent_queries(
        self,
        user_id: uuid.UUID,
        limit: int = 8,
        prefix: Optional[str] = None,
    ) -> List[str]:
        """Return recent unique query strings for the user (newest first)."""
        stmt = (
            select(SearchHistory.query)
            .where(SearchHistory.user_id == user_id)
            .order_by(SearchHistory.created_at.desc())
            .limit(50)
        )
        result = await self.session.execute(stmt)
        all_queries = [row[0] for row in result.fetchall()]

        # Deduplicate preserving order
        seen: set[str] = set()
        unique: List[str] = []
        for q in all_queries:
            if q not in seen:
                seen.add(q)
                unique.append(q)

        # Filter by prefix if provided
        if prefix:
            prefix_lower = prefix.lower()
            unique = [q for q in unique if q.lower().startswith(prefix_lower)]

        return unique[:limit]

    async def clear_history(self, user_id: uuid.UUID) -> None:
        await self.session.execute(
            delete(SearchHistory).where(SearchHistory.user_id == user_id)
        )
