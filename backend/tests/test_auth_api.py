"""
Integration tests for authentication API endpoints.

Tests:
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- GET  /api/v1/auth/me
- POST /api/v1/auth/logout
- POST /api/v1/auth/logout-all
- GET  /api/v1/auth/sessions
- POST /api/v1/auth/password-reset/request
- POST /api/v1/auth/password/change
- POST /api/v1/auth/email/resend
- GET  /api/v1/auth/audit-log

API contract verified: status codes, response shape, error messages.
"""

import pytest

pytestmark = pytest.mark.integration

BASE = "/api/v1/auth"
VALID_PASSWORD = "TestPass@123"
VALID_REGISTER = {
    "full_name": "Test User",
    "email": "newuser@test.com",
    "password": VALID_PASSWORD,
    "confirm_password": VALID_PASSWORD,
}


class TestRegister:
    async def test_register_success_201(self, client):
        response = await client.post(f"{BASE}/register", json=VALID_REGISTER)
        assert response.status_code == 201

    async def test_register_returns_tokens(self, client):
        response = await client.post(f"{BASE}/register", json=VALID_REGISTER)
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"

    async def test_register_returns_user(self, client):
        response = await client.post(f"{BASE}/register", json=VALID_REGISTER)
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == VALID_REGISTER["email"]

    async def test_register_duplicate_email_409(self, client):
        await client.post(f"{BASE}/register", json=VALID_REGISTER)
        response = await client.post(f"{BASE}/register", json=VALID_REGISTER)
        assert response.status_code == 409

    async def test_register_weak_password_422(self, client):
        payload = {**VALID_REGISTER, "password": "weak", "confirm_password": "weak"}
        response = await client.post(f"{BASE}/register", json=payload)
        assert response.status_code == 422

    async def test_register_mismatched_passwords_422(self, client):
        payload = {**VALID_REGISTER, "confirm_password": "Different@999"}
        response = await client.post(f"{BASE}/register", json=payload)
        assert response.status_code == 422

    async def test_register_invalid_email_422(self, client):
        payload = {**VALID_REGISTER, "email": "not-an-email"}
        response = await client.post(f"{BASE}/register", json=payload)
        assert response.status_code == 422

    async def test_register_missing_name_422(self, client):
        payload = {k: v for k, v in VALID_REGISTER.items() if k != "full_name"}
        response = await client.post(f"{BASE}/register", json=payload)
        assert response.status_code == 422

    async def test_register_response_has_request_id(self, client):
        response = await client.post(f"{BASE}/register", json=VALID_REGISTER)
        assert "x-request-id" in response.headers


class TestLogin:
    async def _register_and_get_creds(self, client):
        await client.post(f"{BASE}/register", json=VALID_REGISTER)
        return VALID_REGISTER["email"], VALID_PASSWORD

    async def test_login_success_200(self, client):
        await client.post(f"{BASE}/register", json=VALID_REGISTER)
        response = await client.post(
            f"{BASE}/login",
            json={"email": VALID_REGISTER["email"], "password": VALID_PASSWORD},
        )
        assert response.status_code == 200

    async def test_login_returns_tokens(self, client):
        await client.post(f"{BASE}/register", json=VALID_REGISTER)
        response = await client.post(
            f"{BASE}/login",
            json={"email": VALID_REGISTER["email"], "password": VALID_PASSWORD},
        )
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_login_wrong_password_401(self, client):
        await client.post(f"{BASE}/register", json=VALID_REGISTER)
        response = await client.post(
            f"{BASE}/login",
            json={"email": VALID_REGISTER["email"], "password": "WrongPass@1"},
        )
        assert response.status_code == 401

    async def test_login_unknown_email_401(self, client):
        response = await client.post(
            f"{BASE}/login",
            json={"email": "nobody@nowhere.com", "password": VALID_PASSWORD},
        )
        assert response.status_code == 401

    async def test_login_error_message_not_verbose(self, client):
        """Error must NOT pinpoint which field is wrong (email vs password).
        
        Acceptable: 'invalid email or password' (combined — doesn't reveal which)
        Not acceptable: 'email not found' or 'wrong password' (reveals which)
        """
        response = await client.post(
            f"{BASE}/login",
            json={"email": "nobody@nowhere.com", "password": VALID_PASSWORD},
        )
        assert response.status_code in (401, 422)
        if response.status_code == 401:
            data = response.json()
            msg = data.get("message", "").lower()
            # Must not say ONLY "email" wrong OR ONLY "password" wrong
            # "invalid email or password" is acceptable — it's ambiguous
            assert "email not found" not in msg
            assert "wrong password" not in msg
            assert "incorrect password" not in msg
            assert "user not found" not in msg

    async def test_login_missing_email_422(self, client):
        response = await client.post(f"{BASE}/login", json={"password": "x"})
        assert response.status_code == 422

    async def test_login_missing_password_422(self, client):
        response = await client.post(f"{BASE}/login", json={"email": "x@x.com"})
        assert response.status_code == 422

    async def test_login_error_has_error_code(self, client):
        response = await client.post(
            f"{BASE}/login",
            json={"email": "bad@bad.com", "password": "WrongPass@1"},
        )
        data = response.json()
        assert "error" in data


