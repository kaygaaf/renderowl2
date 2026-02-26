# Renderowl Product/API Surface — Sprint Report
**Date:** February 25, 2026  
**Subagent:** Product/API  
**Phase:** Phase 1 — Credit System Backend + Stripe

---

## ✅ APIs Built / Verified

### 1. User Model (Complete)
**Location:** `routes/user.ts`

User schema includes all required credit system fields:
- `credits_balance` (integer) — Current credit balance
- `plan_tier` (enum: trial/starter/creator/pro) — Current subscription tier
- `trial_expires_at` (ISO8601) — Trial expiration date
- `subscription_status` (enum: active/cancelled/past_due/none)
- `subscription_expires_at` (ISO8601) — Subscription renewal date
- `stripe_customer_id` — Stripe customer reference
- `stripe_subscription_id` — Stripe subscription reference

### 2. GET /api/user/me (Complete)
**Location:** `routes/user.ts`

Returns complete user profile with credit information:
```json
{
  "id": "user_xxx",
  "email": "user@example.com",
  "name": "Demo User",
  "credits_balance": 60,
  "plan_tier": "trial",
  "trial_expires_at": "2025-03-04T20:39:00Z",
  "subscription_status": "none",
  "subscription_expires_at": null,
  "days_until_trial_expires": 7
}
```

### 3. POST /api/credits/calculate-cost (Complete)
**Location:** `routes/credits.ts`

Calculates credit cost for video generation:
```json
// Request
{
  "video_type": "short",
  "include_images": true,
  "include_voiceover": true,
  "include_sfx": false
}

// Response
{
  "credits": 25,
  "cost_eur": 0.50,
  "breakdown": {
    "base_cost": 5,
    "image_cost": 20,
    "voiceover_cost": 0,
    "sfx_cost": 0
  }
}
```

Supports video types: `short` (25 credits), `medium` (70 credits), `long` (220 credits), `custom`

### 4. GET /api/credits/balance (NEW — Added This Run)
**Location:** `routes/credits.ts`

Simple endpoint for Frontend to get current user's credit status:
```json
{
  "user_id": "user_xxx",
  "credits_balance": 60,
  "plan_tier": "trial",
  "trial_expires_at": "2025-03-04T20:39:00Z",
  "subscription_status": "none",
  "subscription_expires_at": null
}
```

### 5. POST /api/stripe/buy-credits (Complete)
**Location:** `routes/stripe.ts`

Creates Stripe checkout session for credit purchase:
```json
// Request
{
  "tier": "creator",
  "success_url": "https://app.renderowl.com/payment/success",
  "cancel_url": "https://app.renderowl.com/pricing"
}

// Response
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_xxx"
}
```

Supports tiers: `trial` (€1), `starter` (€7), `creator` (€19), `pro` (€49)

### 6. Stripe Webhook Handler (Complete)
**Location:** `routes/stripe-webhook.ts`

Handles all required webhook events:
- `checkout.session.completed` → Adds credits, updates user plan
- `invoice.payment_succeeded` → Monthly credit refill for subscriptions
- `invoice.payment_failed` → Marks subscription as past_due
- `customer.subscription.updated` → Syncs subscription status
- `customer.subscription.deleted` → Downgrades to starter, marks cancelled

### 7. Internal Credit Operations (Complete)
**Location:** `routes/credits.ts` + `routes/user.ts`

For Automations team integration:
- `POST /credits/deduct` — Atomically deduct credits
- `POST /credits/add` — Add credits (purchases, refunds)
- `GET /credits/check/:user_id` — Check if user has required credits

---

## 📋 What's Ready for Frontend

| Endpoint | Status | Use Case |
|----------|--------|----------|
| `GET /user/me` | ✅ Ready | Header credit display, profile page |
| `GET /credits/balance` | ✅ Ready | Quick balance check |
| `POST /credits/calculate-cost` | ✅ Ready | Cost preview before generation |
| `POST /stripe/buy-credits` | ✅ Ready | "Buy Credits" / "Upgrade" buttons |
| `GET /user/transactions` | ✅ Ready | Transaction history page |

### Frontend Integration Pattern
```javascript
// 1. Show cost preview
const cost = await fetch('/v1/credits/calculate-cost', {
  method: 'POST',
  body: JSON.stringify({ video_type: 'short' })
});

// 2. Display balance in header
const balance = await fetch('/v1/credits/balance');

// 3. Buy credits
const checkout = await fetch('/v1/stripe/buy-credits', {
  method: 'POST',
  body: JSON.stringify({ tier: 'creator', success_url, cancel_url })
});
window.location = checkout.checkout_url;
```

---

## 🔧 What Automations Team Has

Per their report, the Automations team has implemented:
- ✅ `deduct_credits_atomic()` — Row-locked credit deduction
- ✅ `refund_credits_atomic()` — Row-locked credit refund
- ✅ Atomic transaction wrapper
- ✅ Celery task revocation on failure
- ✅ Credit deduction on job start (renders and scheduled jobs)
- ✅ Automatic refund on job failure

**No additional APIs needed from Product/API** — Automations team has everything required.

---

## 📡 API Contract: Consistent Credit Information

All endpoints return credit information in consistent format:

**Credit balance:** Always `credits_balance` (integer, non-negative)
**Plan tier:** Always `plan_tier` (trial/starter/creator/pro)
**Trial status:** `trial_expires_at` (ISO8601 or null)
**Subscription status:** `subscription_status` (active/cancelled/past_due/none)

---

## 🔐 Environment Variables Required

```bash
# Stripe (required for payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Pre-configured price IDs
STRIPE_PRICE_TRIAL=price_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_CREATOR=price_...
STRIPE_PRICE_PRO=price_...

# JWT (for auth)
JWT_SECRET=your-secret-key
```

---

## 🚧 Blockers

**NONE** — All Phase 1 APIs are complete and ready.

---

## 📝 Files Modified This Run

| File | Changes |
|------|---------|
| `routes/credits.ts` | Added `GET /balance` endpoint for Frontend team |

---

## ✅ Phase 1 Status: COMPLETE

All required Phase 1 APIs are built, tested, and ready:
- [x] User model with credit fields
- [x] GET /user/me with credits
- [x] POST /credits/calculate-cost
- [x] GET /credits/balance
- [x] POST /stripe/buy-credits
- [x] Stripe webhook handlers
- [x] Internal credit operations

**Frontend team is UNBLOCKED.** All APIs they need are ready.

---

**Report Submitted:** Product/API Surface Subagent  
**Build Status:** ✅ Passing (`npm run build` succeeds)
