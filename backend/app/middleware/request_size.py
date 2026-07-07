"""
Request Size Middleware — rejects oversized requests before they reach route handlers.

- Non-upload requests: MAX_REQUEST_SIZE_KB (default 1 MB)
- Checked via Content-Length header (fast path, no body read)
"""

from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings

_MAX_BYTES = settings.MAX_REQUEST_SIZE_KB * 1024


class RequestSizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Upload endpoints have their own size checks
        if "/documents" in request.url.path and request.method == "POST":
            return await call_next(request)

        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > _MAX_BYTES:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "error": "request_too_large",
                            "message": f"Request body exceeds {settings.MAX_REQUEST_SIZE_KB} KB limit.",
                        },
                    )
            except ValueError:
                pass

        return await call_next(request)
