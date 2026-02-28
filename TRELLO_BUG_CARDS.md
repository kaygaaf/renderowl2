# 🐛 Trello Bug Cards - Renderowl 2.0 QA

## Bug 1: 🔴 CRITICAL - CORS Policy Blocking API Calls

**List:** Testing Board → Bugs → Critical

**Title:** 🐛 BUG: CORS Policy Blocking API Calls on Staging

**Description:**
```
🔴 CRITICAL - Blocks all API functionality

**Environment:**
- Frontend: https://staging.renderowl.com
- API: https://staging-api.renderowl.com

**Steps to Reproduce:**
1. Open browser console on staging.renderowl.com
2. Click "New Timeline" or any action that calls API
3. Observe console errors

**Expected:**
API calls succeed with proper CORS headers

**Actual:**
Console shows CORS errors:
```
Access to fetch at 'https://staging-api.renderowl.com/timeline' 
from origin 'https://staging.renderowl.com' has been blocked by 
CORS policy: Response to preflight request doesn't pass access 
control check: No 'Access-Control-Allow-Origin' header is present.
```

**Impact:**
- Cannot save timelines
- Cannot load timelines from backend
- All persistent storage broken

**Fix Required:**
Add CORS headers to API server:
```
Access-Control-Allow-Origin: https://staging.renderowl.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Screenshot:** renderowl-test-final.png (console visible)

**Reporter:** QA Lead (Antigravity)
**Date:** 2026-02-28
```

**Labels:** 🔴 critical, backend, api, cors, staging

---

## Bug 2: 🔴 CRITICAL - Missing Authentication System

**List:** Testing Board → Bugs → Critical

**Title:** 🐛 BUG: Authentication System Completely Missing

**Description:**
```
🔴 CRITICAL - No user accounts or security

**Environment:**
https://staging.renderowl.com

**Steps to Reproduce:**
1. Visit https://staging.renderowl.com (root)
2. Observe: Timeline editor loads immediately
3. Try visiting:
   - https://staging.renderowl.com/auth → 404
   - https://staging.renderowl.com/login → 404  
   - https://staging.renderowl.com/signup → 404
   - https://staging.renderowl.com/dashboard → 404

**Expected:**
- Landing page with "Get Started" CTA
- /auth page with login/signup forms
- /dashboard for project management
- Protected routes requiring authentication

**Actual:**
- No landing page
- No authentication flow
- No user accounts
- Editor loads publicly at root /
- All auth routes return 404

**Impact:**
- No user authentication
- No project ownership
- No security
- Cannot test user registration (Test 1 FAIL)
- Cannot test user login (Test 2 FAIL)
- Cannot test dashboard (Test 3 FAIL)
- Cannot test logout (Test 6 FAIL)

**Fix Required:**
1. Create landing page at /
2. Implement /auth route with login/signup forms
3. Create /dashboard for authenticated users
4. Add middleware to protect editor routes
5. Integrate with auth provider (NextAuth, Clerk, etc.)

**Reporter:** QA Lead (Antigravity)
**Date:** 2026-02-28
```

**Labels:** 🔴 critical, auth, frontend, missing-feature

---

## Bug 3: 🟡 MEDIUM - Save Timeline Button Disabled

**List:** Testing Board → Bugs → Medium

**Title:** 🐛 BUG: Save Timeline Button Remains Disabled

**Description:**
```
🟡 MEDIUM - Cannot save work

**Environment:**
https://staging.renderowl.com

**Steps to Reproduce:**
1. Load staging.renderowl.com
2. Click "New Timeline"
3. Add tracks or make changes
4. Observe "Save Timeline" button

**Expected:**
Save button becomes enabled after changes

**Actual:**
Save button remains disabled [disabled] attribute

**Likely Cause:**
Related to CORS errors - frontend cannot sync with backend

**Fix Required:**
1. Fix CORS issues first
2. Verify save functionality works
3. Enable button when timeline has unsaved changes

**Reporter:** QA Lead (Antigravity)
**Date:** 2026-02-28
```

**Labels:** 🟡 medium, ui, backend, cors-related

---

## Bug 4: 🟡 MEDIUM - No Landing Page

**List:** Testing Board → Bugs → Medium

**Title:** 🐛 BUG: Missing Landing/Marketing Page

**Description:**
```
🟡 MEDIUM - No entry point for new users

**Environment:**
https://staging.renderowl.com/

**Steps to Reproduce:**
1. Visit https://staging.renderowl.com/
2. Observe page content

**Expected:**
Landing page with:
- Hero section with value proposition
- "Get Started" CTA button
- Feature highlights
- Navigation to login/signup

**Actual:**
Timeline editor loads immediately
No marketing content
No entry funnel

**Fix Required:**
Create landing page at / with marketing content and auth CTAs

**Reporter:** QA Lead (Antigravity)
**Date:** 2026-02-28
```

**Labels:** 🟡 medium, frontend, ux, marketing

---

## Summary for Trello

| Card | Priority | List |
|------|----------|------|
| CORS Policy Blocking API | 🔴 Critical | Bugs → Critical |
| Missing Authentication | 🔴 Critical | Bugs → Critical |
| Save Button Disabled | 🟡 Medium | Bugs → Medium |
| No Landing Page | 🟡 Medium | Bugs → Medium |

**Testing Report:** RENDEROWL_E2E_TEST_REPORT.md
**Screenshots:** /Users/minion/.openclaw/workspace/renderowl-test-*.png
