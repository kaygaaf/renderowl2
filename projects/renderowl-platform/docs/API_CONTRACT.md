# Renderowl Platform API Contract

**Version:** 0.1.0-alpha  
**Date:** 2026-02-25  
**Status:** Design Phase

## Overview

The Renderowl Platform API is the orchestration layer that manages video rendering workflows at scale. It sits above the `renderowl-remotion` renderer (and future render engines) to provide:

- **Multi-tenant project organization**
- **Asset management** (videos, fonts, templates, brand kits)
- **Render job orchestration** with queue management
- **Automation workflows** (webhooks, scheduled jobs, template-based generation)
- **Usage tracking & billing**

---

## Resource Hierarchy

```
Organization
├── Projects
│   ├── Assets (videos, fonts, templates, brand-kits)
│   ├── Render Jobs
│   └── Automations
├── API Keys
├── Webhooks
└── Usage Quotas
```

---

## Core Resources

### 1. Projects

Projects are isolated workspaces for organizing assets and renders.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Project identifier |
| `organizationId` | UUID | Parent organization |
| `name` | string | Human-readable name |
| `slug` | string | URL-friendly identifier |
| `settings` | ProjectSettings | Default render settings |
| `webhookUrl` | string? | Global webhook endpoint |
| `createdAt` | ISO8601 | Creation timestamp |
| `updatedAt` | ISO8601 | Last update timestamp |

### 2. Assets

Assets are reusable resources within a project.

**Asset Types:**
- `video` — Source video files
- `font` — Custom fonts for rendering
- `template` — Remotion/template compositions
- `brand-kit` — Colors, logos, typography presets
- `caption-style` — Saved caption styling presets

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Asset identifier |
| `projectId` | UUID | Parent project |
| `type` | AssetType | Asset category |
| `name` | string | Display name |
| `metadata` | object | Type-specific metadata |
| `storage` | StorageInfo | File storage details |
| `tags` | string[] | Searchable tags |
| `createdAt` | ISO8601 | Creation timestamp |

### 3. Render Jobs

Render jobs represent a video rendering task from submission to completion.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Job identifier |
| `projectId` | UUID | Parent project |
| `status` | JobStatus | `pending` → `queued` → `processing` → `completed`/`failed` |
| `engine` | RenderEngine | `remotion`, `ffmpeg`, `future-engine` |
| `input` | RenderInput | Job configuration (references assets) |
| `output` | RenderOutput | Result details |
| `progress` | JobProgress | Real-time progress tracking |
| `webhook` | WebhookConfig? | Job-specific webhook overrides |
| `cost` | CostInfo | Render cost tracking |
| `createdAt` | ISO8601 | Submission time |
| `startedAt` | ISO8601? | Processing start time |
| `completedAt` | ISO8601? | Completion time |

### 4. Automations

Automations define trigger-based workflows for recurring renders.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Automation identifier |
| `projectId` | UUID | Parent project |
| `name` | string | Display name |
| `enabled` | boolean | Active state |
| `trigger` | TriggerConfig | What triggers this automation |
| `template` | TemplateRef | Asset reference for template |
| `mappings` | DataMapping[] | How trigger data maps to template inputs |
| `output` | OutputConfig | Where to save results |
| `createdAt` | ISO8601 | Creation timestamp |

**Trigger Types:**
- `webhook` — HTTP POST triggers automation
- `schedule` — Cron-based recurring renders
- `asset-upload` — Triggered when new asset uploaded
- `render-complete` — Chain reactions (post-processing)

---

## API Endpoints

### Projects

```
GET    /v1/projects                    # List projects
POST   /v1/projects                    # Create project
GET    /v1/projects/{id}               # Get project
PATCH  /v1/projects/{id}               # Update project
DELETE /v1/projects/{id}               # Delete project (soft)
GET    /v1/projects/{id}/usage         # Get usage stats
```

### Assets

```
GET    /v1/projects/{id}/assets        # List assets
POST   /v1/projects/{id}/assets        # Create asset (upload URL)
GET    /v1/assets/{id}                 # Get asset
PATCH  /v1/assets/{id}                 # Update asset metadata
DELETE /v1/assets/{id}                 # Delete asset
POST   /v1/assets/{id}/upload-complete # Confirm upload complete
```

### Renders

```
GET    /v1/projects/{id}/renders       # List renders
POST   /v1/projects/{id}/renders       # Submit render job
GET    /v1/renders/{id}                # Get render status
DELETE /v1/renders/{id}                # Cancel render (if pending)
GET    /v1/renders/{id}/logs           # Get render logs
POST   /v1/renders/{id}/retry          # Retry failed render
```

### Automations

```
GET    /v1/projects/{id}/automations   # List automations
POST   /v1/projects/{id}/automations   # Create automation
GET    /v1/automations/{id}            # Get automation
PATCH  /v1/automations/{id}            # Update automation
DELETE /v1/automations/{id}            # Delete automation
POST   /v1/automations/{id}/trigger    # Manual trigger
POST   /v1/automations/{id}/toggle     # Enable/disable
GET    /v1/automations/{id}/runs       # Get run history
```

### Webhooks (Org-level)

```
GET    /v1/webhooks                    # List webhooks
POST   /v1/webhooks                    # Register webhook
DELETE /v1/webhooks/{id}               # Remove webhook
POST   /v1/webhooks/{id}/test          # Send test event
```

---

## Authentication

**API Key Authentication:**
```
Authorization: Bearer rwl_live_xxxxxxxxxxxxxxxx
```

**Header Requirements:**
- `X-Renderowl-Version: 2024-02-25`
- `Content-Type: application/json`

---

## Rate Limits

| Tier | Requests/min | Concurrent Renders |
|------|-------------|-------------------|
| Free | 60 | 2 |
| Pro | 600 | 10 |
| Enterprise | Custom | Custom |

Rate limit headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Webhook Events

```json
{
  "id": "evt_xxxxxxxx",
  "type": "render.completed",
  "created": 1708876800,
  "data": {
    "renderId": "rnd_xxxxxxxx",
    "projectId": "prj_xxxxxxxx",
    "status": "completed",
    "outputUrl": "https://storage.renderowl.com/..."
  }
}
```

**Event Types:**
- `render.queued`
- `render.started`
- `render.progress`
- `render.completed`
- `render.failed`
- `render.cancelled`
- `asset.uploaded`
- `automation.triggered`
- `quota.warning`

---

## Error Format

```json
{
  "error": {
    "code": "insufficient_quota",
    "message": "Monthly render quota exceeded",
    "param": null,
    "type": "quota_error"
  }
}
```

**Error Codes:**
- `invalid_request` — Malformed request
- `authentication_error` — Invalid API key
- `not_found` — Resource doesn't exist
- `rate_limit_exceeded` — Too many requests
- `insufficient_quota` — Render quota exceeded
- `render_engine_error` — Renderer failed
- `validation_error` — Schema validation failed
