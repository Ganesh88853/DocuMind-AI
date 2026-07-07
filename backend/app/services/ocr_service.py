"""
OCRService — isolated OCR processing pipeline for DocuMind AI.

Design principles:
  - Completely independent of DocumentService (upload logic never imported here)
  - Creates its own DB session (runs as a background task after HTTP response sent)
  - Graceful degradation: if Tesseract is unavailable, stores OCR_FAILED with clear message
  - Structured logging at every step

Supported engines:
  pdf_embedded  — PyPDF2 extracts text directly from PDF (no Tesseract needed)
  docx          — python-docx extracts paragraph text (no Tesseract needed)
  tesseract     — pytesseract for images (requires Tesseract binary installed)
"""

import io
import logging
import time
import uuid
from typing import Optional

from app.models.document import Document, DocumentStatus
from app.models.document_content import DocumentContent
from app.repositories.document_content_repository import DocumentContentRepository
from app.repositories.document_repository import DocumentRepository
from app.storage.base import StorageProvider

logger = logging.getLogger(__name__)

# ─── Extraction Result ────────────────────────────────────────────────────────


class ExtractionResult:
    """Internal DTO for a single extraction attempt."""

    def __init__(
        self,
        text: Optional[str],
        pages: int,
        language: str,
        engine: str,
        error: Optional[str] = None,
    ) -> None:
        self.text = text
        self.pages = pages
        self.language = language
        self.engine = engine
        self.error = error

    @property
    def success(self) -> bool:
        return self.error is None and bool(self.text and self.text.strip())


# ─── OCR Service ─────────────────────────────────────────────────────────────


