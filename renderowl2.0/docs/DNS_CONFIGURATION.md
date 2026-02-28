# 🌐 Renderowl 2.0 - DNS Configuration Guide

Complete DNS setup instructions for custom domains.

---

## Required DNS Records

Add these records to your DNS provider (Cloudflare recommended):

### Root Domain (renderowl.com)

| Type | Name | Content | Proxy Status | TTL | Notes |
|------|------|---------|--------------|-----|-------|
| A | `@` | `91.98.168.113` | Proxied | Auto | Main site |
| A | `app` | `91.98.168.113` | Proxied | Auto | Frontend app |
| A | `api` | `91.98.168.113` | Proxied | Auto | Backend API |
| A | `worker` | `91.98.168.113` | Proxied | Auto | Worker (optional) |
| A | `cdn` | `91.98.168.113` | Proxied | Auto | Asset CDN |
| CNAME | `www` | `renderowl.com` | Proxied | Auto | Redirect to root |
| CNAME | `status` | `renderowl.statuspage.io` | DNS only | Auto | Status page |

### Email Records (if using custom domain email)

| Type | Name | Content | Priority |
|------|------|---------|----------|
| MX | `@` | `mx1.improvmx.com` | 10 |
| MX | `@` | `mx2.improvmx.com` | 20 |
| TXT | `@` | `v=spf1 include:spf.improvmx.com ~all` | - |

### Security Records (Recommended)

