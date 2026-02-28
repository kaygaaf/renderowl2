# 🚨 Renderowl 2.0 - Production Runbook

**Quick reference for common production operations and emergency procedures.**

---

## Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [Quick Commands](#quick-commands)
3. [Common Operations](#common-operations)
4. [Emergency Procedures](#emergency-procedures)
5. [Health Checks](#health-checks)
6. [Log Analysis](#log-analysis)
7. [Scaling](#scaling)
8. [Backup & Restore](#backup--restore)

---

## Emergency Contacts

| System | URL | Priority |
|--------|-----|----------|
| Coolify Dashboard | https://coolify.kayorama.nl | P0 |
| Cloudflare | https://dash.cloudflare.com | P0 |
| Stripe Dashboard | https://dashboard.stripe.com | P1 |
| Clerk Dashboard | https://dashboard.clerk.com | P1 |
| Sentry | https://sentry.io | P1 |

---

## Quick Commands

### Connect to Production Server
```bash
ssh root@91.98.168.113
cd /data/coolify
```

### View Running Containers
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Restart Services
```bash
# Restart all
mcporter call coolify.restart_project uuid=dw8koss8w0ock4kwkg8kgcs4

# Restart specific service
mcporter call coolify.restart_service uuid=q4scks4osww0g0osc0s00o8k
mcporter call coolify.restart_service uuid=fkk0cswckcos4ossoo0cks0g
mcporter call coolify.restart_service uuid=ew4084gcc844400g80sscskk
```

### View Logs
```bash
# Frontend logs
mcporter call coolify.application_logs uuid=q4scks4osww0g0osc0s00o8k lines=100

# Backend logs
mcporter call coolify.application_logs uuid=fkk0cswckcos4ossoo0cks0g lines=100

# Worker logs
mcporter call coolify.application_logs uuid=ew4084gcc844400g80sscskk lines=100

# Real-time logs
docker logs -f renderowl-frontend
docker logs -f renderowl-backend
docker logs -f renderowl-worker
```

---

## Common Operations

### Deploy New Version
```bash
# Via GitHub Actions (recommended)
open https://github.com/kaygaaf/renderowl2.0/actions

# Via CLI
./scripts/deploy-prod.sh v1.0.0
```

### Check Health Status
```bash
# Quick health check
curl -s https://api.renderowl.com/health | jq .
curl -s https://app.renderowl.com/api/health | jq .

# Full verification
./scripts/verify-production.sh production
```

### Check Database
```bash
# Connect to database
mcporter call coolify.database.execute uuid=pco4ko044wowcww4k0co04go command="SELECT version();"

# Check active connections
mcporter call coolify.application_logs uuid=pco4ko044wowcww4k0co04go command="SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Check table sizes
mcporter call coolify.database.execute uuid=pco4ko044wowcww4k0co04go command="SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Check Redis
```bash
# Connect to Redis
redis-cli -u $REDIS_URL

# Check queue depth
redis-cli -u $REDIS_URL LLEN bull:video-render:waiting

# Check memory usage
redis-cli -u $REDIS_URL INFO memory
```

---

## Emergency Procedures

### 🔴 Site Down (P0)

```bash
# 1. Check if services are running
docker ps | grep renderowl

# 2. Check health endpoints
curl -s https://api.renderowl.com/health
curl -s https://app.renderowl.com/api/health

# 3. If unhealthy, restart services
mcporter call coolify.restart_project uuid=dw8koss8w0ock4kwkg8kgcs4

# 4. Check logs for errors
docker logs renderowl-backend --tail 100 | grep -i error
docker logs renderowl-frontend --tail 100 | grep -i error

# 5. If still down, check infrastructure
ssh root@91.98.168.113
df -h  # Disk space
free -h  # Memory
top  # CPU usage
```

### 🔴 504 Gateway Timeout

```bash
# 1. Check backend response time
time curl -s https://api.renderowl.com/health

# 2. Check database connections
mcporter call coolify.database.execute uuid=pco4ko044wowcww4k0co04go command="SELECT count(*) FROM pg_stat_activity;"

# 3. Restart backend if needed
mcporter call coolify.restart_service uuid=fkk0cswckcos4ossoo0cks0g

# 4. Scale up if under load (see Scaling section)
```

### 🔴 Database Connection Issues

```bash
# 1. Check database status
mcporter call coolify.database.status uuid=pco4ko044wowcww4k0co04go

# 2. Check connection count
mcporter call coolify.database.execute uuid=pco4ko044wowcww4k0co04go command="SELECT count(*) FROM pg_stat_activity WHERE datname='renderowl';"

# 3. Kill idle connections if needed
mcporter call coolify.database.execute uuid=pco4ko044wowcww4k0co04go command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 minutes';"

# 4. Restart services to clear connection pools
mcporter call coolify.restart_service uuid=fkk0cswckcos4ossoo0cks0g
```

### 🔴 Worker Queue Backlog

```bash
# 1. Check queue depth
redis-cli -u $REDIS_URL LLEN bull:video-render:waiting
redis-cli -u $REDIS_URL LLEN bull:video-render:active
redis-cli -u $REDIS_URL LLEN bull:video-render:failed

# 2. Scale up workers temporarily
mcporter call coolify.scale_service uuid=ew4084gcc844400g80sscskk replicas=5

# 3. Monitor queue clearance
watch -n 5 'redis-cli -u $REDIS_URL LLEN bull:video-render:waiting'

# 4. Scale back down when cleared
mcporter call coolify.scale_service uuid=ew4084gcc844400g80sscskk replicas=2
```

### 🔴 SSL Certificate Expired

```bash
# 1. Check certificate expiry
echo | openssl s_client -servername app.renderowl.com -connect app.renderowl.com:443 2>/dev/null | openssl x509 -noout -dates

# 2. Regenerate via Coolify
# Go to Coolify Dashboard → Applications → Edit → SSL → Regenerate

# 3. Or force renewal
mcporter call coolify.application.regenerate_ssl uuid=q4scks4osww0g0osc0s00o8k
mcporter call coolify.application.regenerate_ssl uuid=fkk0cswckcos4ossoo0cks0g
```

### 🔴 Security Incident

```bash
# 1. Enable maintenance mode (block all traffic)
# Via Cloudflare: Security → WAF → Create Rule → Block all

# 2. Check access logs for suspicious activity
docker logs renderowl-nginx 2>&1 | grep -E "(POST /login|POST /api/auth)" | tail -50

# 3. Check for rate limit violations
docker logs renderowl-backend 2>&1 | grep -i "rate limit" | tail -20

# 4. Rotate secrets if compromised
# - Clerk API keys
# - Stripe API keys
# - JWT secret

# 5. Notify team and document incident
```

---

## Health Checks

### Automated Health Check Script
```bash
#!/bin/bash
# Add to cron for continuous monitoring

API_URL="https://api.renderowl.com"
APP_URL="https://app.renderowl.com"
WEBHOOK_URL="$DISCORD_WEBHOOK_URL"

# Check API
if ! curl -sf "$API_URL/health" > /dev/null; then
    curl -H "Content-Type: application/json" \
        -d '{"content":"🚨 API health check failed!"}' \
        "$WEBHOOK_URL"
fi

# Check Frontend
if ! curl -sf "$APP_URL/api/health" > /dev/null; then
    curl -H "Content-Type: application/json" \
        -d '{"content":"🚨 Frontend health check failed!"}' \
        "$WEBHOOK_URL"
fi
```

### Manual Health Check
```bash
# Run full verification
./scripts/verify-production.sh production
```

---

## Log Analysis

### Common Log Commands

```bash
# Recent errors
docker logs renderowl-backend --since=1h 2>&1 | grep -i error
docker logs renderowl-frontend --since=1h 2>&1 | grep -i error

# Specific status codes
docker logs renderowl-nginx 2>&1 | grep '" 5[0-9][0-9] '
docker logs renderowl-nginx 2>&1 | grep '" 4[0-9][0-9] '

# Slow requests
docker logs renderowl-nginx 2>&1 | awk '{if ($NF > 2.0) print}'

# Authentication failures
docker logs renderowl-backend 2>&1 | grep -i "auth.*fail\|unauthorized\|forbidden"
```

### Export Logs
```bash
# Export last hour
docker logs renderowl-backend --since=1h > backend_logs_$(date +%Y%m%d_%H%M).log

# Export specific time range (requires log file)
docker logs renderowl-backend --since="2026-02-28T10:00:00" --until="2026-02-28T11:00:00"
```

---

## Scaling

### Manual Scaling

```bash
# Scale frontend
mcporter call coolify.scale_service uuid=q4scks4osww0g0osc0s00o8k replicas=3

# Scale backend
mcporter call coolify.scale_service uuid=fkk0cswckcos4ossoo0cks0g replicas=4

# Scale workers
mcporter call coolify.scale_service uuid=ew4084gcc844400g80sscskk replicas=5
```

### Auto-Scaling Configuration

```bash
# Edit docker-compose.prod.yml
# Add resources section to each service:

# deploy:
#   resources:
#     limits:
#       cpus: '2'
#       memory: 2G
#     reservations:
#       cpus: '1'
#       memory: 1G
```

---

## Backup & Restore

### Database Backup
```bash
# Manual backup trigger
mcporter call coolify.backup.create uuid=fogco0gk4kgg4kw0sgcsk844

# Check backup status
mcporter call coolify.backup.status uuid=fogco0gk4kgg4kw0sgcsk844

# List backups
mcporter call coolify.backup.list uuid=fogco0gk4kgg4kw0sgcsk844
```

### Database Restore
```bash
# ⚠️ DESTRUCTIVE - Use with caution
# 1. Stop all services
mcporter call coolify.stop_project uuid=dw8koss8w0ock4kwkg8kgcs4

# 2. Restore from backup
mcporter call coolify.backup.restore uuid=fogco0gk4kgg4kw0sgcsk844 backup_id=<backup_id>

# 3. Start services
mcporter call coolify.start_project uuid=dw8koss8w0ock4kwkg8kgcs4
```

### Export Database
```bash
# Export to file
mcporter call coolify.database.export uuid=pco4ko044wowcww4k0co04go format=sql > backup_$(date +%Y%m%d).sql
```

---

## Performance Tuning

### Database Optimization
```bash
# Analyze tables
mcporter call coolify.database.execute uuid=pco4ko044wowcww4k0co04go command="ANALYZE;"

# Check slow queries
mcporter call coolify.database.execute uuid=pco4ko044wowcww4k0co04go command="SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Reindex if needed
mcporter call coolify.database.execute uuid=pco4ko044wowcww4k0co04go command="REINDEX DATABASE renderowl;"
```

### Redis Optimization
```bash
# Check memory usage
redis-cli -u $REDIS_URL INFO memory

# Clear old keys
redis-cli -u $REDIS_URL --eval "local keys = redis.call('keys', '*:old:*') for i=1,#keys,5000 do redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) end return #keys"
```

---

## Deployment Checklist

Before each production deployment:

- [ ] Staging tests passed
- [ ] Database migrations reviewed
- [ ] Rollback plan ready
- [ ] Team notified
- [ ] Monitoring dashboards open
- [ ] Rollback command ready

---

**Last Updated:** 2026-02-28  
**Version:** 1.0
