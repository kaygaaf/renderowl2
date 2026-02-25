# Renderowl Platform API Surface

## Overview

This document defines the complete platform API surface for Renderowl — a multi-tenant video rendering platform with project isolation, asset management, reusable templates, and automation workflows.

## API Structure

```
/api/v1/
├── projects                    # Multi-tenant project management
│   ├── POST   /projects                    # Create project
│   ├── GET    /projects                    # List projects
│   ├── GET    /projects/:id                # Get project
│   ├── PATCH  /projects/:id                # Update project
│   ├── DELETE /projects/:id                # Archive project
│   ├── POST   /projects/:id/api-keys       # Create API key
│   ├── GET    /projects/:id/api-keys       # List API keys
│   └── DELETE /projects/:id/api-keys/:keyId # Revoke API key
│
├── assets                      # Asset library per project
│   ├── POST   /projects/:id/assets         # Create asset (get upload URL)
│   ├── GET    /projects/:id/assets         # List assets
│   ├── GET    /projects/:id/assets/:assetId # Get asset
│   ├── PATCH  /projects/:id/assets/:assetId # Update asset metadata
│   └── DELETE /projects/:id/assets/:assetId # Delete asset
│
├── templates                   # Reusable caption styles/compositions
│   ├── POST   /projects/:id/templates      # Create template
│   ├── GET    /projects/:id/templates      # List templates
│   ├── GET    /projects/:id/templates/:tid # Get template
│   ├── PATCH  /projects/:id/templates/:tid # Update template
│   └── DELETE /projects/:id/templates/:tid # Delete template
│
├── automations                 # Workflow automation
│   ├── POST   /projects/:id/automations    # Create automation
│   ├── GET    /projects/:id/automations    # List automations
│   ├── GET    /projects/:id/automations/:aid     # Get automation
│   ├── PATCH  /projects/:id/automations/:aid     # Update automation
│   ├── DELETE /projects/:id/automations/:aid     # Delete automation
│   ├── POST   /projects/:id/automations/:aid/run # Trigger manually
│   └── GET    /projects/:id/automations/:aid/runs # List run history
│
└── renders                     # Enhanced render jobs (project-scoped)
    ├── POST   /projects/:id/renders        # Submit render
    └── GET    /projects/:id/renders/:jobId # Get render status
```

## Authentication

All platform endpoints require API key authentication via Bearer token:

```
Authorization: Bearer rk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

API keys are scoped per-project with granular permissions:
- `renders:read` - View render jobs
- `renders:write` - Submit render jobs
- `assets:read` - View assets
- `assets:write` - Upload/manage assets
- `webhooks` - Configure webhooks
- `admin` - Full project access

## Projects API

### Create Project
```http
POST /api/v1/projects
Content-Type: application/json
Authorization: Bearer {master_key}

{
  "slug": "my-company",
  "name": "My Company",
  "description": "Main production project",
  "settings": {
    "defaultRenderSettings": {
      "width": 1080,
      "height": 1920,
      "fps": 30,
      "maxDurationSeconds": 300
    },
    "storageQuotaGb": 50,
    "renderQuotaMinutes": 5000
  }
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "my-company",
  "name": "My Company",
  "status": "active",
  "settings": { ... },
  "apiKeys": [],
  "usage": {
    "storageUsedBytes": 0,
    "rendersCompleted": 0,
    "renderMinutesUsed": 0
  },
  "createdAt": "2026-02-25T04:00:00Z",
  "updatedAt": "2026-02-25T04:00:00Z"
}
```

### Create API Key
```http
POST /api/v1/projects/:id/api-keys
Content-Type: application/json
Authorization: Bearer {master_key}

{
  "name": "Production Server",
  "scopes": ["renders:write", "assets:read"],
  "rateLimitRpm": 200
}
```

**Response (201 Created):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Production Server",
  "key": "rk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "keyPrefix": "rk_live_xxxxxxxx",
  "scopes": ["renders:write", "assets:read"],
  "createdAt": "2026-02-25T04:00:00Z"
}
```

⚠️ **The full key is shown ONLY once on creation.** Store it securely.

## Assets API

### Create Asset (Initiate Upload)
```http
POST /api/v1/projects/:id/assets
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "name": "Background Video - Beach Sunset",
  "type": "video",
  "sizeBytes": 15728640,
  "mimeType": "video/mp4",
  "tags": ["background", "nature"]
}
```

**Response (201 Created):**
```json
{
  "asset": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "video",
    "name": "Background Video - Beach Sunset",
    "status": "uploading",
    "sizeBytes": 15728640,
    "mimeType": "video/mp4",
    "urls": {
      "original": "https://assets.renderowl.com/..."
    },
    "tags": ["background", "nature"],
    "createdAt": "2026-02-25T04:00:00Z",
    "updatedAt": "2026-02-25T04:00:00Z"
  },
  "uploadUrl": "https://storage.renderowl.com/presigned/...",
  "uploadExpiresAt": "2026-02-25T04:15:00Z"
}
```

Upload the file directly to `uploadUrl` via PUT, then the asset will be processed.

