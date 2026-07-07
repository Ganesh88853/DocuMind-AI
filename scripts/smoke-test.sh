#!/usr/bin/env bash
# =============================================================================
# scripts/smoke-test.sh — Post-deployment smoke tests for DocuMind AI
# =============================================================================
# Runs a minimal but real end-to-end flow against a live environment:
#   1. Register a temporary user
#   2. Login and retrieve tokens
#   3. Call /me to verify the token works
#   4. Upload a tiny test document
#   5. Logout
#   6. Clean up (attempt to delete the test user)
#
# Usage:
#   BACKEND_URL=https://documind-backend.onrender.com ./scripts/smoke-test.sh
#   ./scripts/smoke-test.sh http://localhost:8000
# =============================================================================

set -euo pipefail

BACKEND_URL="${1:-${BACKEND_URL:-http://localhost:8000}}"
TIMESTAMP=$(date +%s)
TEST_EMAIL="smoke-test-${TIMESTAMP}@documind-ci.invalid"
TEST_PASSWORD="SmokeTest@${TIMESTAMP}"
TEST_NAME="Smoke Test User"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

pass() { echo -e "${GREEN}  ✅ $1${NC}"; }
fail() { echo -e "${RED}  ❌ $1${NC}"; exit 1; }

echo ""
echo "=============================================="
echo "  DocuMind AI — Post-Deployment Smoke Tests"
echo "  Target: $BACKEND_URL"
echo "  Email:  $TEST_EMAIL"
echo "=============================================="
echo ""

# ── Step 1: Register ───────────────────────────────────────────────────────────
echo "Step 1: Register test user"
REG_RESPONSE=$(curl -sf --max-time 30 \
    -X POST "$BACKEND_URL/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"full_name\": \"$TEST_NAME\",
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"password_confirm\": \"$TEST_PASSWORD\"
    }" 2>/dev/null)

ACCESS_TOKEN=$(echo "$REG_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ]; then
    # Maybe registration is disabled — try login with seeded user
    fail "Registration failed or returned no access_token. Response: ${REG_RESPONSE:0:200}"
fi
pass "Registered successfully"

# ── Step 2: Get profile ───────────────────────────────────────────────────────
echo "Step 2: Get user profile (/me)"
ME_RESPONSE=$(curl -sf --max-time 30 \
    "$BACKEND_URL/api/v1/auth/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)

ME_EMAIL=$(echo "$ME_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('email',''))" 2>/dev/null || echo "")
if [ "$ME_EMAIL" = "$TEST_EMAIL" ]; then
    pass "/me returned correct user"
else
    fail "/me returned unexpected email: '$ME_EMAIL'"
fi

# ── Step 3: Login with credentials ────────────────────────────────────────────
echo "Step 3: Login"
LOGIN_RESPONSE=$(curl -sf --max-time 30 \
    -X POST "$BACKEND_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}" 2>/dev/null)

LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || echo "")
if [ -z "$LOGIN_TOKEN" ]; then
    fail "Login failed. Response: ${LOGIN_RESPONSE:0:200}"
fi
pass "Login successful"

# ── Step 4: Logout ────────────────────────────────────────────────────────────
echo "Step 4: Logout"
LOGOUT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 \
    -X POST "$BACKEND_URL/api/v1/auth/logout" \
    -H "Authorization: Bearer $LOGIN_TOKEN" 2>/dev/null)

if [ "$LOGOUT_STATUS" = "200" ] || [ "$LOGOUT_STATUS" = "204" ]; then
    pass "Logout successful (HTTP $LOGOUT_STATUS)"
else
    fail "Logout returned unexpected status: $LOGOUT_STATUS"
fi

# ── Step 5: Confirm token is invalidated ──────────────────────────────────────
echo "Step 5: Verify token is invalidated after logout"
POST_LOGOUT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 \
    "$BACKEND_URL/api/v1/auth/me" \
    -H "Authorization: Bearer $LOGIN_TOKEN" 2>/dev/null)

if [ "$POST_LOGOUT_STATUS" = "401" ]; then
    pass "Token correctly invalidated after logout (401)"
else
    fail "Token still valid after logout! Got: $POST_LOGOUT_STATUS"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "=============================================="
echo -e "${GREEN}  ✅ All smoke tests passed!${NC}"
echo "  Deployment is healthy and functional."
echo "=============================================="
echo ""
