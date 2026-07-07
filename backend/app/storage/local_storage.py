"""
LocalStorageProvider — stores files on the local filesystem.
Files are organized as:  backend/uploads/{owner_id}/{uuid_filename}

Security guarantees:
  - All paths are resolved and validated against the uploads root.
  - Directory traversal attempts raise ValueError.
  - Client-supplied filenames are never used as storage paths.
"""

import os
from pathlib import Path

from app.storage.base import StorageProvider

# Absolute path to the uploads directory (backend/uploads/)
UPLOADS_ROOT = Path(__file__).parent.parent.parent / "uploads"


class LocalStorageProvider(StorageProvider):
    """
    Stores files on the local disk under UPLOADS_ROOT.

    Directory layout:
        uploads/
          {owner_uuid}/
            {random_uuid}.pdf
            {random_uuid}.docx

    To swap to S3 or Supabase in a future milestone, replace this class
    with a new provider that implements StorageProvider — no service code changes needed.
    """

    def __init__(self, root: Path = UPLOADS_ROOT) -> None:
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    # ─── Interface Implementation ──────────────────────────────────────────────

    def generate_path(self, owner_id: str, stored_filename: str) -> str:
        """
        Build a relative storage path: {owner_id}/{stored_filename}
        This relative path is stored in the database and used for all I/O.
        """
        return f"{owner_id}/{stored_filename}"

    async def save(self, file_data: bytes, destination_path: str) -> str:
        """Write bytes to disk, creating parent directories as needed."""
        safe_path = self._resolve_safe(destination_path)
        safe_path.parent.mkdir(parents=True, exist_ok=True)
        safe_path.write_bytes(file_data)
        return destination_path

    async def delete(self, storage_path: str) -> bool:
        """Delete the file. Returns True if deleted, False if it didn't exist."""
        safe_path = self._resolve_safe(storage_path)
        if safe_path.exists():
            safe_path.unlink()
            # Remove owner directory if now empty
            try:
                safe_path.parent.rmdir()
            except OSError:
                pass  # Directory not empty — fine
            return True
        return False

    async def exists(self, storage_path: str) -> bool:
        """Check if the file exists on disk."""
        return self._resolve_safe(storage_path).exists()

    async def get_file(self, storage_path: str) -> bytes:
        """Read and return raw bytes. Raises FileNotFoundError if missing."""
        safe_path = self._resolve_safe(storage_path)
        if not safe_path.exists():
            raise FileNotFoundError(f"File not found in local storage: {storage_path}")
        return safe_path.read_bytes()

    # ─── Internal Helpers ──────────────────────────────────────────────────────

    def _resolve_safe(self, path: str) -> Path:
        """
        Resolve the given relative path against uploads root.
        Raises ValueError if the resolved path escapes the root (traversal attack).
        """
        resolved = (self.root / path).resolve()
        if not str(resolved).startswith(str(self.root)):
            raise ValueError(f"Path traversal attempt detected: {path!r}")
        return resolved