class OCRService:
    """
    Processes a stored document and extracts its text content.

    Injection points (allows future Celery/Redis replacement):
      - DocumentRepository      — update document status
      - DocumentContentRepository — persist extracted text
      - StorageProvider          — read file bytes from storage
    """

    def __init__(
        self,
        doc_repo: DocumentRepository,
        content_repo: DocumentContentRepository,
        storage: StorageProvider,
    ) -> None:
        self.doc_repo = doc_repo
        self.content_repo = content_repo
        self.storage = storage

    # ─── Public Entry Point ───────────────────────────────────────────────────

    async def process_document(self, document_id: uuid.UUID) -> None:
        """
        Main pipeline entry point — called by BackgroundTasks after upload.

        Flow:
          1. Fetch document record
          2. Set status → OCR_PROCESSING
          3. Read file bytes from storage
          4. Dispatch to format-specific extractor
          5. Save result → document_contents
          6. Update status → OCR_COMPLETED or OCR_FAILED
        """
        logger.info("OCR started", extra={"doc_id": str(document_id)})

        doc = await self.doc_repo.get_by_id(document_id)
        if doc is None:
            logger.warning("OCR skipped — document not found: %s", document_id)
            return

        # Mark as processing
        await self.doc_repo.update(doc, status=DocumentStatus.OCR_PROCESSING)

        start = time.perf_counter()
        result: Optional[ExtractionResult] = None

        try:
            # Read raw bytes from storage
            file_bytes = await self.storage.get_file(doc.storage_path)

            ext = doc.file_extension.lower()

            if ext == ".pdf":
                result = self._extract_pdf(file_bytes)
            elif ext in {".docx", ".doc"}:
                result = self._extract_docx(file_bytes)
            elif ext in {".png", ".jpg", ".jpeg"}:
                result = self._extract_image(file_bytes)
            else:
                result = ExtractionResult(
                    text=None, pages=0, language="unknown",
                    engine="none",
                    error=f"Unsupported file type: {ext}",
                )

        except Exception as exc:
            logger.exception("OCR extraction raised exception for doc %s", document_id)
            result = ExtractionResult(
                text=None, pages=0, language="unknown",
                engine="error",
                error=str(exc),
            )

        elapsed = round(time.perf_counter() - start, 3)

        # Persist result (upsert handles re-processing attempts)
        await self.content_repo.upsert(
            document_id=document_id,
            extracted_text=result.text if result.success else None,
            total_pages=result.pages,
            detected_language=result.language if result.success else None,
            processing_time=elapsed,
            ocr_engine=result.engine,
            error_message=result.error,
        )

        if result.success:
            await self.doc_repo.update(doc, status=DocumentStatus.OCR_COMPLETED)
            logger.info(
                "OCR completed",
                extra={
                    "doc_id": str(document_id),
                    "engine": result.engine,
                    "pages": result.pages,
                    "elapsed_s": elapsed,
                    "words": len(result.text.split()) if result.text else 0,
                },
            )
        else:
            await self.doc_repo.update(doc, status=DocumentStatus.OCR_FAILED)
            logger.warning(
                "OCR failed",
                extra={
                    "doc_id": str(document_id),
                    "engine": result.engine,
                    "error": result.error,
                    "elapsed_s": elapsed,
                },
            )

    # ─── PDF Extractor ────────────────────────────────────────────────────────

    def _extract_pdf(self, file_bytes: bytes) -> ExtractionResult:
        """
        Extract text from a PDF.
        Strategy: embedded text via PyPDF2 first (fast, no OCR needed).
        If the PDF has no embedded text (scanned), falls back to an error
        since Tesseract is not available in this deployment.
        """
        try:
            import PyPDF2  # type: ignore

            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            pages = len(reader.pages)
            texts = []

            for page in reader.pages:
                page_text = page.extract_text() or ""
                texts.append(page_text)

            full_text = "\n\n".join(texts).strip()

            if full_text:
                return ExtractionResult(
                    text=full_text,
                    pages=pages,
                    language="eng",
                    engine="pdf_embedded",
                )
            else:
                # PDF has no embedded text — would need Tesseract for OCR
                return ExtractionResult(
                    text=None,
                    pages=pages,
                    language="unknown",
                    engine="pdf_embedded",
                    error=(
                        "PDF contains no embedded text (likely a scanned document). "
                        "Install Tesseract OCR to extract text from scanned PDFs."
                    ),
                )

        except Exception as exc:
            return ExtractionResult(
                text=None, pages=0, language="unknown",
                engine="pdf_embedded",
                error=f"PDF extraction failed: {exc}",
            )

    # ─── DOCX Extractor ───────────────────────────────────────────────────────

    def _extract_docx(self, file_bytes: bytes) -> ExtractionResult:
        """
        Extract text from a DOCX file using python-docx.
        No external binary required — pure Python.
        """
        try:
            from docx import Document as DocxDocument  # type: ignore

            doc = DocxDocument(io.BytesIO(file_bytes))

            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            full_text = "\n".join(paragraphs).strip()

            if not full_text:
                return ExtractionResult(
                    text=None, pages=1, language="unknown",
                    engine="docx",
                    error="DOCX file appears to have no readable text content.",
                )

            # Estimate page count (~500 words per page)
            word_count = len(full_text.split())
            estimated_pages = max(1, round(word_count / 500))

            return ExtractionResult(
                text=full_text,
                pages=estimated_pages,
                language="eng",
                engine="docx",
            )

        except Exception as exc:
            return ExtractionResult(
                text=None, pages=0, language="unknown",
                engine="docx",
                error=f"DOCX extraction failed: {exc}",
            )

    # ─── Image Extractor ──────────────────────────────────────────────────────

    def _extract_image(self, file_bytes: bytes) -> ExtractionResult:
        """
        Extract text from an image using Tesseract OCR.
        Returns OCR_FAILED gracefully if Tesseract is not installed.
        """
        try:
            import pytesseract  # type: ignore
            from PIL import Image  # type: ignore

            image = Image.open(io.BytesIO(file_bytes))
            text = pytesseract.image_to_string(image).strip()

            if not text:
                return ExtractionResult(
                    text=None, pages=1, language="unknown",
                    engine="tesseract",
                    error="No text detected in image.",
                )

            return ExtractionResult(
                text=text,
                pages=1,
                language="eng",
                engine="tesseract",
            )

        except pytesseract.TesseractNotFoundError:  # type: ignore
            return ExtractionResult(
                text=None, pages=1, language="unknown",
                engine="tesseract",
                error=(
                    "Tesseract OCR is not installed or not in PATH. "
                    "Download from: https://github.com/UB-Mannheim/tesseract/wiki"
                ),
            )
        except Exception as exc:
            return ExtractionResult(
                text=None, pages=1, language="unknown",
                engine="tesseract",
                error=f"Image OCR failed: {exc}",
            )
