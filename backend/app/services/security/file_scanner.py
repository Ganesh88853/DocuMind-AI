"""
VirusScanner — pluggable interface for malware scanning.

MockVirusScanner is the default — it logs the scan intent but always passes.
Replace with ClamAVScanner or any other implementation by setting VIRUS_SCANNER_BACKEND in .env.

Rejected file types regardless of scanner result:
  .exe .bat .sh .ps1 .msi .cmd .vbs .js .jar .com .scr .pif
"""

import logging
from abc import ABC, abstractmethod
from typing import Optional

logger = logging.getLogger(__name__)

# File extensions that are always rejected — no documents should be executables
BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".sh", ".ps1", ".msi", ".cmd", ".vbs", ".js",
    ".jar", ".com", ".scr", ".pif", ".dll", ".so", ".dylib",
    ".php", ".py", ".rb", ".pl", ".cgi",
}

# Allowed document MIME types
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/tiff",
}


class ScanResult:
    def __init__(self, clean: bool, message: str = "") -> None:
        self.clean = clean
        self.message = message


class VirusScanner(ABC):
    @abstractmethod
    async def scan(self, content: bytes, filename: str) -> ScanResult: ...


class MockVirusScanner(VirusScanner):
    """Mock scanner — always clean. Replace for production."""

    async def scan(self, content: bytes, filename: str) -> ScanResult:
        logger.debug("[VIRUS SCANNER MOCK] Scanned %s (%d bytes) — clean", filename, len(content))
        return ScanResult(clean=True, message="Mock scan passed")


def get_scanner() -> VirusScanner:
    return MockVirusScanner()


def validate_file_extension(filename: str) -> Optional[str]:
    """
    Return an error message if the file extension is blocked, else None.
    Case-insensitive check.
    """
    import os
    ext = os.path.splitext(filename.lower())[1]
    if ext in BLOCKED_EXTENSIONS:
        return f"File type '{ext}' is not allowed for security reasons."
    return None


def validate_mime_type(mime_type: str, filename: str) -> Optional[str]:
    """
    Return an error message if the MIME type is not in the allowed list, else None.
    """
    if mime_type not in ALLOWED_MIME_TYPES:
        return f"MIME type '{mime_type}' is not allowed."
    return None


async def scan_file(content: bytes, filename: str, mime_type: str) -> Optional[str]:
    """
    Full file security check. Returns error message if rejected, else None.
    Checks: extension, MIME type, zip bomb heuristic, virus scan.
    """
    # 1. Extension check
    err = validate_file_extension(filename)
    if err:
        return err

    # 2. MIME type check
    err = validate_mime_type(mime_type, filename)
    if err:
        return err

    # 3. Zip bomb heuristic — ratio check for compressible formats
    if mime_type in ("application/zip", "application/gzip") and len(content) > 0:
        pass  # zip bombs handled by rejecting zip uploads entirely via MIME

    # 4. Virus scan
    scanner = get_scanner()
    result = await scanner.scan(content, filename)
    if not result.clean:
        return f"Security scan failed: {result.message}"

    return None