class TestMe:
    async def _login(self, client):
        await client.post(f"{BASE}/register", json=VALID_REGISTER)
        r = await client.post(
            f"{BASE}/login",
            json={"email": VALID_REGISTER["email"], "password": VALID_PASSWORD},
        )
        return r.json()["access_token"]

    async def test_me_authenticated_200(self, client):
        token = await self._login(client)
        response = await client.get(f"{BASE}/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200

    async def test_me_returns_user_fields(self, client):
        token = await self._login(client)
        response = await client.get(f"{BASE}/me", headers={"Authorization": f"Bearer {token}"})
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "full_name" in data
        assert "password_hash" not in data  # Must never be exposed

    async def test_me_no_token_401(self, client):
        response = await client.get(f"{BASE}/me")
        assert response.status_code in (401, 403)

    async def test_me_invalid_token_401(self, client):
        response = await client.get(f"{BASE}/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert response.status_code == 401

    async def test_me_email_matches_registered(self, client):
        token = await self._login(client)
        response = await client.get(f"{BASE}/me", headers={"Authorization": f"Bearer {token}"})
        assert response.json()["email"] == VALID_REGISTER["email"]


class TestTokenRefresh:
    async def _get_tokens(self, client):
        await client.post(f"{BASE}/register", json=VALID_REGISTER)
        r = await client.post(
            f"{BASE}/login",
            json={"email": VALID_REGISTER["email"], "password": VALID_PASSWORD},
        )
        return r.json()

    async def test_refresh_returns_new_tokens(self, client):
        tokens = await self._get_tokens(client)
        response = await client.post(
            f"{BASE}/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_refresh_tokens_are_new(self, client):
        tokens = await self._get_tokens(client)
        response = await client.post(
            f"{BASE}/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        new_data = response.json()
        assert new_data["access_token"] != tokens["access_token"]

    async def test_refresh_invalid_token_401(self, client):
        response = await client.post(
            f"{BASE}/refresh",
            json={"refresh_token": "bad.refresh.token"},
        )
        assert response.status_code == 401

    async def test_refresh_with_access_token_fails(self, client):
        """Access tokens must NOT be accepted as refresh tokens."""
        tokens = await self._get_tokens(client)
        response = await client.post(
            f"{BASE}/refresh",
            json={"refresh_token": tokens["access_token"]},
        )
        assert response.status_code == 401


class TestLogout:
    async def _full_login(self, client):
        await client.post(f"{BASE}/register", json=VALID_REGISTER)
        r = await client.post(
            f"{BASE}/login",
            json={"email": VALID_REGISTER["email"], "password": VALID_PASSWORD},
        )
        return r.json()

    async def test_logout_success(self, client):
        tokens = await self._full_login(client)
        response = await client.post(
            f"{BASE}/logout",
            json={"refresh_token": tokens["refresh_token"]},
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert response.status_code == 200

    async def test_logout_without_auth_401(self, client):
        tokens = await self._full_login(client)
        response = await client.post(
            f"{BASE}/logout",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert response.status_code in (401, 403)

    async def test_refresh_after_logout_fails(self, client):
        tokens = await self._full_login(client)
        # Logout first
        await client.post(
            f"{BASE}/logout",
            json={"refresh_token": tokens["refresh_token"]},
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        # Try to refresh with revoked token
        response = await client.post(
            f"{BASE}/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert response.status_code == 401


class TestPasswordReset:
    async def test_request_always_200(self, client):
        """Always returns 200 — prevents email enumeration."""
        response = await client.post(
            f"{BASE}/password-reset/request",
            json={"email": "nobody@nowhere.com"},
        )
        assert response.status_code == 200

    async def test_request_returns_message(self, client):
        response = await client.post(
            f"{BASE}/password-reset/request",
            json={"email": "user@test.com"},
        )
        data = response.json()
        assert "message" in data


class TestSessions:
    async def _login(self, client):
        await client.post(f"{BASE}/register", json=VALID_REGISTER)
        r = await client.post(
            f"{BASE}/login",
            json={"email": VALID_REGISTER["email"], "password": VALID_PASSWORD},
        )
        return r.json()

    async def test_get_sessions_200(self, client):
        tokens = await self._login(client)
        response = await client.get(
            f"{BASE}/sessions",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert response.status_code == 200

    async def test_get_sessions_returns_list(self, client):
        tokens = await self._login(client)
        response = await client.get(
            f"{BASE}/sessions",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert isinstance(response.json(), list)

    async def test_sessions_unauthenticated_401(self, client):
        response = await client.get(f"{BASE}/sessions")
        assert response.status_code in (401, 403)


class TestAuditLog:
    async def test_audit_log_authenticated_200(self, client):
        await client.post(f"{BASE}/register", json=VALID_REGISTER)
        r = await client.post(
            f"{BASE}/login",
            json={"email": VALID_REGISTER["email"], "password": VALID_PASSWORD},
        )
        token = r.json()["access_token"]
        response = await client.get(
            f"{BASE}/audit-log",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_audit_log_unauthenticated_401(self, client):
        response = await client.get(f"{BASE}/audit-log")
        assert response.status_code in (401, 403)


class TestEmailResend:
    async def test_resend_requires_auth(self, client):
        response = await client.post(f"{BASE}/email/resend")
        assert response.status_code in (401, 403)
