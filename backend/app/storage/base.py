"""
Storage provider abstraction for DocuMind AI.
Defines the interface that all storage backends must implement.
This allows swapping LocalStorage → S3 → Supabase without changing any service code.
"""

import abc


class StorageProvider(abc.ABC):
    """
    Abstract base class for all storage backends.
    Every method is async to support non-blocking I/O across local and remote providers.
    """

    @abc.abstractmethod
    async def save(self, file_data: bytes, destination_path: str) -> str:
        """
        Persist file bytes to the given path.
        Returns the canonical storage path (may differ from destination_path for remote providers).
        """
        ...

    @abc.abstractmethod
    async def delete(self, storage_path: str) -> bool:
        """
        Remove the file at storage_path.
        Returns True if the file was deleted, False if it did not exist.
        """
        ...

    @abc.abstractmethod
    async def exists(self, storage_path: str) -> bool:
        """Return True if the file exists in storage."""
        ...

    @abc.abstractmethod
    async def get_file(self, storage_path: str) -> bytes:
        """Read and return the raw bytes of the file at storage_path."""
        ...

    @abc.abstractmethod
    def generate_path(self, owner_id: str, stored_filename: str) -> str:
        """
        Build a canonical storage path for a new file.
        Implementations must ensure uniqueness and prevent path collisions.
        """
        ...
