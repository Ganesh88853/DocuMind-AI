"""
EmbeddingService — generates semantic embeddings using Sentence Transformers.

Model: all-MiniLM-L6-v2 (384 dimensions, ~90MB, Apache 2.0 license).
The model is loaded lazily on first use and cached at the class level.
All encoding is run via asyncio.to_thread to avoid blocking the event loop.

Embedding text combines:
  - Document filename (strong signal)
  - Category + subcategory
  - Summary (most semantic content)
  - Tags (comma-joined)
  - Key metadata values
  - First 2000 chars of OCR text (context fallback)
"""

import asyncio
import logging
from typing import TYPE_CHECKING, List, Optional

if TYPE_CHECKING:
    from app.models.document import Document

logger = logging.getLogger(__name__)

_MODEL_NAME = "all-MiniLM-L6-v2"


class EmbeddingService:
    """
    Encodes text into semantic embedding vectors.
    The SentenceTransformer model is loaded once and cached globally.
    """

    _model = None  # class-level singleton (loaded on first use)

    @classmethod
    def _get_model(cls):
        """Lazy-load the model on first call."""
        if cls._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info("Loading embedding model %s…", _MODEL_NAME)
                cls._model = SentenceTransformer(_MODEL_NAME)
                logger.info("Embedding model loaded successfully")
            except ImportError:
                raise RuntimeError(
                    "sentence-transformers is not installed. "
                    "Run: pip install sentence-transformers"
                )
        return cls._model

    async def encode(self, text: str) -> List[float]:
        """
        Encode text to a normalised 384-dimensional embedding vector.
        Runs in a thread pool to avoid blocking asyncio event loop.
        """
        model = self._get_model()

        def _encode() -> List[float]:
            vec = model.encode(text, normalize_embeddings=True, show_progress_bar=False)
            return vec.tolist()

        return await asyncio.to_thread(_encode)

    @staticmethod
    def build_document_text(
        doc: "Document",
        ocr_text: Optional[str],
        tags: List[str],
    ) -> str:
        """
        Combine all available signals into a single text string for embedding.
        Field weights are implicit in ordering and repetition.
        """
        parts: List[str] = []

        # Filename (always present — strong signal)
        parts.append(doc.original_filename.replace("_", " ").replace("-", " "))

        # Category and subcategory (repeated for emphasis)
        if doc.category:
            parts.extend([doc.category, doc.category])
        if doc.subcategory:
            parts.append(doc.subcategory)

        # Summary (highest quality semantic signal)
        if doc.summary:
            parts.append(doc.summary)

        # Tags
        if tags:
            parts.append(" ".join(tags))

        # Key metadata values (structured extraction)
        if doc.ai_metadata:
            for value in doc.ai_metadata.values():
                if isinstance(value, str) and value.strip():
                    parts.append(value[:100])

        # OCR text fallback (raw content, truncated)
        if ocr_text:
            parts.append(ocr_text[:2000])

        combined = " ".join(filter(None, parts))
        return combined[:4000]   # Hard cap to stay within model token limits
