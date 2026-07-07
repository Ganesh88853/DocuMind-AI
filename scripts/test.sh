#!/usr/bin/env bash
# =============================================================================
# DocuMind AI — Run Tests Inside Containers
# =============================================================================
# Runs the full test suite inside the backend container.
# Uses the documind_test database (created by postgres init.sql).
#
# Usage:
#   ./scripts/test.sh                    # run all backend tests
#   ./scripts/test.sh tests/test_auth_api.py   # run specific file
#   ./scripts/test.sh --frontend         # run frontend vitest suite
#   ./scripts/test.sh --all              # run both backend + frontend
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[test]${NC} $*"; }
err() { echo -e "${RED}[test]${NC} $*"; }

cd "$PROJECT_ROOT"

FRONTEND=false
ALL=false
ARGS=()

for arg in "$@"; do
    case "$arg" in
        --frontend) FRONTEND=true ;;
        --all)      ALL=true ;;
        *)          ARGS+=("$arg") ;;
    esac
done

run_backend() {
    log "Running backend tests..."
    docker exec \
        -e TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@postgres:5432/documind_test" \
        -e ENVIRONMENT=testing \
        -e BCRYPT_ROUNDS=4 \
        -e GEMINI_API_KEY=fake-key-for-tests \
        documind-backend \
        python -m pytest "${ARGS[@]:-tests/}" -v --no-header --tb=short
}

run_frontend() {
    log "Running frontend tests..."
    docker exec documind-frontend sh -c "npm test" 2>/dev/null || \
    docker exec documind-frontend sh -c "npx vitest run" 2>/dev/null || \
    (log "Frontend container does not have npm — running locally..." && \
     cd "$PROJECT_ROOT/frontend" && npm test)
}

if $ALL; then
    run_backend
    run_frontend
elif $FRONTEND; then
    run_frontend
else
    run_backend
fi
