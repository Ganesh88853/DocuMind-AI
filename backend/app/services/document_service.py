"""
DocumentService — business logic for document management.
Orchestrates validation, storage I/O, and database persistence.
All business rules live here; the repository handles only SQL.
"""

import logging
import uuid
from pathlib import Path
from typing import List, Optional, Tuple

from fastapi import HTTPException, UploadFile, status

from app.core.security import hash_file
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.repositories.document_repository import DocumentRepository
from app.services.security.file_scanner import scan_file, validate_file_extension
from app.storage.base import StorageProvider

logger = logging.getLogger(__name__)

# ─── Upload Constraints ────────────────────────────────────────────────────────

from app.core.config import settings

MAX_FILE_SIZE: int = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

ALLOWED_MIME_TYPES: set[str] = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
    "text/plain",
    "text/csv",
}

ALLOWED_EXTENSIONS: set[str] = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".txt", ".csv"}


class DocumentService:
    """
    Handles the full document lifecycle:
      upload → validate → store → persist metadata → return DTO

    Depends on DocumentRepository (DB) and StorageProvider (files).
    Both are injected so they can be swapped for tests or future providers.
    """

    def __init__(self, repo: DocumentRepository, storage: StorageProvider) -> None:
        self.repo = repo
        self.storage = storage

    # ─── Upload ───────────────────────────────────────────────────────────────

    async def upload(self, file: UploadFile, owner: User) -> Document:
        """
        Full upload pipeline:
          1. Read bytes
          2. Validate size, MIME type, extension
          3. Check for duplicate
          4. Generate UUID-based stored filename
          5. Create DB record (UPLOADING status)
          6. Write bytes to storage
          7. Update DB record to READY
        """
        # 1. Read all bytes (needed for size validation before streaming)
        content = await file.read()
        file_size = len(content)

        # 2a. Size validation
        if file_size == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB} MB "
                       f"(received {file_size / 1_048_576:.1f} MB).",
            )

        original_filename = file.filename or "untitled"
        content_type = (file.content_type or "").lower()

        # 2b. Executable / blocked extension check (FIRST — fast fail)
        ext_err = validate_file_extension(original_filename)
        if ext_err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ext_err)

        # 2c. MIME type validation
        if content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type: '{content_type}'. Allowed: PDF, DOC, DOCX, PNG, JPG, JPEG, TXT, CSV.",
            )

        # 2d. Extension validation
        file_ext = Path(original_filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file extension: '{file_ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

        # 2e. Full security scan (virus scan + MIME check via file_scanner)
        scan_error = await scan_file(content, original_filename, content_type)
        if scan_error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=scan_error)

        # 2f. SHA-256 hash for deduplication
        file_hash = hash_file(content)

        # 3. Hash-based duplicate detection (same content, same owner)
        if await self.repo.is_duplicate_by_hash(owner.id, file_hash):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This exact file has already been uploaded. Duplicate files are not allowed.",
            )

        # 4. Generate safe stored filename (UUID-based — never use client name)
        stored_filename = f"{uuid.uuid4()}{file_ext}"
        storage_path = self.storage.generate_path(str(owner.id), stored_filename)

        # 5. Create DB record with UPLOADING status first
        doc = await self.repo.create(
            owner_id=owner.id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_extension=file_ext,
            mime_type=content_type,
            file_size=file_size,
            storage_path=storage_path,
            status=DocumentStatus.UPLOADING,
            file_hash=file_hash,
        )

        # 6 & 7. Write file, then update status
        try:
            await self.storage.save(content, storage_path)
            doc = await self.repo.update(doc, status=DocumentStatus.READY)
            logger.info(
                "Document uploaded",
                extra={"doc_id": str(doc.id), "owner": str(owner.id), "size": file_size},
            )
        except Exception as exc:
            logger.error("Upload failed for doc %s: %s", doc.id, exc)
            await self.repo.update(doc, status=DocumentStatus.FAILED)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save the file. Please try again.",
            )

        return doc

    # ─── List ─────────────────────────────────────────────────────────────────

    async def list_documents(
        self,
        owner: User,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        favorites_only: bool = False,
    ) -> Tuple[List[Document], int, int]:
        """
        Return a paginated list of documents for the given owner.
        Returns (documents, total_count, total_pages).
        """
        docs, total = await self.repo.get_paginated(
            owner_id=owner.id,
            page=page,
            page_size=page_size,
            search=search,
            favorites_only=favorites_only,
        )
        total_pages = max(1, (total + page_size - 1) // page_size)
        return docs, total, total_pages

    # ─── Get ──────────────────────────────────────────────────────────────────

    async def get_document(self, doc_id: uuid.UUID, owner: User) -> Document:
        """
        Fetch a single document by ID.
        Raises 404 if not found OR if the document belongs to a different user.
        (No information leakage about existence of others' documents.)
        """
        doc = await self.repo.get_by_id(doc_id)
        if doc is None or doc.owner_id != owner.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )
        return doc

    # ─── Delete ───────────────────────────────────────────────────────────────

    async def delete_document(self, doc_id: uuid.UUID, owner: User) -> None:
        """
        Delete a document: removes the file from storage and the DB record.
        Storage deletion failures are logged but do not block the DB deletion.
        """
        doc = await self.get_document(doc_id, owner)
        try:
            await self.storage.delete(doc.storage_path)
        except Exception as exc:
            logger.warning("Could not delete file %s from storage: %s", doc.storage_path, exc)
        await self.repo.delete(doc)

    # ─── Favorite ─────────────────────────────────────────────────────────────

    async def toggle_favorite(self, doc_id: uuid.UUID, owner: User) -> Document:
        """Flip the is_favorite flag on a document."""
        doc = await self.get_document(doc_id, owner)
        return await self.repo.update(doc, is_favorite=not doc.is_favorite)

    # ─── Download ─────────────────────────────────────────────────────────────

    async def get_file_bytes(self, doc_id: uuid.UUID, owner: User) -> Tuple[bytes, str, str]:
        """
        Retrieve raw file bytes for download.
        Returns (bytes, original_filename, mime_type).
        """
        doc = await self.get_document(doc_id, owner)
        file_bytes = await self.storage.get_file(doc.storage_path)
        return file_bytes, doc.original_filename, doc.mime_type
