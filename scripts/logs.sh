#!/usr/bin/env bash
# =============================================================================
# DocuMind AI — View Container Logs
# =============================================================================
# Tails logs from all or specific services.
#
# Usage:
#   ./scripts/logs.sh               # all services
#   ./scripts/logs.sh backend       # backend only
#   ./scripts/logs.sh frontend      # frontend only
#   ./scripts/logs.sh postgres      # database logs
#   ./scripts/logs.sh nginx         # nginx access/error logs
#   ./scripts/logs.sh -n 100        # last 100 lines for all
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

docker compose \
    -f docker-compose.yml \
    -f docker-compose.dev.yml \
    logs \
    --follow \
    --tail=50 \
    "$@"
