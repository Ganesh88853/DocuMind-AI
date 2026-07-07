#!/usr/bin/env bash
# =============================================================================
# scripts/migrate-prod.sh — Run Alembic migrations against production database
# =============================================================================
# Usage:
#   DATABASE_URL="postgresql+asyncpg://..." ./scripts/migrate-prod.sh
#   ./scripts/migrate-prod.sh upgrade head
#   ./scripts/migrate-prod.sh downgrade -1      (rollback one revision)
#   ./scripts/migrate-prod.sh history           (show migration history)
#   ./scripts/migrate-prod.sh current           (show current revision)
# =============================================================================

set -euo pipefail

COMMAND="${1:-upgrade}"
REVISION="${2:-head}"

# Validate DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
    echo "❌ DATABASE_URL environment variable is required"
    echo "   Export it first: export DATABASE_URL='postgresql+asyncpg://...'"
    exit 1
fi

# Warn before any destructive downgrade
if [ "$COMMAND" = "downgrade" ]; then
    echo ""
    echo "⚠️  WARNING: You are about to run a database DOWNGRADE."
    echo "   This may result in data loss if the migration drops columns or tables."
    echo ""
    echo "   Target revision: $REVISION"
    echo "   DATABASE_URL: ${DATABASE_URL:0:60}..."
    echo ""
    read -r -p "   Type 'yes' to continue: " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

echo ""
echo "=============================================="
echo "  DocuMind AI — Database Migration"
echo "  Command: alembic $COMMAND $REVISION"
echo "=============================================="
echo ""

cd "$BACKEND_DIR"

# Activate venv if it exists
if [ -f "venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source venv/bin/activate
elif [ -f ".venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source .venv/bin/activate
fi

echo "Current migration state:"
alembic current 2>/dev/null || echo "(no migrations applied yet)"
echo ""

echo "Running: alembic $COMMAND $REVISION"
alembic "$COMMAND" "$REVISION"

echo ""
echo "Migration complete. New state:"
alembic current
echo ""
echo "✅ Done"
