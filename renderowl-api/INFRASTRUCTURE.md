# RenderOwl Automation & API Infrastructure

This document describes the complete automation and API infrastructure built for RenderOwl.

## Table of Contents

1. [Webhook System](#webhook-system)
2. [API Improvements](#api-improvements)
3. [Integrations Framework](#integrations-framework)
4. [Template System](#template-system)
5. [API Usage Examples](#api-usage-examples)

---

## Webhook System

The webhook system allows users to receive real-time notifications about events in their RenderOwl account.

### Events Supported

- `video.created` - New video created
- `video.completed` - Video rendering completed successfully
- `video.failed` - Video rendering failed
- `credits.low` - Credit balance below threshold
- `credits.purchased` - Credits purchased
- `automation.triggered` - Automation executed
- `automation.failed` - Automation failed
- `render.started` - Render job started
- `render.completed` - Render job completed
- `render.failed` - Render job failed

### Webhook Endpoints

```
GET  /v1/webhooks              - List webhooks
POST /v1/webhooks              - Create webhook
GET  /v1/webhooks/:id          - Get webhook details
PATCH /v1/webhooks/:id         - Update webhook
DELETE /v1/webhooks/:id        - Delete webhook
GET  /v1/webhooks/:id/deliveries - List delivery history
POST /v1/webhooks/:id/test     - Send test event
POST /v1/webhooks/:id/regenerate-secret - Rotate secret
GET  /v1/webhooks/events       - List available events
```

### Creating a Webhook

```bash
curl -X POST https://api.renderowl.com/v1/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/renderowl",
    "events": ["video.completed", "video.failed"],
    "description": "Production webhook",
    "max_retries": 5
  }'
```

### Webhook Payload Structure

```json
{
  "event": "video.completed",
  "timestamp": "2025-02-26T10:30:00Z",
  "webhookId": "wh_abc123",
  "data": {
    "videoId": "vid_xyz789",
    "projectId": "proj_def456",
    "title": "My Video",
    "status": "completed",
    "duration": 60,
    "resolution": "1080x1920",
    "fileSize": 15240000,
    "url": "https://cdn.renderowl.com/videos/vid_xyz789.mp4",
    "completedAt": "2025-02-26T10:30:00Z"
  }
}
```

### Signature Verification

Webhooks are signed with HMAC-SHA256 for security:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// In your webhook handler:
const signature = req.headers['x-webhook-signature'];
const payload = req.body;
if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
  return res.status(401).send('Invalid signature');
}
```

---

## API Improvements

### Rate Limiting

All API endpoints are rate-limited with clear headers:

| Tier | API Key Requests/min | Authenticated Requests/min |
|------|---------------------|---------------------------|
| Free | 100 | 30 |
| Starter | 1,000 | 100 |
| Creator | 5,000 | 500 |
| Pro | 20,000 | 2,000 |
| Enterprise | 100,000 | 10,000 |

**Rate Limit Headers:**
- `X-RateLimit-Limit` - Maximum requests per window
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Unix timestamp when window resets
- `Retry-After` - Seconds to wait (on 429 response)

### API Key Management

Create API keys with granular scopes:

```bash
# Create API key
curl -X POST https://api.renderowl.com/v1/user/api-keys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Production API Key",
    "scopes": ["videos:read", "videos:write", "renders:write"],
    "expires_in_days": 90
  }'

# Response:
{
  "api_key": {
    "id": "ak_abc123",
    "name": "Production API Key",
    "key_preview": "ro_live_***",
    "scopes": ["videos:read", "videos:write", "renders:write"],
    "status": "active",
    "created_at": "2025-02-26T10:00:00Z"
  },
  "key": "ro_live_a1b2c3d4e5f6...",  // ONLY SHOWN ONCE
  "warning": "This is the only time the full API key will be shown."
}
```

**Available Scopes:**
- `videos:read`, `videos:write`, `videos:delete`
- `renders:read`, `renders:write`, `renders:delete`
- `projects:read`, `projects:write`, `projects:delete`
- `assets:read`, `assets:write`, `assets:delete`
- `automations:read`, `automations:write`, `automations:trigger`
- `webhooks:read`, `webhooks:write`
- `credits:read`
- `user:read`
- `batch:execute`

**Scope Templates:**
- `read-only` - Read access to all resources
- `video-renderer` - Create renders and manage videos
- `automation-manager` - Manage automations
- `webhook-manager` - Configure webhooks
- `full-access` - All permissions

### Batch Operations

Execute multiple API calls in a single request:

```bash
curl -X POST https://api.renderowl.com/v1/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "operations": [
      {
        "id": "get-project",
        "method": "GET",
        "path": "/projects/proj_123"
      },
      {
        "id": "create-render",
        "method": "POST",
        "path": "/projects/proj_123/renders",
        "body": {
          "template_id": "tmpl_abc",
          "variables": {"title": "Hello"}
        }
      },
      {
        "id": "list-assets",
        "method": "GET",
        "path": "/projects/proj_123/assets",
        "query": {"limit": 10}
      }
    ],
    "stop_on_error": false
  }'
```

**Response:**
```json
{
  "batch_id": "batch_xyz789",
  "completed": true,
  "completed_count": 3,
  "failed_count": 0,
  "total_count": 3,
  "duration_ms": 245,
  "results": [
    {
      "id": "get-project",
      "status": 200,
      "body": { "id": "proj_123", "name": "My Project" },
      "duration_ms": 45
    },
    {
      "id": "create-render",
      "status": 202,
      "body": { "id": "rnd_456", "status": "queued" },
      "duration_ms": 120
    },
    {
      "id": "list-assets",
      "status": 200,
      "body": { "data": [...] },
      "duration_ms": 80
    }
  ]
}
```

### API Documentation

- **Swagger UI**: `https://api.renderowl.com/docs`
- **OpenAPI Spec**: `https://api.renderowl.com/docs/openapi.json`
- **Postman Collection**: `https://api.renderowl.com/docs/postman`

---

## Integrations Framework

### YouTube Upload Integration

Connect your YouTube channel for automatic uploads:

```bash
# 1. Get OAuth URL
GET /v1/youtube/auth

# 2. After OAuth callback, check connection
GET /v1/youtube/connection

# 3. Queue video upload
POST /v1/youtube/uploads \
  -d '{
    "video_id": "vid_abc123",
    "project_id": "proj_def456",
    "render_id": "rnd_xyz789",
    "title": "My Awesome Video",
    "description": "Created with RenderOwl",
    "tags": ["video", "content"],
    "privacy_status": "public",
    "category_id": "22",
    "schedule_at": "2025-02-27T09:00:00Z"
  }'
```

### Zapier/Make.com Integration

Simplified endpoints for no-code platforms:

```bash
# Quick render trigger
POST /v1/integrations/trigger-render \
  -d '{
    "project_id": "proj_123",
    "template_id": "tmpl_abc",
    "variables": {"title": "Dynamic Title"},
    "webhook_url": "https://hooks.zapier.com/..."
  }'

# Schedule render for later
POST /v1/integrations/schedule-render \
  -d '{
    "project_id": "proj_123",
    "template_id": "tmpl_abc",
    "schedule_at": "2025-03-01T10:00:00Z",
    "timezone": "America/New_York"
  }'

# Data mapping helper
POST /v1/integrations/map-data \
  -d '{
    "source_data": {"firstName": "John", "lastName": "Doe"},
    "mapping_rules": [
      {"source_field": "firstName", "target_field": "name", "transform": "uppercase"},
      {"source_field": "lastName", "target_field": "surname"}
    ]
  }'

# Subscribe to webhooks
POST /v1/integrations/subscribe \
  -d '{
    "target_url": "https://hooks.zapier.com/...",
    "events": ["video.completed"]
  }'
```

### RSS Feed Ingestion

Automatically generate videos from RSS feeds:

```bash
# Create RSS feed subscription
POST /v1/rss \
  -d '{
    "name": "Blog to Video",
    "url": "https://myblog.com/feed.xml",
    "project_id": "proj_123",
    "template_id": "tmpl_news",
    "check_interval_minutes": 60
  }'

# List feed items
GET /v1/rss/:id/items?processed=false

# Check feed manually
POST /v1/rss/:id/check
```

**Auto-generation flow:**
1. RSS feed is checked every N minutes
2. New items are detected by GUID
3. Items are stored for processing
4. Background worker generates videos from templates
5. Optional: Auto-upload to YouTube

---

## Template System

### Creating Templates

Save any video configuration as a reusable template:

```bash
# Create template from composition
POST /v1/templates \
  -d '{
    "name": "News Intro",
    "description": "Professional news intro template",
    "category": "News",
    "tags": ["intro", "news", "professional"],
    "composition": {
      "scenes": [...],
      "transitions": [...],
      "audio": {...}
    },
    "variables_schema": {
      "headline": {"type": "string", "required": true, "maxLength": 100},
      "subheadline": {"type": "string", "maxLength": 200},
      "background_color": {"type": "color", "default": "#1a1a1a"}
    },
    "default_variables": {
      "background_color": "#1a1a1a"
    },
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "duration_seconds": 15
  }'
```

### Publishing to Marketplace

```bash
# Publish template (make it public)
PATCH /v1/templates/:id \
  -d '{
    "status": "published",
    "visibility": "community"
  }'

# List in marketplace with price
POST /v1/templates/:id/list \
  -d '{
    "price_credits": 500,
    "price_usd": 4.99
  }'
```

### Browsing Marketplace

```bash
# Browse all templates
GET /v1/templates/marketplace/browse?sort_by=popular

# Featured templates
GET /v1/templates/marketplace/featured

# Filter by category
GET /v1/templates/marketplace/browse?category=News

# Search
GET /v1/templates/marketplace/browse?search=intro

# Price range
GET /v1/templates/marketplace/browse?min_price=0&max_price=1000

# Get categories
GET /v1/templates/marketplace/categories
```

### Reviews and Ratings

```bash
# Add review
POST /v1/templates/:id/reviews \
  -d '{
    "rating": 5,
    "review": "Great template, easy to customize!"
  }'

# Get reviews
GET /v1/templates/:id/reviews
```

---

## API Usage Examples

### Complete Workflow: Render to YouTube

```bash
#!/bin/bash

# 1. Check credit balance
curl https://api.renderowl.com/v1/credits/balance \
  -H "Authorization: Bearer $TOKEN"

# 2. Calculate render cost
curl -X POST https://api.renderowl.com/v1/credits/calculate-cost \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "video_type": "custom",
    "scene_count": 5,
    "include_voiceover": true
  }'

# 3. Create render from template
curl -X POST https://api.renderowl.com/v1/projects/$PROJECT/renders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "template_id": "tmpl_news",
    "variables": {
      "headline": "Breaking News",
      "subheadline": "RenderOwl Launches New API"
    }
  }'

# 4. Poll for completion
curl https://api.renderowl.com/v1/projects/$PROJECT/renders/$RENDER_ID \
  -H "Authorization: Bearer $TOKEN"

# 5. Queue YouTube upload
curl -X POST https://api.renderowl.com/v1/youtube/uploads \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "video_id": "'$VIDEO_ID'",
    "project_id": "'$PROJECT'",
    "render_id": "'$RENDER_ID'",
    "title": "Breaking News: RenderOwl API Launch",
    "privacy_status": "public"
  }'
```

### Automation: RSS to Video to YouTube

```javascript
const { RssService } = require('@renderowl/sdk');

// Set up RSS feed monitoring
const rssService = new RssService();

rssService.on('item:new', async ({ feedId, itemId }) => {
  const item = await rssService.getItem(itemId);
  
  // Create video from RSS item
  const render = await renderowl.renders.create({
    projectId: feed.projectId,
    templateId: feed.templateId,
    variables: {
      title: item.title,
      content: item.description,
      image: item.imageUrl,
    },
  });
  
  // Wait for completion and upload to YouTube
  renderowl.on('render:completed', async ({ renderId, videoId }) => {
    if (renderId === render.id) {
      await renderowl.youtube.upload({
        videoId,
        title: item.title,
        description: `${item.description}\n\nRead more: ${item.link}`,
        privacyStatus: 'public',
      });
    }
  });
});
```

### Webhook Handler Example (Express)

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

app.post('/webhooks/renderowl', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  
  // Verify signature
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
    
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(payload);
  
  switch (event.event) {
    case 'video.completed':
      // Send notification to user
      notifyUser(event.data);
      break;
      
    case 'credits.low':
      // Send email about low credits
      sendLowCreditsEmail(event.data);
      break;
      
    case 'render.failed':
      // Alert engineering team
      alertOpsTeam(event.data);
      break;
  }
  
  res.status(200).send('OK');
});
```

---

## Environment Variables

```bash
# Webhook Service
WEBHOOK_DB_PATH=./data/webhooks.db

