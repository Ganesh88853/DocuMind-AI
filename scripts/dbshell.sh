#!/usr/bin/env bash
# =============================================================================
# DocuMind AI — PostgreSQL Shell
# =============================================================================
# Opens psql directly in the database container.
#
# Usage:
#   ./scripts/dbshell.sh                    # connect to documind_ai
#   ./scripts/dbshell.sh documind_test      # connect to test database
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Load .env for credentials
set -a
[ -f .env ] && source .env
set +a

DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${1:-${POSTGRES_DB:-documind_ai}}"

echo "[dbshell] Connecting to PostgreSQL: $DB_NAME as $DB_USER"
docker exec -it documind-postgres \
    psql -U "$DB_USER" -d "$DB_NAME"
