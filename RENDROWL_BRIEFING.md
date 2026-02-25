# Renderowl Team — Strategic Alignment Briefing
**Date:** February 25, 2026
**Status:** ACTIVE — All subagents must read before next run

---

## 🎯 Business Model Pivot: Credit-Based Pricing

We are shifting from a pure subscription model to **credit-based pricing with usage tiers**.

### Final Pricing Structure

| Tier | Price | Credits | Per-Credit | Automation |
|------|-------|---------|------------|------------|
| **Trial** | **€1** (7 days) | 60 | - | Manual only |
| **Starter** | **€7/mo** | 350 | €0.02 | Manual only |
| **Creator** | **€19/mo** | 1200 | €0.0158 | Schedule 4×/week |
| **Pro** | **€49/mo** | 3500 | €0.014 | Unlimited + YouTube upload |

### Cost Basis (Our Actual Costs)
- Image generation (Replicate FLUX): **€0.0046 per image**
- Voiceover (edge-tts): **FREE**
- SFX (Replicate): **~€0.01 per sound**
- Video assembly: Our compute (negligible)

### Credit Costs for Users
- 1 image: **2 credits** (€0.04)
- 1 short video (10 scenes): **25 credits** (€0.50)
- 1 mid video (30 scenes): **70 credits** (€1.40)
- 1 long video (100 scenes): **220 credits** (€4.40)

**Target margin: 85-90%** after AI costs.

---

## 📋 Priority Feature Roadmap — AGGRESSIVE TIMELINE

### Phase 1: Core Monetization (48 HOURS)
**Owner: Product/API Surface + Frontend teams**

**Day 1 (Today):**
1. **Credit System Backend** — Product/API
   - Add `credits_balance` to user model
   - POST /api/calculate-cost endpoint
   - GET /api/user/me with credits

2. **Frontend UI** — Frontend (parallel)
   - Credit balance display in header
   - Cost preview before generation
   - Pricing page

**Day 2 (Tomorrow):**
3. **Stripe Integration** — Product/API
   - €1 trial checkout
   - Webhook handlers
   - Trial expiration logic

4. **Credit Deduction Flow** — Automations/Queue
   - Atomic credit deduction on job start
   - Refund on failure

### Phase 2: Automation Features (Days 3-5)
**Owner: Automations/Queue team**

1. **YouTube Upload Integration**
2. **Scheduled Generation**

### Phase 3: Storage & Delivery (Day 1-2)
**Owner: Infra/Stability team**

1. **S3/R2 Integration** — ✅ Code done, needs credentials ASAP
2. **30-day auto-delete**

---

## ⚡ URGENCY RULES

**No feature takes more than 2 days.** If it does:
1. Cut scope
2. Ship MVP
3. Iterate later

**Product/API is BLOCKING everyone** — prioritize their work first.

**Push working code, not perfect code.** We can fix bugs in production.

---

## ✅ Recent Fixes (Deployed)

### Frontend Deployment Issues
- **FIXED:** Dockerfile missing `wget` for healthchecks
- **FIXED:** Cookie domain not set (auth failing across subdomains)
- **FIXED:** All frontend deployments now passing healthchecks

### Auth Flow
- **FIXED:** Login now redirects properly to dashboard
- **FIXED:** Cookie now shared across renderowl.com and app.renderowl.com
- **DEPLOYED:** Commit `7c2f3a7` and `1e1b839`

### Video Delivery
- **DEPLOYED:** S3 storage service (`8a0bc5a`)
- **PENDING:** Cloudflare R2 credentials from Kay

---

## 🚫 STOP Doing This

1. **Do NOT work on:**
   - Landing page redesigns (it's good enough for now)
   - New video templates (wait for monetization)
   - Advanced caption features (Remotion integration on hold)

2. **Do NOT:**
   - Deploy to production without checking Coolify status first
   - Make edits that fail silently (check git status after edits)
   - Work on features not in the Phase 1/2/3 list above

---

## 🎨 Design Guidelines

### For Frontend Team
- **Primary goal:** Get users to generate their first video
- **Secondary goal:** Convert trial users to paid
- **Tertiary goal:** Upsell to higher tiers

### UI Patterns to Implement
1. **Credit balance badge** — Always visible in header
2. **Cost preview** — Before clicking "Generate", show "25 credits"
3. **Progressive disclosure** — Hide advanced features (scheduling, YouTube) behind upgrade prompts
4. **Trial countdown** — Show "6 days left" in trial banner

---

## 📊 Success Metrics

We will measure:
1. **Trial-to-paid conversion rate** (target: >15%)
2. **Credit burn rate** (credits used / credits purchased)
3. **Video generation success rate** (target: >95%)
4. **Average revenue per user (ARPU)**

---

## 🔧 Technical Notes

### Repository
- **Main repo:** `kaygaaf/videogen`
- **Branch:** `main` (deploys auto via Coolify)
- **Frontend:** `/frontend` directory
- **Backend:** `/app` directory

### Environment Variables Needed
```
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_TRIAL=price_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_CREATOR=price_...
STRIPE_PRICE_PRO=price_...

# Cloudflare R2 (pending from Kay)
R2_ENDPOINT_URL=https://<account>.r2.cloudflarestorage.com
R2_BUCKET_NAME=renderowl-videos
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

---

## 🚨 Blockers / Needs Input

1. **Cloudflare R2 credentials** — Waiting for Kay to provide
2. **Stripe account setup** — Need to create account and products
3. **YouTube API quota** — Need to apply for increased quota

---

## ✅ Checklist Before Next Run

**All subagents:**
- [ ] Read this briefing fully
- [ ] Check that your last commit pushed successfully
- [ ] Verify no edit failures in your last run
- [ ] Confirm you're working on Phase 1/2/3 priorities only

**Questions?** Ping the main session.

---

*This briefing supersedes all previous instructions. Focus on monetization first, features second.*
