"""
ContextBuilder — converts RetrievedDoc list into a structured LLM context string.

Responsibilities:
  - Format each document's metadata + OCR excerpt into readable sections
  - Enforce a character budget to avoid overflowing token limits
  - Return the context string and the list of doc IDs used

Token budget strategy:
  - Each doc gets up to 1500 chars of OCR text
  - Max 5 documents = ~7500 chars of context (~1875 tokens)
  - Total prompt stays well under Gemini's 32K token limit
"""

from dataclasses import dataclass
from typing import List

from app.services.assistant.retrieval_service import RetrievedDoc

_MAX_OCR_CHARS_PER_DOC = 1500   # chars of raw OCR text per document
_MAX_DOCS              = 5       # hard cap on context documents


@dataclass
class ContextPayload:
    text: str               # formatted context string to inject into prompt
    document_ids: list      # UUID strings of docs included
    doc_count: int


class ContextBuilder:
    """
    Single responsibility: format RetrievedDoc list into a context block.
    """

    def build(self, retrieved_docs: List[RetrievedDoc]) -> ContextPayload:
        if not retrieved_docs:
            return ContextPayload(
                text="No relevant documents found in the user's collection.",
                document_ids=[],
                doc_count=0,
            )

        docs = retrieved_docs[:_MAX_DOCS]
        sections: List[str] = []
        doc_ids: List[str] = []

        for i, rd in enumerate(docs, start=1):
            doc = rd.document
            doc_ids.append(str(doc.id))

            # Use summary if available; fall back to OCR excerpt
            summary_line = f"Summary: {doc.summary}" if doc.summary else ""
            category_line = f"Category: {doc.category}" if doc.category else ""

            # Trim OCR text to budget
            ocr_excerpt = rd.ocr_text[:_MAX_OCR_CHARS_PER_DOC]
            if len(rd.ocr_text) > _MAX_OCR_CHARS_PER_DOC:
                ocr_excerpt += "…"

            parts = [f"--- Document {i}: {doc.original_filename} ---"]
            if category_line:
                parts.append(category_line)
            if summary_line:
                parts.append(summary_line)
            if ocr_excerpt:
                parts.append(f"Content:\n{ocr_excerpt}")

            sections.append("\n".join(parts))

        context_text = "\n\n".join(sections)

        return ContextPayload(
            text=context_text,
            document_ids=doc_ids,
            doc_count=len(docs),
        )
