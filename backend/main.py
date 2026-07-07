"""
DocuMind AI — Backend Entry Point — Milestone 9 hardened.

Security middleware stack (order matters — outermost first):
  1. RequestIDMiddleware   — inject X-Request-ID
  2. SecurityHeadersMiddleware — OWASP security headers
  3. GZipMiddleware        — response compression
  4. RateLimiterMiddleware — sliding window per-IP rate limits
  5. RequestSizeMiddleware — reject oversized non-upload requests
  6. CORSMiddleware        — (added via add_cors_middleware)
"""

from app.core.logging import setup_logging
from app.core.config import settings
from app.api.router import api_router
from app.middleware.exception_handler import add_exception_handlers
from app.middleware.cors import add_cors_middleware
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.middleware.request_size import RequestSizeMiddleware

import logging

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

# Initialize structured logging before anything else
setup_logging()

logger = logging.getLogger(__name__)


def create_application() -> FastAPI:
    """Application factory — constructs and configures the FastAPI instance."""

    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI-powered document assistant API — Enterprise hardened",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
    )

    # ── Middleware stack (LIFO — last added = outermost) ──────────────────────
    # CORS must be first (innermost) so it handles preflight before rate limits
    add_cors_middleware(application)

    # Request size check
    application.add_middleware(RequestSizeMiddleware)

    # Rate limiting
    application.add_middleware(RateLimiterMiddleware)

    # GZip compression (min 1KB)
    application.add_middleware(GZipMiddleware, minimum_size=1024)

    # Security headers (OWASP)
    application.add_middleware(SecurityHeadersMiddleware)

    # Request ID (outermost — ensures all logs have request_id)
    application.add_middleware(RequestIDMiddleware)

    # ── Exception handlers ────────────────────────────────────────────────────
    add_exception_handlers(application)

    # ── Routers ───────────────────────────────────────────────────────────────
    application.include_router(api_router)

    @application.on_event("startup")
    async def on_startup() -> None:
        logger.info(
            "DocuMind AI backend starting up",
            extra={
                "environment": settings.ENVIRONMENT,
                "version": settings.APP_VERSION,
                "debug": settings.DEBUG,
            },
        )

    @application.on_event("shutdown")
    async def on_shutdown() -> None:
        logger.info("DocuMind AI backend shutting down")

    return application


app = create_application()
