# Renderowl API Implementation Tickets

## Ticket 1: Projects API ✅ COMPLETED
**Status:** Done by Product/API Subagent  
**Location:** `/renderowl-api/routes/projects.ts`

### Deliverables
- [x] Zod schemas for Project CRUD operations
- [x] Fastify route handlers (list, create, get, update, delete)
- [x] Response validation with proper error handling
- [x] RFC 7807 Problem Details error format
- [x] In-memory store (ready for DB swap)

### Endpoints Implemented
| Method | Path | Status |
|--------|------|--------|
| GET | /projects | ✅ |
| POST | /projects | ✅ |
| GET | /projects/:id | ✅ |
| PATCH | /projects/:id | ✅ |
| DELETE | /projects/:id | ✅ |

---

## Ticket 2: Assets API ✅ COMPLETED
**Priority:** High  
**Estimated Effort:** 2-3 days  
**Status:** Done by Product/API Subagent  
**Location:** `/renderowl-api/routes/assets.ts`

### Requirements
Implement full Assets API for project file management with presigned upload URLs.

### Acceptance Criteria
- [x] Asset CRUD endpoints with validation
- [x] Presigned URL generation for secure uploads
- [x] Asset type detection from content-type/magic bytes
- [x] Metadata extraction hooks (ready for worker integration)
- [ ] Webhook notification on upload completion (moved to Ticket 4)

### Endpoints Implemented
| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | /projects/:id/assets | ✅ | List assets with pagination + filtering |
| POST | /projects/:id/assets/upload | ✅ | Get presigned upload URL (15-min expiry) |
| GET | /projects/:id/assets/:assetId | ✅ | Get asset details (+ signed URL option) |
| PATCH | /projects/:id/assets/:assetId | ✅ | Update asset metadata (name) |
| DELETE | /projects/:id/assets/:assetId | ✅ | Delete asset |
| POST | /projects/:id/assets/:assetId/upload-complete | ✅ | Confirm upload + trigger processing |
| GET | /projects/:id/assets/:assetId/download | ✅ | Get signed download URL |

### Features Implemented
- **Asset Type Detection:** MIME type + extension-based detection for video, audio, image, subtitle, font
- **Upload Flow:** Create → Presigned URL → Upload → Confirm → Processing → Ready
- **Signed URLs:** 1-hour expiry download URLs (CDN-ready)
- **Response Validation:** All responses validated against Zod schemas
- **RFC 7807 Errors:** Consistent error format across all endpoints

### Technical Notes
- Max file size: 10GB
- Supported types: video, audio, image, subtitle (SRT/VTT/JSON), font
- Use S3/R2 multipart upload for large files
- FFmpeg probe for metadata extraction

---

## Ticket 3: Renders API ✅ COMPLETED
**Priority:** High  
**Estimated Effort:** 3-4 days  
**Status:** Done by Product/API Subagent  
**Location:** `/renderowl-api/routes/renders.ts`

### Requirements
Implement render job lifecycle management with progress tracking.

### Acceptance Criteria
- [x] Render CRUD endpoints (list, create, get, cancel, progress)
- [x] Input props validation against composition schema (CaptionedVideo)
- [x] Job queuing to SQLite-based job queue
- [x] Progress polling via GET /:id/progress
- [x] Output URL generation with 24h expiry
- [x] Webhook endpoint for worker progress updates
- [x] Asset reference extraction from input props

### Endpoints Implemented
| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | /projects/:id/renders | ✅ | List renders with filtering (status, composition_id) |
| POST | /projects/:id/renders | ✅ | Create render job with queue integration |
| GET | /projects/:id/renders/:renderId | ✅ | Get render status + progress |
| POST | /projects/:id/renders/:renderId/cancel | ✅ | Cancel pending/queued render |
| GET | /projects/:id/renders/:renderId/output | ✅ | Get signed download URL (24h expiry) |
| GET | /projects/:id/renders/:renderId/progress | ✅ | Poll for progress updates |
| POST | /v1/renders/webhooks/progress | ✅ | Worker webhook for progress updates |

### Technical Notes
- Queue priorities: urgent > high > normal > low (enforced by JobQueue)
- Progress stored in job stepState (frame updates from workers)
- Output signed URLs expire after 24h (CDN-ready pattern)
- Supports asset:// and https:// input references
- Input validation for CaptionedVideo composition schema
- Idempotency key support via header

---

