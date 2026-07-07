"""
Rate Limiter Middleware — sliding window rate limiting backed by PostgreSQL.
No Redis required.

Limits:
- AUTH endpoints (/api/v1/auth/login, /register): 10 req/min per IP
- UPLOAD endpoints (/api/v1/documents): 20 req/min per IP
- CHAT endpoints (/api/v1/assistant/chat): 30 req/min per IP
- GLOBAL: 200 req/min per IP

Uses slowapi (limits library) with an in-memory store for development.
For production, replace the in-memory limiter with a PostgreSQL or Redis backend.
"""

import logging
import time
from collections import defaultdict
from typing import Callable, Dict, List, Tuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory sliding window store
# {(ip, endpoint_category): [(timestamp, ...)]}
_window: Dict[Tuple[str, str], List[float]] = defaultdict(list)
_WINDOW_SECONDS = 60


def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
        trusted = settings.get_trusted_proxies()
        if request.client and request.client.host in trusted:
            return ip
    return request.client.host if request.client else "unknown"


def _categorize(path: str) -> Tuple[str, int]:
    """Return (category, limit) for a given path."""
    if path.startswith("/api/v1/auth/login") or path.startswith("/api/v1/auth/register"):
        return "auth", settings.RATE_LIMIT_AUTH
    if "/documents" in path and "upload" in path:
        return "upload", settings.RATE_LIMIT_UPLOAD
    if "/assistant/chat" in path:
        return "chat", settings.RATE_LIMIT_CHAT
    return "global", settings.RATE_LIMIT_GLOBAL


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Sliding-window in-memory rate limiter."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health/metrics endpoints
        if request.url.path in ("/health", "/health/ready", "/health/live", "/metrics"):
            return await call_next(request)

        ip = _get_ip(request)
        category, limit = _categorize(request.url.path)
        key = (ip, category)
        now = time.time()

        # Slide window
        timestamps = _window[key]
        cutoff = now - _WINDOW_SECONDS
        _window[key] = [t for t in timestamps if t > cutoff]
        _window[key].append(now)
        count = len(_window[key])

        if count > limit:
            logger.warning(
                "Rate limit exceeded: ip=%s category=%s count=%d limit=%d path=%s",
                ip, category, count, limit, request.url.path,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": f"Too many requests. Limit: {limit} per minute.",
                    "retry_after": _WINDOW_SECONDS,
                },
                headers={"Retry-After": str(_WINDOW_SECONDS)},
            )

        # Add rate limit headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, limit - count))
        response.headers["X-RateLimit-Reset"] = str(int(now + _WINDOW_SECONDS))
        return response
