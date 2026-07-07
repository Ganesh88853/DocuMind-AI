#!/usr/bin/env bash
# =============================================================================
# DocuMind AI — Clean / Reset Development Environment
# =============================================================================
# Removes all containers, volumes, images, and build cache.
# WARNING: This DESTROYS all data. Use only when you need a clean slate.
#
# Usage:
#   ./scripts/clean.sh              # remove containers + volumes
#   ./scripts/clean.sh --images     # also remove built images
#   ./scripts/clean.sh --all        # full nuclear reset
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

log()  { echo -e "${GREEN}[clean]${NC} $*"; }
warn() { echo -e "${YELLOW}[clean]${NC} $*"; }
err()  { echo -e "${RED}[clean]${NC} $*"; }

cd "$PROJECT_ROOT"

REMOVE_IMAGES=false
REMOVE_ALL=false

for arg in "$@"; do
    case "$arg" in
        --images) REMOVE_IMAGES=true ;;
        --all)    REMOVE_IMAGES=true; REMOVE_ALL=true ;;
    esac
done

warn "⚠️  This will remove all DocuMind AI containers and volumes (DATA LOSS)!"
read -rp "Type 'yes' to confirm: " confirm
[[ "$confirm" == "yes" ]] || { log "Aborted."; exit 0; }

log "Stopping all services..."
docker compose \
    -f docker-compose.yml \
    -f docker-compose.dev.yml \
    down \
    --remove-orphans \
    --volumes \
    2>/dev/null || true

if $REMOVE_IMAGES; then
    log "Removing DocuMind images..."
    docker rmi documind-backend:latest documind-frontend:latest 2>/dev/null || true
fi

if $REMOVE_ALL; then
    log "Pruning build cache..."
    docker builder prune -f
    log "Pruning unused Docker resources..."
    docker system prune -f
fi

log "Clean complete. Run './scripts/start.sh --build' to rebuild."
