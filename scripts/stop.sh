#!/usr/bin/env bash
# =============================================================================
# DocuMind AI — Stop All Services
# =============================================================================
# Gracefully stops all running containers.
#
# Usage:
#   ./scripts/stop.sh           # stop all services (keep volumes)
#   ./scripts/stop.sh --volumes # stop and remove volumes (WARNING: data loss)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[stop]${NC} $*"; }
warn() { echo -e "${YELLOW}[stop]${NC} $*"; }
err()  { echo -e "${RED}[stop]${NC} $*"; }

cd "$PROJECT_ROOT"

VOLUMES_FLAG=""
if [[ "${1:-}" == "--volumes" || "${1:-}" == "-v" ]]; then
    warn "WARNING: --volumes flag set. This will DELETE all database data and uploads!"
    read -rp "Are you sure? Type 'yes' to confirm: " confirm
    if [[ "$confirm" == "yes" ]]; then
        VOLUMES_FLAG="--volumes"
    else
        log "Aborted."
        exit 0
    fi
fi

log "Stopping DocuMind AI services..."

docker compose \
    -f docker-compose.yml \
    -f docker-compose.dev.yml \
    down \
    --remove-orphans \
    $VOLUMES_FLAG

log "All services stopped."
