# Renderowl Projects API Specification

## Overview
RESTful API surface for project management, asset handling, and render orchestration. All endpoints use JSON with snake_case keys.

## Base URL
```
https://api.renderowl.com/v1
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <api_key>
```

---

## Endpoints

### Projects

#### List Projects
```http
GET /projects
```

Query Parameters:
- `page` (int, default: 1)
- `per_page` (int, default: 20, max: 100)
- `status` (enum: active, archived, deleted)
- `sort` (enum: created_at, updated_at, name)
- `order` (enum: asc, desc, default: desc)

Response (200):
```json
{
  "data": [ProjectSchema],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

#### Create Project
```http
POST /projects
```

Request Body:
```json
{
  "name": "Summer Campaign 2025",
  "description": "Q3 marketing videos",
  "settings": {
    "default_width": 1080,
    "default_height": 1920,
    "default_fps": 30,
    "default_duration_sec": 60
  }
}
```

Response (201): `ProjectSchema`

#### Get Project
```http
GET /projects/:id
```

Response (200): `ProjectSchema`

#### Update Project
```http
PATCH /projects/:id
```

Request Body: Partial of Create Project

Response (200): `ProjectSchema`

#### Delete Project
```http
DELETE /projects/:id
```

Response (204)

---

### Assets

#### List Assets
```http
GET /projects/:project_id/assets
```

Query Parameters:
- `type` (enum: video, audio, image, subtitle, font, other)
- `status` (enum: pending, processing, ready, error)

Response (200):
```json
{
  "data": [AssetSchema]
}
```

#### Upload Asset (Presigned URL)
```http
POST /projects/:project_id/assets/upload
```

Request Body:
```json
{
  "filename": "intro.mp4",
  "content_type": "video/mp4",
  "size_bytes": 52428800
}
```

Response (200):
```json
{
  "asset": AssetSchema,
  "upload_url": "https://storage.renderowl.com/...",
  "expires_at": "2025-02-25T02:30:00Z"
}
```

#### Get Asset
```http
GET /projects/:project_id/assets/:id
```

Response (200): `AssetSchema`

#### Delete Asset
```http
DELETE /projects/:project_id/assets/:id
```

Response (204)

---

### Renders

#### List Renders
```http
GET /projects/:project_id/renders
```

Query Parameters:
- `status` (enum: pending, queued, rendering, completed, failed, cancelled)
- `composition_id` (string)

Response (200):
```json
{
  "data": [RenderSchema]
}
```

#### Create Render
```http
POST /projects/:project_id/renders
```

Request Body:
```json
{
  "composition_id": "CaptionedVideo",
  "input_props": {
    "videoSrc": "asset://assets/abc123",
    "captions": "asset://assets/xyz789",
    "captionStyle": {
      "fontSize": 64,
      "textColor": "#FFFFFF"
    }
  },
  "output_settings": {
    "format": "mp4",
    "codec": "h264",
    "width": 1080,
    "height": 1920,
    "fps": 30
  },
  "priority": "normal"
}
```

Response (201): `RenderSchema`

#### Get Render
```http
GET /projects/:project_id/renders/:id
```

Response (200): `RenderSchema`

#### Cancel Render
```http
POST /projects/:project_id/renders/:id/cancel
```

Response (200): `RenderSchema`

#### Get Render Output
```http
GET /projects/:project_id/renders/:id/output
```

Response (200):
```json
{
  "download_url": "https://cdn.renderowl.com/renders/...",
  "expires_at": "2025-02-26T01:24:00Z",
  "size_bytes": 15728640,
  "duration_ms": 4523
}
```

---

### Automations

#### List Automations
```http
GET /projects/:project_id/automations
```

Response (200):
```json
{
  "data": [AutomationSchema]
}
```

#### Create Automation
```http
POST /projects/:project_id/automations
```

Request Body:
```json
{
  "name": "Auto-render on S3 upload",
  "trigger": {
    "type": "webhook",
    "config": {
      "secret_header": "X-Webhook-Secret"
    }
  },
  "actions": [
    {
      "type": "render",
      "config": {
        "composition_id": "CaptionedVideo",
        "input_props_template": {
          "videoSrc": "{{trigger.video_url}}",
          "captions": "{{trigger.subtitle_url}}"
        }
      }
    }
  ],
  "enabled": true
}
```

Response (201): `AutomationSchema`

#### Trigger Automation
```http
POST /projects/:project_id/automations/:id/trigger
```

Request Body: Context-specific payload

Response (202): `{ "execution_id": "exec_xxx" }`

---

## Schemas

### ProjectSchema
```typescript
{
  id: string;                    // "proj_abc123xyz"
  name: string;
  description: string | null;
  status: "active" | "archived";
  settings: ProjectSettings;
  created_at: ISO8601;
  updated_at: ISO8601;
  created_by: string;            // User ID
  asset_count: number;
  render_count: number;
}
```

### AssetSchema
```typescript
{
  id: string;                    // "asset_abc123"
  project_id: string;
  name: string;
  type: "video" | "audio" | "image" | "subtitle" | "font" | "other";
  status: "pending" | "processing" | "ready" | "error";
  content_type: string;
  size_bytes: number | null;
  url: string | null;            // Signed URL when ready
  metadata: {
    width?: number;
    height?: number;
    duration_ms?: number;
    codec?: string;
  } | null;
  created_at: ISO8601;
  updated_at: ISO8601;
}
```

### RenderSchema
```typescript
{
  id: string;                    // "rnd_abc123"
  project_id: string;
  composition_id: string;
  status: "pending" | "queued" | "rendering" | "completed" | "failed" | "cancelled";
  input_props: Record<string, unknown>;
  output_settings: OutputSettings;
  priority: "low" | "normal" | "high" | "urgent";
  progress: {
    percent: number;             // 0-100
    current_frame: number;
    total_frames: number;
    estimated_remaining_sec: number | null;
  };
  output: {
    url: string | null;
    size_bytes: number | null;
    duration_ms: number | null;
  } | null;
  error: {
    code: string;
    message: string;
    details: unknown | null;
  } | null;
  created_at: ISO8601;
  started_at: ISO8601 | null;
  completed_at: ISO8601 | null;
}
```

### AutomationSchema
```typescript
{
  id: string;                    // "auto_abc123"
  project_id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  created_at: ISO8601;
  updated_at: ISO8601;
  last_triggered_at: ISO8601 | null;
  trigger_count: number;
}
```

---

## Error Format
All errors follow RFC 7807 (Problem Details):

```json
{
  "type": "https://api.renderowl.com/errors/invalid-request",
  "title": "Invalid Request",
  "status": 400,
  "detail": "The 'name' field is required",
  "instance": "/projects",
  "errors": [
    {
      "field": "name",
      "code": "required",
      "message": "Field is required"
    }
  ]
}
```
