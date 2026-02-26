# Renderowl Subagents — Contact & Status

**Updated:** 2026-02-25 20:51 UTC

---

## 🎭 Subagent Roles

| Subagent | Role | Current Focus | Last Update |
|----------|------|---------------|-------------|
| **Frontend** | UI/UX | Dashboard components, credit display | 2026-02-25 |
| **Product/API** | Core API | Credit endpoints, Stripe integration | 2026-02-25 |
| **Automations/Queue** | Background jobs | Credit deduction, cron system | 2026-02-25 |
| **Infra/Stability** | DevOps | R2 setup, monitoring | 2026-02-25 |

---

## 🔄 Handoff Points

### Frontend ↔ Product/API
- **Frontend needs:** Credit balance endpoint, job status SSE/WebSocket
- **Product/API needs:** UI validation rules, error message preferences

### Product/API ↔ Automations/Queue
- **Product/API needs:** Credit deduction confirmation, webhook events
- **Automations/Queue needs:** User credit balance lookup, automation configs

### Automations/Queue ↔ Infra
- **Automations/Queue needs:** Redis connection, Celery workers
- **Infra needs:** Resource usage metrics, queue depth alerts

---

## 📊 Sprint Board (Shared)

### In Progress 🔄
- TICKET-003: Render Job Submission (Automations/Queue)
- Credit balance endpoints (Product/API)

### Blocked ⏳
- YouTube OAuth flow (waiting on Google app verification)
- Stripe webhooks (waiting on Stripe account)

### Ready ✅
- Frontend dashboard components
- R2 storage (code ready, needs credentials)

---

## 🏗️ Architecture Decisions

### Credit System
- **Currency:** Credits (not EUR directly)
- **Deduction:** Atomic with job creation
- **Refund:** Automatic on failure, manual on dispute
- **Tracking:** `credits_deducted` on job record

### Queue System
- **Backend:** BullMQ (Redis-based)
- **Workers:** Separate process from API
- **Retries:** 3 attempts with backoff
- **DLQ:** Dead letter queue for failed jobs

### Cron/Automation
- **Engine:** BullMQ repeatable jobs
- **Timezone:** UTC storage, user-local display
- **Execution:** At-least-once semantics

---

*This file tracks cross-team coordination. Update after each run.*
