"""
Structured logging configuration — Milestone 9.

- Development: colorized human-readable output
- Production: JSON structured output with request_id, user_id
- Log sanitizer: strips password/token/secret fields
- Never logs document content
"""

import logging
import sys
from app.core.config import settings

# Fields that must never appear in logs
_SENSITIVE_KEYS = frozenset({
    "password", "password_hash", "token", "access_token", "refresh_token",
    "secret", "api_key", "jwt", "authorization", "credit_card",
})


class SanitizingFilter(logging.Filter):
    """Remove sensitive fields from log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        if hasattr(record, "msg") and isinstance(record.msg, str):
            for key in _SENSITIVE_KEYS:
                if key in record.msg.lower():
                    record.msg = "[REDACTED — contains sensitive field]"
                    break
        return True


class RequestContextFilter(logging.Filter):
    """Inject request_id and user_id into every log record if available."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            from app.middleware.request_id import request_id_var
            record.request_id = request_id_var.get("")
        except Exception:
            record.request_id = ""
        return True


class ColorFormatter(logging.Formatter):
    """ANSI color formatter for development log output."""

    COLORS = {
        logging.DEBUG: "\033[36m",
        logging.INFO: "\033[32m",
        logging.WARNING: "\033[33m",
        logging.ERROR: "\033[31m",
        logging.CRITICAL: "\033[35m",
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelno, self.RESET)
        record.levelname = f"{color}{record.levelname}{self.RESET}"
        return super().format(record)


class JSONFormatter(logging.Formatter):
    """JSON structured log formatter for production."""

    def format(self, record: logging.LogRecord) -> str:
        import json
        import traceback

        log_obj = {
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", ""),
        }

        # Include extra context fields
        for key in ("user_id", "doc_id", "path", "method", "duration_ms", "status_code"):
            val = getattr(record, key, None)
            if val is not None:
                log_obj[key] = val

        # Include exception info without exposing full stack trace in message
        if record.exc_info:
            log_obj["exception"] = traceback.format_exception_only(
                record.exc_info[0], record.exc_info[1]
            )[-1].strip()

        return json.dumps(log_obj)


def setup_logging() -> None:
    """Configure application-wide logging."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(SanitizingFilter())
    handler.addFilter(RequestContextFilter())

    if settings.ENVIRONMENT == "development":
        formatter = ColorFormatter(
            fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    else:
        formatter = JSONFormatter()

    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Suppress noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
