# Renderowl Platform API — Implementation Tickets

**Sprint:** Foundation  
**Created:** 2026-02-25  
**Status:** Ready for Development

---

## 🎫 TICKET-001: Project API Endpoints

**Priority:** P0 (Critical)  
**Estimate:** 2 days  
**Assignee:** TBD  
**Labels:** `api`, `projects`, `foundation`

### Description
Implement the CRUD API endpoints for project management. Projects are the top-level organizational unit for assets and renders.

### Acceptance Criteria

- [ ] `GET /v1/projects` — List projects with pagination
  - Support query params: `limit`, `cursor`, `sort`
  - Return `PaginatedResponse<Project>`
  
- [ ] `POST /v1/projects` — Create new project
  - Validate unique slug per organization
  - Generate webhook secret on creation
  - Return `Project` with `webhookSecret` (only on create)
  
- [ ] `GET /v1/projects/{id}` — Get project by ID
  - Return 404 if not found or not in user's org
  
- [ ] `PATCH /v1/projects/{id}` — Update project
  - Support partial updates via `UpdateProjectSchema`
  - Prevent slug changes (immutable after creation)
  
- [ ] `DELETE /v1/projects/{id}` — Soft delete project
  - Set `deletedAt` timestamp, don't purge
  - Cascade: mark associated assets as orphaned

### Technical Notes
- Use `ProjectSchema` for response validation
- Database table: `projects` with RLS on `organization_id`
- Webhook secret: generate 32-byte random, hex-encoded

### Files to Create/Modify
```
src/routes/projects.ts        # Express/Fastify routes
src/services/project.ts       # Business logic
src/db/schema/projects.sql    # Migration
```

---

## 🎫 TICKET-002: Asset Upload Flow

**Priority:** P0 (Critical)  
**Estimate:** 3 days  
**Assignee:** TBD  
**Labels:** `api`, `assets`, `storage`, `foundation`

### Description
Implement the asset lifecycle: creation → presigned upload URL → processing → ready state.

### Acceptance Criteria

- [ ] `POST /v1/projects/{id}/assets` — Create asset
  - Return `AssetUploadResponse` with presigned URL
  - Asset status: `pending`
  - Generate S3/GCS presigned PUT URL (15-min expiry)
  
- [ ] `POST /v1/assets/{id}/upload-complete` — Confirm upload
  - Trigger async metadata extraction
  - Update status: `processing` → `ready`
  - For videos: extract duration, resolution, codec
  - For fonts: extract family, variants
  - For templates: validate schema
  
- [ ] `GET /v1/assets/{id}` — Get asset with metadata
  - Include signed download URL (if requested)
  
- [ ] `PATCH /v1/assets/{id}` — Update metadata
  - Update name, description, tags
  - Validate `UpdateAssetSchema`
  
- [ ] `DELETE /v1/assets/{id}` — Delete asset
  - Delete from storage + database
  - 409 if asset referenced by active renders

### Technical Notes
- Storage abstraction: interface for S3/GCS/R2
- Metadata extraction: FFmpeg for video, fontkit for fonts
- Background jobs: BullMQ or similar for processing queue
- Asset schema validation with `AssetSchema`

### Files to Create/Modify
```
src/routes/assets.ts
src/services/asset.ts
src/services/storage.ts       # Storage abstraction
src/workers/asset-processor.ts
src/db/schema/assets.sql
```

---

## 🎫 TICKET-003: Render Job Submission

**Priority:** P0 (Critical)  
**Estimate:** 3 days  
**Assignee:** TBD  
**Labels:** `api`, `renders`, `queue`, `foundation`

### Description
Implement render job submission API that orchestrates between the platform and `renderowl-remotion` renderer.

### Acceptance Criteria

- [ ] `POST /v1/projects/{id}/renders` — Submit render job
  - Accept `SubmitRenderSchema` body
  - Resolve asset references to URLs/paths
  - Validate input (template exists, assets ready)
  - Queue job with priority support
  - Return `RenderJob` with `status: pending`
  
- [ ] `GET /v1/renders/{id}` — Get render status
  - Return full `RenderJob` with progress
  - Include signed output URL if completed
  
- [ ] `DELETE /v1/renders/{id}` — Cancel render
  - Only allowed if `status: pending` or `queued`
  - Update status to `cancelled`
  
- [ ] Render engine adapter for `remotion`
  - Transform platform `RenderInput` → remotion `RenderRequest`
  - Handle asset URL resolution
  - Post result back to platform queue

### Technical Notes
- Job queue: Redis-based (BullMQ)
- Renderer communication: HTTP API to remotion server
- Asset resolution: generate signed URLs for renderer access
- Progress updates: WebSocket or polling via queue events

### Files to Create/Modify
```
src/routes/renders.ts
src/services/render.ts
src/services/renderer-adapter.ts
src/queue/render-queue.ts
src/db/schema/renders.sql
```

---

## 🎫 TICKET-004: Webhook Event System

