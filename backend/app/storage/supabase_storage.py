"""
SupabaseStorageProvider — stores files in Supabase Storage (S3-compatible).

Production storage backend for DocuMind AI.
Implements the same StorageProvider interface as LocalStorageProvider,
so no service code changes are needed when switching backends.

Requirements:
    pip install supabase>=2.0.0

Configuration (environment variables):
    SUPABASE_URL          — your project URL: https://xxx.supabase.co
    SUPABASE_SERVICE_KEY  — service role key (not the anon key!)
    SUPABASE_STORAGE_BUCKET — bucket name (default: documind-uploads)

Bucket setup (one-time):
    1. Go to Supabase Dashboard → Storage → New Bucket
    2. Name: documind-uploads
    3. Public: NO (private — all access goes through signed URLs)
    4. File size limit: 52428800 (50MB)
    5. Allowed MIME types: (leave empty to allow all)
"""

from app.storage.base import StorageProvider


class SupabaseStorageProvider(StorageProvider):
    """
    Stores files in Supabase Storage using the supabase-py SDK.

    Layout:  {bucket}/{owner_uuid}/{uuid_filename}

    All files are stored in a private bucket.
    Signed URLs are generated for time-limited access.
    """

    def __init__(self) -> None:
        try:
            from supabase import create_client  # type: ignore[import]
        except ImportError:
            raise ImportError(
                "supabase package is required for SupabaseStorageProvider. "
                "Install it with: pip install supabase>=2.0.0"
            )

        from app.core.config import settings
        self._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        self._bucket = settings.SUPABASE_STORAGE_BUCKET
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self) -> None:
        """Create the storage bucket if it doesn't already exist."""
        try:
            buckets = self._client.storage.list_buckets()
            bucket_names = [b.name for b in buckets]
            if self._bucket not in bucket_names:
                self._client.storage.create_bucket(
                    self._bucket,
                    options={"public": False, "file_size_limit": 52_428_800},
                )
        except Exception:
            pass  # Bucket already exists or permissions prevent listing — proceed

    def generate_path(self, owner_id: str, stored_filename: str) -> str:
        """Build a storage path: {owner_id}/{stored_filename}"""
        return f"{owner_id}/{stored_filename}"

    async def save(self, file_data: bytes, destination_path: str) -> str:
        """Upload bytes to Supabase Storage. Returns the storage path."""
        self._client.storage.from_(self._bucket).upload(
            path=destination_path,
            file=file_data,
            file_options={"upsert": "true"},
        )
        return destination_path

    async def delete(self, storage_path: str) -> bool:
        """Remove the file from Supabase Storage."""
        try:
            self._client.storage.from_(self._bucket).remove([storage_path])
            return True
        except Exception:
            return False

    async def exists(self, storage_path: str) -> bool:
        """Check if a file exists in the bucket."""
        try:
            # List files at the parent path and check for the filename
            parts = storage_path.rsplit("/", 1)
            if len(parts) == 2:
                folder, filename = parts
                files = self._client.storage.from_(self._bucket).list(folder)
                return any(f["name"] == filename for f in files)
            return False
        except Exception:
            return False

    async def get_file(self, storage_path: str) -> bytes:
        """Download and return raw bytes from Supabase Storage."""
        response = self._client.storage.from_(self._bucket).download(storage_path)
        if response is None:
            raise FileNotFoundError(f"File not found in Supabase storage: {storage_path}")
        return response

    def get_signed_url(self, storage_path: str, expires_in: int = 3600) -> str:
        """
        Generate a time-limited signed URL for direct client access.
        Default expiry: 1 hour.
        Use this instead of streaming through the backend for large files.
        """
        response = self._client.storage.from_(self._bucket).create_signed_url(
            storage_path, expires_in
        )
        return response.get("signedURL", "")
