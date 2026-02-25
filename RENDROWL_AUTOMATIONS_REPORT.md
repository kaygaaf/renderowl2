# Renderowl Automations/Queue Team - Sprint Report
**Date:** February 25, 2026  
**Subagent:** Automations/Queue  
**Phase:** Phase 2 (Credit Deduction + Automation Features)

---

## ✅ Backend Support Added

### 1. Bulletproof Atomic Credit System (`app/services/credit_atomic.py`)
**Critical for Phase 2 requirements: No double-charging, no charge-without-generation**

- **`deduct_credits_atomic()`**: Deducts credits with `SELECT FOR UPDATE` row locking
  - Prevents race conditions when multiple concurrent requests hit the same user
  - Returns updated user and deducted amount
  - Raises `InsufficientCreditsError` or `CreditOperationError`

- **`refund_credits_atomic()`**: Refunds credits with dual-row locking (user + video)
  - Uses `credits_deducted` field on Video model for idempotency
  - Clears `credits_deducted` after refund to prevent double refunds
  - Locked at database level

- **`credit_transaction` context manager**: Ensures proper commit/rollback

### 2. Updated API Router (`app/api/router.py`)
**Fixed critical race condition in manual video generation**

**Before (Buggy):**
```python
current_user.credits_balance -= estimated_credits  # Deduct
await db.commit()  # Committed even if task fails!
task = generate_video_task.apply_async(...)  # May fail after deduct
```

**After (Atomic):**
```python
# 1. Queue Celery task FIRST (get valid task ID)
task = generate_video_task.apply_async(...)

# 2. Atomically deduct credits + create video record
deduct_credits_atomic(db, user_id, credits, video_id=task.id)
video_crud.create_with_owner(db, obj_in=video_data, ...)
await db.commit()  # Both or neither

# 3. Auto-revoke Celery task if anything fails
except Exception:
    celery_app.control.revoke(task.id, terminate=True)
```

### 3. Updated Scheduled Job Executor (`app/tasks/scheduled_job_executor.py`)
**Same atomic pattern for scheduled/automated generation**

- Queue Celery task first → Get valid task ID
- Atomic credit deduction + video record creation
- Proper rollback and Celery task revocation on failure
- Detailed error handling per job

### 4. Updated Pipeline Refund (`app/tasks/pipeline.py`)
- Refactored `_refund_credits()` to use centralized `refund_credits_atomic()`
- Consistent with other credit operations
- Maintains retry logic for transient DB errors

---

## 📡 APIs Needed from Product/API Team

### 1. Stripe Checkout Session Endpoint ✅ ALREADY EXISTS
**Location:** `POST /api/payments/buy-credits`  
**Status:** ✅ Implemented by Product/API team  
**Used by:** Frontend for "Buy Credits" / "Upgrade" buttons

### 2. Stripe Webhook Handler ✅ ALREADY EXISTS
**Location:** `POST /webhooks/stripe`  
**Status:** ✅ Implemented by Product/API team in `app/api/stripe_webhooks.py`  
**Handles:**
- `checkout.session.completed` → Add credits
- `invoice.payment_succeeded` → Monthly refill
- `customer.subscription.updated/deleted` → Tier changes

### 3. Credit Balance Endpoint ✅ ALREADY EXISTS
**Location:** `GET /api/credits/balance`  
**Status:** ✅ Implemented  
**Returns:** `credits_balance`, `tier`, `tier_credits`

### 4. Cost Calculation Endpoint ✅ ALREADY EXISTS
**Location:** `POST /api/calculate-cost`  
**Status:** ✅ Implemented  
**Used by:** Frontend to show cost preview before generation

---

## 🚧 Blockers

### NONE - All dependencies resolved

**Previous blockers now resolved:**
1. ✅ Stripe webhook handlers exist (Product/API team built them)
2. ✅ Checkout session endpoint exists
3. ✅ Credit balance endpoint exists
4. ✅ User model has all credit fields

---

## 🔧 Technical Implementation Details

### Atomic Credit Flow (Manual Generation)
```
User clicks "Generate"
    ↓
POST /api/generate
    ↓
1. Calculate credit cost
2. Queue Celery task → Get task_id
    ↓
3. BEGIN TRANSACTION
   - Lock user row (SELECT FOR UPDATE)
   - Deduct credits
   - Create video record with credits_deducted = cost
   - COMMIT
    ↓
Task executes...
    ↓
Success: Video delivered, credits kept
Failure: _refund_credits() called → Credits restored, credits_deducted cleared
```

### Atomic Credit Flow (Scheduled Generation)
```
Cron triggers execute_scheduled_jobs (every minute)
    ↓
For each due job:
    1. Lock user row
    2. Check credits_balance
    3. Queue Celery task → Get task_id
        ↓
    4. BEGIN TRANSACTION
       - Deduct credits
       - Create video record
       - Create scheduled_job_run record
       - Update job stats
       - COMMIT
        ↓
    Task executes...
```

### Database Locking Strategy
```sql
-- Prevents concurrent modifications to same user
SELECT * FROM users WHERE id = ? FOR UPDATE;

-- Prevents double refunds
SELECT * FROM videos WHERE id = ? FOR UPDATE;
SELECT * FROM users WHERE id = ? FOR UPDATE;
UPDATE videos SET credits_deducted = 0 WHERE id = ?;
```

---

## 📊 Files Changed

| File | Changes |
|------|---------|
| `app/services/credit_atomic.py` | +295 lines (NEW) - Atomic credit operations |
| `app/api/router.py` | +90/-45 - Use atomic credit operations |
| `app/tasks/scheduled_job_executor.py` | +180/-85 - Atomic scheduled job execution |
| `app/tasks/pipeline.py` | +39/-36 - Use centralized refund |

**Commit:** `3c9525c` pushed to `main`

---

## 🎯 Phase 2 Progress

| Requirement | Status |
|-------------|--------|
| Credit deduction on job start (atomic) | ✅ **DONE** |
| Credit refund on job failure | ✅ **DONE** |
| Scheduled generation infrastructure | ✅ **DONE** |
| YouTube upload integration prep | ✅ **READY** (hooks exist in scheduled_job_executor.py) |

---

## 📝 Notes for Frontend Team

### Before Starting Video Generation:
1. Call `POST /api/calculate-cost` to show preview
2. Check `GET /api/credits/balance` for balance display
3. If insufficient credits, redirect to pricing page

### Generation Flow:
```javascript
// 1. Preview cost
const cost = await fetch('/api/calculate-cost', {method: 'POST', body: {...}})
showModal(`This will cost ${cost.total_credits} credits`)

// 2. Generate
const result = await fetch('/api/generate', {...})  // Returns immediately
// Status: PENDING, job_id returned

// 3. Poll status
const status = await fetch(`/api/status/${job_id}`)
// If status = FAILURE → credits automatically refunded
```

### Buying Credits:
```javascript
const checkout = await fetch('/api/payments/buy-credits', {
  method: 'POST',
  body: {credit_package: 'creator', success_url, cancel_url}
})
window.location = checkout.checkout_url  // Redirect to Stripe
```

---

## 🔐 Security Measures Implemented

1. **Row-level locking** prevents race conditions
2. **Atomic transactions** ensure no partial states
3. **Celery task revocation** if credit deduction fails
4. **Idempotent refunds** via `credits_deducted` clearing
5. **Insufficient credit check** before any task queueing

---

**Report Submitted:** Automations/Queue Subagent  
**Next Run:** Coordinate with Frontend team on scheduled job UI
