# 🚀 Renderowl 2.0 - Production Deployment Guide

**Document Version:** 1.0  
**Last Updated:** 2026-02-28  
**Status:** Ready for Production Launch

---

## 📋 Table of Contents

1. [Pre-Flight Checklist](#pre-flight-checklist)
2. [Custom Domain Setup](#custom-domain-setup)
3. [Production Environment Variables](#production-environment-variables)
4. [Deployment Commands](#deployment-commands)
5. [Post-Deploy Verification](#post-deploy-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Emergency Contacts](#emergency-contacts)

---

## Pre-Flight Checklist

### ✅ Infrastructure Status

| Component | Status | UUID | Notes |
|-----------|--------|------|-------|
| Production Project | ✅ Ready | `dw8koss8w0ock4kwkg8kgcs4` | Coolify configured |
| PostgreSQL DB | ✅ Running | `pco4ko044wowcww4k0co04go` | Daily backups @ 2 AM |
| Redis Cache | ✅ Running | `i8kcc48okkw84s8cooo0os44` | Session & queue storage |
| Frontend App | ⏳ Pending | `q4scks4osww0g0osc0s00o8k` | Awaiting deployment |
| Backend API | ⏳ Pending | `fkk0cswckcos4ossoo0cks0g` | Awaiting deployment |
| Worker Service | ⏳ Pending | `ew4084gcc844400g80sscskk` | Awaiting deployment |

### ✅ Required Secrets Checklist

Add these to GitHub Repository Settings → Secrets and variables → Actions:

```bash
# ─────────────────────────────────────────────────────────
# REQUIRED SECRETS - PRODUCTION WILL FAIL WITHOUT THESE
# ─────────────────────────────────────────────────────────

# Coolify Deployment
COOLIFY_URL=https://coolify.kayorama.nl
COOLIFY_API_KEY=<your_coolify_api_key>
COOLIFY_PROD_PROJECT_ID=dw8koss8w0ock4kwkg8kgcs4

# Clerk Authentication (Live Keys Required)
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx

# Stripe Payments (Live Keys Required)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx

# Cloudflare R2 Storage
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<r2_access_key>
R2_SECRET_ACCESS_KEY=<r2_secret_key>
R2_BUCKET_UPLOADS=renderowl-uploads-prod
R2_BUCKET_EXPORTS=renderowl-exports-prod

# OpenAI API
OPENAI_API_KEY=sk-xxxxxxxxxxxx

# ─────────────────────────────────────────────────────────
# OPTIONAL BUT RECOMMENDED
# ─────────────────────────────────────────────────────────

# Sentry Error Tracking
SENTRY_DSN=https://xxxxxxxxxxxx@xxxxxxxxxxxx.ingest.sentry.io/xxxxxxxxxxxx
SENTRY_AUTH_TOKEN=<sentry_auth_token>
SENTRY_ORG=<your_org>

# Discord Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxxxxxxxxx/xxxxxxxxxxxx
```

### ✅ DNS Configuration Checklist

- [ ] `renderowl.com` → A record → Coolify VPS IP (91.98.168.113)
- [ ] `www.renderowl.com` → CNAME → renderowl.com
- [ ] `app.renderowl.com` → A record → Coolify VPS IP
- [ ] `api.renderowl.com` → A record → Coolify VPS IP
- [ ] `worker.renderowl.com` → A record → Coolify VPS IP (optional)

### ✅ SSL Certificate Checklist

- [ ] Cloudflare SSL/TLS mode: Full (strict)
- [ ] Origin certificates generated
- [ ] Automatic HTTPS rewrites enabled
- [ ] Always Use HTTPS enabled

---

## Custom Domain Setup

### Step 1: DNS Configuration at Cloudflare

Add these DNS records to your Cloudflare dashboard for `renderowl.com`:

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | `@` | `91.98.168.113` | Proxied | Auto |
| A | `app` | `91.98.168.113` | Proxied | Auto |
| A | `api` | `91.98.168.113` | Proxied | Auto |
| CNAME | `www` | `renderowl.com` | Proxied | Auto |

### Step 2: Update Coolify Domains

After DNS propagates (5-30 minutes), update domains in Coolify:

```bash
# Using mcporter (recommended)
# Frontend
echo '{"domains": [{"domain": "app.renderowl.com", "https": true}]}' | mcporter call coolify.application.update uuid=q4scks4osww0g0osc0s00o8k domains='[{"domain":"app.renderowl.com"}]'

# Backend
echo '{"domains": [{"domain": "api.renderowl.com", "https": true}]}' | mcporter call coolify.application.update uuid=fkk0cswckcos4ossoo0cks0g domains='[{"domain":"api.renderowl.com"}]'

# Worker (optional)
echo '{"domains": [{"domain": "worker.renderowl.com", "https": true}]}' | mcporter call coolify.application.update uuid=ew4084gcc844400g80sscskk domains='[{"domain":"worker.renderowl.com"}]'
```

Or manually via Coolify Dashboard:
1. Visit https://coolify.kayorama.nl
2. Navigate to Project → Applications
3. Edit each application
4. Update domain field
5. Enable HTTPS

### Step 3: Verify SSL Certificates

```bash
# Check SSL certificates
curl -I https://app.renderowl.com
curl -I https://api.renderowl.com

# Verify certificate details
echo | openssl s_client -servername app.renderowl.com -connect app.renderowl.com:443 2>/dev/null | openssl x509 -noout -text | grep -A2 "Subject Alternative Name"
```

Expected output should show valid SSL certificate with correct SANs.

---

## Production Environment Variables

### Full Production .env Template

```bash
# =============================================================================
# RENDEROWL 2.0 - PRODUCTION ENVIRONMENT
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# APPLICATION CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

NODE_ENV=production
ENVIRONMENT=production
PORT=8080

# ─────────────────────────────────────────────────────────────────────────────
# DATABASE CONFIGURATION (Auto-configured by Coolify)
# ─────────────────────────────────────────────────────────────────────────────

DATABASE_URL=postgres://renderowl:${DB_PASSWORD}@pco4ko044wowcww4k0co04go:5432/renderowl
DATABASE_MAX_CONNECTIONS=20
DATABASE_SSL_MODE=require

# ─────────────────────────────────────────────────────────────────────────────
# REDIS CONFIGURATION (Auto-configured by Coolify)
# ─────────────────────────────────────────────────────────────────────────────

REDIS_URL=redis://default:${REDIS_PASSWORD}@i8kcc48okkw84s8cooo0os44:6379/0
REDIS_POOL_SIZE=10

# ─────────────────────────────────────────────────────────────────────────────
# CLERK AUTHENTICATION (REQUIRED - Replace with live keys)
# ─────────────────────────────────────────────────────────────────────────────

CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# ─────────────────────────────────────────────────────────────────────────────
# STRIPE PAYMENTS (REQUIRED - Replace with live keys)
# ─────────────────────────────────────────────────────────────────────────────

STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Pricing Plans
STRIPE_PRICE_BASIC=price_xxxxxxxxxxxx
STRIPE_PRICE_PRO=price_xxxxxxxxxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxxxxxxxxx

# ─────────────────────────────────────────────────────────────────────────────
# CLOUDFLARE R2 STORAGE (REQUIRED)
# ─────────────────────────────────────────────────────────────────────────────

R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxx
R2_BUCKET_UPLOADS=renderowl-uploads-prod
R2_BUCKET_EXPORTS=renderowl-exports-prod
R2_PUBLIC_URL=https://cdn.renderowl.com

# ─────────────────────────────────────────────────────────────────────────────
# AI SERVICES (REQUIRED)
# ─────────────────────────────────────────────────────────────────────────────

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=4000

# Together AI (Optional - for cheaper inference)
TOGETHER_API_KEY=xxxxxxxxxxxx
TOGETHER_MODEL=meta-llama/Llama-2-70b-chat-hf

# ElevenLabs Voice (Optional)
ELEVENLABS_API_KEY=xxxxxxxxxxxx
ELEVENLABS_VOICE_ID=xxxxxxxxxxxx

# ─────────────────────────────────────────────────────────────────────────────
# SENTRY ERROR TRACKING (OPTIONAL)
# ─────────────────────────────────────────────────────────────────────────────

SENTRY_DSN=https://xxxxxxxxxxxx@xxxxxxxxxxxx.ingest.sentry.io/xxxxxxxxxxxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=${VERSION}

# ─────────────────────────────────────────────────────────────────────────────
# WORKER CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

WORKER_CONCURRENT_JOBS=2
WORKER_MAX_RETRIES=3
WORKER_TIMEOUT_SECONDS=300

# ─────────────────────────────────────────────────────────────────────────────
# SECURITY & CORS
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS=https://app.renderowl.com,https://renderowl.com
CORS_MAX_AGE=86400
JWT_SECRET=<generate-strong-secret>

# ─────────────────────────────────────────────────────────────────────────────
# RATE LIMITING
# ─────────────────────────────────────────────────────────────────────────────

RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST=20

# ─────────────────────────────────────────────────────────────────────────────
# FEATURE FLAGS
# ─────────────────────────────────────────────────────────────────────────────

FEATURE_AI_SCRIPT=true
FEATURE_AI_SCENE=true
FEATURE_AI_VOICE=true
FEATURE_BATCH_PROCESSING=true
FEATURE_ANALYTICS=true
```

### Generate Strong Secrets

```bash
# JWT Secret
openssl rand -base64 32

# Webhook Secrets (if needed)
openssl rand -hex 32
```

---

## Deployment Commands

### Option 1: GitHub Actions (Recommended)

```bash
# 1. Go to GitHub repository
open https://github.com/kaygaaf/renderowl2.0/actions

# 2. Select "Deploy to Production" workflow

# 3. Click "Run workflow"

# 4. Enter parameters:
#    - Version: v1.0.0 (or desired version tag)
#    - Confirm: DEPLOY (type exactly)

# 5. Click "Run workflow" button

# 6. Monitor deployment progress in GitHub Actions UI
```

### Option 2: Command Line Deployment

```bash
# Navigate to project directory
cd /Users/minion/.openclaw/workspace/renderowl2.0

# Set required environment variables
export COOLIFY_URL=https://coolify.kayorama.nl
export COOLIFY_API_KEY=<your_api_key>

# Deploy specific version
./scripts/deploy-prod.sh v1.0.0

# Or deploy latest
./scripts/deploy-prod.sh latest
```

### Option 3: Direct Coolify Deploy (Emergency)

```bash
# Deploy via mcporter (requires COOLIFY_API_KEY in environment)

# Frontend
mcporter call coolify.deploy tag_or_uuid=q4scks4osww0g0osc0s00o8k force=true

# Backend
mcporter call coolify.deploy tag_or_uuid=fkk0cswckcos4ossoo0cks0g force=true

# Worker
mcporter call coolify.deploy tag_or_uuid=ew4084gcc844400g80sscskk force=true
```

---

## Post-Deploy Verification

### Automated Verification Script

```bash
#!/bin/bash
# save as: verify-production.sh

set -e

API_URL="https://api.renderowl.com"
APP_URL="https://app.renderowl.com"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Production Deployment Verification"
echo "======================================"
echo ""

# Function to check endpoint
check_endpoint() {
    local name=$1
    local url=$2
    local expected=${3:-200}
    
    echo -n "Checking $name... "
    
    if response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null); then
        if [ "$response" = "$expected" ]; then
            echo -e "${GREEN}✅ OK${NC} (HTTP $response)"
            return 0
        else
            echo -e "${RED}❌ FAIL${NC} (Expected $expected, got $response)"
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (Connection error)"
        return 1
    fi
}

# 1. Health Checks
echo "📊 Step 1: Health Checks"
echo "-------------------------"
check_endpoint "Backend Health" "$API_URL/health"
check_endpoint "Frontend Health" "$APP_URL/api/health"
echo ""

# 2. API Endpoints
echo "📡 Step 2: API Endpoints"
echo "------------------------"
check_endpoint "API Status" "$API_URL/api/v1/status"
check_endpoint "Auth Config" "$API_URL/api/v1/auth/config"
echo ""

# 3. Static Assets
echo "📦 Step 3: Static Assets"
echo "------------------------"
check_endpoint "Landing Page" "$APP_URL" 200
check_endpoint "Login Page" "$APP_URL/login" 200
echo ""

# 4. SSL/TLS
echo "🔒 Step 4: SSL/TLS Verification"
echo "--------------------------------"
echo -n "Checking SSL certificate... "
if echo | openssl s_client -servername app.renderowl.com -connect app.renderowl.com:443 2>/dev/null | openssl x509 -noout -text > /dev/null; then
    expiry=$(echo | openssl s_client -servername app.renderowl.com -connect app.renderowl.com:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
    echo -e "${GREEN}✅ Valid${NC} (Expires: $expiry)"
else
    echo -e "${RED}❌ Invalid or missing${NC}"
fi
echo ""

# 5. Response Times
echo "⏱️ Step 5: Response Times"
echo "--------------------------"
echo "Backend response time:"
curl -s -o /dev/null -w "  Time: %{time_total}s\n" "$API_URL/health"

echo "Frontend response time:"
curl -s -o /dev/null -w "  Time: %{time_total}s\n" "$APP_URL/api/health"
echo ""

echo "======================================"
echo "✅ Verification Complete!"
```

### Manual Verification Checklist

| Check | Command/URL | Expected Result |
|-------|-------------|-----------------|
| **Backend Health** | `curl https://api.renderowl.com/health` | `{"status":"healthy"}` |
| **Frontend Health** | `curl https://app.renderowl.com/api/health` | `{"status":"healthy"}` |
| **Landing Page** | `curl -I https://app.renderowl.com` | HTTP 200 |
| **Login Page** | Visit in browser | Clerk login form loads |
| **API Docs** | `curl https://api.renderowl.com/api/v1/status` | Status info JSON |
| **Auth Config** | `curl https://api.renderowl.com/api/v1/auth/config` | Auth configuration |
| **SSL Valid** | Browser padlock | Secure connection |
| **WebSocket** | WSS connection | Established |

### Database Verification

```bash
# Connect to production database (via Coolify)
mcporter call coolify.database.execute uuid=pco4ko044wowcww4k0co04go command="SELECT version();"

# Check migration status
mcporter call coolify.database.execute uuid=pco4ko044wowcww4k0co04go command="SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Verify connection count
mcporter call coolify.database.execute uuid=pco4ko044wowcww4k0co04go command="SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

### End-to-End Smoke Tests

```bash
# Test user registration flow
curl -X POST https://api.renderowl.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# Test login flow
curl -X POST https://api.renderowl.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# Test API with auth (requires valid token)
curl https://api.renderowl.com/api/v1/projects \
  -H "Authorization: Bearer $TOKEN"
```

---

## Rollback Procedures

### Automatic Rollback

The GitHub Actions workflow includes automatic rollback on failure:

```yaml
rollback-on-failure:
  needs: deploy-production
  if: failure()
  # Automatically notifies and provides rollback guidance
```

### Manual Rollback

#### Option 1: GitHub Actions Rollback

```bash
# 1. Go to GitHub Actions
open https://github.com/kaygaaf/renderowl2.0/actions

# 2. Select "Deploy to Production"

# 3. Click "Run workflow"

# 4. Enter previous stable version tag (e.g., v0.9.5)

# 5. Type "DEPLOY" to confirm
```

#### Option 2: Command Line Rollback

```bash
# Identify last known good version
git log --oneline --tags | head -10

# Rollback to specific version
./scripts/deploy-prod.sh v0.9.5
```

#### Option 3: Emergency Rollback (Fastest)

```bash
# Rollback to previous deployment via Coolify
# This uses Coolify's built-in rollback feature

# Get previous deployment info
mcporter call coolify.application.show uuid=q4scks4osww0g0osc0s00o8k

# Trigger rollback (if supported by your Coolify version)
mcporter call coolify.application.rollback uuid=q4scks4osww0g0osc0s00o8k
```

### Rollback Verification

```bash
# Verify rollback success
curl https://api.renderowl.com/health
curl https://app.renderowl.com/api/health

# Check version endpoint (if implemented)
curl https://api.renderowl.com/api/v1/version
```

---

## Monitoring & Alerts

### Health Check Endpoints

| Service | Endpoint | Check Interval |
|---------|----------|----------------|
| Frontend | `https://app.renderowl.com/api/health` | 30s |
| Backend | `https://api.renderowl.com/health` | 30s |
| Worker | Internal only | 30s |
| Database | Internal health | 60s |
| Redis | Internal health | 60s |

### Monitoring URLs

```bash
# Coolify Dashboard
https://coolify.kayorama.nl/project/dw8koss8w0ock4kwkg8kgcs4

# Sentry (if configured)
https://sentry.io/organizations/<org>/projects/renderowl/

# Cloudflare Analytics
https://dash.cloudflare.com/<account>/renderowl.com

# Stripe Dashboard
https://dashboard.stripe.com/dashboard
```

### Log Access

```bash
# View logs via mcporter
mcporter call coolify.application_logs uuid=q4scks4osww0g0osc0s00o8k lines=100
mcporter call coolify.application_logs uuid=fkk0cswckcos4ossoo0cks0g lines=100
mcporter call coolify.application_logs uuid=ew4084gcc844400g80sscskk lines=100

# Or via Docker
docker logs renderowl-frontend --tail 100 -f
docker logs renderowl-backend --tail 100 -f
docker logs renderowl-worker --tail 100 -f
```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Response Time | > 500ms | > 2000ms | Scale up |
| Error Rate | > 1% | > 5% | Investigate |
| CPU Usage | > 70% | > 90% | Scale up |
| Memory Usage | > 80% | > 95% | Scale up |
| Queue Depth | > 100 | > 500 | Add workers |
| DB Connections | > 15 | > 18 | Optimize |

---

## Emergency Contacts

### Infrastructure

| Service | URL | Access |
|---------|-----|--------|
| Coolify Dashboard | https://coolify.kayorama.nl | Admin login |
| Cloudflare | https://dash.cloudflare.com | Account access |
| Stripe Dashboard | https://dashboard.stripe.com | Account access |
| Clerk Dashboard | https://dashboard.clerk.com | Account access |

### Server Access

```bash
# SSH to production server
ssh root@91.98.168.113

# Docker commands
docker ps
docker logs <container_name>
docker restart <container_name>

# View Coolify logs
cd /data/coolify
./coolify logs
```

### Rollback Hotline

If all else fails:

1. **Stop all traffic:** Disable Cloudflare proxy (DNS only mode)
2. **Restore database:** Use latest backup from Coolify
3. **Deploy last known good:** Use rollback procedures above
4. **Notify users:** Use status page or Discord

---

## Troubleshooting

### Common Issues

#### 504 Gateway Timeout

```bash
# Check if backend is running
docker ps | grep renderowl-backend

# Restart backend
mcporter call coolify.restart_service uuid=fkk0cswckcos4ossoo0cks0g
```

#### Database Connection Errors

```bash
# Check database status
mcporter call coolify.database.status uuid=pco4ko044wowcww4k0co04go

# Check connection count
mcporter call coolify.database.execute uuid=pco4ko044wowcww4k0co04go command="SELECT count(*) FROM pg_stat_activity;"
```

#### SSL Certificate Issues

```bash
# Force SSL renewal in Coolify
# Go to application settings → SSL → Regenerate

# Or via CLI
curl -X POST "${COOLIFY_URL}/api/v1/applications/q4scks4osww0g0osc0s00o8k/regenerate-ssl" \
  -H "Authorization: Bearer ${COOLIFY_API_KEY}"
```

#### Worker Queue Backlog

```bash
# Check queue depth
redis-cli -u $REDIS_URL LLEN bull:video-render:waiting

# Scale up workers temporarily
mcporter call coolify.scale_service uuid=ew4084gcc844400g80sscskk replicas=5
```

---

## Launch Day Checklist

### Pre-Launch (T-2 Hours)

- [ ] All GitHub secrets configured
- [ ] DNS records propagated (check with `dig renderowl.com`)
- [ ] SSL certificates valid
- [ ] Staging environment verified working
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Team on standby

### Launch (T-0)

- [ ] Run production deployment
- [ ] Monitor deployment logs
- [ ] Wait for health checks to pass
- [ ] Verify all endpoints responding
- [ ] Test user registration
- [ ] Test payment flow (Stripe test mode first)
- [ ] Announce launch

### Post-Launch (T+1 Hour)

- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify analytics tracking
- [ ] Confirm email notifications working
- [ ] Monitor support channels
- [ ] Celebrate! 🎉

---

**Document maintained by:** DevOps Team  
**Last deployment:** Not yet deployed  
**Next review:** After production launch

---

*Renderowl 2.0 - Production Ready* 🚀
