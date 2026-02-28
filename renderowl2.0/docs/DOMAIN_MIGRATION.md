# Renderowl 2.0 - Domain Migration Plan

## Current Status

### Temporary Domains (Active)
- Frontend: https://renderowl2-prod-frontend.kayorama.nl
- Backend: https://renderowl2-prod-api.kayorama.nl
- Worker: https://renderowl2-prod-worker.kayorama.nl

### Target Production Domains
- Main: https://renderowl.com
- App: https://app.renderowl.com
- API: https://api.renderowl.com

## Migration Steps

### Step 1: DNS Configuration
Update DNS records for renderowl.com:

```
Type    Name            Value                           TTL
A       @               91.98.168.113                   300
A       app             91.98.168.113                   300
A       api             91.98.168.113                   300
CNAME   www             renderowl.com                   300
```

### Step 2: SSL Certificates
Coolify will automatically provision Let's Encrypt certificates for:
- renderowl.com
- app.renderowl.com
- api.renderowl.com

### Step 3: Domain Migration in Coolify

#### Option A: Gradual Migration (Recommended)
1. Keep Renderowl v1 running on renderowl.com
2. Deploy Renderowl 2.0 to app.renderowl.com and api.renderowl.com
3. Test thoroughly
4. Update main domain (renderowl.com) to redirect to app.renderowl.com

#### Option B: Cutover Migration
1. Stop Renderowl v1 applications
2. Update Renderowl 2.0 domains to use production URLs
3. Update DNS if needed

### Step 4: Update Environment Variables

Update frontend environment variable:
```
NEXT_PUBLIC_API_URL=https://api.renderowl.com
```

### Step 5: Verification

Check all endpoints:
```bash
# Frontend
curl -sf https://app.renderowl.com/api/health

# Backend
curl -sf https://api.renderowl.com/health

# Main domain (should redirect or serve app)
curl -sf https://renderowl.com
```

## Current Production Setup Summary

✅ **Project Created:** Renderowl2 Production (dw8koss8w0ock4kwkg8kgcs4)
✅ **Database:** PostgreSQL with daily backups
✅ **Cache:** Redis configured
✅ **Applications:** Frontend, Backend, Worker deployed
✅ **Environment Variables:** Configured
✅ **GitHub Actions:** Deploy pipeline ready
✅ **One-Command Deploy:** scripts/deploy-prod.sh

⏳ **Pending:** Domain migration (requires DNS update or stopping old app)

## Rollback Plan

If migration fails:
1. Revert DNS changes
2. Restart old Renderowl v1 applications
3. Investigate issues
4. Retry migration

## Timeline

- **Day 1:** Complete staging testing
- **Day 2:** Configure DNS and SSL
- **Day 3:** Execute domain migration
- **Day 4:** Monitor and verify
