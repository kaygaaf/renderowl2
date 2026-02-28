# Renderowl 2.0 - QA Testing Report
**Date:** Saturday, February 28th, 2026 — 7:31 PM (Europe/Amsterdam)  
**Environment:** https://staging.renderowl.com  
**QA Lead:** Antigravity 🛸

---

## 📊 Test Summary

| Flow | Status | Notes |
|------|--------|-------|
| 1. Homepage | ✅ PASS | Loads successfully, all UI elements present |
| 2. Auth | ⚠️ N/A | No auth system detected (standalone editor) |
| 3. Dashboard | ❌ FAIL | Returns 404 error |
| 4. Editor | ✅ PASS | Core editor UI loads and responds |
| 5. Timeline | ⚠️ PARTIAL | UI works but API calls fail due to CORS |

**Overall Status: 🔴 CRITICAL ISSUES FOUND**

---

## 🐛 Bugs Found

### BUG #1: CORS Policy Blocking API Calls 🔴 CRITICAL
**Severity:** Critical  
**Priority:** P0

**Description:**
All API calls from the frontend to `staging-api.renderowl.com` are blocked by CORS policy, preventing any data persistence or timeline loading/saving functionality.

**Error Message:**
```
Access to fetch at 'https://staging-api.renderowl.com/timeline' from origin 
'https://staging.renderowl.com' has been blocked by CORS policy: Response to 
preflight request doesn't pass access control check: No 
'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Affected Endpoints:**
- `POST https://staging-api.renderowl.com/timeline`
- `GET https://staging-api.renderowl.com/timeline/1`
- Any other API endpoints

**Impact:**
- Timeline cannot be saved
- Timeline cannot be loaded from server
- No data persistence possible
- App is essentially read-only

**Screenshot:** See `qa_tests/after_new_timeline.png`

**Trello Card Data:**
```
Title: [CRITICAL] CORS Policy Blocking All API Calls
Description: 
- All API requests to staging-api.renderowl.com fail with CORS errors
- Affected: POST /timeline, GET /timeline/1
- Need to add Access-Control-Allow-Origin headers on API server
- Currently blocking all save/load functionality
Labels: critical, backend, cors, api
Checklist:
  - [ ] Add CORS middleware to API server
  - [ ] Configure allowed origins: https://staging.renderowl.com
  - [ ] Test preflight requests
  - [ ] Verify save/load functionality works
```

---

### BUG #2: Dashboard Route Returns 404 🔴 CRITICAL
**Severity:** Critical  
**Priority:** P0

**Description:**
The `/dashboard` route returns a 404 error, suggesting either the route is not implemented or there's a routing configuration issue.

**URL:** https://staging.renderowl.com/dashboard

**Expected Behavior:**
Dashboard should load showing user's projects/timelines

**Actual Behavior:**
404: "This page could not be found."

**Impact:**
- Users cannot access their dashboard
- No project management possible
- Navigation broken

**Screenshot:** `qa_tests/dashboard_test.png`

**Trello Card Data:**
```
Title: [CRITICAL] Dashboard Route Returns 404
Description:
- https://staging.renderowl.com/dashboard returns 404
- Users cannot access project dashboard
- Check Next.js routing configuration
- May need to implement dashboard page or fix routing
Labels: critical, frontend, routing, 404
Checklist:
  - [ ] Check Next.js pages/routes configuration
  - [ ] Implement dashboard page OR
  - [ ] Remove dashboard link from navigation
  - [ ] Add proper redirect if needed
```

---

### BUG #3: Login Route Returns 404 🟡 MEDIUM
**Severity:** Medium  
**Priority:** P2

**Description:**
The `/login` route returns a 404. The app appears to be a standalone editor without authentication, but if auth is planned, this needs to be implemented.

**URL:** https://staging.renderowl.com/login

**Expected Behavior:**
If auth is required: Login page should appear  
If standalone: Remove any login references from UI

**Actual Behavior:**
404: "This page could not be found."

**Impact:**
- Cannot determine if auth is required
- Unclear product direction

**Screenshot:** N/A (same 404 page as dashboard)

**Trello Card Data:**
```
Title: [MEDIUM] Login Route Returns 404 - Auth Decision Needed
Description:
- /login returns 404
- App currently works as standalone editor without auth
- DECISION NEEDED: Is authentication required for MVP?
  - If YES: Implement login page
  - If NO: Remove auth-related code/routes
Labels: medium, auth, decision-needed
Checklist:
  - [ ] Product decision: Auth required?
  - [ ] If YES: Implement login page
  - [ ] If NO: Remove login route references
  - [ ] Update documentation
```

---

### BUG #4: Save Timeline Button Always Disabled 🟡 MEDIUM
**Severity:** Medium  
**Priority:** P2

**Description:**
The "Save Timeline" button remains disabled even after making changes to the timeline. This may be related to the CORS issue (cannot save to server) or a UI state bug.

**Steps to Reproduce:**
1. Load the editor
2. Click "New Timeline"
3. Add video track
4. Observe Save button remains disabled

**Expected Behavior:**
Save button should enable when there are unsaved changes

