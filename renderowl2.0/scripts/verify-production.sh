#!/bin/bash
# =============================================================================
# Renderowl 2.0 - Production Deployment Verification Script
# =============================================================================
# Usage: ./scripts/verify-production.sh [environment]
#        environment: production (default) | staging
# =============================================================================

set -e

ENVIRONMENT="${1:-production}"

if [ "$ENVIRONMENT" = "production" ]; then
    API_URL="https://api.renderowl.com"
    APP_URL="https://app.renderowl.com"
    WORKER_URL="https://worker.renderowl.com"
    MAIN_URL="https://renderowl.com"
elif [ "$ENVIRONMENT" = "staging" ]; then
    API_URL="https://staging-api.renderowl.com"
    APP_URL="https://staging.renderowl.com"
    WORKER_URL=""
    MAIN_URL="https://staging.renderowl.com"
else
    echo "❌ Unknown environment: $ENVIRONMENT"
    echo "Usage: $0 [production|staging]"
    exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

echo ""
echo "🚀 Renderowl 2.0 - Production Verification"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "API: $API_URL"
echo "App: $APP_URL"
echo ""

# Helper functions
log_pass() {
    echo -e "${GREEN}✅ PASS${NC} $1"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}❌ FAIL${NC} $1"
    ((FAILED++))
}

log_info() {
    echo -e "${BLUE}ℹ️  INFO${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC} $1"
}

check_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}
    local timeout=${4:-10}
    
    echo -n "  $name... "
    
    if response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" \
        --max-time "$timeout" "$url" 2>/dev/null); then
        
        code=$(echo "$response" | cut -d',' -f1)
        time=$(echo "$response" | cut -d',' -f2)
        
        if [ "$code" = "$expected_code" ]; then
            log_pass "(HTTP $code, ${time}s)"
            return 0
        else
            log_fail "Expected $expected_code, got $code"
            return 1
        fi
    else
        log_fail "Connection timeout or error"
        return 1
    fi
}

check_json_endpoint() {
    local name=$1
    local url=$2
    local expected_field=$3
    
    echo -n "  $name... "
    
    if response=$(curl -s --max-time 10 "$url" 2>/dev/null); then
        if echo "$response" | grep -q "\"$expected_field\""; then
            log_pass "(Found $expected_field)"
            return 0
        else
            log_fail "Missing field: $expected_field"
            return 1
        fi
    else
        log_fail "Connection error"
        return 1
    fi
}

# =============================================================================
# SECTION 1: Health Checks
# =============================================================================
echo "📊 Section 1: Health Checks"
echo "----------------------------"

check_endpoint "Backend Health" "$API_URL/health"
check_endpoint "Frontend Health" "$APP_URL/api/health"
[ -n "$WORKER_URL" ] && check_endpoint "Worker Health" "$WORKER_URL/health"

echo ""

# =============================================================================
# SECTION 2: API Endpoints
# =============================================================================
echo "📡 Section 2: API Endpoints"
echo "----------------------------"

check_json_endpoint "API Status" "$API_URL/api/v1/status" "status"
check_json_endpoint "Auth Config" "$API_URL/api/v1/auth/config" "clerk"
check_endpoint "API Version" "$API_URL/api/v1/version" 200

echo ""

# =============================================================================
# SECTION 3: Frontend Pages
# =============================================================================
echo "🎨 Section 3: Frontend Pages"
echo "-----------------------------"

check_endpoint "Landing Page" "$APP_URL"
check_endpoint "Login Page" "$APP_URL/login"
check_endpoint "Signup Page" "$APP_URL/signup"
check_endpoint "Dashboard" "$APP_URL/dashboard" 302  # Redirects if not logged in
check_endpoint "Editor" "$APP_URL/editor" 302  # Redirects if not logged in

echo ""

# =============================================================================
# SECTION 4: Static Assets
# =============================================================================
echo "📦 Section 4: Static Assets"
echo "----------------------------"

echo -n "  Checking CSS/JS bundles... "
html=$(curl -s --max-time 10 "$APP_URL" 2>/dev/null)
if echo "$html" | grep -q "script.*src\|link.*stylesheet"; then
    log_pass "Bundles present"
else
    log_warn "Could not verify bundles"
fi

echo ""

# =============================================================================
# SECTION 5: SSL/TLS Verification
# =============================================================================
echo "🔒 Section 5: SSL/TLS Verification"
echo "-----------------------------------"

check_ssl() {
    local domain=$1
    echo -n "  SSL for $domain... "
    
    if expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain":443 2>/dev/null | \
        openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2); then
        
        # Convert to timestamp
        expiry_ts=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry" +%s 2>/dev/null || date -d "$expiry" +%s 2>/dev/null)
        now_ts=$(date +%s)
        days_until=$(( (expiry_ts - now_ts) / 86400 ))
        
        if [ $days_until -gt 30 ]; then
            log_pass "Valid for $days_until days"
        elif [ $days_until -gt 7 ]; then
            log_warn "Expires in $days_until days"
        else
            log_fail "Expires in $days_until days!"
        fi
    else
        log_fail "Could not verify SSL"
    fi
}

# Extract domains
domain=$(echo "$APP_URL" | sed 's|https://||' | sed 's|/.*||')
api_domain=$(echo "$API_URL" | sed 's|https://||' | sed 's|/.*||')

check_ssl "$domain"
check_ssl "$api_domain"

echo ""

# =============================================================================
# SECTION 6: Response Times
# =============================================================================
echo "⏱️  Section 6: Response Times"
echo "-----------------------------"

echo "  Backend response times:"
for i in {1..3}; do
    time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$API_URL/health" 2>/dev/null)
    echo "    Request $i: ${time}s"
done

echo ""
echo "  Frontend response times:"
for i in {1..3}; do
    time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$APP_URL/api/health" 2>/dev/null)
    echo "    Request $i: ${time}s"
done

echo ""

# =============================================================================
# SECTION 7: Headers & Security
# =============================================================================
echo "🛡️  Section 7: Security Headers"
echo "-------------------------------"

check_header() {
    local url=$1
    local header=$2
    echo -n "  $header... "
    
    if response=$(curl -sI --max-time 10 "$url" 2>/dev/null | grep -i "^$header:"); then
        log_pass "$(echo "$response" | cut -d':' -f2- | xargs)"
    else
        log_warn "Header not found"
    fi
}

check_header "$APP_URL" "strict-transport-security"
check_header "$APP_URL" "x-content-type-options"
check_header "$APP_URL" "x-frame-options"
check_header "$API_URL" "access-control-allow-origin"

echo ""

# =============================================================================
# SECTION 8: Integration Checks
# =============================================================================
echo "🔗 Section 8: Integration Checks"
echo "---------------------------------"

echo -n "  Clerk auth endpoint... "
if curl -s "$API_URL/api/v1/auth/config" | grep -q "publishableKey"; then
    log_pass "Clerk configured"
else
    log_warn "Could not verify Clerk config"
fi

echo -n "  Stripe configuration... "
if curl -s "$API_URL/api/v1/billing/config" 2>/dev/null | grep -q "stripe"; then
    log_pass "Stripe configured"
else
    log_warn "Could not verify Stripe config"
fi

echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo "=========================================="
echo "📋 Verification Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Production is healthy.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some checks failed. Please review above.${NC}"
    exit 1
fi
