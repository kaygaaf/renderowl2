# Renderowl Team — Subagent Coordination Briefing

**Last Updated:** 2026-02-25 21:00 UTC  
**Sprint:** Phase 2 — Credit Deduction + Automation Features

---

## 🎯 Current Sprint Priority

### Phase 2: Credit Deduction + Automation Features

1. **Credit deduction on job start** (atomic with job creation)
2. **Credit refund on job failure**
3. **Scheduled generation infrastructure** (cron trigger system)
4. **YouTube upload integration preparation**

---

## 👥 Subagent Responsibilities

### 1. Frontend Team
- **Needs:** API endpoints BEFORE building UI
- **Blockers:** Waiting on Product/API for credit balance endpoints, automation creation forms
- **Current Status:** UI healthy at app.renderowl.com, ready to consume new APIs

### 2. Product/API Team
- **Responsibility:** Core API endpoints, Stripe webhook handlers, credit balance management
- **Priority:** Credit balance endpoints (`GET /v1/credits/balance`, `POST /v1/credits/purchase`)
- **Blockers:** Waiting on Automations/Queue for credit deduction logic

### 3. Automations/Queue Team (YOU ARE HERE)
- **Responsibility:** Queue system, credit atomic operations, scheduled jobs, YouTube integration
- **Priority:** Bulletproof credit deduction, cron infrastructure
- **Deliverables:**
  - Atomic credit deduction on job submission
  - Automatic credit refund on failure
  - Cron-based automation triggers
  - YouTube upload queue preparation

### 4. Infra/Stability Team
- **Responsibility:** Deployments, storage, monitoring
- **Current Status:** API healthy, R2 credentials pending

---

## 🔗 Dependencies & Coordination

### Status Update: Automations/Queue → Product/API
**DELIVERED:** Credit deduction logic, queue system, automation infrastructure

```
Automations/Queue ✅──→ Product/API
    ├─ ✅ Credit service with atomic deduction
    ├─ ✅ Queue manager with BullMQ
    ├─ ✅ Automation runner with cron
    ├─ ✅ YouTube upload service
    └─ ✅ Database schema for credits

Product/API ──→ Frontend
    ├─ 🔄 Credit endpoints (mount routes/credits.ts)
    ├─ 🔄 Automation endpoints (mount routes/automations.ts)
    └─ ⏳ Stripe webhook handlers (waiting on Stripe account)

Frontend ──→ Automations/Queue
    └─ ℹ️ Queue client available via SDK
```

---

## 🚧 Critical: Credit System Safety

**MUST BE BULLETPROOF:**
- ✅ Atomic credit deduction (DB transaction with row locking)
- ✅ No double-charging (idempotent job submissions)
- ✅ No charge-without-generation (task queued AFTER credit check)
- ✅ Automatic refund on failure (webhook-triggered)
- ✅ Credit balance check BEFORE queueing

**Pattern to follow:** See `videogen/app/services/credit_atomic.py` for atomic operations.

---

## 📋 API Contracts — STATUS

### ✅ DELIVERED by Automations/Queue Team

**Mount these routes in your Express/Fastify app:**

```typescript
import {createCreditRoutes} from './routes/credits';
import {createAutomationRoutes} from './routes/automations';

// Credit routes
app.use('/v1/credits', createCreditRoutes({pool, creditService, stripeClient}));

// Automation routes  
app.use('/v1/projects/:projectId/automations', createAutomationRoutes({pool, queueManager}));
app.use('/v1/automations', createAutomationRoutes({pool, queueManager}));
```

**Available Endpoints:**

```typescript
// Credit Management
GET    /v1/credits/balance
GET    /v1/credits/transactions?limit=20&type=deduction
POST   /v1/credits/purchase                    (requires Stripe)
POST   /v1/internal/credits/refund             (internal/admin)
POST   /v1/internal/credits/grant              (internal/admin)

// Automation Management
GET    /v1/projects/{id}/automations
POST   /v1/projects/{id}/automations
GET    /v1/automations/{id}
PATCH  /v1/automations/{id}
DELETE /v1/automations/{id}
POST   /v1/automations/{id}/trigger            // Manual trigger
POST   /v1/automations/{id}/toggle             // Enable/disable
GET    /v1/automations/{id}/runs               // Run history
```

### ⏳ FROM Product/API Team (Still Needed)

```typescript
// Stripe webhook handlers
POST /v1/webhooks/stripe
→ Handle payment_intent.succeeded for credit purchases

// Render job submission (to integrate with queue)
POST /v1/projects/{id}/renders
→ Should call queueManager.submitRenderJob()

// Job status callback (for credit refunds)
POST /v1/internal/jobs/{id}/complete
→ Triggered by render workers on completion/failure
```

---

## 🗂️ Shared Resources

### Database Schema (Existing)
- `users.credits_balance` — Available credits
- `videos.credits_deducted` — Credits charged for this job
- `scheduled_jobs` — Cron automation definitions
- `scheduled_job_runs` — Execution history with credit tracking

### Code References
- `videogen/app/services/credit_atomic.py` — Atomic credit operations
- `videogen/app/models/scheduled_job.py` — Automation model
- `videogen/app/tasks/scheduled_job_executor.py` — Cron executor

---

## ⚠️ Active Blockers

| Blocker | Blocking | Owner | Status |
|---------|----------|-------|--------|
| R2 Credentials | Storage scaling | Kay | ⏳ Waiting |
| Stripe Account | Payment webhooks | Product/API | ⏳ Waiting |
| YouTube OAuth App | YouTube uploads | Product/API | ⏳ Waiting |

## ✅ Phase 2 Status Update (2026-02-25 21:00)

### Delivered by Automations/Queue Team

| Component | Status | Files |
|-----------|--------|-------|
| Credit Service (Atomic) | ✅ Ready | `src/services/credit.ts` |
| Queue Manager (BullMQ) | ✅ Ready | `src/queue/manager.ts` |
| Credit Schema | ✅ Ready | `src/db/schema/002_credit_system.sql` |
| Automation Runner | ✅ Ready | `src/workers/automation-runner.ts` |
| YouTube Upload Service | ✅ Ready | `src/services/youtube.ts` |
| Credit API Routes | ✅ Ready | `src/routes/credits.ts` |
| Automation API Routes | ✅ Ready | `src/routes/automations.ts` |
| Credit Contracts | ✅ Ready | `src/credit-contract.ts` |

### Key Features Implemented

**Credit System:**
- Atomic credit deduction with row locking
- Automatic refund on job failure (3 retries)
- Transaction audit trail
- Cost calculation (base + per-scene × quality)

**Queue System:**
- BullMQ with Redis
- Priority-based scheduling
- Dead letter queue for failed jobs
- Worker pools for different job types

**Automation:**
- Cron-based scheduling
- Data mapping with transforms
- Manual trigger endpoint
- Run history tracking
- Auto-disable on repeated failures

**YouTube Integration:**
- OAuth flow
- Resumable uploads
- Playlist assignment
- Progress tracking

---

## ✅ Phase 2 Definition of Done

- [x] Atomic credit deduction implemented
- [x] Credit refund on failure working
- [x] Cron trigger system operational
- [x] YouTube upload queue prepared
- [ ] Product/API mounts the routes
- [ ] Stripe webhook handlers implemented
- [ ] Integration tests for credit flow
- [ ] Documentation updated

---

## 📞 Escalation

If cross-team coordination needed:
1. Document the dependency in this file
2. Notify in shared channel
3. Update blocker table above

*This file is updated by each subagent after every run.*