**Priority:** P1 (High)  
**Estimate:** 2 days  
**Assignee:** TBD  
**Labels:** `api`, `webhooks`, `events`

### Description
Implement the webhook delivery system for async event notifications.

### Acceptance Criteria

- [ ] Webhook signing with HMAC-SHA256
  - Sign payload with project webhook secret
  - Include `X-Renderowl-Signature` header
  - Include `X-Renderowl-Timestamp` header
  
- [ ] Event types implemented:
  - `render.queued`, `render.started`, `render.progress`
  - `render.completed`, `render.failed`, `render.cancelled`
  - `asset.uploaded`, `asset.ready`
  
- [ ] Retry logic with exponential backoff
  - Max 5 retries over ~30 minutes
  - Mark webhooks as failing after consecutive failures
  
- [ ] Webhook endpoint registration
  - `POST /v1/webhooks` — Register org-level webhook
  - Support event filtering

### Technical Notes
- Webhook payload: `WebhookEventSchema`
- Delivery queue: separate from render queue
- Idempotency: events include unique `id`, consumers should dedupe
- Security: verify timestamp within 5 minutes to prevent replay

### Files to Create/Modify
```
src/services/webhook.ts
src/queue/webhook-queue.ts
src/routes/webhooks.ts
src/utils/signature.ts
```

---

## 🎫 TICKET-005: Automation Engine Core

**Priority:** P1 (High)  
**Estimate:** 4 days  
**Assignee:** TBD  
**Labels:** `api`, `automations`, `workflows`

### Description
Implement the automation engine that allows trigger-based render workflows.

### Acceptance Criteria

- [ ] `POST /v1/projects/{id}/automations` — Create automation
  - Validate `CreateAutomationSchema`
  - Template must exist and be `ready`
  - Validate data mappings against template schema
  
- [ ] Trigger implementations:
  - **Webhook trigger:** Generate unique URL per automation
  - **Schedule trigger:** Cron-based with node-cron/bull repeat
  - **Asset upload trigger:** Watch asset events
  
- [ ] Data mapping engine:
  - JSONPath-like extraction from trigger payload
  - Transform functions: `uppercase`, `lowercase`, `formatDate`
  - Static value injection
  
- [ ] `POST /v1/automations/{id}/trigger` — Manual trigger
  - Allow testing automations with custom payload
  
- [ ] Run history: `GET /v1/automations/{id}/runs`
  - List past automation executions
  - Include success/failure status

### Technical Notes
- Automation runner: separate worker process
- Template schema validation: JSON Schema store per template asset
- Webhook endpoints: `/v1/hooks/{automationId}` (unauthenticated)

### Files to Create/Modify
```
src/routes/automations.ts
src/services/automation.ts
src/workers/automation-runner.ts
src/utils/data-mapping.ts
src/db/schema/automations.sql
```

---

## 🎫 TICKET-006: TypeScript SDK Client

**Priority:** P2 (Medium)  
**Estimate:** 2 days  
**Assignee:** TBD  
**Labels:** `sdk`, `developer-experience`, `typescript`

### Description
Create an official TypeScript SDK for the Renderowl Platform API.

### Acceptance Criteria

- [ ] SDK structure:
  ```typescript
  import {RenderowlClient} from '@renderowl/sdk';
  
  const client = new RenderowlClient({
    apiKey: 'rwl_live_xxx',
    baseUrl: 'https://api.renderowl.com'
  });
  
  const project = await client.projects.create({name: 'My Project'});
  const render = await client.renders.submit(project.id, {...});
  ```

- [ ] Resource methods:
  - `client.projects.*` — CRUD operations
  - `client.assets.*` — Upload, metadata, delete
  - `client.renders.*` — Submit, status, cancel
  - `client.automations.*` — Create, trigger, history
  
- [ ] Features:
  - Automatic retries with exponential backoff
  - Request/response validation with Zod schemas
  - Type-safe throughout
  - Browser and Node.js compatible

### Files to Create
```
sdk/typescript/
  src/client.ts
  src/resources/
    projects.ts
    assets.ts
    renders.ts
    automations.ts
  src/types.ts      # Re-export from platform-contract
  src/errors.ts
```

---

## 📊 Ticket Dependencies

```
TICKET-001 (Projects)
    ↓
TICKET-002 (Assets) ←→ TICKET-004 (Webhooks)
    ↓                    ↓
TICKET-003 (Renders) ←──┘
    ↓
TICKET-005 (Automations)
    ↓
TICKET-006 (SDK)
```

---

## 🎯 Definition of Done (All Tickets)

- [ ] Code implements all acceptance criteria
- [ ] Unit tests cover happy path and error cases (80%+ coverage)
- [ ] Integration tests for API endpoints
- [ ] API documentation updated in `API_CONTRACT.md`
- [ ] Zod schemas exported for SDK consumption
- [ ] Database migrations included
- [ ] No security vulnerabilities (secrets handled properly)