### List Assets
```http
GET /api/v1/projects/:id/assets?type=video&limit=20&cursor=xxx
Authorization: Bearer {api_key}
```

**Response (200 OK):**
```json
{
  "data": [ ... ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJpZCI6I...",
    "total": 156
  }
}
```

## Templates API

### Create Template
```http
POST /api/v1/projects/:id/templates
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "name": "Viral Shorts Style",
  "description": "High-contrast captions for short-form content",
  "style": {
    "fontFamily": "Inter, system-ui, sans-serif",
    "fontSize": 72,
    "textColor": "#FFFFFF",
    "highlightColor": "#FF0055",
    "highlightMode": "pill",
    "strokeWidth": 12,
    "bottomOffset": 180
  },
  "variables": [
    {
      "key": "accentColor",
      "type": "color",
      "label": "Accent Color",
      "default": "#FF0055"
    },
    {
      "key": "fontSize",
      "type": "number",
      "label": "Font Size",
      "default": 72
    }
  ]
}
```

### Use Template in Render
```http
POST /api/v1/projects/:id/renders
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "templateId": "880e8400-e29b-41d4-a716-446655440003",
  "templateVariables": {
    "accentColor": "#00FF88",
    "fontSize": 64
  },
  "captions": [ ... ],
  "video": {
    "type": "asset",
    "assetId": "770e8400-e29b-41d4-a716-446655440002"
  },
  "output": {
    "format": "mp4"
  }
}
```

## Automations API

### Create Automation (Webhook Trigger)
```http
POST /api/v1/projects/:id/automations
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "name": "Auto-render on Upload",
  "description": "Automatically render captions when a video is uploaded",
  "trigger": {
    "type": "asset_upload",
    "assetTypes": ["video"]
  },
  "actions": [
    {
      "type": "render",
      "templateId": "880e8400-e29b-41d4-a716-446655440003",
      "variableMapping": {
        "videoAsset": "{{trigger.assetId}}",
        "captionText": "{{trigger.metadata.filename}}"
      }
    },
    {
      "type": "webhook",
      "url": "https://my-app.com/webhooks/render-complete",
      "method": "POST"
    }
  ]
}
```

### Create Automation (Scheduled)
```http
POST /api/v1/projects/:id/automations
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "name": "Daily News Render",
  "trigger": {
    "type": "schedule",
    "cron": "0 9 * * *"
  },
  "actions": [
    {
      "type": "webhook",
      "url": "https://my-app.com/api/fetch-news",
      "method": "GET"
    },
    {
      "type": "render",
      "templateId": "990e8400-e29b-41d4-a716-446655440004",
      "variableMapping": {
        "headlines": "{{actions.0.response.headlines}}"
      }
    }
  ]
}
```

### Trigger Automation Manually
```http
POST /api/v1/projects/:id/automations/:aid/run
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "variables": {
    "customData": "value"
  }
}
```

## Error Responses

All errors follow this structure:

```json
{
  "error": {
    "code": "PROJECT_QUOTA_EXCEEDED",
    "message": "Storage quota exceeded (10.5 GB / 10 GB)",
    "details": {
      "quotaGb": 10,
      "usedGb": 10.5
    }
  }
}
```

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `PROJECT_NOT_FOUND` | 404 | Project does not exist |
| `PROJECT_SLUG_EXISTS` | 409 | Slug already in use |
| `PROJECT_QUOTA_EXCEEDED` | 429 | Storage/render quota exceeded |
| `ASSET_NOT_FOUND` | 404 | Asset does not exist |
| `ASSET_QUOTA_EXCEEDED` | 429 | Storage quota exceeded |
| `TEMPLATE_NOT_FOUND` | 404 | Template does not exist |
| `AUTOMATION_NOT_FOUND` | 404 | Automation does not exist |
| `INVALID_TEMPLATE_VARIABLES` | 400 | Missing or invalid variables |
| `API_KEY_REVOKED` | 401 | API key has been revoked |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `UNAUTHORIZED_SCOPE` | 403 | API key lacks required scope |

## Rate Limiting

Rate limits are enforced per API key:

- Default: 100 requests/minute
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Pagination

List endpoints use cursor-based pagination:

```http
GET /api/v1/projects/:id/assets?limit=20&cursor=eyJpZCI6I...
```

Response includes:
- `data`: Array of items
- `pagination.hasMore`: Boolean
- `pagination.nextCursor`: Opaque cursor for next page
- `pagination.total`: Total count (if available)

## Webhooks

Project-level webhooks can be configured to receive all events:

```http
PATCH /api/v1/projects/:id
{
  "settings": {
    "webhookDefaults": {
      "url": "https://my-app.com/webhooks/renderowl",
      "secret": "whsec_xxxxxxxx",
      "events": ["completed", "failed"]
    }
  }
}
```

Signature verification:
```
X-Renderowl-Signature: sha256=<hmac>
X-Renderowl-Timestamp: 1708857600
X-Renderowl-Event: render.completed
```

## SDK Support

Platform API types are exported for TypeScript:

```typescript
import {
  Project,
  Asset,
  Template,
  Automation,
  CreateProjectRequest,
  CreateAssetResponse
} from '@renderowl/platform-api';
```
