# Renderowl Deployment Recovery — 2026-02-25

## Problem
- Production API at `api.renderowl.com` returning **503 Service Unavailable**
- Coolify deployment stuck in `in_progress` state since 2026-02-24 00:16 UTC
- Container shows `running:unknown` status but healthchecks were passing during deploy
- Root cause: Coolify deployment never completed/closed properly

## Immediate Fix
Restart the deployment via Coolify webhook trigger:

```bash
# Trigger redeploy via Coolify API
curl -X POST \
  "http://91.98.168.113:8000/api/v1/applications/13/restart" \
  -H "Authorization: Bearer $COOLIFY_API_KEY"
```

## Stabilization Improvement Implemented

### 1. Healthcheck Resilience (docker-compose.yaml)
Increased `start_period` from 60s → 90s to prevent premature container restart during slow startup:

```yaml
healthcheck:
  test: [ "CMD", "curl", "--fail", "--silent", "--show-error", "--connect-timeout", "2", "--max-time", "5", "http://localhost:8000/live" ]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 90s  # Increased from 60s
```

### 2. Deployment Monitoring (scripts/deploy-check.sh)
New script to detect stuck deployments:

```bash
#!/bin/bash
# Detect and alert on stuck deployments
DEPLOY_STATUS=$(curl -s "http://91.98.168.113:8000/api/v1/applications/13" \
  -H "Authorization: Bearer $COOLIFY_API_KEY" | jq -r '.status')

if [ "$DEPLOY_STATUS" = "in_progress" ]; then
  # Check if deployment has been running > 30 minutes
  DEPLOY_START=$(curl -s "http://91.98.168.113:8000/api/v1/applications/13/deployments" \
    -H "Authorization: Bearer $COOLIFY_API_KEY" | jq -r '.[0].created_at')
  
  START_TS=$(date -d "$DEPLOY_START" +%s)
  NOW_TS=$(date +%s)
  DIFF_MIN=$(( (NOW_TS - START_TS) / 60 ))
  
  if [ $DIFF_MIN -gt 30 ]; then
    echo "WARNING: Deployment stuck for ${DIFF_MIN} minutes. Triggering restart..."
    curl -X POST "http://91.98.168.113:8000/api/v1/applications/13/restart" \
      -H "Authorization: Bearer $COOLIFY_API_KEY"
  fi
fi
```

### 3. Liveness Check Optimization (Dockerfile)
Added `--retry` to curl for transient network issues during startup:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD curl --fail --silent --show-error --retry 2 --connect-timeout 2 --max-time 5 http://localhost:8000/live || exit 1
```

## Resolution ✅

**Deployment restart successful at 10:56 AM CET**

- `/live` → `{"status":"ok","service":"renderowl-api"}` (200 OK)
- `/health` → `{"status":"healthy"}` with all checks passing (DB, Redis, Celery, Storage)
- Response time: ~166ms
- Coolify deployment completed successfully

## Verification Steps (Completed)
- [x] After restart, verify: `curl -s https://api.renderowl.com/live`
- [x] Should return: `{"status": "ok", "service": "renderowl-api", ...}`
- [x] Healthcheck should pass: `curl -s https://api.renderowl.com/health`
- [x] Coolify status should show healthy

## Next Steps
- [x] Execute deployment restart
- [x] Monitor for 503 resolution
- [ ] Add deployment watchdog cron (hourly checks) — Ticket created
- [ ] Consider adding circuit breaker for deployment API calls

## Files Modified
- `docker-compose.yaml` — increased healthcheck start_period
- `scripts/deploy-check.sh` — new deployment watchdog script (to be committed)
- `Dockerfile` — added curl retry flag
