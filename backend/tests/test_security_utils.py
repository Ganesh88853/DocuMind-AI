"""
Unit tests for app/core/security.py

Tests:
- Password hashing and verification
- JWT token creation (access + refresh) with jti and role claims
- Token decoding, subject extraction, type checks
- File hashing (SHA-256)
- Secure token generation

All tests are pure unit tests — no database or HTTP required.
"""

import time
import uuid

import pytest
from jose import JWTError, jwt

pytestmark = pytest.mark.unit


class TestPasswordHashing:
    def test_hash_returns_string(self):
        from app.core.security import hash_password
        result = hash_password("MyPass@123")
        assert isinstance(result, str)
        assert len(result) > 20

    def test_hash_is_not_plaintext(self):
        from app.core.security import hash_password
        result = hash_password("MyPass@123")
        assert "MyPass@123" not in result

    def test_different_plaintexts_produce_different_hashes(self):
        from app.core.security import hash_password
        h1 = hash_password("PassOne@1")
        h2 = hash_password("PassTwo@2")
        assert h1 != h2

    def test_same_password_produces_different_hashes(self):
        """bcrypt salts are random — same input gives different hashes."""
        from app.core.security import hash_password
        h1 = hash_password("MyPass@123")
        h2 = hash_password("MyPass@123")
        assert h1 != h2  # different salts


class TestPasswordVerification:
    def test_correct_password_verifies(self):
        from app.core.security import hash_password, verify_password
        hashed = hash_password("Correct@123")
        assert verify_password("Correct@123", hashed) is True

    def test_wrong_password_fails(self):
        from app.core.security import hash_password, verify_password
        hashed = hash_password("Correct@123")
        assert verify_password("Wrong@456", hashed) is False

    def test_empty_password_fails(self):
        from app.core.security import hash_password, verify_password
        hashed = hash_password("Correct@123")
        assert verify_password("", hashed) is False

    def test_invalid_hash_returns_false(self):
        from app.core.security import verify_password
        assert verify_password("anything", "not-a-valid-hash") is False


class TestAccessToken:
    def test_creates_tuple_token_and_jti(self):
        from app.core.security import create_access_token
        result = create_access_token(subject="user-123")
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_token_is_string(self):
        from app.core.security import create_access_token
        token, jti = create_access_token(subject="user-123")
        assert isinstance(token, str)
        assert len(token) > 10

    def test_jti_is_uuid_string(self):
        from app.core.security import create_access_token
        _, jti = create_access_token(subject="user-123")
        uuid.UUID(jti)  # raises ValueError if not valid UUID

    def test_token_contains_subject(self):
        from app.core.security import create_access_token, decode_token
        token, _ = create_access_token(subject="user-abc")
        payload = decode_token(token)
        assert payload["sub"] == "user-abc"

    def test_token_contains_role(self):
        from app.core.security import create_access_token, decode_token
        token, _ = create_access_token(subject="user-abc", role="admin")
        payload = decode_token(token)
        assert payload["role"] == "admin"

    def test_token_type_is_access(self):
        from app.core.security import create_access_token, decode_token
        token, _ = create_access_token(subject="user-abc")
        payload = decode_token(token)
        assert payload["type"] == "access"

    def test_token_contains_jti_claim(self):
        from app.core.security import create_access_token, decode_token
        token, jti = create_access_token(subject="user-abc")
        payload = decode_token(token)
        assert payload["jti"] == jti

    def test_default_role_is_user(self):
        from app.core.security import create_access_token, decode_token
        token, _ = create_access_token(subject="user-abc")
        payload = decode_token(token)
        assert payload["role"] == "user"

    def test_two_tokens_have_different_jtis(self):
        from app.core.security import create_access_token
        _, jti1 = create_access_token(subject="user-abc")
        _, jti2 = create_access_token(subject="user-abc")
        assert jti1 != jti2


class TestRefreshToken:
    def test_creates_tuple(self):
        from app.core.security import create_refresh_token
        result = create_refresh_token(subject="user-123")
        assert isinstance(result, tuple) and len(result) == 2

    def test_token_type_is_refresh(self):
        from app.core.security import create_refresh_token, decode_token
        token, _ = create_refresh_token(subject="user-123")
        payload = decode_token(token)
        assert payload["type"] == "refresh"

    def test_refresh_has_longer_expiry_than_access(self):
        from app.core.security import create_access_token, create_refresh_token, decode_token
        access, _ = create_access_token(subject="u")
        refresh, _ = create_refresh_token(subject="u")
        a_exp = decode_token(access)["exp"]
        r_exp = decode_token(refresh)["exp"]
        assert r_exp > a_exp


class TestTokenHelpers:
    def test_extract_subject(self):
        from app.core.security import create_access_token, extract_subject
        token, _ = create_access_token(subject="user-xyz")
        assert extract_subject(token) == "user-xyz"

    def test_get_token_type_access(self):
        from app.core.security import create_access_token, get_token_type
        token, _ = create_access_token(subject="u")
        assert get_token_type(token) == "access"

    def test_get_token_type_refresh(self):
        from app.core.security import create_refresh_token, get_token_type
        token, _ = create_refresh_token(subject="u")
        assert get_token_type(token) == "refresh"

    def test_get_token_jti(self):
        from app.core.security import create_access_token, get_token_jti
        token, jti = create_access_token(subject="u")
        assert get_token_jti(token) == jti

    def test_get_token_role_admin(self):
        from app.core.security import create_access_token, get_token_role
        token, _ = create_access_token(subject="u", role="admin")
        assert get_token_role(token) == "admin"

    def test_decode_invalid_token_raises(self):
        from app.core.security import decode_token
        with pytest.raises(JWTError):
            decode_token("this.is.not.a.valid.token")

    def test_decode_tampered_token_raises(self):
        from app.core.security import create_access_token, decode_token
        token, _ = create_access_token(subject="u")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            decode_token(tampered)


class TestFileHashing:
    def test_returns_hex_string(self):
        from app.core.security import hash_file
        result = hash_file(b"hello world")
        assert isinstance(result, str)
        assert len(result) == 64  # SHA-256 hex

    def test_same_content_same_hash(self):
        from app.core.security import hash_file
        assert hash_file(b"content") == hash_file(b"content")

    def test_different_content_different_hash(self):
        from app.core.security import hash_file
        assert hash_file(b"aaa") != hash_file(b"bbb")

    def test_empty_bytes_has_known_sha256(self):
        from app.core.security import hash_file
        # SHA-256 of empty bytes is well-known
        assert hash_file(b"") == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


class TestSecureTokenGeneration:
    def test_generates_string(self):
        from app.core.security import generate_secure_token
        token = generate_secure_token()
        assert isinstance(token, str)

    def test_default_length_adequate(self):
        from app.core.security import generate_secure_token
        token = generate_secure_token()
        assert len(token) >= 20

    def test_two_tokens_are_different(self):
        from app.core.security import generate_secure_token
        t1 = generate_secure_token()
        t2 = generate_secure_token()
        assert t1 != t2
