"""
Application configuration using Pydantic v2 BaseSettings.
All values are loaded from environment variables or .env file.

Fail-fast validation: required production variables are checked on startup
so the application refuses to start with a dangerously misconfigured state.

Never store secrets in source code — always read from environment.
"""

import sys
from functools import lru_cache
from typing import List, Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────
    APP_NAME: str = "DocuMind AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: Literal["development", "testing", "production"] = "development"

    # ── Server ─────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── Database ───────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/documind_ai"

    # ── CORS ───────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # ── Logging ────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"

    # ── JWT ────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "change-this-to-a-secure-random-secret-at-least-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Security hardening ─────────────────────────────────────────────────
    BCRYPT_ROUNDS: int = 12
    MAX_UPLOAD_SIZE_MB: int = 50
    MAX_REQUEST_SIZE_KB: int = 1024
    RATE_LIMIT_GLOBAL: int = 200
    RATE_LIMIT_AUTH: int = 10
    RATE_LIMIT_UPLOAD: int = 20
    RATE_LIMIT_CHAT: int = 30
    TRUSTED_PROXIES: str = "127.0.0.1"
    SECRET_ROTATION_KEY: str = ""

    # ── Email ──────────────────────────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@documind.ai"
    EMAIL_FROM_NAME: str = "DocuMind AI"
    FRONTEND_URL: str = "http://localhost:5173"

    # ── AI ─────────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash-lite"

    # ── Storage backend ────────────────────────────────────────────────────
    # "local"    → LocalStorageProvider (dev/testing)
    # "supabase" → SupabaseStorageProvider (production)
    STORAGE_BACKEND: Literal["local", "supabase"] = "local"

    # ── Supabase (required when STORAGE_BACKEND=supabase) ─────────────────
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "documind-uploads"

    # ── Computed helpers ───────────────────────────────────────────────────

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str) -> str:
        return value

    def get_cors_origins(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def get_trusted_proxies(self) -> List[str]:
        return [p.strip() for p in self.TRUSTED_PROXIES.split(",") if p.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT == "testing"

    # ── Fail-fast production validation ────────────────────────────────────
    @model_validator(mode="after")
    def validate_production_requirements(self) -> "Settings":
        """
        Refuse to start in production with insecure / missing configuration.
        This runs once at import time — prevents accidental prod misconfiguration.
        """
        if self.ENVIRONMENT != "production":
            return self

        errors: List[str] = []

        # JWT secret must not be the development placeholder
        insecure_jwt_prefixes = ("change-this", "dev-", "test-", "ci-", "fake-")
        if any(self.JWT_SECRET_KEY.lower().startswith(p) for p in insecure_jwt_prefixes):
            errors.append(
                "JWT_SECRET_KEY looks like a development placeholder. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if len(self.JWT_SECRET_KEY) < 32:
            errors.append("JWT_SECRET_KEY must be at least 32 characters in production.")

        # CORS must not allow localhost in production
        cors = self.get_cors_origins()
        localhost_origins = [o for o in cors if "localhost" in o or "127.0.0.1" in o]
        if localhost_origins:
            errors.append(
                f"CORS_ORIGINS contains localhost entries in production: {localhost_origins}. "
                "Set to your production domain(s) only."
            )

        # Gemini key must be set
        if not self.GEMINI_API_KEY or self.GEMINI_API_KEY.startswith("fake"):
            errors.append("GEMINI_API_KEY must be set to a real key in production.")

        # Supabase storage validation
        if self.STORAGE_BACKEND == "supabase":
            if not self.SUPABASE_URL:
                errors.append("SUPABASE_URL is required when STORAGE_BACKEND=supabase.")
            if not self.SUPABASE_SERVICE_KEY:
                errors.append("SUPABASE_SERVICE_KEY is required when STORAGE_BACKEND=supabase.")

        # Debug must be off
        if self.DEBUG:
            errors.append("DEBUG must be false in production.")

        if errors:
            print("\n❌ DocuMind AI refused to start — production misconfiguration:\n", file=sys.stderr)
            for i, err in enumerate(errors, 1):
                print(f"  {i}. {err}", file=sys.stderr)
            print("\nFix the above issues in your environment variables and restart.\n", file=sys.stderr)
            sys.exit(1)

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
