#!/usr/bin/env bash
# =============================================================================
# DocuMind AI — Shell into Container
# =============================================================================
# Opens an interactive shell inside a running container.
#
# Usage:
#   ./scripts/shell.sh              # shell into backend (default)
#   ./scripts/shell.sh backend      # shell into backend
#   ./scripts/shell.sh frontend     # shell into frontend
#   ./scripts/shell.sh nginx        # shell into nginx
#   ./scripts/shell.sh postgres     # shell into postgres
#   ./scripts/shell.sh redis        # shell into redis
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

SERVICE="${1:-backend}"

# Map service names to container names
case "$SERVICE" in
    backend)  CONTAINER="documind-backend"  ; SHELL="sh" ;;
    frontend) CONTAINER="documind-frontend" ; SHELL="sh" ;;
    nginx)    CONTAINER="documind-nginx"    ; SHELL="sh" ;;
    postgres) CONTAINER="documind-postgres" ; SHELL="bash" ;;
    redis)    CONTAINER="documind-redis"    ; SHELL="sh" ;;
    *)
        echo "Unknown service: $SERVICE"
        echo "Valid services: backend, frontend, nginx, postgres, redis"
        exit 1
        ;;
esac

echo "[shell] Opening $SHELL in $CONTAINER ..."
docker exec -it "$CONTAINER" "$SHELL"
