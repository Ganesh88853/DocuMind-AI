"""
AIService — orchestrator for the full AI processing pipeline.

Coordinates:
  ClassificationService → MetadataExtractionService → TagGenerationService → SummaryService

Each sub-service is independent and tested in isolation.
The orchestrator is the only place that knows the pipeline order.

Design note: This runs in a BackgroundTask context with its own DB session.
Swapping BackgroundTasks → Celery only requires changing the task runner in routes.
"""

import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.ai.base import AIProvider, AIProviderError
from app.models.document import Document, DocumentStatus
from app.repositories.document_content_repository import DocumentContentRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.tag_repository import TagRepository
from app.services.ai.classification_service import ClassificationService
from app.services.ai.metadata_service import MetadataExtractionService
from app.services.ai.summary_service import SummaryService
from app.services.ai.tag_service import TagGenerationService
from app.services.search.embedding_service import EmbeddingService
from app.vector.numpy_store import NumpyVectorStore

logger = logging.getLogger(__name__)


class AIService:
    """
    Orchestrates the full AI enrichment pipeline for a document.

    Pipeline:
      1. Validate — document exists and has OCR text
      2. Classify  — category, subcategory, confidence
      3. Metadata  — structured field extraction
      4. Tags      — 3–8 reusable tags (deduped in DB)
      5. Summary   — ≤120-word plain-text summary
      6. Persist   — update Document + DocumentTags
    """

    def __init__(
        self,
        doc_repo: DocumentRepository,
        content_repo: DocumentContentRepository,
        tag_repo: TagRepository,
        provider: AIProvider,
    ) -> None:
        self.doc_repo = doc_repo
        self.content_repo = content_repo
        self.tag_repo = tag_repo
        self.provider = provider

        # Compose independent sub-services with the same provider
        self.classifier = ClassificationService(provider)
        self.metadata_svc = MetadataExtractionService(provider)
        self.summariser = SummaryService(provider)
        self.tagger = TagGenerationService(provider)
        self.embedding_svc = EmbeddingService()

    async def process_document(self, document_id: uuid.UUID) -> None:
        """
        Main entry point — called by the background task after OCR completes.

        On any failure: document status reverts to OCR_COMPLETED (OCR data preserved),
        and the error is stored in ai_error for future reprocessing.
        """
        logger.info("AI processing started", extra={"doc_id": str(document_id)})

        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            logger.warning("AI skipped — document not found: %s", document_id)
            return

        # Guard: if already running, skip — prevents duplicate background tasks
        if doc.status == DocumentStatus.AI_PROCESSING:
            logger.warning(
                "AI skipped — already processing doc %s (duplicate task)", document_id
            )
            return

        # Guard: if already fully completed (has real data), skip to save quota
        already_done = (
            doc.status == DocumentStatus.COMPLETED
            and doc.category
            and doc.summary
        )
        if already_done:
            logger.info(
                "AI skipped — doc %s already COMPLETED with category=%r",
                document_id, doc.category,
            )
            return

        # Only process if OCR succeeded or a previous AI attempt left it ready
        if doc.status not in (DocumentStatus.OCR_COMPLETED, DocumentStatus.COMPLETED):
            logger.info(
                "AI skipped — unexpected status %s for doc %s", doc.status, document_id
            )
            return

        # Fetch OCR text
        content = await self.content_repo.get_by_document_id(document_id)
        if not content or not content.extracted_text:
            logger.warning("AI skipped — no OCR text for doc %s", document_id)
            await self.doc_repo.update(
                doc, ai_error="No extracted text available for AI processing."
            )
            return

        text = content.extracted_text

        # Mark as AI processing
        await self.doc_repo.update(doc, status=DocumentStatus.AI_PROCESSING)

        start = time.perf_counter()
        ai_error: Optional[str] = None

        try:
            # ── 1. Classification ──────────────────────────────────────────────
            logger.info("Running classification for doc %s", document_id)
            classification = await self.classifier.classify(text)
            logger.info(
                "Classified as %r (%.0f%% confidence)",
                classification.category, classification.confidence
            )

            # ── 2. Metadata Extraction ─────────────────────────────────────────
            logger.info("Running metadata extraction for doc %s", document_id)
            metadata = await self.metadata_svc.extract(text, classification.category)

            # ── 3. Tag Generation ──────────────────────────────────────────────
            logger.info("Running tag generation for doc %s", document_id)
            tag_names = await self.tagger.generate_tags(text, classification.category)
            tag_objects = await self.tag_repo.get_or_create_many(tag_names)
            await self.tag_repo.set_document_tags(document_id, tag_objects)

            # ── 4. Summary Generation ──────────────────────────────────────────
            logger.info("Running summary generation for doc %s", document_id)
            summary = await self.summariser.summarise(text, classification.category)

            elapsed = round(time.perf_counter() - start, 2)

            # ── 5. Persist all AI results ──────────────────────────────────────
            await self.doc_repo.update(
                doc,
                category=classification.category,
                subcategory=classification.subcategory,
                summary=summary,
                ai_confidence=classification.confidence,
                ai_metadata=metadata,
                ai_error=None,
                processed_at=datetime.now(timezone.utc),
                status=DocumentStatus.COMPLETED,
            )

            # ── 6. Generate embedding for semantic search ─────────────────────
            logger.info("Generating embedding for doc %s", document_id)
            try:
                # Reload doc to get updated fields for best embedding quality
                updated_doc = await self.doc_repo.get_by_id(document_id)
                if updated_doc:
                    embed_text = EmbeddingService.build_document_text(
                        updated_doc, text, tag_names,
                    )
                    embedding = await self.embedding_svc.encode(embed_text)
                    vector_store = NumpyVectorStore(self.doc_repo.session)
                    await vector_store.upsert(
                        document_id, embedding, embed_text[:300],
                    )
                    logger.info("Embedding stored for doc %s", document_id)
            except Exception as emb_exc:
                logger.warning(
                    "Embedding generation failed for doc %s: %s", document_id, emb_exc
                )  # Non-fatal: search degrades gracefully

            elapsed = round(time.perf_counter() - start, 2)

            logger.info(
                "AI processing completed",
                extra={
                    "doc_id": str(document_id),
                    "category": classification.category,
                    "confidence": classification.confidence,
                    "tags": tag_names,
                    "elapsed_s": elapsed,
                },
            )

        except AIProviderError as exc:
            ai_error = f"AI provider error: {exc}"
            logger.error("AI provider error for doc %s: %s", document_id, exc)

        except Exception as exc:
            ai_error = f"Unexpected error: {exc}"
            logger.exception("AI processing failed for doc %s", document_id)

        finally:
            if ai_error:
                # Preserve OCR data — revert to OCR_COMPLETED, store error
                await self.doc_repo.update(
                    doc,
                    status=DocumentStatus.OCR_COMPLETED,
                    ai_error=ai_error,
                )
