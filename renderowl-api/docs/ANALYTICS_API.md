# Analytics & Notifications API Documentation

**Version:** 0.2.0  
**Date:** February 27, 2026

---

## Overview

The Analytics & Notifications API provides:

- **Analytics:** Render statistics, usage metrics, time-series data, and project comparisons
- **Notifications:** Real-time user notifications for render events, credit alerts, and batch completions
- **Batch Progress Tracking:** Automatic notifications when batch render jobs complete

---

## Endpoints

### Analytics Summary

#### GET /v1/analytics/summary

Get overall analytics summary for the authenticated user.

**Query Parameters:**
- `project_id` (optional): Filter by specific project
- `from` (optional): Start date (ISO 8601)
- `to` (optional): End date (ISO 8601)

**Response:**
```json
{
  "summary": {
    "totalRenders": 150,
    "completedRenders": 142,
    "failedRenders": 5,
    "cancelledRenders": 3,
    "completionRate": 94.7,
    "averageRenderDuration": 42.5,
    "totalFramesRendered": 540000,
    "totalCreditsUsed": 3750
  },
  "daily": [
    {
      "date": "2026-02-27",
      "rendersTotal": 10,
      "rendersCompleted": 9,
      "rendersFailed": 1,
      "rendersCancelled": 0,
      "totalDurationSeconds": 420,
      "totalFramesRendered": 36000,
      "creditsUsed": 250,
      "storageBytesUsed": 524288000
    }
  ],
  "projects": [
    {
      "projectId": "proj_abc123",
      "projectName": "Marketing Videos",
      "renderCount": 75,
      "successRate": 96.0,
      "totalCredits": 1875
    }
  ],
  "period": {
    "from": "2026-02-01T00:00:00Z",
    "to": "2026-02-27T23:59:59Z"
  }
}
```

---

### Time Series Data

#### GET /v1/analytics/timeseries

Get time-series data for specific metrics.

**Query Parameters:**
- `metric` (required): One of `renders`, `credits`, `frames`, `duration`
- `days` (optional): Number of days to include (default: 30, max: 90)
- `project_id` (optional): Filter by specific project

**Response:**
```json
{
  "metric": "renders",
  "days": 30,
  "data": [
    {
      "timestamp": "2026-02-27",
      "value": 10
    },
    {
      "timestamp": "2026-02-26",
      "value": 15
    }
  ]
}
```

---

### Project Comparison

#### GET /v1/analytics/projects

Get performance comparison across all user projects.

**Response:**
```json
{
  "projects": [
    {
      "projectId": "proj_abc123",
      "projectName": "Marketing Videos",
      "renderCount": 75,
      "successRate": 96.0,
      "totalCredits": 1875
    },
    {
      "projectId": "proj_def456",
      "projectName": "Social Media",
      "renderCount": 45,
      "successRate": 93.3,
      "totalCredits": 1125
    }
  ]
}
```

---

### Custom Event Tracking

#### POST /v1/analytics/events

Track custom analytics events.

**Request Body:**
```json
{
  "event_type": "template.used",
  "project_id": "proj_abc123",
  "event_data": {
    "templateId": "tmpl_xyz789",
    "variables": { "title": "Summer Sale" }
  }
}
```

**Response:**
```json
{
  "success": true,
  "event_id": "evt_1772150967483_elk5kzfcr"
}
```

---

## Notifications

### List Notifications

#### GET /v1/analytics/notifications

Get user notifications.

**Query Parameters:**
- `unread_only` (optional): Return only unread notifications (default: false)
- `limit` (optional): Maximum number of notifications (default: 50, max: 100)

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif_1772150967485_rxw1m7i08",
      "userId": "user_abc123",
      "type": "render_complete",
      "title": "Render Complete",
      "message": "Your video \"Summer Promo\" has finished rendering.",
      "data": {
        "renderId": "rnd_789",
        "outputUrl": "https://cdn.example.com/video.mp4"
      },
      "read": false,
      "createdAt": "2026-02-27T10:30:00Z"
    }
  ],
  "unread_count": 1,
  "total": 1
}
```

**Notification Types:**
- `render_complete` — Render job finished successfully
- `render_failed` — Render job failed
- `credit_low` — User's credit balance is low
- `batch_complete` — Batch processing job completed
- `system` — System announcements

---

### Unread Count

#### GET /v1/analytics/notifications/unread-count

Get count of unread notifications.

**Response:**
```json
{
  "unread_count": 5
}
```

---

### Mark as Read

#### POST /v1/analytics/notifications/:id/read

Mark a specific notification as read.

**Response:**
```json
{
  "success": true
}
```

---

### Mark All as Read

#### POST /v1/analytics/notifications/read-all

Mark all notifications as read.

**Response:**
```json
{
  "success": true,
  "marked_read": 5
}
```

---

### Delete Notification

#### DELETE /v1/analytics/notifications/:id

Delete a specific notification.

**Response:**
```json
{
  "success": true
}
```

---

## Database Schema

### analytics_events

```sql
CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  event_type TEXT NOT NULL,
  event_data TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### analytics_daily

```sql
CREATE TABLE analytics_daily (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  renders_total INTEGER DEFAULT 0,
  renders_completed INTEGER DEFAULT 0,
  renders_failed INTEGER DEFAULT 0,
  renders_cancelled INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  total_frames_rendered INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  storage_bytes_used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);
```

### notifications

```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT, -- JSON payload
  read BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);
```

---

## Batch Generation Integration

When using the Batch API (`POST /v1/batch`), analytics events are automatically tracked. When a batch completes, a notification is automatically created:

```json
{
  "type": "batch_complete",
  "title": "Batch Processing Complete",
  "message": "5 of 5 renders completed successfully",
  "data": {
    "batchId": "batch_abc123",
    "totalJobs": 5,
    "completedJobs": 5,
    "failedJobs": 0
  }
}
```

---

## Video Templates Integration

The Templates API (`/v1/templates`) automatically tracks:

- Template usage events
- Render count per template
- Download analytics
- Marketplace purchase events

---

## Error Responses

All endpoints return RFC 7807 Problem Details for errors:

```json
{
  "type": "https://api.renderowl.com/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Bearer token or API key required",
  "instance": "/v1/analytics/summary"
}
```

**Common Status Codes:**
- `200` — Success
- `400` — Bad Request (validation error)
- `401` — Unauthorized (missing/invalid token)
- `404` — Not Found
- `429` — Rate Limited

---

## Rate Limits

Analytics endpoints have the following rate limits:

| Endpoint | Limit |
|----------|-------|
| GET /analytics/summary | 60/min |
| GET /analytics/timeseries | 60/min |
| GET /analytics/notifications | 120/min |
| POST /analytics/events | 100/min |
| Other analytics | 60/min |

---

## WebSocket Notifications (Future)

Real-time notifications via WebSocket are planned for a future release:

```javascript
const ws = new WebSocket('wss://api.renderowl.com/v1/notifications/stream');

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('New notification:', notification);
};
```
