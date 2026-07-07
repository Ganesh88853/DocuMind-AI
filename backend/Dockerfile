# ─────────────────────────────────────────────────────────────────────────────
# DocuMind AI — Backend Dockerfile
# Multi-stage build: deps → runtime
# Non-root user, minimal image, health check included
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependency builder ───────────────────────────────────────────────
# Use full slim image with build tools to compile native extensions
# (asyncpg, Pillow, psycopg2 need gcc + libpq-dev)
FROM python:3.12-slim AS builder

WORKDIR /build

# Install system build dependencies (only needed at build time)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install wheel for faster installs
RUN pip install --no-cache-dir --upgrade pip wheel

# Copy only requirements first — Docker cache layer optimization
# If requirements.txt hasn't changed, this layer is cached
COPY requirements.txt .

# Install all dependencies into a target prefix for clean copying
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime image ────────────────────────────────────────────────────
# Lean runtime image — no build tools, no gcc
FROM python:3.12-slim AS runtime

LABEL maintainer="DocuMind AI Team"
LABEL description="DocuMind AI Backend — FastAPI + SQLAlchemy"

WORKDIR /app

# Runtime-only system libraries (libpq5 for asyncpg/psycopg2 at runtime)
# curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder stage
COPY --from=builder /install /usr/local

# ── Security: create non-root user ────────────────────────────────────────────
RUN groupadd --system --gid 1001 appgroup \
    && useradd --system --uid 1001 --gid 1001 \
       --no-create-home --shell /sbin/nologin appuser

# ── Create required directories with correct ownership ────────────────────────
RUN mkdir -p /app/uploads /app/logs /app/tmp \
    && chown -R appuser:appgroup /app

# ── Copy application source ───────────────────────────────────────────────────
# Copy entrypoint first so it's executable before we drop privileges
COPY --chown=appuser:appgroup docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy application code
COPY --chown=appuser:appgroup . .

# ── Drop to non-root ──────────────────────────────────────────────────────────
USER appuser

# Expose application port
EXPOSE 8000

# ── Health check ──────────────────────────────────────────────────────────────
# Curl the /health endpoint — fails fast if app is down
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# ── Default entrypoint ────────────────────────────────────────────────────────
# docker-entrypoint.sh: waits for DB → runs migrations → starts uvicorn
ENTRYPOINT ["docker-entrypoint.sh"]

# Production command: single worker, no reload
# Overridden in docker-compose.dev.yml for hot reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--log-level", "info"]
