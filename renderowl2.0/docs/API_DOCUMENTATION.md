# 📚 Renderowl 2.0 - API Documentation

Complete API reference for Renderowl 2.0 backend services.

**Base URL:**
- Staging: `https://staging-api.renderowl.com`
- Production: `https://api.renderowl.com`

**API Version:** `v1`

---

## 🔐 Authentication

All API endpoints (except health checks) require authentication via Bearer token.

### Authentication Header

```http
Authorization: Bearer <clerk_jwt_token>
```

### Obtaining a Token

Tokens are obtained through Clerk authentication in the frontend. The token should be included in all API requests.

### Token Validation

```go
// Backend validation middleware
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(401, gin.H{"error": "Missing authorization header"})
            return
        }
        
        token := strings.TrimPrefix(authHeader, "Bearer ")
        // Validate with Clerk...
    }
}
```

---

## 📊 Rate Limits

| Endpoint Type | Rate Limit | Window |
|---------------|------------|--------|
| General API | 100 requests | 1 minute |
| AI Generation | 10 requests | 1 minute |
| File Upload | 50 MB | Per upload |
| Export/Render | 5 requests | 1 minute |
| Social Publish | 20 requests | 1 minute |

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1709102400
```

---

## 🏥 Health & Status

### Check API Health

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-28T04:30:00Z",
  "version": "2.0.0"
}
```

### Check API Status

```http
GET /api/v1/status
```

**Response:**
```json
{
  "status": "operational",
  "services": {
    "database": "connected",
    "redis": "connected",
    "storage": "connected"
  }
}
```

---

## 👤 User Management

### Get Current User

```http
GET /api/v1/user
```

**Response:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar_url": "https://...",
  "credits_balance": 1000,
  "subscription_tier": "pro",
  "created_at": "2026-01-15T10:00:00Z"
}
```

### Update User Profile

```http
PATCH /api/v1/user
Content-Type: application/json

{
  "name": "Jane Doe",
  "avatar_url": "https://..."
}
```

**Response:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "Jane Doe",
  "avatar_url": "https://...",
  "updated_at": "2026-02-28T04:30:00Z"
}
```

---

## 🎬 Timeline Management

### List User Timelines

```http
GET /api/v1/timelines?page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "timeline_123",
      "title": "My Video Project",
      "description": "Product showcase video",
      "status": "draft",
      "duration": 60,
      "resolution": "1920x1080",
      "fps": 30,
      "created_at": "2026-02-20T10:00:00Z",
      "updated_at": "2026-02-27T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

### Create New Timeline

```http
POST /api/v1/timelines
Content-Type: application/json

{
  "title": "New Video Project",
  "description": "Explainer video for our product",
  "duration": 60,
  "resolution": "1920x1080",
  "fps": 30
}
```

**Response:**
```json
{
  "id": "timeline_456",
  "title": "New Video Project",
  "description": "Explainer video for our product",
  "status": "draft",
  "duration": 60,
  "resolution": "1920x1080",
  "fps": 30,
  "created_at": "2026-02-28T04:30:00Z",
  "updated_at": "2026-02-28T04:30:00Z"
}
```

### Get Timeline Details

```http
GET /api/v1/timelines/:id
```

**Response:**
```json
{
  "id": "timeline_456",
  "title": "New Video Project",
  "description": "Explainer video for our product",
  "status": "draft",
  "duration": 60,
  "resolution": "1920x1080",
  "fps": 30,
  "background_color": "#000000",
  "transition_type": "fade",
  "created_at": "2026-02-28T04:30:00Z",
  "updated_at": "2026-02-28T04:30:00Z"
}
```

### Update Timeline

```http
PUT /api/v1/timelines/:id
Content-Type: application/json