| Type | Name | Content |
|------|------|---------|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@renderowl.com` |
| TXT | `@` | `google-site-verification=...` (for Google Search Console) |

---

## Cloudflare Configuration

### SSL/TLS Settings

1. **Overview Tab:**
   - SSL/TLS encryption mode: **Full (strict)**

2. **Edge Certificates:**
   - Always Use HTTPS: **On**
   - Automatic HTTPS Rewrites: **On**
   - Minimum TLS Version: **1.2**
   - Opportunistic Encryption: **On**

3. **Origin Server:**
   - Create Origin Certificate
   - Download certificate and private key
   - Upload to Coolify for custom SSL

### Security Settings

1. **Security Level:** Medium
2. **Challenge Passage:** 30 minutes
3. **Browser Integrity Check:** On

### Speed Settings

1. **Auto Minify:** Enable for CSS, JavaScript, HTML
2. **Brotli:** On
3. **Rocket Loader:** Off (may break React apps)

### Page Rules (Create in order)

| Priority | URL Pattern | Settings |
|----------|-------------|----------|
| 1 | `api.renderowl.com/*` | SSL: Full, Security Level: High, Cache Level: Bypass |
| 2 | `app.renderowl.com/*` | SSL: Full, Auto Minify: All, Browser Cache TTL: 4 hours |
| 3 | `cdn.renderowl.com/*` | SSL: Full, Cache Level: Cache Everything, Edge Cache TTL: 7 days |
| 4 | `*renderowl.com/*` | SSL: Full, Auto HTTPS Rewrites: On |

---

## Verification Commands

### Check DNS Propagation

```bash
# Check A records
dig renderowl.com A
dig app.renderowl.com A
dig api.renderowl.com A

# Check CNAME records
dig www.renderowl.com CNAME

# Check all records
dig renderowl.com ANY

# Global propagation check
nslookup renderowl.com 8.8.8.8
nslookup renderowl.com 1.1.1.1
```

### Check SSL Certificate

```bash
# Check SSL certificate
echo | openssl s_client -servername app.renderowl.com -connect app.renderowl.com:443 -showcerts

# Check certificate expiry
echo | openssl s_client -servername app.renderowl.com -connect app.renderowl.com:443 2>/dev/null | openssl x509 -noout -dates

# Verify certificate chain
echo | openssl s_client -servername app.renderowl.com -connect app.renderowl.com:443 2>/dev/null | openssl x509 -noout -text | grep -A2 "Subject Alternative Name"
```

### Check HTTP Response

```bash
# Check redirects
curl -I https://renderowl.com
curl -I https://www.renderowl.com

# Check SSL configuration
curl -I --http2 https://app.renderowl.com
curl -I --compressed https://app.renderowl.com
```

---

## Coolify Domain Configuration

### Update Application Domains

After DNS is configured, update Coolify:

```bash
# Frontend - app.renderowl.com
curl -X PATCH "${COOLIFY_URL}/api/v1/applications/q4scks4osww0g0osc0s00o8k" \
  -H "Authorization: Bearer ${COOLIFY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "domains": [
      {
        "domain": "app.renderowl.com",
        "https": true,
        "www": false
      }
    ]
  }'

# Backend - api.renderowl.com
curl -X PATCH "${COOLIFY_URL}/api/v1/applications/fkk0cswckcos4ossoo0cks0g" \
  -H "Authorization: Bearer ${COOLIFY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "domains": [
      {
        "domain": "api.renderowl.com",
        "https": true,
        "www": false
      }
    ]
  }'

# Worker - worker.renderowl.com (optional)
curl -X PATCH "${COOLIFY_URL}/api/v1/applications/ew4084gcc844400g80sscskk" \
  -H "Authorization: Bearer ${COOLIFY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "domains": [
      {
        "domain": "worker.renderowl.com",
        "https": true,
        "www": false
      }
    ]
  }'
```

Or manually via Coolify Dashboard:

1. Go to https://coolify.kayorama.nl
2. Select Project: "Renderowl2 Production"
3. Click on each application
4. Edit "Domains" field
5. Enter the custom domain
6. Enable HTTPS
7. Save and redeploy

---

## Environment Variables Update

After domain migration, update environment variables:

```bash
# Frontend environment variables
NEXT_PUBLIC_API_URL=https://api.renderowl.com
NEXT_PUBLIC_APP_URL=https://app.renderowl.com
NEXT_PUBLIC_CDN_URL=https://cdn.renderowl.com

# Backend environment variables
ALLOWED_ORIGINS=https://app.renderowl.com,https://renderowl.com
CORS_ORIGIN=https://app.renderowl.com

# Worker environment variables
API_URL=https://api.renderowl.com
```

Update in Coolify:

```bash
# Update frontend env
curl -X PATCH "${COOLIFY_URL}/api/v1/applications/q4scks4osww0g0osc0s00o8k" \
  -H "Authorization: Bearer ${COOLIFY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "environment_variables": [
      {"key": "NEXT_PUBLIC_API_URL", "value": "https://api.renderowl.com"},
      {"key": "NEXT_PUBLIC_APP_URL", "value": "https://app.renderowl.com"}
    ]
  }'

# Update backend env
curl -X PATCH "${COOLIFY_URL}/api/v1/applications/fkk0cswckcos4ossoo0cks0g" \
  -H "Authorization: Bearer ${COOLIFY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "environment_variables": [
      {"key": "ALLOWED_ORIGINS", "value": "https://app.renderowl.com,https://renderowl.com"}
    ]
  }'
```

---

## Migration Timeline

### Phase 1: DNS Setup (T-24h)
- [ ] Add DNS records to Cloudflare
- [ ] Wait for propagation (can take up to 24 hours)
- [ ] Verify with dig/nslookup

### Phase 2: SSL Configuration (T-2h)
- [ ] Generate Origin Certificates in Cloudflare
- [ ] Upload certificates to Coolify
- [ ] Test SSL configuration

### Phase 3: Domain Migration (T-0)
- [ ] Update domains in Coolify applications
- [ ] Update environment variables
- [ ] Deploy with new domains
- [ ] Verify all endpoints
- [ ] Update any hardcoded URLs in codebase

### Phase 4: Cleanup (T+24h)
- [ ] Verify old domains redirect correctly
- [ ] Monitor for any DNS issues
- [ ] Update documentation

---

## Troubleshooting

### DNS Not Propagating

```bash
# Check current DNS servers
cat /etc/resolv.conf

# Force DNS refresh
sudo dscacheutil -flushcache  # macOS
sudo systemd-resolve --flush-caches  # Linux

# Check specific DNS server
dig @1.1.1.1 renderowl.com
dig @8.8.8.8 renderowl.com
```

### SSL Certificate Errors

```bash
# Check certificate details
echo | openssl s_client -connect app.renderowl.com:443 -servername app.renderowl.com 2>/dev/null | openssl x509 -noout -text

# Verify certificate chain
echo | openssl s_client -connect app.renderowl.com:443 -servername app.renderowl.com -showcerts

# Test with curl
curl -vI https://app.renderowl.com 2>&1 | grep -E "(SSL|TLS|certificate)"
```

### Mixed Content Warnings

If you see "Mixed Content" errors in browser console:

1. Check that all `NEXT_PUBLIC_API_URL` variables use HTTPS
2. Verify backend is returning HTTPS URLs for assets
3. Check R2_PUBLIC_URL uses HTTPS

---

## Post-Migration Checklist

- [ ] All DNS records resolve correctly
- [ ] SSL certificates valid on all domains
- [ ] HTTP redirects to HTTPS
- [ ] www redirects to non-www (or vice versa)
- [ ] API endpoints respond correctly
- [ ] Frontend loads without mixed content warnings
- [ ] File uploads/downloads work
- [ ] WebSocket connections work (if used)
- [ ] Email deliverability not affected
- [ ] SEO rankings monitored

---

*Last Updated: 2026-02-28*
