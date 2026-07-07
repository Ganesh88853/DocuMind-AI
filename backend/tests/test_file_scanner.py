"""
Unit tests for app/services/security/file_scanner.py

Tests:
- Extension blocking (executables)
- MIME type allowlist
- Full scan_file pipeline
"""

import pytest

pytestmark = pytest.mark.unit


class TestExtensionValidation:
    def test_pdf_is_allowed(self):
        from app.services.security.file_scanner import validate_file_extension
        assert validate_file_extension("document.pdf") is None

    def test_docx_is_allowed(self):
        from app.services.security.file_scanner import validate_file_extension
        assert validate_file_extension("report.docx") is None

    def test_txt_is_allowed(self):
        from app.services.security.file_scanner import validate_file_extension
        assert validate_file_extension("notes.txt") is None

    def test_exe_is_blocked(self):
        from app.services.security.file_scanner import validate_file_extension
        result = validate_file_extension("malware.exe")
        assert result is not None
        assert "exe" in result.lower() or "not allowed" in result.lower()

    def test_bat_is_blocked(self):
        from app.services.security.file_scanner import validate_file_extension
        assert validate_file_extension("script.bat") is not None

    def test_sh_is_blocked(self):
        from app.services.security.file_scanner import validate_file_extension
        assert validate_file_extension("setup.sh") is not None

    def test_ps1_is_blocked(self):
        from app.services.security.file_scanner import validate_file_extension
        assert validate_file_extension("run.ps1") is not None

    def test_case_insensitive(self):
        from app.services.security.file_scanner import validate_file_extension
        assert validate_file_extension("virus.EXE") is not None

    def test_dll_is_blocked(self):
        from app.services.security.file_scanner import validate_file_extension
        assert validate_file_extension("library.dll") is not None

    def test_js_is_blocked(self):
        from app.services.security.file_scanner import validate_file_extension
        assert validate_file_extension("evil.js") is not None


class TestMIMEValidation:
    def test_pdf_mime_allowed(self):
        from app.services.security.file_scanner import validate_mime_type
        assert validate_mime_type("application/pdf", "doc.pdf") is None

    def test_jpeg_mime_allowed(self):
        from app.services.security.file_scanner import validate_mime_type
        assert validate_mime_type("image/jpeg", "photo.jpg") is None

    def test_application_exe_blocked(self):
        from app.services.security.file_scanner import validate_mime_type
        result = validate_mime_type("application/x-executable", "evil.exe")
        assert result is not None

    def test_octet_stream_blocked(self):
        from app.services.security.file_scanner import validate_mime_type
        result = validate_mime_type("application/octet-stream", "file.bin")
        assert result is not None


class TestScanFile:
    @pytest.mark.asyncio
    async def test_valid_pdf_passes(self):
        from app.services.security.file_scanner import scan_file
        result = await scan_file(b"%PDF-1.4 fake content", "doc.pdf", "application/pdf")
        assert result is None

    @pytest.mark.asyncio
    async def test_exe_extension_fails(self):
        from app.services.security.file_scanner import scan_file
        result = await scan_file(b"MZ malware bytes", "evil.exe", "application/pdf")
        assert result is not None

    @pytest.mark.asyncio
    async def test_bad_mime_fails(self):
        from app.services.security.file_scanner import scan_file
        result = await scan_file(b"content", "file.pdf", "application/x-executable")
        assert result is not None

    @pytest.mark.asyncio
    async def test_txt_passes(self):
        from app.services.security.file_scanner import scan_file
        result = await scan_file(b"plain text content", "notes.txt", "text/plain")
        assert result is None
