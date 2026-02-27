# RenderOwl Bug Report

## Bugs Found and Fixed

### 1. ✅ FIXED: Render Progress Webhook Has No Authentication (CRITICAL)
**File:** `routes/renders.ts` (POST /webhooks/progress)
- **Issue:** Anyone could POST to this endpoint and update any render's progress/status
- **Impact:** Attackers could mark renders as completed/failed, manipulate progress
- **Fix:** Added `X-Worker-Signature` header validation using HMAC-SHA256 with `RENDER_WEBHOOK_SECRET` environment variable
- **Also Fixed:** 
  - Added input validation for `render_id`, `current_frame`, `total_frames`
  - Added guard against division by zero
  - Added validation for output URLs (must be HTTPS)

### 2. ✅ FIXED: Internal Credit Endpoints Exposed Without Auth (CRITICAL)
**File:** `routes/credits.ts` (POST /credits/deduct, POST /credits/add, GET /credits/check/:user_id)
- **Issue:** Internal credit management endpoints were accessible without authentication
- **Impact:** Anyone could add/deduct credits arbitrarily
- **Fix:** 
  - Added `requireInternalAuth()` helper function
  - Endpoints now require either:
    - Valid internal API key in `X-API-Key` header (set via `INTERNAL_API_KEYS` env)
    - Admin user authentication (set via `ADMIN_USER_IDS` env)
  - Added comprehensive input validation for all parameters

### 3. ✅ FIXED: Hardcoded Demo User in Auth Hook (CRITICAL)
**File:** `server.ts` (auth hook)
- **Issue:** JWT tokens were not validated; request.user was always hardcoded demo user
- **Impact:** No real authentication; anyone could access any user's data
- **Fix:** 
  - Implemented proper JWT verification using `request.jwtVerify()`
  - Added validation for decoded token payload structure
  - Added proper error handling for invalid/expired tokens
  - Set proper user context with id, email, tier, and authType

### 4. ✅ PARTIALLY FIXED: Race Condition in Job Claiming
**File:** `lib/queue.ts` (claimNextJob)
- **Issue:** SELECT and UPDATE were separate operations; multiple workers could claim same job
- **Impact:** Job executed multiple times, data corruption
- **Fix:** Changed to atomic UPDATE with subquery and RETURNING clause
- **Note:** Full race condition fix requires database-level locking (SQLite has limitations)

### 5. ✅ FIXED: Division by Zero in Progress Calculation
**File:** `routes/renders.ts` (progress webhook)
- **Issue:** No check if `total_frames` is 0 before calculating percentage
- **Impact:** NaN values in progress, potential crashes
- **Fix:** Added validation that rejects `total_frames` of 0

### 6. ✅ FIXED: Missing Input Validation
**Files:** Various
- **renders.ts:** Added validation for:
  - Output resolution limits (min 64x64, max 7680x4320 / 8K)
  - FPS limits (min 1, max 240)
  - Duration limits (1 second to 1 hour)
- **assets.ts:** Added validation for:
  - Filename security (no path traversal, no null bytes)
  - File extension whitelist
  - Blocked dangerous extensions (exe, php, js, etc.)

### 7. ✅ FIXED: API Key Admin Scope Not Restricted
**File:** `routes/apikeys.ts`
- **Issue:** Any user could create API keys with `admin:*` scope
- **Impact:** Privilege escalation
- **Fix:** 
  - Added `isAdminUser()` helper
  - Added `validateScopes()` function
  - Admin scope creation restricted to admin users only

### 8. ✅ FIXED: Asset Reference Check on Delete (TODO)
**File:** `routes/assets.ts` (DELETE /:id)
- **Issue:** Assets could be deleted even when referenced by active renders
- **Impact:** Broken renders, data inconsistency
- **Fix:** 
  - Added check for asset references in active renders
  - Returns 409 Conflict if asset is in use
  - Includes list of active render IDs in error response

## TODOs from Codebase (Status)

1. ~~`routes/assets.ts`: Check if asset is referenced by active renders before deleting~~ ✅ **DONE**
2. `routes/credits.ts`: Implement Stripe payment intent creation ⏳ (requires Stripe integration)
3. ~~`routes/credits.ts`: Add internal API key validation~~ ✅ **DONE**
4. ~~`routes/credits.ts`: Add admin role validation~~ ✅ **DONE**
5. `routes/credits.ts`: Implement credit granting ⏳ (feature development)
6. `workers/automation-runner.ts`: Fetch template schema from database and validate variables ⏳ (requires schema store)

## Environment Variables Added

| Variable | Description | Required For |
|----------|-------------|--------------|
| `RENDER_WEBHOOK_SECRET` | HMAC secret for render progress webhooks | Worker webhook authentication |
| `INTERNAL_API_KEYS` | Comma-separated list of internal API keys | Internal credit operations |
| `ADMIN_USER_IDS` | Comma-separated list of admin user IDs | Admin operations |
| `JWT_SECRET` | Secret for JWT signing/verification | User authentication |

## Testing the Fixes

### Test Webhook Authentication
```bash
# Should fail (no signature)
curl -X POST http://localhost:8000/v1/renders/webhooks/progress \
  -H "Content-Type: application/json" \
  -d '{"render_id":"rnd_test","current_frame":100}'

# Should work with valid signature (requires RENDER_WEBHOOK_SECRET)
```

### Test Internal Auth
```bash
# Should fail (no auth)
curl -X POST http://localhost:8000/v1/credits/deduct \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user_test","amount":10,"description":"test"}'

# Should work with internal API key
curl -X POST http://localhost:8000/v1/credits/deduct \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-internal-key" \
  -d '{"user_id":"user_test","amount":10,"description":"test"}'
```

### Test JWT Auth
```bash
# Should fail (no token)
curl http://localhost:8000/v1/user/me

# Should work with valid JWT
curl http://localhost:8000/v1/user/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Remaining Issues

1. **In-Memory Stores:** All data is stored in memory and lost on restart. Migrate to persistent database.
2. **Credit Race Condition:** `deductCredits` still has a race condition between check and update. Needs atomic transaction.
3. **Enhanced Queue Issues:** The `lib/enhanced-queue.ts` file has TypeScript errors that need fixing.
4. **Monitoring/Security Modules:** Several unused imports and type errors in monitoring.ts and security.ts.
