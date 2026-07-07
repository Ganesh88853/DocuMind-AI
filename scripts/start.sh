#!/usr/bin/env bash
# =============================================================================
# DocuMind AI — Start Development Environment
# =============================================================================
# Starts all services in development mode with hot reload.
#
# Usage:
#   ./scripts/start.sh              # start all services
#   ./scripts/start.sh backend      # start specific service
#   ./scripts/start.sh --build      # force rebuild images
#
# After starting:
#   Frontend (Vite HMR):  http://localhost:5173
#   Backend (FastAPI):    http://localhost:8000
#   API Docs:             http://localhost:8000/docs
#   Via Nginx:            http://localhost
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()    { echo -e "${GREEN}[start]${NC} $*"; }
info()   { echo -e "${CYAN}[start]${NC} $*"; }
warn()   { echo -e "${YELLOW}[start]${NC} $*"; }

cd "$PROJECT_ROOT"

# ── Ensure .env exists ────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
    warn ".env not found — copying from .env.example"
    cp .env.example .env
    warn "Edit .env and set GEMINI_API_KEY and JWT_SECRET_KEY before continuing."
    warn "Press ENTER to continue with defaults, or Ctrl+C to abort."
    read -r
fi

# ── Parse arguments ───────────────────────────────────────────────────────────
BUILD_FLAG=""
SERVICE=""
for arg in "$@"; do
    case "$arg" in
        --build|-b) BUILD_FLAG="--build" ;;
        *)          SERVICE="$arg" ;;
    esac
done

# ── Start ─────────────────────────────────────────────────────────────────────
log "Starting DocuMind AI development environment..."
info "Compose files: docker-compose.yml + docker-compose.dev.yml"

docker compose \
    -f docker-compose.yml \
    -f docker-compose.dev.yml \
    up \
    --remove-orphans \
    $BUILD_FLAG \
    $SERVICE

