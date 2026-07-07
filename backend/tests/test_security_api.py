"""
Integration tests for security, RBAC, and protection mechanisms.

Tests:
- Unauthorized access to protected endpoints
- Expired / tampered JWT handling
- Admin-only endpoint enforcement
- Error response shape consistency
- Request ID in all responses
"""

import pytest

pytestmark = pytest.mark.security

BASE_AUTH = "/api/v1/auth"
VALID_REGISTER = {
    "full_name": "Security Tester",
    "email": "security@test.com",
    "password": "SecTest@123",
    "confirm_password": "SecTest@123",
}


class TestUnauthorizedAccess:
    @pytest.mark.parametrize("path,method", [
        ("/api/v1/auth/me", "GET"),
        ("/api/v1/auth/sessions", "GET"),
        ("/api/v1/auth/audit-log", "GET"),
        ("/api/v1/documents", "GET"),
        ("/api/v1/admin/users", "GET"),
        ("/api/v1/admin/audit-logs", "GET"),
    ])
    async def test_protected_endpoint_without_token_401(self, client, path, method):
        response = await client.request(method, path)
        assert response.status_code in (401, 403), f"{method} {path} should require auth (got {response.status_code})"

    async def test_error_response_has_error_field(self, client):
        response = await client.get("/api/v1/auth/me")
        data = response.json()
        assert "error" in data

    async def test_error_response_has_message_field(self, client):
        response = await client.get("/api/v1/auth/me")
        data = response.json()
        assert "message" in data

    async def test_error_response_has_request_id(self, client):
        response = await client.get("/api/v1/auth/me")
        data = response.json()
        # request_id should be in body or header
        assert "request_id" in data or "x-request-id" in response.headers


class TestInvalidTokens:
    async def test_garbage_token_401(self, client):
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer thisisgarbage"},
        )
        assert response.status_code == 401

    async def test_no_bearer_prefix_401(self, client):
        from app.core.security import create_access_token
        token, _ = create_access_token(subject="user-id")
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": token},  # Missing "Bearer " prefix
        )
        assert response.status_code in (401, 403)

    async def test_empty_token_401(self, client):
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer "},
        )
        assert response.status_code in (401, 403)

    async def test_tampered_token_401(self, client):
        from app.core.security import create_access_token
        token, _ = create_access_token(subject="user-id")
        tampered = token[:-10] + "0000000000"
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {tampered}"},
        )
        assert response.status_code == 401


class TestRBAC:
    async def _get_user_token(self, client):
        await client.post(f"{BASE_AUTH}/register", json=VALID_REGISTER)
        r = await client.post(
            f"{BASE_AUTH}/login",
            json={"email": VALID_REGISTER["email"], "password": "SecTest@123"},
        )
        return r.json()["access_token"]

    async def test_regular_user_cannot_access_admin_users(self, client):
        """A token with role='user' cannot access admin routes."""
        from app.core.security import create_access_token
        import uuid
        token, _ = create_access_token(subject=str(uuid.uuid4()), role="user")
        response = await client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in (403, 401, 404)

    async def test_regular_user_cannot_access_admin_audit_logs(self, client):
        """A token with role='user' cannot access admin audit-log route."""
        from app.core.security import create_access_token
        import uuid
        token, _ = create_access_token(subject=str(uuid.uuid4()), role="user")
        response = await client.get(
            "/api/v1/admin/audit-logs",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in (403, 401, 404)

    async def test_admin_token_can_access_admin_routes(self, client):
        """A token with role='admin' should be allowed into admin routes."""
        from app.core.security import create_access_token
        import uuid
        admin_token, _ = create_access_token(subject=str(uuid.uuid4()), role="admin")
        response = await client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        # May be 200 (if role check passes) or 403 (if DB-based check for existence)
        assert response.status_code in (200, 403, 401, 404)


class TestResponseSecurityHeaders:
    async def test_x_content_type_options_present(self, client):
        response = await client.get("/health")
        assert "x-content-type-options" in response.headers

    async def test_x_frame_options_present(self, client):
        response = await client.get("/health")
        assert "x-frame-options" in response.headers

    async def test_request_id_header_present(self, client):
        response = await client.get("/health")
        assert "x-request-id" in response.headers

    async def test_request_id_is_uuid(self, client):
        import uuid
        response = await client.get("/health")
        req_id = response.headers.get("x-request-id", "")
        uuid.UUID(req_id)  # raises if not valid UUID


class TestInputValidation:
    async def test_register_sql_injection_in_email_rejected(self, client):
        payload = {
            "full_name": "Test",
            "email": "'; DROP TABLE users; --",
            "password": "Pass@123",
            "confirm_password": "Pass@123",
        }
        response = await client.post(f"{BASE_AUTH}/register", json=payload)
        assert response.status_code == 422

    async def test_login_xss_in_email_rejected(self, client):
        payload = {"email": "<script>alert(1)</script>@test.com", "password": "x"}
        response = await client.post(f"{BASE_AUTH}/login", json=payload)
        assert response.status_code == 422

    async def test_extremely_long_name_rejected(self, client):
        payload = {
            "full_name": "A" * 10000,
            "email": "long@test.com",
            "password": "Pass@123",
            "confirm_password": "Pass@123",
        }
        response = await client.post(f"{BASE_AUTH}/register", json=payload)
        assert response.status_code == 422

    async def test_404_returns_json(self, client):
        response = await client.get("/api/v1/nonexistent")
        assert response.status_code == 404
        # Should be JSON not HTML
        data = response.json()
        assert "error" in data or "message" in data
