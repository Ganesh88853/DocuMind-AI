"""
Storage package for DocuMind AI.

Exports the base interface and concrete providers.
The active provider is selected at startup via STORAGE_BACKEND env var:

    STORAGE_BACKEND=local     → LocalStorageProvider  (development/testing)
    STORAGE_BACKEND=supabase  → SupabaseStorageProvider (production)

Usage in services:
    from app.storage import get_storage_provider
    storage = get_storage_provider()
    path = await storage.save(file_bytes, destination_path)
"""

from app.storage.base import StorageProvider
from app.storage.local_storage import LocalStorageProvider

__all__ = ["StorageProvider", "LocalStorageProvider", "get_storage_provider"]


def get_storage_provider() -> StorageProvider:
    """
    Factory function — returns the configured storage backend.

    Reads STORAGE_BACKEND from settings. Falls back to local if the
    requested backend cannot be instantiated (e.g. missing supabase package).
    """
    from app.core.config import settings

    if settings.STORAGE_BACKEND == "supabase":
        try:
            from app.storage.supabase_storage import SupabaseStorageProvider
            return SupabaseStorageProvider()
        except ImportError as exc:
            import logging
            logging.getLogger(__name__).warning(
                "STORAGE_BACKEND=supabase but supabase package not installed. "
                "Falling back to local storage. Install with: pip install supabase>=2.0.0. "
                f"Error: {exc}"
            )

    return LocalStorageProvider()