{
  "title": "Updated Project Name",
  "description": "Updated description",
  "duration": 90,
  "resolution": "3840x2160",
  "fps": 60
}
```

**Response:**
```json
{
  "id": "timeline_456",
  "title": "Updated Project Name",
  "description": "Updated description",
  "duration": 90,
  "resolution": "3840x2160",
  "fps": 60,
  "updated_at": "2026-02-28T04:35:00Z"
}
```

### Delete Timeline

```http
DELETE /api/v1/timelines/:id
```

**Response:**
```json
{
  "message": "Timeline deleted successfully"
}
```

---

## 🎵 Track Management

### List Timeline Tracks

```http
GET /api/v1/timelines/:timeline_id/tracks
```

**Response:**
```json
{
  "data": [
    {
      "id": "track_123",
      "timeline_id": "timeline_456",
      "name": "Video Track 1",
      "type": "video",
      "order": 0,
      "is_visible": true,
      "is_locked": false,
      "created_at": "2026-02-28T04:30:00Z"
    },
    {
      "id": "track_124",
      "timeline_id": "timeline_456",
      "name": "Audio Track",
      "type": "audio",
      "order": 1,
      "is_visible": true,
      "is_locked": false,
      "created_at": "2026-02-28T04:30:00Z"
    }
  ]
}
```

### Create Track

```http
POST /api/v1/timelines/:timeline_id/tracks
Content-Type: application/json

{
  "name": "Text Overlay",
  "type": "text",
  "order": 2
}
```

**Types:** `video`, `audio`, `text`, `image`, `effect`

**Response:**
```json
{
  "id": "track_125",
  "timeline_id": "timeline_456",
  "name": "Text Overlay",
  "type": "text",
  "order": 2,
  "is_visible": true,
  "is_locked": false,
  "created_at": "2026-02-28T04:35:00Z"
}
```

### Update Track

```http
PUT /api/v1/tracks/:id
Content-Type: application/json

{
  "name": "Updated Track Name",
  "is_visible": false,
  "is_locked": true
}
```

### Delete Track

```http
DELETE /api/v1/tracks/:id
```

---

## 🎞️ Clip Management

### List Timeline Clips

```http
GET /api/v1/timelines/:timeline_id/clips
```

**Response:**
```json
{
  "data": [
    {
      "id": "clip_123",
      "timeline_id": "timeline_456",
      "track_id": "track_123",
      "type": "video",
      "start_time": 0,
      "duration": 15,
      "source_url": "https://storage.../video.mp4",
      "thumbnail_url": "https://storage.../thumb.jpg",
      "metadata": {
        "width": 1920,
        "height": 1080,
        "codec": "h264"
      },
      "created_at": "2026-02-28T04:30:00Z"
    }
  ]
}
```

### Create Clip

```http
POST /api/v1/timelines/:timeline_id/clips
Content-Type: application/json

{
  "track_id": "track_123",
  "type": "text",
  "start_time": 5.5,
  "duration": 10,
  "content": {
    "text": "Hello World!",
    "font_family": "Inter",
    "font_size": 48,
    "color": "#FFFFFF",
    "background_color": "#000000",
    "position": {
      "x": 960,
      "y": 540,
      "anchor": "center"
    }
  }
}
```

**Clip Types:**

**Video:**
```json
{
  "type": "video",
  "source_url": "https://storage.../video.mp4",
  "start_time": 0,
  "duration": 30,
  "trim_start": 5,
  "trim_end": 25
}
```

**Audio:**
```json
{
  "type": "audio",
  "source_url": "https://storage.../audio.mp3",
  "start_time": 0,
  "duration": 60,
  "volume": 0.8,
  "fade_in": 1.0,
  "fade_out": 2.0
}
```

**Text:**
```json
{
  "type": "text",
  "start_time": 5,
  "duration": 10,
  "content": {
    "text": "Title Text",
    "font_family": "Inter",
    "font_size": 72,
    "color": "#FFFFFF",
    "background_color": "transparent",
    "text_align": "center",
    "animation": "fade_in"
  }
}
```

**Image:**
```json
{
  "type": "image",
  "source_url": "https://storage.../image.jpg",
  "start_time": 0,
  "duration": 5,
  "animation": "zoom_in"
}
```

### Update Clip

```http
PUT /api/v1/clips/:id
Content-Type: application/json

