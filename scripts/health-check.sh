#!/usr/bin/env bash
# =============================================================================
# scripts/health-check.sh — Verify a DocuMind AI deployment is healthy
# =============================================================================
# Usage:
#   ./scripts/health-check.sh                                  (localhost)
#   ./scripts/health-check.sh https://documind-backend.onrender.com
#   BACKEND_URL=https://... ./scripts/health-check.sh
# =============================================================================

set -euo pipefail

BACKEND_URL="${1:-${BACKEND_URL:-http://localhost:8000}}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
TIMEOUT=30
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}  ✅ $1${NC}"; ((PASS++)); }
fail() { echo -e "${RED}  ❌ $1${NC}"; ((FAIL++)); }
info() { echo -e "${YELLOW}  ℹ  $1${NC}"; }

echo ""
echo "=============================================="
echo "  DocuMind AI — Health Verification"
echo "  Backend:  $BACKEND_URL"
echo "=============================================="
echo ""

# ── 1. Backend /health endpoint ───────────────────────────────────────────────
echo "1. Backend Health Endpoint"
HEALTH_RESPONSE=$(curl -sf --max-time "$TIMEOUT" "$BACKEND_URL/health" 2>/dev/null || echo "FAILED")
if [ "$HEALTH_RESPONSE" = "FAILED" ]; then
    fail "/health did not respond within ${TIMEOUT}s"
else
    if echo "$HEALTH_RESPONSE" | grep -q '"status"'; then
        pass "/health responded: $(echo "$HEALTH_RESPONSE" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("status","?"))' 2>/dev/null || echo "ok")"
    else
        pass "/health responded (non-JSON): ${HEALTH_RESPONSE:0:60}"
    fi
fi

# ── 2. Backend API root ────────────────────────────────────────────────────────
echo ""
echo "2. Backend API Root"
API_RESPONSE=$(curl -sf --max-time "$TIMEOUT" "$BACKEND_URL/" 2>/dev/null || echo "FAILED")
if [ "$API_RESPONSE" = "FAILED" ]; then
    fail "/ did not respond"
else
    pass "API root reachable"
fi

# ── 3. Backend — auth endpoint exists ────────────────────────────────────────
echo ""
echo "3. Auth Endpoint Reachability"
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST "$BACKEND_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}' 2>/dev/null || echo "000")

case "$AUTH_STATUS" in
    401|422) pass "Auth endpoint active (returned $AUTH_STATUS — expected for invalid creds)" ;;
    000)     fail "Auth endpoint unreachable" ;;
    *)       info "Auth endpoint returned $AUTH_STATUS" ;;
esac

# ── 4. Database connectivity (via /health extended) ────────────────────────────
echo ""
echo "4. Database Connectivity"
DB_HEALTH=$(curl -sf --max-time "$TIMEOUT" "$BACKEND_URL/health" 2>/dev/null || echo "{}")
DB_STATUS=$(echo "$DB_HEALTH" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('database', d.get('db', 'unknown')))
except:
    print('parse-error')
" 2>/dev/null)
if [ "$DB_STATUS" = "ok" ] || [ "$DB_STATUS" = "healthy" ] || [ "$DB_STATUS" = "connected" ]; then
    pass "Database: $DB_STATUS"
elif [ "$DB_STATUS" = "unknown" ] || [ "$DB_STATUS" = "parse-error" ]; then
    info "Database status not exposed in /health response (not an error)"
else
    fail "Database status: $DB_STATUS"
fi

# ── 5. CORS headers ───────────────────────────────────────────────────────────
echo ""
echo "5. CORS Headers"
CORS_HEADER=$(curl -s -o /dev/null -D - --max-time "$TIMEOUT" \
    -H "Origin: https://your-app.vercel.app" \
    "$BACKEND_URL/health" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_HEADER" ]; then
    pass "CORS header present: $(echo "$CORS_HEADER" | tr -d '\r')"
else
    info "CORS header not present (may require Origin match with CORS_ORIGINS setting)"
fi

# ── 6. Security headers ───────────────────────────────────────────────────────
echo ""
echo "6. Security Headers"
HEADERS=$(curl -s -o /dev/null -D - --max-time "$TIMEOUT" "$BACKEND_URL/health" 2>/dev/null)
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    pass "X-Content-Type-Options present"
else
    fail "X-Content-Type-Options missing"
fi
if echo "$HEADERS" | grep -qi "x-frame-options"; then
    pass "X-Frame-Options present"
else
    fail "X-Frame-Options missing"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "=============================================="
if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}  ✅ All $PASS checks passed!${NC}"
    echo "=============================================="
    exit 0
else
    echo -e "${RED}  ❌ $FAIL check(s) failed / $PASS passed${NC}"
    echo "=============================================="
    exit 1
fi
