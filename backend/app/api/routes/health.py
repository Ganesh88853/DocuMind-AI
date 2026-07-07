"""
Health, readiness, liveness, and metrics endpoints — Milestone 9.

Endpoints:
  GET /health         — basic alive check (no DB)
  GET /health/ready   — readiness: checks DB connection
  GET /health/live    — liveness: always 200 if process is alive
  GET /metrics        — Prometheus-compatible text format
"""

import time
from typing import Any, Dict

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from app.core.config import settings

router = APIRouter(tags=["Health & Monitoring"])

# Simple in-process counters (reset on restart)
_metrics: Dict[str, Any] = {
    "requests_total": 0,
    "requests_errors": 0,
    "start_time": time.time(),
}


def increment_requests(error: bool = False) -> None:
    _metrics["requests_total"] += 1
    if error:
        _metrics["requests_errors"] += 1


@router.get("/health", include_in_schema=True, tags=["Health & Monitoring"])
async def health_check() -> dict:
    """Basic health check — always returns 200 if the process is alive."""
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@router.get("/health/ready", include_in_schema=True, tags=["Health & Monitoring"])
async def readiness_check() -> dict:
    """Readiness probe — checks database connectivity."""
    from app.database.database import engine as async_engine
    try:
        async with async_engine.connect() as conn:
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as exc:
        db_status = f"error: {exc}"

    ready = db_status == "ok"
    return {
        "status": "ready" if ready else "not_ready",
        "checks": {
            "database": db_status,
        },
    }


@router.get("/health/live", include_in_schema=True, tags=["Health & Monitoring"])
async def liveness_check() -> dict:
    """Liveness probe — confirms the process is alive and event loop is running."""
    return {"status": "alive", "uptime_seconds": round(time.time() - _metrics["start_time"], 1)}


@router.get("/metrics", response_class=PlainTextResponse, include_in_schema=True, tags=["Health & Monitoring"])
async def metrics() -> str:
    """
    Prometheus-compatible text metrics.
    Expose: request counters, error rate, uptime.
    """
    uptime = time.time() - _metrics["start_time"]
    lines = [
        "# HELP documind_requests_total Total HTTP requests processed",
        "# TYPE documind_requests_total counter",
        f"documind_requests_total {_metrics['requests_total']}",
        "",
        "# HELP documind_requests_errors_total Total HTTP requests that resulted in errors",
        "# TYPE documind_requests_errors_total counter",
        f"documind_requests_errors_total {_metrics['requests_errors']}",
        "",
        "# HELP documind_uptime_seconds Time since process start in seconds",
        "# TYPE documind_uptime_seconds gauge",
        f"documind_uptime_seconds {uptime:.2f}",
        "",
        f"# service={settings.APP_NAME} version={settings.APP_VERSION} env={settings.ENVIRONMENT}",
    ]
    return "\n".join(lines)
