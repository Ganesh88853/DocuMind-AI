"""
Document API routes for DocuMind AI — Milestone 5.

New in this milestone:
  - upload now chains OCR → AI automatically in background
  - GET /{id}/summary           — AI summary + tags + confidence
  - GET /{id}/metadata          — structured metadata fields
  - GET /{id}/tags              — document tags
  - POST /{id}/reprocess-ai    — trigger AI reprocessing
"""

import logging
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.database import AsyncSessionLocal, get_db
from app.dependencies.auth import CurrentUser
from app.models.document import DocumentStatus
from app.repositories.document_content_repository import DocumentContentRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.tag_repository import TagRepository
from app.schemas.ai import AIMetadataResponse, AISummaryResponse, AITagsResponse, ReprocessResponse, TagResponse
from app.schemas.document import DocumentListResponse, DocumentResponse
from app.schemas.ocr import OCRResultResponse, ProcessingStatusResponse
from app.services.document_service import DocumentService
from app.services.ocr_service import OCRService
from app.storage.local_storage import LocalStorageProvider

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Documents"])

# ─── Dependency helpers ───────────────────────────────────────────────────────

DbSession = Annotated[AsyncSession, Depends(get_db)]


def get_document_service(db: DbSession) -> DocumentService:
    return DocumentService(DocumentRepository(db), LocalStorageProvider())


DocumentSvc = Annotated[DocumentService, Depends(get_document_service)]


# ─── AI runner (background) ───────────────────────────────────────────────────

async def run_ai_background(document_id: uuid.UUID) -> None:
    """
    Runs AI processing in a background task with its own DB session.
    Only proceeds if document status is OCR_COMPLETED.
    """
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your-gemini-api-key-here":
        logger.warning(
            "GEMINI_API_KEY not configured — AI processing skipped for doc %s. "
            "Add your key to backend/.env to enable AI.", document_id
        )
        return

    try:
        from app.ai.gemini_provider import GeminiProvider
        from app.services.ai.ai_service import AIService

        async with AsyncSessionLocal() as session:
            try:
                ai_svc = AIService(
                    doc_repo=DocumentRepository(session),
                    content_repo=DocumentContentRepository(session),
                    tag_repo=TagRepository(session),
                    provider=GeminiProvider(
                        settings.GEMINI_API_KEY,
                        model=settings.GEMINI_MODEL,
                    ),
                )
                await ai_svc.process_document(document_id)
                await session.commit()
            except Exception:
                await session.rollback()
                logger.exception("AI background session error for doc %s", document_id)
    except Exception:
        logger.exception("AI background runner failed for doc %s", document_id)


async def run_ocr_background(document_id: uuid.UUID) -> None:
    """
    Runs OCR in the background, then chains AI processing automatically.
    Each phase uses its own DB session.
    """
    logger.info("OCR background task started for doc %s", document_id)
    ocr_succeeded = False

    async with AsyncSessionLocal() as session:
        try:
            storage = LocalStorageProvider()
            ocr = OCRService(
                doc_repo=DocumentRepository(session),
                content_repo=DocumentContentRepository(session),
                storage=storage,
            )
            await ocr.process_document(document_id)
            await session.commit()

            # Check OCR result in same session before closing
            doc = await DocumentRepository(session).get_by_id(document_id)
            ocr_succeeded = doc is not None and doc.status == DocumentStatus.OCR_COMPLETED

        except Exception:
            await session.rollback()
            logger.exception("OCR background session error for doc %s", document_id)

    # Chain AI after successful OCR (new session created inside)
    if ocr_succeeded:
        logger.info("OCR succeeded — chaining AI processing for doc %s", document_id)
        await run_ai_background(document_id)


# ─── Upload ───────────────────────────────────────────────────────────────────


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document",
    description="Upload a file. OCR + AI processing start automatically in the background.",
)
async def upload_document(
    current_user: CurrentUser,
    service: DocumentSvc,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> DocumentResponse:
    doc = await service.upload(file, current_user)
    background_tasks.add_task(run_ocr_background, doc.id)
    return DocumentResponse.model_validate(doc)


# ─── List / Get / Download / Delete / Favorite ───────────────────────────────


@router.get("", response_model=DocumentListResponse, summary="List documents")
async def list_documents(
    current_user: CurrentUser, service: DocumentSvc,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    favorites_only: bool = Query(False),
) -> DocumentListResponse:
    docs, total, total_pages = await service.list_documents(
        owner=current_user, page=page, page_size=page_size,
        search=search, favorites_only=favorites_only,
    )
    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total, page=page, page_size=page_size, total_pages=total_pages,
    )


@router.get("/{document_id}", response_model=DocumentResponse, summary="Get document details")
async def get_document(
    document_id: uuid.UUID, current_user: CurrentUser, service: DocumentSvc,
) -> DocumentResponse:
    doc = await service.get_document(document_id, current_user)
    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}/download", summary="Download a document")
async def download_document(
    document_id: uuid.UUID, current_user: CurrentUser, service: DocumentSvc,
) -> Response:
    file_bytes, original_filename, mime_type = await service.get_file_bytes(document_id, current_user)
    return Response(
        content=file_bytes, media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{original_filename}"',
            "Content-Length": str(len(file_bytes)),
        },
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a document")
async def delete_document(
    document_id: uuid.UUID, current_user: CurrentUser, service: DocumentSvc,
) -> None:
    await service.delete_document(document_id, current_user)


