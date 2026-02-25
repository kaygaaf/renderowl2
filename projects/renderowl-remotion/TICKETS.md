# Renderowl Platform API — Implementation Tickets

## Overview
This document tracks the implementation of the Renderowl Platform API surface, organized by domain (Projects, Assets, Templates, Automations).

---

## TICKET-1: Project Model & Database Schema
**Priority:** P0 | **Estimate:** 4h | **Status:** Ready

### Description
Create the foundational data layer for multi-tenant project support.

### Acceptance Criteria
- [ ] Create `projects` table with columns:
  - `id` (UUID, PK)
  - `slug` (varchar(50), unique, indexed)
  - `name` (varchar(100))
  - `description` (text, nullable)
  - `status` (enum: active, suspended, archived)
  - `settings` (JSONB with defaults)
  - `usage` (JSONB: storage, renders, minutes)
  - `created_at`, `updated_at` (timestamps)
- [ ] Create `api_keys` table:
  - `id` (UUID, PK)
  - `project_id` (UUID, FK → projects)
  - `name` (varchar(100))
  - `key_hash` (varchar(64), indexed) — store SHA-256 hash only
  - `key_prefix` (varchar(20)) — for display (rk_live_xxxx)
  - `scopes` (text[] array)
  - `rate_limit_rpm` (int, default 100)
  - `last_used_at` (timestamp, nullable)
  - `created_at`, `revoked_at` (timestamps)
- [ ] Create `project_members` table (for future multi-user):
  - `project_id`, `user_id`, `role` (owner, admin, member)
- [ ] Write migration file (Alembic/TypeORM)
- [ ] Create indexes: `slug` (unique), `api_keys.key_hash` (btree)

### Technical Notes
- Use JSONB for flexible settings/usage without schema migrations
- Consider partitioning by `created_at` if >1M projects expected

---

## TICKET-2: API Key Authentication Middleware
**Priority:** P0 | **Estimate:** 3h | **Status:** Ready

### Description
Implement Bearer token authentication with scope-based authorization.

### Acceptance Criteria
- [ ] Create `AuthMiddleware` class/handler:
  - Extract `Authorization: Bearer {token}` header
  - Validate token format (`rk_live_[a-zA-Z0-9]{32}`)
  - Hash token and lookup in `api_keys` table
  - Reject if revoked, project suspended, or not found
  - Update `last_used_at` timestamp (async, non-blocking)
- [ ] Create `RequireScope` decorator/middleware:
  - Check if API key has required scope(s)
  - Return 403 `UNAUTHORIZED_SCOPE` if missing
- [ ] Attach auth context to request:
  - `req.auth.projectId`
  - `req.auth.apiKeyId`
  - `req.auth.scopes[]`
- [ ] Rate limiting per API key:
  - In-memory sliding window (Redis later)
  - Return 429 with `Retry-After` header

### Error Responses
```json
{"error": {"code": "API_KEY_REVOKED", "message": "API key has been revoked"}}
{"error": {"code": "UNAUTHORIZED_SCOPE", "message": "Key lacks 'renders:write' scope"}}
{"error": {"code": "RATE_LIMIT_EXCEEDED", "message": "100 requests/minute exceeded"}}
```

---

## TICKET-3: Projects REST API Endpoints
**Priority:** P0 | **Estimate:** 4h | **Status:** Ready

### Description
Implement CRUD endpoints for project management (master key only).

### Acceptance Criteria
- [ ] `POST /api/v1/projects` — Create project
  - Validate slug format (`^[a-z0-9-]{3,50}$`)
  - Check slug uniqueness
  - Return 201 with full project (no API keys)
- [ ] `GET /api/v1/projects` — List projects
  - Pagination (limit/cursor)
  - Filter by status
- [ ] `GET /api/v1/projects/:id` — Get project
  - Include usage statistics
- [ ] `PATCH /api/v1/projects/:id` — Update project
  - Allow: name, description, settings, status
- [ ] `DELETE /api/v1/projects/:id` — Archive project
  - Soft delete (set status=archived)
- [ ] `POST /api/v1/projects/:id/api-keys` — Create API key
  - Generate cryptographically secure key
  - Return full key ONLY in 201 response
  - Store hash only in DB
- [ ] `GET /api/v1/projects/:id/api-keys` — List API keys
  - Exclude `key_hash`, include `key_prefix`
- [ ] `DELETE /api/v1/projects/:id/api-keys/:keyId` — Revoke key
  - Set `revoked_at` timestamp

### Technical Notes
- Master key authentication (separate from project API keys)
- Consider slug -> id resolution caching

---

