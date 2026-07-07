"""
NumpyVectorStore — PostgreSQL + Numpy implementation of VectorRepository.

Embeddings are stored as JSONB float arrays in the document_embeddings table.
On search: loads all user's embeddings into memory, computes cosine similarity
using numpy, returns top-k results. This is O(n) but fine for < 100,000 docs.

To upgrade to pgvector: implement VectorRepository using the pgvector extension
and swap in SearchService — no other changes needed.
"""

import logging
import json
import uuid
from typing import List, Tuple

import numpy as np
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_embedding import DocumentEmbedding
from app.vector.base import VectorRepository

logger = logging.getLogger(__name__)


class NumpyVectorStore(VectorRepository):
    """
    Uses PostgreSQL (JSONB) + numpy for vector similarity search.

    Search algorithm:
      1. SELECT embeddings WHERE document_id IN (owner's document IDs)
      2. Stack into (N, 384) matrix
      3. Compute cosine similarity: dot product (embeddings already L2-normalised)
      4. Return top-k by score
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def upsert(
        self,
        document_id: uuid.UUID,
        embedding: List[float],
        source_text_preview: str = "",
    ) -> None:
        """Insert or update embedding (upsert using ON CONFLICT)."""
        # Serialize to JSON string — asyncpg requires :param style (no ::cast suffix)
        # Use cast(:emb as jsonb) instead of :emb::jsonb to avoid parser conflict
        embedding_json = json.dumps(embedding)
        await self.session.execute(
            text("""
                INSERT INTO document_embeddings
                    (id, document_id, embedding, embedding_model, source_text_preview, created_at, updated_at)
                VALUES
                    (gen_random_uuid(), :doc_id, cast(:emb as jsonb), 'all-MiniLM-L6-v2', :preview, now(), now())
                ON CONFLICT (document_id)
                DO UPDATE SET
                    embedding = EXCLUDED.embedding,
                    source_text_preview = EXCLUDED.source_text_preview,
                    updated_at = now()
            """),
            {
                "doc_id": str(document_id),
                "emb": embedding_json,
                "preview": source_text_preview[:500] if source_text_preview else "",
            },
        )
        logger.debug("Upserted embedding for doc %s", document_id)

    async def search(
        self,
        query_embedding: List[float],
        owner_id: uuid.UUID,
        top_k: int = 20,
    ) -> List[Tuple[uuid.UUID, float]]:
        """
        Compute cosine similarity between query and all of owner's document embeddings.
        Returns list of (document_id, similarity_score) sorted descending.
        """
        # Load all embeddings for this user's documents
        result = await self.session.execute(
            text("""
                SELECT de.document_id, de.embedding
                FROM document_embeddings de
                JOIN documents d ON d.id = de.document_id
                WHERE d.owner_id = :owner_id
                  AND d.status NOT IN ('UPLOADING', 'FAILED', 'ARCHIVED')
            """),
            {"owner_id": str(owner_id)},
        )
        rows = result.fetchall()

        if not rows:
            return []

        query_vec = np.array(query_embedding, dtype=np.float32)
        query_norm = np.linalg.norm(query_vec)
        if query_norm == 0:
            return []
        query_unit = query_vec / query_norm

        doc_ids = []
        embeddings = []
        for row in rows:
            emb = row.embedding  # already a Python list from JSONB
            if isinstance(emb, list) and len(emb) > 0:
                doc_ids.append(row.document_id)
                embeddings.append(emb)

        if not embeddings:
            return []

        matrix = np.array(embeddings, dtype=np.float32)  # (N, 384)
        # Normalise rows (embeddings stored as unit vectors, but re-normalise for safety)
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1
        matrix = matrix / norms

        similarities = matrix @ query_unit  # cosine similarity per doc

        # Get top-k indices
        k = min(top_k, len(similarities))
        top_indices = np.argpartition(similarities, -k)[-k:]
        top_indices = top_indices[np.argsort(similarities[top_indices])[::-1]]

        return [
            (uuid.UUID(str(doc_ids[i])), float(similarities[i]))
            for i in top_indices
            if similarities[i] > 0.0
        ]

    async def delete(self, document_id: uuid.UUID) -> None:
        await self.session.execute(
            delete(DocumentEmbedding).where(DocumentEmbedding.document_id == document_id)
        )