**Actual Behavior:**
Save button remains [disabled]

**Impact:**
- Users cannot save their work
- Even local storage save appears unavailable

**Screenshot:** `qa_tests/track_buttons_tested.png`

**Trello Card Data:**
```
Title: [MEDIUM] Save Timeline Button Always Disabled
Description:
- Save button never enables, even after making changes
- Tested: New Timeline, Add Video Track
- May be related to CORS issue (cannot verify save capability)
- OR: UI state not updating properly
Labels: medium, ui, state-management
Checklist:
  - [ ] Investigate save button state logic
  - [ ] Check if save is blocked due to API unavailability
  - [ ] Implement localStorage fallback if API fails
  - [ ] Enable save button when changes detected
```

---

### BUG #5: Multiple 404 Errors for Static Assets 🟡 MEDIUM
**Severity:** Medium  
**Priority:** P2

**Description:**
Console shows multiple 404 errors for static assets. These may be missing images, fonts, or other resources.

**Error Messages:**
```
Failed to load resource: the server responded with a status of 404 ()
(4 occurrences)
```

**Impact:**
- Missing assets may affect UI appearance
- Console noise makes debugging harder

**Screenshot:** Console errors visible in multiple test screenshots

**Trello Card Data:**
```
Title: [MEDIUM] Multiple 404 Errors for Static Assets
Description:
- Console shows 4 x 404 errors for static resources
- May be missing images, fonts, or icons
- Check build output and static file serving
Labels: medium, assets, build
Checklist:
  - [ ] Identify which assets are 404ing
  - [ ] Check static asset paths in build
  - [ ] Verify assets are in correct public directory
  - [ ] Rebuild and redeploy if needed
```

---

### BUG #6: API Health Endpoint Returns Empty 🟢 LOW
**Severity:** Low  
**Priority:** P3

**Description:**
The `/health` endpoint on the API server returns an empty response. While not critical, a proper health check would help with monitoring.

**URL:** https://staging-api.renderowl.com/health

**Expected Behavior:**
JSON response like `{"status": "ok", "timestamp": "..."}`

**Actual Behavior:**
Empty response (status 200 but no body)

**Trello Card Data:**
```
Title: [LOW] API Health Endpoint Returns Empty Response
Description:
- GET /health returns 200 but empty body
- Should return JSON health status
- Useful for monitoring and load balancers
Labels: low, api, monitoring
Checklist:
  - [ ] Implement health check endpoint
  - [ ] Return JSON with status and timestamp
  - [ ] Add database connectivity check
  - [ ] Document endpoint for DevOps
```

---

## ✅ Working Features

| Feature | Status | Notes |
|---------|--------|-------|
| Homepage Load | ✅ | Loads quickly, title correct |
| Editor UI | ✅ | All buttons and controls present |
| New Timeline | ✅ | Creates new timeline successfully |
| Load Timeline | ✅ | Opens timeline (shows UI feedback) |
| Add Video Track | ✅ | Adds new video track to timeline |
| Add Audio Track | ✅ | Button functional |
| Hide Track | ✅ | Hides track from view |
| Lock Track | ✅ | Locks track for editing |
| Mute Track | ✅ | Mutes audio track |
| Timeline Scrubber | ✅ | Slider visible and clickable |
| Timeline Items | ✅ | Items display with duration |
| /projects Route | ✅ | Loads editor (SPA behavior) |
| /editor Route | ✅ | Loads editor (SPA behavior) |

---

## 📸 Screenshots Captured

| File | Description |
|------|-------------|
| `homepage_initial.png` | Initial page load state |
| `homepage_full.png` | Full page screenshot |
| `after_new_timeline.png` | After clicking New Timeline |
| `video_track_added.png` | After adding video track |
| `timeline_item_clicked.png` | After clicking timeline item |
| `load_timeline_clicked.png` | After clicking Load Timeline |
| `track_buttons_tested.png` | Hide/Lock/Mute buttons tested |
| `slider_clicked.png` | Timeline slider interaction |
| `dashboard_test.png` | Dashboard 404 error |
| `editor_route.png` | Editor route test |
| `final_state.png` | Final comprehensive screenshot |

All screenshots saved to: `/Users/minion/.openclaw/workspace/qa_tests/`

---

## 🔧 Recommended Next Steps

1. **Fix CORS (P0)** - Unblocks all save/load functionality
2. **Implement Dashboard (P0)** - Core navigation feature
3. **Fix Static Asset 404s (P2)** - Clean up build
4. **Enable Save Button (P2)** - Local storage fallback
5. **Clarify Auth Strategy (P2)** - Product decision needed
6. **Add API Health Check (P3)** - Monitoring improvement

---

## 📝 Notes for Trello Card Creation

Since no Trello MCP server is configured, please manually create cards using the data provided above for each bug.

**Suggested Trello Board Columns:**
- 🔴 Critical (P0)
- 🟡 Medium (P2)
- 🟢 Low (P3)
- ✅ Verified Fixed

**Assignee Suggestions:**
- CORS issues → Backend/API team
- UI/State issues → Frontend team
- Routing/404s → Full-stack or DevOps