## TICKET-4: Asset Upload Flow (Presigned URLs)
**Priority:** P1 | **Estimate:** 6h | **Status:** Ready

### Description
Implement direct-to-storage uploads with presigned URLs.

### Acceptance Criteria
- [ ] `POST /api/v1/projects/:id/assets` — Create asset record
  - Validate storage quota
  - Generate asset UUID
  - Create DB record with status=`uploading`
  - Generate presigned PUT URL (S3/MinIO/Cloudflare R2)
  - Return asset + uploadUrl + expiresAt (15 min)
- [ ] Storage provider abstraction:
  - Interface: `generateUploadUrl(assetId, sizeBytes, mimeType)`
  - Implement S3-compatible provider
- [ ] Webhook/callback for upload completion:
  - Storage -> API callback on successful upload
  - Update asset status=`processing`
  - Trigger async metadata extraction
- [ ] Background metadata extraction:
  - FFprobe for video/audio duration, dimensions, codec
  - Update asset record with metadata
  - Set status=`ready`
- [ ] `GET /api/v1/projects/:id/assets` — List assets
  - Pagination, filtering by type, status, tags
  - Search by name (ILIKE)
- [ ] `GET /api/v1/projects/:id/assets/:assetId` — Get asset
- [ ] `PATCH /api/v1/projects/:id/assets/:assetId` — Update metadata
  - name, description, tags
- [ ] `DELETE /api/v1/projects/:id/assets/:assetId` — Delete asset
  - Soft delete (mark deleted)
  - Schedule storage cleanup

### Schema
```typescript
interface Asset {
  id: string;
  projectId: string;
  type: 'video' | 'audio' | 'image' | 'font' | 'template';
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  sizeBytes: number;
  mimeType: string;
  metadata?: {
    width?: number;
    height?: number;
    durationSeconds?: number;
    codec?: string;
    fps?: number;
  };
  urls: { original: string; thumbnail?: string };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}
```

---

## TICKET-5: Template System
**Priority:** P1 | **Estimate:** 4h | **Status:** Ready

### Description
Implement reusable caption style templates with variable substitution.

### Acceptance Criteria
- [ ] Create `templates` table:
  - `id`, `project_id` (FK), `name`, `description`
  - `style` (JSONB — CaptionStyle object)
  - `default_video` (JSONB: {type, assetId})
  - `default_settings` (JSONB)
  - `variables` (JSONB[] — variable definitions)
  - `is_default` (boolean)
  - `created_at`, `updated_at`
- [ ] Template CRUD endpoints:
  - `POST /api/v1/projects/:id/templates`
  - `GET /api/v1/projects/:id/templates`
  - `GET /api/v1/projects/:id/templates/:tid`
  - `PATCH /api/v1/projects/:id/templates/:tid`
  - `DELETE /api/v1/projects/:id/templates/:tid`
- [ ] Variable validation:
  - Keys must match regex `^[a-zA-Z_][a-zA-Z0-9_]*$`
  - Types: string, number, color, boolean, select
  - Validate defaults match type
- [ ] Template application in render:
  - `POST /api/v1/projects/:id/renders` accepts `templateId` + `templateVariables`
  - Merge template style/defaults with request overrides
  - Validate all required variables provided
  - Return 400 `INVALID_TEMPLATE_VARIABLES` if invalid

### Variable Substitution
```typescript
// Template style: { "textColor": "{{accentColor}}", "fontSize": "{{fontSize}}" }
// Variables: { accentColor: "#FF0055", fontSize: 72 }
// Result: { textColor: "#FF0055", fontSize: 72 }
```

---

## TICKET-6: Automation Engine Core
**Priority:** P2 | **Estimate:** 8h | **Status:** Ready

### Description
Build the automation system for trigger-based workflows.

### Acceptance Criteria
- [ ] Create `automations` table:
  - `id`, `project_id`, `name`, `description`, `enabled`
  - `trigger` (JSONB — trigger config)
  - `actions` (JSONB[] — action chain)
  - `runs` stats (JSONB)
  - `created_at`, `updated_at`
- [ ] Create `automation_runs` table:
  - `id`, `automation_id`, `project_id`
  - `status` (running, completed, failed)
  - `triggered_at`, `completed_at`
  - `input`, `output`, `error` (JSONB)
- [ ] Trigger types:
  - `webhook` — unique endpoint per automation
  - `schedule` — cron expression (use node-cron/bree)
  - `asset_upload` — fired on asset status=ready
- [ ] Action types:
  - `render` — submit render job with template
  - `webhook` — HTTP call to external service
- [ ] Action chaining with variable passing:
  - `{{trigger.assetId}}`, `{{actions.0.output.url}}`
