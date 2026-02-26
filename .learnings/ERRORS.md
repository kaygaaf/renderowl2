## [ERR-20260226-001] Cross-subdomain cookie auth failure

**Logged**: 2026-02-26T23:00:00Z
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
Video playback failed in dashboard with "Video Processing" / "Failed" errors despite video existing and being downloadable via API.

### Error
Cookie auth failing between app.renderowl.com (frontend) and api.renderowl.com (API) due to samesite="lax" cookie setting.

### Root Cause
- Cookie was set with samesite="lax" which blocks cross-subdomain requests
- Frontend on app.renderowl.com couldn't send auth cookie to api.renderowl.com
- API returned 404 (auth failed) → Frontend showed processing state

### Solution
Instead of fixing cookie auth, use the presigned URL already provided in job data:
- Jobs list API already returns `video_url` with presigned R2 URL
- Pass it directly to VideoPlayer component
- No additional auth needed for video playback

### Resolution
- **Resolved**: 2026-02-26T23:38:00Z
- **Commit**: 292867f
- **Approach**: VideoPlayer now accepts optional videoUrl prop, uses it directly if provided

### Metadata
- Related Files: 
  - frontend/src/components/dashboard/video-player.tsx
  - frontend/src/components/dashboard/dashboard-content.tsx
  - app/web/auth.py (cookie settings)
- Tags: auth, cors, video, cookie, subdomain
- See Also: LRN-20260226-001

---

## [ERR-20260226-002] Browser automation unavailable

**Logged**: 2026-02-26T23:30:00Z
**Priority**: medium
**Status**: pending
**Area**: tooling

### Summary
Browser tool requires Chrome extension to be manually attached. Cannot verify frontend changes visually.

### Error
"Chrome extension relay is running, but no tab is connected. Click the OpenClaw Chrome extension icon on a tab to attach it."

### Context
- Browser automation needs Chrome extension clicked manually
- Cannot attach programmatically
- Alternative: Use playwright-mcp skill

### Suggested Fix
Install and use playwright-mcp skill for browser automation instead of browser tool.

### Metadata
- Related Files: N/A
- Tags: browser, testing, automation

---