{
  "start_time": 10,
  "duration": 15,
  "content": {
    "text": "Updated text"
  }
}
```

### Delete Clip

```http
DELETE /api/v1/clips/:id
```

---

## 🤖 AI Generation

### Generate Script

```http
POST /api/v1/ai/script
Content-Type: application/json

{
  "prompt": "Explain how solar panels work for homeowners",
  "style": "educational",
  "duration": 60,
  "max_scenes": 5,
  "language": "en"
}
```

**Styles:** `educational`, `entertaining`, `professional`, `casual`, `dramatic`, `humorous`

**Response:**
```json
{
  "title": "Solar Panels: How They Work",
  "scenes": [
    {
      "number": 1,
      "narration": "Solar panels convert sunlight into electricity through photovoltaic cells.",
      "visual_description": "Close-up of solar panel cells glistening in sunlight",
      "suggested_duration": 12
    },
    {
      "number": 2,
      "narration": "When sunlight hits these cells, it knocks electrons loose, creating an electric current.",
      "visual_description": "Animated diagram showing electron flow",
      "suggested_duration": 15
    }
  ],
  "total_duration": 60,
  "word_count": 145
}
```

### Enhance Script

```http
POST /api/v1/ai/script/enhance
Content-Type: application/json

{
  "script": "Solar panels make electricity from sun.",
  "style": "educational",
  "target_duration": 60
}
```

### Get Script Styles

```http
GET /api/v1/ai/script-styles
```

**Response:**
```json
{
  "styles": [
    {
      "id": "educational",
      "name": "Educational",
      "description": "Clear, informative content that teaches concepts"
    },
    {
      "id": "entertaining",
      "name": "Entertaining",
      "description": "Engaging, fun content that keeps viewers hooked"
    }
  ]
}
```

### Generate Scenes

```http
POST /api/v1/ai/scenes
Content-Type: application/json

{
  "script_title": "Solar Panels: How They Work",
  "scenes": [
    {
      "number": 1,
      "narration": "Solar panels convert sunlight into electricity...",
      "visual_description": "Close-up of solar panel cells"
    }
  ],
  "style": "cinematic",
  "image_source": "unsplash",
  "generate_images": true
}
```

**Styles:** `cinematic`, `realistic`, `animated`, `abstract`, `minimalist`
**Image Sources:** `unsplash`, `pexels`, `dalle`, `stability`, `together`

**Response:**
```json
{
  "scenes": [
    {
      "number": 1,
      "image_url": "https://images.unsplash.com/...",
      "image_alt": "Solar panel close-up",
      "enhanced_description": "Glistening photovoltaic cells capturing sunlight",
      "color_palette": ["#FFD700", "#4169E1", "#FFFFFF"]
    }
  ]
}
```

### Get Image Sources

```http
GET /api/v1/ai/image-sources
```

### Generate Voice

```http
POST /api/v1/ai/voice
Content-Type: application/json