- [ ] Automation endpoints:
  - `POST /api/v1/projects/:id/automations`
  - `GET /api/v1/projects/:id/automations`
  - `GET /api/v1/projects/:id/automations/:aid`
  - `PATCH /api/v1/projects/:id/automations/:aid`
  - `DELETE /api/v1/projects/:id/automations/:aid`
  - `POST /api/v1/projects/:id/automations/:aid/run` (manual trigger)
  - `GET /api/v1/projects/:id/automations/:aid/runs`
- [ ] Webhook trigger endpoints:
  - `POST /webhooks/automations/:endpoint` (public, verifies secret)

### Variable Context
```typescript
interface AutomationContext {
  trigger: { type: string; [key: string]: unknown };
  actions: Array<{ output: unknown }>;
  project: { id: string; settings: unknown };
}
// Access via: {{trigger.assetId}}, {{actions.0.output.renderJobId}}
```

---

## TICKET-7: Project-Scoped Render Jobs
**Priority:** P1 | **Estimate:** 3h | **Status:** Ready

### Description
Extend existing render API to be project-scoped with quota tracking.

### Acceptance Criteria
- [ ] Add `project_id` column to `render_jobs` table
- [ ] Update `POST /api/v1/projects/:id/renders`:
  - Accept `templateId` + `templateVariables` (optional)
  - Resolve template and merge settings
  - Support `video.type: 'asset'` with `assetId`
  - Validate asset belongs to project
- [ ] Update `GET /api/v1/projects/:id/renders/:jobId`:
  - Verify job belongs to project
- [ ] Quota tracking:
  - Increment `renderMinutesUsed` on completion
  - Check `renderQuotaMinutes` before accepting job
  - Return 429 `PROJECT_QUOTA_EXCEEDED` if over quota
- [ ] Usage aggregation job:
  - Daily recalculation of project usage stats
  - Storage sum, render count, total minutes

### Migration Path
- Existing renders: set `project_id` to default project
- Deprecate old endpoints with sunset header

---

## TICKET-8: Platform API SDK (TypeScript)
**Priority:** P2 | **Estimate:** 4h | **Status:** Ready

### Description
Generate TypeScript SDK for platform API consumers.

### Acceptance Criteria
- [ ] Export all types from `platform-contract.ts`:
  - `Project`, `Asset`, `Template`, `Automation`
  - Request/response types for all endpoints
- [ ] Create `RenderowlClient` class:
  ```typescript
  const client = new RenderowlClient({
    apiKey: 'rk_live_...',
    baseUrl: 'https://api.renderowl.com'
  });
  
  const project = await client.projects.create({ slug: '...', name: '...' });
  const render = await client.renders.submit(project.id, { ... });
  ```
- [ ] Auto-generated OpenAPI spec from Zod schemas
  - Use `zod-to-openapi` or similar
- [ ] Error handling with typed error codes
- [ ] Pagination helper for list endpoints

---

## TICKET-9: Webhook Security HMAC
**Priority:** P1 | **Estimate:** 2h | **Status:** Ready

### Description
Implement proper HMAC-SHA256 webhook signature verification.

### Acceptance Criteria
- [ ] Update webhook signing:
  - Sign payload with project webhook secret
  - Include timestamp in signature
  - Format: `t={timestamp},v1={hmac}`
- [ ] Verification helper function:
  ```typescript
  function verifyWebhook(payload: string, signature: string, secret: string): boolean
  ```
- [ ] SDK includes verification helper
- [ ] Documentation with examples (Node, Python, PHP)

---

## TICKET-10: Platform API Documentation Portal
**Priority:** P3 | **Estimate:** 3h | **Status:** Ready

### Description
Deploy interactive API documentation.

### Acceptance Criteria
- [ ] Set up Swagger UI or Scalar at `/docs`
- [ ] Import OpenAPI spec from TICKET-8
- [ ] Include authentication flow documentation
- [ ] Add code examples (curl, Node, Python)
- [ ] Deploy to `docs.renderowl.com`

---

## Implementation Order

**Phase 1 (Foundation):**
1. TICKET-1: Database schema
2. TICKET-2: Auth middleware
3. TICKET-3: Projects API

**Phase 2 (Core Features):**
4. TICKET-4: Asset upload flow
5. TICKET-5: Template system
6. TICKET-7: Project-scoped renders

**Phase 3 (Automation):**
7. TICKET-6: Automation engine
8. TICKET-9: Webhook security

**Phase 4 (Developer Experience):**
9. TICKET-8: TypeScript SDK
10. TICKET-10: Documentation portal
