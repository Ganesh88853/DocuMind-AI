"""
Unit tests for app/schemas/auth.py

Tests all password strength rules and schema validation.
Pure unit tests — no database needed.
"""

import pytest
from pydantic import ValidationError

pytestmark = pytest.mark.unit


class TestRegisterRequestSchema:
    def _valid_payload(self, **overrides):
        base = {
            "full_name": "Jane Doe",
            "email": "jane@example.com",
            "password": "Secret@123",
            "confirm_password": "Secret@123",
        }
        base.update(overrides)
        return base

    def test_valid_registration(self):
        from app.schemas.auth import RegisterRequest
        req = RegisterRequest(**self._valid_payload())
        assert req.email == "jane@example.com"
        assert req.full_name == "Jane Doe"

    def test_passwords_must_match(self):
        from app.schemas.auth import RegisterRequest
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(**self._valid_payload(confirm_password="Different@99"))
        assert "Passwords do not match" in str(exc_info.value)

    def test_password_too_short(self):
        from app.schemas.auth import RegisterRequest
        with pytest.raises(ValidationError):
            RegisterRequest(**self._valid_payload(password="Ab1!", confirm_password="Ab1!"))

    def test_password_missing_uppercase(self):
        from app.schemas.auth import RegisterRequest
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(**self._valid_payload(password="secret@123", confirm_password="secret@123"))
        assert "uppercase" in str(exc_info.value)

    def test_password_missing_lowercase(self):
        from app.schemas.auth import RegisterRequest
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(**self._valid_payload(password="SECRET@123", confirm_password="SECRET@123"))
        assert "lowercase" in str(exc_info.value)

    def test_password_missing_number(self):
        from app.schemas.auth import RegisterRequest
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(**self._valid_payload(password="Secret@abc", confirm_password="Secret@abc"))
        assert "number" in str(exc_info.value)

    def test_password_missing_special_char(self):
        from app.schemas.auth import RegisterRequest
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(**self._valid_payload(password="Secret1234", confirm_password="Secret1234"))
        assert "special" in str(exc_info.value)

    def test_full_name_too_short(self):
        from app.schemas.auth import RegisterRequest
        with pytest.raises(ValidationError):
            RegisterRequest(**self._valid_payload(full_name="A"))

    def test_invalid_email(self):
        from app.schemas.auth import RegisterRequest
        with pytest.raises(ValidationError):
            RegisterRequest(**self._valid_payload(email="not-an-email"))

    def test_full_name_min_2_chars(self):
        from app.schemas.auth import RegisterRequest
        req = RegisterRequest(**self._valid_payload(full_name="Jo"))
        assert req.full_name == "Jo"


class TestLoginRequestSchema:
    def test_valid_login(self):
        from app.schemas.auth import LoginRequest
        req = LoginRequest(email="user@test.com", password="anypassword")
        assert req.email == "user@test.com"

    def test_missing_email(self):
        from app.schemas.auth import LoginRequest
        with pytest.raises(ValidationError):
            LoginRequest(password="anypassword")

    def test_missing_password(self):
        from app.schemas.auth import LoginRequest
        with pytest.raises(ValidationError):
            LoginRequest(email="user@test.com")

    def test_invalid_email_format(self):
        from app.schemas.auth import LoginRequest
        with pytest.raises(ValidationError):
            LoginRequest(email="bad-email", password="anything")


class TestRefreshRequestSchema:
    def test_valid_refresh(self):
        from app.schemas.auth import RefreshRequest
        req = RefreshRequest(refresh_token="sometoken.value.here")
        assert req.refresh_token == "sometoken.value.here"

    def test_missing_token(self):
        from app.schemas.auth import RefreshRequest
        with pytest.raises(ValidationError):
            RefreshRequest()
