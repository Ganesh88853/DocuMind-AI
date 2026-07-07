"""
CitationFormatter — converts RetrievedDoc list into structured Citation objects.

Each citation includes:
  - document_id and filename (for UI linking)
  - relevance_score (cosine similarity from vector search)
  - excerpt (first 200 chars of OCR text, for display in the citation panel)
"""

from typing import List

from app.schemas.assistant import Citation
from app.services.assistant.retrieval_service import RetrievedDoc

_EXCERPT_LENGTH = 250  # chars shown in citation panel


class CitationFormatter:
    """
    Single responsibility: produce Citation objects from retrieved documents.
    """

    def format(self, retrieved_docs: List[RetrievedDoc]) -> List[Citation]:
        citations: List[Citation] = []

        for rd in retrieved_docs:
            excerpt = rd.ocr_text[:_EXCERPT_LENGTH].strip()
            if len(rd.ocr_text) > _EXCERPT_LENGTH:
                excerpt += "…"

            citations.append(Citation(
                document_id=rd.document.id,
                filename=rd.document.original_filename,
                relevance_score=rd.similarity,
                excerpt=excerpt,
            ))

        return citations
