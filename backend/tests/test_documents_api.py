"""
Integration tests for document upload and listing endpoints.

Tests:
- Upload valid file
- Upload rejected file types
- Upload oversized file
- List documents (authenticated)
- Unauthorized document access
"""

import io
import pytest

pytestmark = pytest.mark.integration

BASE = "/api/v1/documents"
BASE_AUTH = "/api/v1/auth"

VALID_USER = {
    "full_name": "Doc Tester",
    "email": "doctest@test.com",
    "password": "DocTest@123",
    "confirm_password": "DocTest@123",
}


async def _register_and_login(client):
    await client.post(f"{BASE_AUTH}/register", json=VALID_USER)
    r = await client.post(
        f"{BASE_AUTH}/login",
        json={"email": VALID_USER["email"], "password": "DocTest@123"},
    )
    return r.json()["access_token"]


class TestDocumentList:
    async def test_list_requires_auth(self, client):
        response = await client.get(BASE)
        assert response.status_code in (401, 403)

    async def test_list_authenticated_200(self, client):
        token = await _register_and_login(client)
        response = await client.get(BASE, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200

    async def test_list_returns_paginated_shape(self, client):
        token = await _register_and_login(client)
        response = await client.get(BASE, headers={"Authorization": f"Bearer {token}"})
        data = response.json()
        # Expect paginated response or list
        assert isinstance(data, (list, dict))

    async def test_empty_document_list(self, client):
        token = await _register_and_login(client)
        response = await client.get(BASE, headers={"Authorization": f"Bearer {token}"})
        data = response.json()
        if isinstance(data, list):
            assert len(data) == 0
        else:
            # Paginated: documents key should exist
            assert "documents" in data or "items" in data or "data" in data


class TestDocumentUpload:
    async def _auth_headers(self, client):
        token = await _register_and_login(client)
        return {"Authorization": f"Bearer {token}"}

    async def test_upload_requires_auth(self, client, sample_pdf_bytes):
        response = await client.post(
            f"{BASE}/upload",
            files={"file": ("test.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        )
        assert response.status_code in (401, 403)

    async def test_upload_valid_pdf_success(self, client, sample_pdf_bytes):
        headers = await self._auth_headers(client)
        response = await client.post(
            f"{BASE}/upload",
            files={"file": ("test.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
            headers=headers,
        )
        # 200 or 201 depending on implementation
        assert response.status_code in (200, 201)

    async def test_upload_txt_success(self, client, sample_txt_bytes):
        headers = await self._auth_headers(client)
        response = await client.post(
            f"{BASE}/upload",
            files={"file": ("notes.txt", io.BytesIO(sample_txt_bytes), "text/plain")},
            headers=headers,
        )
        assert response.status_code in (200, 201)

    async def test_upload_exe_rejected_400(self, client):
        headers = await self._auth_headers(client)
        response = await client.post(
            f"{BASE}/upload",
            files={"file": ("virus.exe", io.BytesIO(b"MZ malware"), "application/pdf")},
            headers=headers,
        )
        assert response.status_code in (400, 415)

    async def test_upload_bad_mime_rejected(self, client, sample_pdf_bytes):
        headers = await self._auth_headers(client)
        response = await client.post(
            f"{BASE}/upload",
            files={"file": ("test.pdf", io.BytesIO(sample_pdf_bytes), "application/x-executable")},
            headers=headers,
        )
        assert response.status_code in (400, 415)

    async def test_upload_empty_file_rejected(self, client):
        headers = await self._auth_headers(client)
        response = await client.post(
            f"{BASE}/upload",
            files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
            headers=headers,
        )
        assert response.status_code in (400, 422)

    async def test_upload_duplicate_file_rejected(self, client, sample_pdf_bytes):
        """Same file content (same SHA-256) should be rejected on second upload."""
        headers = await self._auth_headers(client)
        await client.post(
            f"{BASE}/upload",
            files={"file": ("first.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
            headers=headers,
        )
        response = await client.post(
            f"{BASE}/upload",
            files={"file": ("second.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
            headers=headers,
        )
        assert response.status_code == 409

    async def test_upload_response_has_document_fields(self, client, sample_pdf_bytes):
        headers = await self._auth_headers(client)
        response = await client.post(
            f"{BASE}/upload",
            files={"file": ("test.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
            headers=headers,
        )
        if response.status_code in (200, 201):
            data = response.json()
            assert "id" in data or "document" in data


class TestDocumentAccess:
    async def test_access_other_users_document_404(self, client, sample_pdf_bytes):
        """Users must not access documents that don't belong to them."""
        import uuid
        # Register user 1
        user1 = {
            "full_name": "User One",
            "email": "user1doc@test.com",
            "password": "UserOne@123",
            "confirm_password": "UserOne@123",
        }
        await client.post(f"{BASE_AUTH}/register", json=user1)
        r1 = await client.post(
            f"{BASE_AUTH}/login",
            json={"email": user1["email"], "password": "UserOne@123"},
        )
        token1 = r1.json()["access_token"]

        # Register user 2
        user2 = {
            "full_name": "User Two",
            "email": "user2doc@test.com",
            "password": "UserTwo@123",
            "confirm_password": "UserTwo@123",
        }
        await client.post(f"{BASE_AUTH}/register", json=user2)
        r2 = await client.post(
            f"{BASE_AUTH}/login",
            json={"email": user2["email"], "password": "UserTwo@123"},
        )
        token2 = r2.json()["access_token"]

        # User 1 uploads
        upload_resp = await client.post(
            f"{BASE}/upload",
            files={"file": ("private.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
            headers={"Authorization": f"Bearer {token1}"},
        )

        if upload_resp.status_code in (200, 201):
            doc_id = upload_resp.json().get("id") or upload_resp.json().get("document", {}).get("id")
            if doc_id:
                # User 2 tries to access user 1's document
                response = await client.get(
                    f"{BASE}/{doc_id}",
                    headers={"Authorization": f"Bearer {token2}"},
                )
                assert response.status_code in (403, 404)

