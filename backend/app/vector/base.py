"""
VectorRepository — abstract interface for vector storage.

Implementations: NumpyVectorStore (current), pgvector (future), FAISS (future).
Business logic (EmbeddingService, SearchService) depends only on this interface.
"""

from abc import ABC, abstractmethod
from typing import List, Tuple
import uuid


class VectorRepository(ABC):
    """
    Abstract interface for storing and searching embedding vectors.
    All implementations must preserve the contract below.
    """

    @abstractmethod
    async def upsert(
        self,
        document_id: uuid.UUID,
        embedding: List[float],
        source_text_preview: str = "",
    ) -> None:
        """Store or update the embedding for a document."""
        ...

    @abstractmethod
    async def search(
        self,
        query_embedding: List[float],
        owner_id: uuid.UUID,
        top_k: int = 20,
    ) -> List[Tuple[uuid.UUID, float]]:
        """
        Return (document_id, cosine_similarity) pairs, sorted descending.
        Only returns documents owned by owner_id.
        top_k limits the result count.
        """
        ...

    @abstractmethod
    async def delete(self, document_id: uuid.UUID) -> None:
        """Remove the embedding for a document."""
        ...