{
  "text": "Welcome to this video about solar panels!",
  "voice_id": "pNInz6obpgDQGcFmaJgB",
  "provider": "elevenlabs",
  "stability": 0.5,
  "clarity": 0.75,
  "speed": 1.0
}
```

**Providers:** `elevenlabs`, `openai`

**Response:**
```json
{
  "audio_url": "https://storage.../voice.mp3",
  "duration": 3.5,
  "provider": "elevenlabs",
  "voice_id": "pNInz6obpgDQGcFmaJgB"
}
```

### List Voices

```http
GET /api/v1/ai/voices?provider=elevenlabs
```

**Response:**
```json
{
  "voices": [
    {
      "id": "pNInz6obpgDQGcFmaJgB",
      "name": "Adam",
      "provider": "elevenlabs",
      "gender": "male",
      "accent": "american",
      "age": "young",
      "description": "Conversational, friendly",
      "preview_url": "https://..."
    }
  ]
}
```

---

## 🎨 Templates

### List Templates

```http
GET /api/v1/templates?category=youtube&page=1&limit=20
```

**Categories:** `youtube`, `tiktok`, `instagram`, `educational`, `promotional`, `social`

**Response:**
```json
{
  "data": [
    {
      "id": "template_123",
      "name": "YouTube Intro",
      "description": "Professional intro template for YouTube videos",
      "category": "youtube",
      "thumbnail_url": "https://storage.../thumb.jpg",
      "preview_url": "https://storage.../preview.mp4",
      "duration": 10,
      "tags": ["intro", "youtube", "professional"],
      "is_premium": false,
      "usage_count": 1543
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### Get Template

```http
GET /api/v1/templates/:id
```

### Use Template

```http
POST /api/v1/templates/:id/use
Content-Type: application/json

{
  "title": "My YouTube Video"
}
```

**Response:**
```json
{
  "timeline_id": "timeline_789",
  "message": "Template applied successfully"
}
```

---

## 📱 Social Media

### List Connected Accounts

```http
GET /api/v1/social/accounts
```

**Response:**
```json
{
  "accounts": [
    {
      "id": "account_123",
      "platform": "youtube",
      "username": "MyChannel",
      "channel_name": "My YouTube Channel",
      "connected_at": "2026-02-20T10:00:00Z",
      "is_active": true
    }
  ]
}
```

### Get OAuth URL

```http
GET /api/v1/social/auth/:platform
```

**Platforms:** `youtube`, `tiktok`, `instagram`, `twitter`, `facebook`, `linkedin`

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "random_state_token"
}
```

### OAuth Callback

```http
POST /api/v1/social/callback/:platform
Content-Type: application/json

{
  "code": "oauth_code_from_platform",
  "state": "random_state_token"
}
```

### Disconnect Account

```http
DELETE /api/v1/social/accounts/:id
```

### Cross-post Video

```http
POST /api/v1/social/crosspost
Content-Type: application/json

{
  "video_url": "https://storage.../video.mp4",
  "title": "My Awesome Video",
  "description": "Check out this amazing content! #viral",
  "platforms": ["youtube", "tiktok", "twitter"],
  "privacy": "public",
  "tags": ["tutorial", "howto"]
}
```

**Privacy:** `public`, `unlisted`, `private`

**Response:**
```json
{
  "post_id": "post_123",
  "status": "queued",
  "platforms": [
    {
      "platform": "youtube",
      "status": "uploading",
      "external_id": null
    }
  ]
}
```

### Schedule Post

```http
POST /api/v1/social/schedule
Content-Type: application/json

{
  "video_url": "https://storage.../video.mp4",
  "title": "Scheduled Post",
  "description": "This will be posted later",
  "platforms": ["youtube", "instagram"],
  "scheduled_at": "2026-03-01T09:00:00Z",
  "timezone": "America/New_York"
}
```

### Get Post Status

```http
GET /api/v1/social/posts/:id
```

---

## 💰 Credits

### Get Credit Balance

```http
GET /api/v1/credits/balance
```

**Response:**
```json
{
  "balance": 1000,
  "currency": "credits",
  "last_updated": "2026-02-28T04:30:00Z"
}
```

### Get Transaction History

```http
GET /api/v1/credits/transactions?limit=20&type=deduction
```

**Types:** `purchase`, `deduction`, `refund`, `grant`, `bonus`

**Response:**
```json
{
  "data": [
    {
      "id": "tx_123",
      "type": "deduction",
      "amount": -50,
      "description": "Video render: 1080p 60s",
      "metadata": {
        "job_id": "job_456",
        "timeline_id": "timeline_789"
      },
      "created_at": "2026-02-27T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### Purchase Credits

```http
POST /api/v1/credits/purchase
Content-Type: application/json

{
  "amount": 1000,
  "payment_method": "stripe",
  "stripe_token": "tok_..."
}
```

---

## 📊 Analytics

### Get Dashboard Analytics

```http
GET /api/v1/analytics/dashboard?start_date=2026-02-01&end_date=2026-02-28
```

**Response:**
```json
{
  "period": {
    "start": "2026-02-01",
    "end": "2026-02-28"
  },
  "overview": {
    "total_views": 15420,
    "total_engagement": 2340,
    "engagement_rate": 15.2,
    "followers_gained": 450
  },
  "platforms": [
    {
      "platform": "youtube",
      "views": 8200,
      "likes": 1200,
      "comments": 340,
      "shares": 180
    },
    {
      "platform": "tiktok",
      "views": 4800,
      "likes": 890,
      "comments": 120,
      "shares": 230
    }
  ],
  "growth": {
    "views_change": 23.5,
    "engagement_change": 18.2,
    "followers_change": 12.4
  }
}
```

### Get Video Analytics

```http
GET /api/v1/analytics/videos/:video_id
```

**Response:**
```json
{
  "video_id": "video_123",
  "title": "My Awesome Video",
  "total_views": 5420,
  "total_likes": 890,
  "total_comments": 234,
  "total_shares": 156,
  "average_watch_time": 45,
  "retention_rate": 75,
  "platforms": [
    {
      "platform": "youtube",
      "views": 3200,
      "url": "https://youtube.com/watch?v=..."
    }
  ],
  "daily_stats": [
    {
      "date": "2026-02-20",
      "views": 1200,
      "likes": 234
    }
  ]
}
```

### List Video Performance

```http
GET /api/v1/analytics/videos?page=1&limit=20
```

---

## 🎬 Rendering

### Start Render Job

```http
POST /api/v1/render
Content-Type: application/json

{
  "timeline_id": "timeline_123",
  "preset": "youtube_1080p",
  "quality": "high"
}
```

**Presets:**
- `youtube_4k` - 3840x2160, 60fps
- `youtube_1080p` - 1920x1080, 60fps
- `youtube_720p` - 1280x720, 30fps
- `tiktok_vertical` - 1080x1920, 60fps
- `instagram_square` - 1080x1080, 30fps
- `web_optimized` - 1280x720, 30fps, compressed
- `high_quality` - Source resolution, high bitrate

**Response:**
```json
{
  "job_id": "job_123",
  "status": "queued",
  "estimated_duration": 120,
  "credits_deducted": 50,
  "queue_position": 3
}
```

### Get Render Status

```http
GET /api/v1/render/:job_id
```

**Response:**
```json
{
  "job_id": "job_123",
  "status": "rendering",
  "progress": 45,
  "output_url": null,
  "started_at": "2026-02-28T04:30:00Z",
  "estimated_completion": "2026-02-28T04:32:00Z"
}
```

**Statuses:** `queued`, `rendering`, `completed`, `failed`, `cancelled`

### Cancel Render Job

```http
DELETE /api/v1/render/:job_id
```

---

## ⚙️ Batch Operations

### Create Batch Job

```http
POST /api/v1/batch
Content-Type: application/json

{
  "name": "Weekly Content Batch",
  "template_id": "template_123",
  "variations": [
    {
      "title": "Video 1",
      "text_content": "Content for video 1"
    },
    {
      "title": "Video 2",
      "text_content": "Content for video 2"
    }
  ],
  "preset": "youtube_1080p"
}
```

### Get Batch Status

```http
GET /api/v1/batch/:id
```

---

## 🔧 System

### Get API Version

```http
GET /api/v1/version
```

**Response:**
```json
{
  "version": "2.0.0",
  "build": "abc123",
  "environment": "production",
  "features": ["ai_generation", "social_publish", "batch_processing"]
}
```

### Get Server Time

```http
GET /api/v1/time
```

---

## ❌ Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  },
  "request_id": "req_abc123"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits for operation |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## 📦 Webhooks

Renderowl can send webhooks for various events:

### Configure Webhooks

```http
POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["render.completed", "render.failed", "social.published"],
  "secret": "your_webhook_secret"
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `render.completed` | Video render finished successfully |
| `render.failed` | Video render failed |
| `social.published` | Video published to social platform |
| `credits.low` | User credit balance below threshold |

### Webhook Payload

```json
{
  "event": "render.completed",
  "timestamp": "2026-02-28T04:30:00Z",
  "data": {
    "job_id": "job_123",
    "timeline_id": "timeline_456",
    "output_url": "https://storage.../video.mp4",
    "duration": 60
  }
}
```

---

**[⬆ Back to Top](#-renderowl-20---api-documentation)**