## Ticket 4: Renders API - WebSocket Progress
**Priority:** Medium  
**Estimated Effort:** 2 days  
**Dependencies:** Renders API Core

### Requirements
Real-time render progress via WebSocket.

### Acceptance Criteria
- [ ] WebSocket endpoint for render subscriptions
- [ ] JWT auth for WebSocket connections
- [ ] Room-based subscriptions (project-level)
- [ ] Automatic reconnection handling
- [ ] Fallback to polling for clients without WS

### Endpoints Required
| Type | Path | Description |
|------|------|-------------|
| WS | /ws/projects/:id/renders | Subscribe to render updates |

### Message Schema
```json
{
  "type": "render.progress",
  "render_id": "rnd_xxx",
  "data": {
    "percent": 45.5,
    "current_frame": 450,
    "total_frames": 990
  }
}
```

---

## Ticket 5: Automations API
**Priority:** Medium  
**Estimated Effort:** 4-5 days  
**Dependencies:** Projects API, Assets API, Renders API

### Requirements
Implement automation system with triggers and actions.

### Acceptance Criteria
- [ ] Automation CRUD endpoints
- [ ] Webhook trigger with HMAC signature validation
- [ ] Schedule trigger with cron expressions
- [ ] Asset upload trigger
- [ ] Template variable substitution in actions
- [ ] Execution history tracking

### Endpoints Required
| Method | Path | Description |
|--------|------|-------------|
| GET | /projects/:id/automations | List automations |
| POST | /projects/:id/automations | Create automation |
| GET | /projects/:id/automations/:autoId | Get automation |
| PATCH | /projects/:id/automations/:autoId | Update automation |
| DELETE | /projects/:id/automations/:autoId | Delete automation |
| POST | /projects/:id/automations/:autoId/trigger | Manual trigger |
| POST | /webhooks/automation/:autoId | Webhook trigger endpoint |

### Technical Notes
- Cron validation using cron-parser
- Template syntax: `{{trigger.video_url}}`
- Execution logs retained for 30 days
- Webhook signatures: HMAC-SHA256 of payload

---

## Ticket 6: API Key Authentication
**Priority:** High  
**Estimated Effort:** 2 days  
**Dependencies:** None

### Requirements
Implement Bearer token authentication for all API endpoints.

### Acceptance Criteria
- [ ] API key generation endpoint
- [ ] Bearer token validation middleware
- [ ] Key scopes (read, write, admin)
- [ ] Key rotation support
- [ ] Usage tracking

### Endpoints Required
| Method | Path | Description |
|--------|------|-------------|
| GET | /keys | List API keys |
| POST | /keys | Create API key |
| DELETE | /keys/:id | Revoke key |

---

## Ticket 7: OpenAPI Spec Generation
**Priority:** Low  
**Estimated Effort:** 1 day  
**Dependencies:** All API tickets complete

### Requirements
Generate OpenAPI 3.1 spec from Zod schemas.

### Acceptance Criteria
- [ ] Convert Zod schemas to OpenAPI components
- [ ] Document all endpoints with examples
- [ ] Generate Swagger UI endpoint
- [ ] Export spec as JSON/YAML

---

## Ticket 8: Rate Limiting
**Priority:** Medium  
**Estimated Effort:** 1-2 days  
**Dependencies:** API Key Authentication

### Requirements
Implement tiered rate limiting per API key.

### Acceptance Criteria
- [ ] Configurable limits per tier (free/pro/enterprise)
- [ ] Redis-backed sliding window
- [ ] 429 responses with Retry-After header
- [ ] Usage headers (X-RateLimit-*) in responses

### Limits (Proposed)
| Tier | Requests/min | Renders/day |
|------|--------------|-------------|
| Free | 60 | 10 |
| Pro | 600 | 100 |
| Enterprise | 6000 | Unlimited |

---

## Database Schema Reference

```sql
-- Projects table
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT NOT NULL,
    asset_count INTEGER DEFAULT 0,
    render_count INTEGER DEFAULT 0
);

-- Assets table
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    content_type TEXT NOT NULL,
    size_bytes BIGINT,
    storage_path TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Renders table
CREATE TABLE renders (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    composition_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    input_props JSONB NOT NULL,
    output_settings JSONB NOT NULL,
    priority TEXT DEFAULT 'normal',
    progress JSONB DEFAULT '{"percent": 0}',
    output JSONB,
    error JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Automations table
CREATE TABLE automations (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    trigger JSONB NOT NULL,
    actions JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0
);
```