# Rate Limiting
RATELIMIT_DB_PATH=./data/ratelimit.db

# API Keys
APIKEY_DB_PATH=./data/apikeys.db

# YouTube Integration
YOUTUBE_DB_PATH=./data/youtube.db
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=https://api.renderowl.com/v1/youtube/callback

# RSS Feeds
RSS_DB_PATH=./data/rss.db

# Templates
TEMPLATE_DB_PATH=./data/templates.db

# General
API_BASE_URL=https://api.renderowl.com
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=https://app.renderowl.com
```

---

## Implementation Status

| Component | Status | Files |
|-----------|--------|-------|
| **Webhook System** | ✅ Ready | `lib/webhooks/*`, `routes/webhooks.ts` |
| **Rate Limiting** | ✅ Ready | `lib/ratelimit/index.ts` |
| **API Keys** | ✅ Ready | `lib/apikeys/index.ts`, `routes/apikeys.ts` |
| **Batch Operations** | ✅ Ready | `routes/batch.ts` |
| **API Documentation** | ✅ Ready | `routes/docs.ts` |
| **YouTube Integration** | ✅ Ready | `routes/youtube.ts` |
| **Zapier/Make Support** | ✅ Ready | `routes/integrations.ts` |
| **RSS Ingestion** | ✅ Ready | `routes/rss.ts` |
| **Template System** | ✅ Ready | `routes/templates.ts` |
| **Marketplace** | ✅ Ready | Part of `routes/templates.ts` |

---

## Next Steps

1. **Mount Routes**: Ensure all new routes are registered in `server.ts`
2. **Database Setup**: Run the schema creation for each service
3. **Environment**: Configure all required environment variables
4. **YouTube OAuth**: Set up Google Cloud Console OAuth credentials
5. **Testing**: Test each integration end-to-end
6. **Documentation**: Deploy Swagger UI for interactive docs

---

## Support

For questions or issues with the API infrastructure:

- Documentation: https://docs.renderowl.com
- API Status: https://api.renderowl.com/health
- Support: support@renderowl.com
