#!/usr/bin/env bash
# =============================================================================
# DocuMind AI — Run Database Migrations
# =============================================================================
# Runs Alembic migrations inside the backend container.
#
# Usage:
#   ./scripts/migrate.sh                 # upgrade to head
#   ./scripts/migrate.sh downgrade -1   # roll back one revision
#   ./scripts/migrate.sh current        # show current revision
#   ./scripts/migrate.sh history        # show migration history
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

CMD="${*:-upgrade head}"

echo "[migrate] Running: alembic $CMD"
docker exec -it documind-backend alembic $CMD
