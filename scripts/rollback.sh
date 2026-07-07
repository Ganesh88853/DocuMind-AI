#!/usr/bin/env bash
# =============================================================================
# scripts/rollback.sh — Emergency rollback procedure for DocuMind AI
# =============================================================================
# Rolls back a failed deployment by:
#   1. Running alembic downgrade (if migration was applied)
#   2. Triggering a Render rollback to the previous deploy (via API)
#   3. Verifying health after rollback
#
# Usage:
#   RENDER_API_KEY=... RENDER_SERVICE_ID=... ./scripts/rollback.sh
#   ./scripts/rollback.sh --steps 1           (roll back N migrations)
#   ./scripts/rollback.sh --skip-db           (only rollback Render deploy)
# =============================================================================

set -euo pipefail

MIGRATION_STEPS="${STEPS:-1}"
SKIP_DB="${SKIP_DB:-false}"
BACKEND_URL="${BACKEND_URL:-}"
RENDER_API_KEY="${RENDER_API_KEY:-}"
RENDER_SERVICE_ID="${RENDER_SERVICE_ID:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=============================================="
echo -e "  ${RED}DocuMind AI — EMERGENCY ROLLBACK${NC}"
echo "=============================================="
echo ""
echo "This script will:"
if [ "$SKIP_DB" != "true" ]; then
    echo "  1. Roll back $MIGRATION_STEPS database migration(s)"
fi
echo "  2. Trigger Render service redeploy to previous commit"
if [ -n "$BACKEND_URL" ]; then
    echo "  3. Verify health after rollback"
fi
echo ""

read -r -p "Are you sure you want to proceed? (type 'rollback' to confirm): " CONFIRM
if [ "$CONFIRM" != "rollback" ]; then
    echo "Aborted."
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Step 1: Database rollback ─────────────────────────────────────────────────
if [ "$SKIP_DB" != "true" ] && [ -n "${DATABASE_URL:-}" ]; then
    echo ""
    echo -e "${YELLOW}Step 1: Rolling back $MIGRATION_STEPS database migration(s)...${NC}"
    DATABASE_URL="$DATABASE_URL" \
        COMMAND="downgrade" \
        REVISION="-${MIGRATION_STEPS}" \
        bash "$SCRIPT_DIR/migrate-prod.sh" downgrade "-${MIGRATION_STEPS}" <<< "yes"
    echo -e "${GREEN}Database rollback complete.${NC}"
else
    echo ""
    echo "Skipping database rollback (SKIP_DB=true or DATABASE_URL not set)"
fi

# ── Step 2: Render service rollback ───────────────────────────────────────────
if [ -n "$RENDER_API_KEY" ] && [ -n "$RENDER_SERVICE_ID" ]; then
    echo ""
    echo -e "${YELLOW}Step 2: Triggering Render rollback to previous deploy...${NC}"

    # List recent deploys to find the previous successful one
    DEPLOYS=$(curl -sf --max-time 30 \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys?limit=5" 2>/dev/null)

    # Find the most recent "live" deploy (skip index 0 which is the current failing one)
    PREVIOUS_DEPLOY_ID=$(echo "$DEPLOYS" | python3 -c "
import sys, json
deploys = json.load(sys.stdin)
live = [d for d in deploys if d.get('status') == 'live']
if len(live) >= 2:
    print(live[1]['id'])
elif len(live) == 1:
    print(live[0]['id'])
" 2>/dev/null || echo "")

    if [ -n "$PREVIOUS_DEPLOY_ID" ]; then
        echo "Rolling back to deploy: $PREVIOUS_DEPLOY_ID"
        curl -sf --max-time 30 \
            -X POST \
            -H "Authorization: Bearer $RENDER_API_KEY" \
            "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys/${PREVIOUS_DEPLOY_ID}/rollback" \
            > /dev/null 2>&1
        echo -e "${GREEN}Render rollback triggered successfully.${NC}"
        echo "Check Render Dashboard for deployment progress."
    else
        echo -e "${RED}Could not find a previous live deploy to roll back to.${NC}"
        echo "Log in to Render Dashboard and manually select a previous deploy."
    fi
else
    echo ""
    echo "Skipping Render rollback (RENDER_API_KEY and RENDER_SERVICE_ID not set)"
    echo "To rollback via Render Dashboard:"
    echo "  1. Go to https://dashboard.render.com"
    echo "  2. Select your service → Events"
    echo "  3. Find the last successful deploy → click 'Redeploy'"
fi

# ── Step 3: Health verification ───────────────────────────────────────────────
if [ -n "$BACKEND_URL" ]; then
    echo ""
    echo -e "${YELLOW}Step 3: Waiting 30s then verifying health...${NC}"
    sleep 30
    bash "$SCRIPT_DIR/health-check.sh" "$BACKEND_URL"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}Rollback procedure complete.${NC}"
echo "Monitor Render dashboard and application logs."
echo "=============================================="
