# Renderowl 2.0 - Production Environment Configuration

## 🚀 Production Infrastructure

### Project Details
- **Project Name:** Renderowl2 Production
- **Project UUID:** `dw8koss8w0ock4kwkg8kgcs4`
- **Environment:** production
- **Server:** localhost (roog0k800wc4ocoko8wgoscs)

### Applications

| Service | UUID | Domain | Repository | Port |
|---------|------|--------|------------|------|
| Frontend | `q4scks4osww0g0osc0s00o8k` | https://renderowl2-prod-frontend.kayorama.nl | kaygaaf/renderowl2-frontend | 3000 |
| Backend | `fkk0cswckcos4ossoo0cks0g` | https://renderowl2-prod-api.kayorama.nl | kaygaaf/renderowl2-backend | 8080 |
| Worker | `ew4084gcc844400g80sscskk` | https://renderowl2-prod-worker.kayorama.nl | kaygaaf/renderowl2.0 | 3001 |

### Databases

| Type | UUID | Name | Internal URL |
|------|------|------|--------------|
| PostgreSQL | `pco4ko044wowcww4k0co04go` | renderowl2-prod-db | postgres://renderowl:...@pco4ko044wowcww4k0co04go:5432/renderowl |
| Redis | `i8kcc48okkw84s8cooo0os44` | renderowl2-prod-redis | redis://default:...@i8kcc48okkw84s8cooo0os44:6379/0 |

### Backup Configuration
- **Backup UUID:** `fogco0gk4kgg4kw0sgcsk844`
- **Schedule:** Daily at 2:00 AM (0 2 * * *)
- **Retention:** 7 days locally
- **Status:** Enabled ✅

---

## 🧪 Staging Infrastructure

### Project Details
- **Project Name:** Renderowl2 Staging
- **Project UUID:** `rc0oo084sswkkokgws8sk8ss`
- **Environment:** staging
- **Server:** localhost (roog0k800wc4ocoko8wgoscs)

### Applications

| Service | UUID | Domain | Repository | Port | Status |
|---------|------|--------|------------|------|--------|
| Frontend | `mocsks4gcgggwgss080s80ws` | https://staging.renderowl.com | kaygaaf/renderowl2-frontend | 3000 | ✅ Running |
| Backend | `kk88gwo8wkk040o8ocs48gcw` | https://staging-api.renderowl.com | kaygaaf/renderowl2-backend | 8080 | ✅ Running |

### Databases

| Type | UUID | Name | Internal URL |
|------|------|------|--------------|
| PostgreSQL | `r4cs0sscwk08ss0400w0wgs0` | renderowl2-staging-db | postgres://postgres:...@r4cs0sscwk08ss0400w0wgs0:5432/postgres |
| Redis | `dsc48cgc4oowwokw88c4s004` | renderowl2-staging-redis | redis://default:...@dsc48cgc4oowwokw88c4s004:6379/0 |

### Environment Variables

**Frontend:**
```
NEXT_PUBLIC_API_URL=https://staging-api.renderowl.com
NEXT_PUBLIC_APP_URL=https://staging.renderowl.com
```

**Backend:**
```
ENVIRONMENT=staging
PORT=8080
DATABASE_URL=<configured>
REDIS_URL=<configured>
ALLOWED_ORIGINS=https://staging.renderowl.com
```

### Deployment
- **Auto-deploy:** On push to `main` branch
- **Manual deploy:** `mcporter call coolify.deploy tag_or_uuid=mocsks4gcgggwgss080s80ws force=true`

### Verification
- ✅ https://staging.renderowl.com - Frontend loads (HTTP 200)
- ✅ https://staging-api.renderowl.com/health - API responds (HTTP 200)
- ✅ SSL certificates valid (Cloudflare)
- ✅ CORS configured correctly

---

## 🔐 Required GitHub Secrets

Add these secrets to the GitHub repository (`kaygaaf/renderowl2.0`):

### Coolify Configuration
```
COOLIFY_URL=https://coolify.kayorama.nl
COOLIFY_API_KEY=<your_coolify_api_key>
COOLIFY_PROD_PROJECT_ID=dw8koss8w0ock4kwkg8kgcs4
```

### Database (Already Configured in Coolify)
```
DATABASE_URL=<auto-configured>
REDIS_URL=<auto-configured>
```

### Clerk Authentication (Required)
```
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
```

### Stripe Payments (Required)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### S3 Storage (Required)
```
S3_ENDPOINT=https://s3.kayorama.nl
S3_ACCESS_KEY=<access_key>
S3_SECRET_KEY=<secret_key>
S3_BUCKET_UPLOADS=renderowl-uploads
S3_BUCKET_EXPORTS=renderowl-exports
```

### OpenAI (Required)
```
OPENAI_API_KEY=sk-...
```

### Sentry (Optional)
```
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=<token>
SENTRY_ORG=<org>
```

### Discord Notifications (Optional)
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All GitHub secrets configured
- [ ] Staging environment healthy
- [ ] Database migrations tested
- [ ] SSL certificates configured for custom domains

### Deployment
- [ ] Run `Deploy to Production` workflow from GitHub Actions
- [ ] Enter version tag (e.g., v1.0.0)
- [ ] Type "DEPLOY" to confirm
- [ ] Wait for build and deployment to complete

### Post-Deployment
- [ ] Verify https://app.renderowl.com is accessible
- [ ] Verify https://api.renderowl.com/health returns 200
- [ ] Check worker health endpoint
- [ ] Verify database connections
- [ ] Test critical user flows

---

## 🔄 Rollback Procedure

If deployment fails:

1. **Identify last known good version:**
   ```bash
   git log --oneline --tags | head -10
   ```

2. **Trigger rollback deployment:**
   - Go to GitHub Actions
   - Run "Deploy to Production" workflow
   - Enter previous stable version tag
   - Type "DEPLOY" to confirm

3. **Verify rollback:**
   - Check health endpoints
   - Monitor error rates
   - Verify database consistency

---

## 📊 Monitoring

### Health Check Endpoints
- Frontend: `https://app.renderowl.com/api/health`
- Backend: `https://api.renderowl.com/health`
- Worker: `https://worker.renderowl.com/health`

### Logs
- View via Coolify dashboard
- Or use CLI: `mcporter call coolify.application_logs uuid=<uuid> lines=100`

### Metrics
- Sentry for error tracking
- Coolify built-in metrics
- Custom application metrics (if configured)

---

## 🌐 Domain Configuration

### Current Setup (Temporary)
- Frontend: https://renderowl2-prod-frontend.kayorama.nl
- Backend: https://renderowl2-prod-api.kayorama.nl
- Worker: https://renderowl2-prod-worker.kayorama.nl

### Target Setup (To be configured)
- Frontend: https://app.renderowl.com
- Backend: https://api.renderowl.com
- Main: https://renderowl.com

**Note:** Update domains in Coolify once DNS is configured.

---

## 🆘 Emergency Contacts

- **Coolify Dashboard:** https://coolify.kayorama.nl
- **Server:** VPS at 91.98.168.113
- **Backup Recovery:** Contact admin for database restore

---

## 📝 Changelog

### 2026-02-28 - Initial Production Setup
- Created Renderowl2 Production project in Coolify
- Provisioned PostgreSQL database with daily backups
- Provisioned Redis cache
- Created frontend, backend, and worker applications
- Configured environment variables
- Set up GitHub Actions deployment pipeline
