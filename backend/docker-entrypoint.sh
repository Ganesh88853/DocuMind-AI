#!/bin/sh
# =============================================================================
# DocuMind AI — Backend Docker Entrypoint
# =============================================================================
# This script runs inside the container before the main application starts.
#
# Responsibilities:
#   1. Wait for PostgreSQL to become healthy (prevents connection errors on start)
#   2. Run Alembic database migrations automatically
#   3. Hand off to the CMD (uvicorn)
#
# Environment Variables Used:
#   DATABASE_URL  — full async DSN (postgresql+asyncpg://...)
#   SKIP_MIGRATIONS — set to "true" to skip migration step (testing)
# =============================================================================

set -e

# ── Colours for readable log output ──────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Colour

log()  { echo "${GREEN}[entrypoint]${NC} $*"; }
warn() { echo "${YELLOW}[entrypoint]${NC} $*"; }
err()  { echo "${RED}[entrypoint]${NC} $*" >&2; }

# ── 1. Wait for PostgreSQL ────────────────────────────────────────────────────
# Parse host and port from DATABASE_URL
# Format: postgresql+asyncpg://user:pass@host:port/dbname
DB_URL="${DATABASE_URL:-postgresql+asyncpg://postgres:postgres@db:5432/documind_ai}"

# Strip scheme and credentials to get host:port/db
DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_PORT="${DB_PORT:-5432}"

log "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT} ..."

MAX_RETRIES=30
RETRY_INTERVAL=2
attempt=0

until python -c "
import sys, asyncio, asyncpg
async def check():
    try:
        conn = await asyncpg.connect('${DB_URL}'.replace('+asyncpg', ''))
        await conn.close()
        sys.exit(0)
    except Exception as e:
        sys.exit(1)
asyncio.run(check())
" 2>/dev/null; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "$MAX_RETRIES" ]; then
        err "PostgreSQL did not become ready after ${MAX_RETRIES} attempts. Aborting."
        exit 1
    fi
    warn "PostgreSQL not ready (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${RETRY_INTERVAL}s ..."
    sleep "$RETRY_INTERVAL"
done

log "PostgreSQL is ready."

# ── 2. Run Alembic migrations ─────────────────────────────────────────────────
if [ "${SKIP_MIGRATIONS:-false}" = "true" ]; then
    warn "SKIP_MIGRATIONS=true — skipping database migrations."
else
    log "Running Alembic database migrations ..."
    if alembic upgrade head; then
        log "Migrations completed successfully."
    else
        err "Migration failed! Check the migration files and database connection."
        exit 1
    fi
fi

# ── 3. Start application ──────────────────────────────────────────────────────
log "Starting DocuMind AI backend: $*"
exec "$@"