@router.patch("/{document_id}/favorite", response_model=DocumentResponse, summary="Toggle favorite")
async def toggle_favorite(
    document_id: uuid.UUID, current_user: CurrentUser, service: DocumentSvc,
) -> DocumentResponse:
    doc = await service.toggle_favorite(document_id, current_user)
    return DocumentResponse.model_validate(doc)


# ─── OCR Endpoints ────────────────────────────────────────────────────────────


@router.get("/{document_id}/text", response_model=OCRResultResponse, summary="Get extracted OCR text")
async def get_document_text(
    document_id: uuid.UUID, current_user: CurrentUser, service: DocumentSvc, db: DbSession,
) -> OCRResultResponse:
    doc = await service.get_document(document_id, current_user)
    content = await DocumentContentRepository(db).get_by_document_id(document_id)
    return OCRResultResponse(
        document_id=doc.id, status=doc.status,
        extracted_text=content.extracted_text if content else None,
        total_pages=content.total_pages if content else None,
        detected_language=content.detected_language if content else None,
        processing_time=content.processing_time if content else None,
        ocr_engine=content.ocr_engine if content else None,
        error_message=content.error_message if content else None,
        created_at=content.created_at if content else None,
    )


@router.get("/{document_id}/processing-status", response_model=ProcessingStatusResponse, summary="Poll processing status")
async def get_processing_status(
    document_id: uuid.UUID, current_user: CurrentUser, service: DocumentSvc, db: DbSession,
) -> ProcessingStatusResponse:
    doc = await service.get_document(document_id, current_user)
    content = await DocumentContentRepository(db).get_by_document_id(document_id)
    return ProcessingStatusResponse(
        document_id=doc.id, status=doc.status,
        ocr_engine=content.ocr_engine if content else None,
        processing_time=content.processing_time if content else None,
        error_message=content.error_message if content else None,
        has_text=bool(content and content.extracted_text),
    )


# ─── AI Endpoints (Milestone 5) ───────────────────────────────────────────────


@router.get(
    "/{document_id}/summary",
    response_model=AISummaryResponse,
    summary="Get AI summary and classification",
)
async def get_ai_summary(
    document_id: uuid.UUID, current_user: CurrentUser, service: DocumentSvc, db: DbSession,
) -> AISummaryResponse:
    doc = await service.get_document(document_id, current_user)
    tag_repo = TagRepository(db)
    tags = await tag_repo.get_document_tags(document_id)
    return AISummaryResponse(
        document_id=doc.id,
        status=doc.status,
        category=doc.category,
        subcategory=doc.subcategory,
        summary=doc.summary,
        ai_confidence=doc.ai_confidence,
        processed_at=doc.processed_at,
        tags=[TagResponse(id=t.id, name=t.name) for t in tags],
        ai_error=doc.ai_error,
    )


@router.get(
    "/{document_id}/metadata",
    response_model=AIMetadataResponse,
    summary="Get AI extracted metadata",
)
async def get_ai_metadata(
    document_id: uuid.UUID, current_user: CurrentUser, service: DocumentSvc,
) -> AIMetadataResponse:
    doc = await service.get_document(document_id, current_user)
    return AIMetadataResponse(
        document_id=doc.id,
        status=doc.status,
        category=doc.category,
        ai_metadata=doc.ai_metadata,
        ai_confidence=doc.ai_confidence,
        ai_error=doc.ai_error,
    )


@router.get(
    "/{document_id}/tags",
    response_model=AITagsResponse,
    summary="Get document tags",
)
async def get_document_tags(
    document_id: uuid.UUID, current_user: CurrentUser, service: DocumentSvc, db: DbSession,
) -> AITagsResponse:
    doc = await service.get_document(document_id, current_user)
    tags = await TagRepository(db).get_document_tags(doc.id)
    return AITagsResponse(
        document_id=doc.id,
        tags=[TagResponse(id=t.id, name=t.name) for t in tags],
    )


@router.post(
    "/{document_id}/reprocess-ai",
    response_model=ReprocessResponse,
    summary="Trigger AI reprocessing",
    description="Re-run AI enrichment on a document that has OCR text. Does not re-run OCR.",
)
async def reprocess_ai(
    document_id: uuid.UUID,
    current_user: CurrentUser,
    service: DocumentSvc,
    background_tasks: BackgroundTasks,
    db: DbSession,
) -> ReprocessResponse:
    # Ownership check
    doc = await service.get_document(document_id, current_user)

    # Don't queue if already running — prevents duplicate background tasks
    if doc.status == DocumentStatus.AI_PROCESSING:
        return ReprocessResponse(
            document_id=document_id,
            message="AI processing is already running for this document. Please wait.",
        )

    # Don't re-run if already fully processed with real data
    from app.repositories.tag_repository import TagRepository as _TR
    tags = await _TR(db).get_document_tags(document_id)
    if (
        doc.status == DocumentStatus.COMPLETED
        and doc.category
        and doc.summary
        and len(tags) > 0
    ):
        return ReprocessResponse(
            document_id=document_id,
            message="Document already has complete AI results. Use force=true to reprocess.",
        )

    background_tasks.add_task(run_ai_background, document_id)
    return ReprocessResponse(
        document_id=document_id,
        message="AI reprocessing started in the background.",
    )
