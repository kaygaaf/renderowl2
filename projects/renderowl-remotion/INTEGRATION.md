# Renderowl Remotion Integration Guide

This document describes how to integrate the Renderowl Remotion captions renderer into the main videogen/renderowl backend.

## Overview

The Renderowl Remotion renderer is a standalone service that:
- Renders captioned videos using Remotion
- Supports per-word karaoke-style highlighting
- Provides pixel-accurate text wrapping
- Offers multiple highlight modes (color, pill, underline, glow, fill)
- Includes word entry animations

## Architecture

```
┌─────────────────┐     HTTP API      ┌──────────────────────┐
│  videogen       │ ─────────────────▶│  renderowl-remotion  │
│  (main backend) │   (this guide)    │  (Remotion renderer) │
└─────────────────┘                   └──────────────────────┘
```

## Quick Start

### 1. Start the Remotion Server

```bash
cd renderowl-remotion
npm install
npm run server
```

The server will start on port 3000 by default.

### 2. Use the Client SDK

Install the client (or copy `src/client/index.ts`):

```typescript
import {RenderowlClient} from '@renderowl/remotion-client';

const client = new RenderowlClient('http://localhost:3000');

// Quick render
const result = await client.quickRender(
  [
    {startMs: 0, endMs: 2000, text: 'Hello world'},
    {startMs: 2000, endMs: 4000, text: 'This is a test'}
  ],
  '/output/path/video.mp4'
);

console.log(`Rendered to: ${result.outputPath}`);
```

## Client SDK API

### Basic Usage

```typescript
import {RenderowlClient, RenderowlError} from './client';

const client = new RenderowlClient({
  baseUrl: 'http://localhost:3000',
  timeoutMs: 30000,
  defaultHeaders: {'X-API-Key': 'optional'}
});
```

### Submit a Render Job

```typescript
// Method 1: Direct API
const response = await client.render({
  captions: [
    {
      startMs: 0,
      endMs: 3000,
      text: 'Hello world',
      words: [
        {startMs: 0, endMs: 500, word: 'Hello'},
        {startMs: 500, endMs: 1000, word: 'world'}
      ]
    }
  ],
  output: {
    path: '/tmp/output.mp4',
    format: 'mp4',
    codec: 'h264'
  },
  style: {
    fontSize: 64,
    highlightColor: '#FFD54A',
    highlightMode: 'fill'
  }
});

// Response: {status: 'queued', jobId: '...'}
```

### Builder API (Recommended)

```typescript
const result = await client.builder()
  .captions(captions)
  .output('/tmp/output.mp4', 'mp4', 'h264')
  .video({type: 'file', path: '/tmp/video.mp4'})
  .style({
    fontSize: 64,
    highlightMode: 'fill',
    highlightColor: '#FFD54A'
  })
  .settings({fps: 30, width: 1080, height: 1920})
  .webhook({
    url: 'https://your-api.com/webhooks/renderowl',
    events: ['completed', 'failed']
  })
  .executeAndWait({
    intervalMs: 1000,
    onProgress: (p) => console.log(`${p.percent}% complete`)
  });
```

### Poll for Completion

```typescript
// If you only queued the job initially
const result = await client.waitForCompletion(jobId, {
  intervalMs: 1000,
  timeoutMs: 300000,
  onProgress: (progress) => {
    console.log(`${progress.percent}% (${progress.framesRendered}/${progress.totalFrames})`);
  }
});
```

### Check Server Health

```typescript
const health = await client.health();
console.log(`Server status: ${health.status}`);
console.log(`Queue: ${health.queue.pending} pending, ${health.queue.active} active`);
```

## API Reference

### `RenderowlClient`

| Method | Description |
|--------|-------------|
| `constructor(baseUrl \| options)` | Create client |
| `health()` | Check server health |
| `render(request)` | Submit render job |
| `getStatus(jobId)` | Get job status |
| `waitForCompletion(jobId, opts?)` | Poll until complete |
| `quickRender(captions, outputPath, opts?)` | Simple render helper |
| `builder()` | Get fluent builder |

### `RenderBuilder`

| Method | Description |
|--------|-------------|
| `captions(captions[])` | Set caption segments |
| `output(path, format?, codec?)` | Set output config |
| `video(videoInput)` | Set video input |
| `style(style)` | Set caption styling |
| `settings(settings)` | Set render settings |
| `webhook(config)` | Set webhook config |
| `jobId(id)` | Set custom job ID |
| `execute()` | Submit job |
| `executeAndWait(opts?)` | Submit and wait |

## Caption Styling

### Highlight Modes

- `color` (default): Simple color change
- `fill`: Progressive fill like YouTube captions
- `pill`: Rounded background pill
- `underline`: Animated underline
- `glow`: Text shadow glow

### Word Entry Animations

- `fade` (default): Fade in
- `none`: No animation
- `pop`: Pop with bounce
- `slideUp`: Slide from below
- `scale`: Scale from 0

### Example Styles

```typescript
// YouTube-style
const youtubeStyle = {
  fontSize: 64,
  highlightMode: 'fill' as const,
  highlightColor: '#FFFFFF',
  textColor: '#808080',
  backgroundOpacity: 0
};

// TikTok-style
const tiktokStyle = {
  fontSize: 72,
  highlightMode: 'pill' as const,
  highlightColor: '#FFD54A',
  highlightPillColor: 'rgba(255, 213, 74, 0.3)',
  fontFamily: 'Arial Black, sans-serif'
};

// Minimal
const minimalStyle = {
  fontSize: 56,
  highlightMode: 'underline' as const,
  strokeWidth: 0,
  backgroundOpacity: 0
};
```

## Webhooks

Configure webhooks for async job notifications:

```typescript
const webhookConfig = {
  url: 'https://your-api.com/webhooks/renderowl',
  headers: {
    'Authorization': 'Bearer your-token'
  },
  events: ['queued', 'started', 'progress', 'completed', 'failed']
};
```

### Webhook Payloads

**queued**
```json
{
  "event": "queued",
  "jobId": "...",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {"queuePosition": 1}
}
```

**completed**
```json
{
  "event": "completed",
  "jobId": "...",
  "timestamp": "2024-01-15T10:01:30Z",
  "data": {
    "outputPath": "/tmp/output.mp4",
    "durationMs": 15000,
    "renderedFrames": 450,
    "renderTimeMs": 45000
  }
}
```

## Error Handling

```typescript
import {RenderowlError} from './client';

try {
  const result = await client.render(request);
} catch (err) {
  if (err instanceof RenderowlError) {
    console.error('Render failed:', err.message);
    if (err.response) {
      console.error('Response:', err.response);
    }
  }
}
```

## Environment Variables

The Remotion server respects these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `MAX_CONCURRENT_RENDERS` | 2 | Max parallel renders |
| `REMOTION_TEXT_CACHE_SIZE` | 5000 | Text measurement cache size |

## Integration with Main Backend

### Example: Express Route

```typescript
import express from 'express';
import {RenderowlClient} from '../renderowl-remotion/src/client';

const router = express.Router();
const renderowl = new RenderowlClient(process.env.REMOTION_URL || 'http://localhost:3000');

router.post('/videos/:id/render', async (req, res) => {
  const {captions, style} = req.body;
  const outputPath = `/storage/videos/${req.params.id}.mp4`;

  try {
    const result = await renderowl.builder()
      .captions(captions)
      .output(outputPath)
      .style(style)
      .webhook({
        url: `${process.env.API_URL}/webhooks/renderowl`,
        events: ['completed', 'failed']
      })
      .execute();

    res.json({jobId: result.jobId, status: 'queued'});
  } catch (err) {
    res.status(500).json({error: 'Failed to queue render'});
  }
});

router.get('/jobs/:jobId/status', async (req, res) => {
  const status = await renderowl.getStatus(req.params.jobId);
  res.json(status);
});
```

### Example: Webhook Handler

```typescript
router.post('/webhooks/renderowl', async (req, res) => {
  const {event, jobId, data} = req.body;

  switch (event) {
    case 'completed':
      await db.videos.update({
        where: {renderJobId: jobId},
        data: {
          status: 'ready',
          outputPath: data.outputPath,
          durationMs: data.durationMs
        }
      });
      break;

    case 'failed':
      await db.videos.update({
        where: {renderJobId: jobId},
        data: {status: 'failed', error: data.error}
      });
      break;
  }

  res.sendStatus(200);
});
```

## Performance Considerations

1. **Text Measurement**: Uses LRU cache (5000 entries by default)
2. **Binary Search**: O(log n) for finding active captions/words
3. **Queue Management**: Server handles concurrent renders
4. **Progress Polling**: Use webhooks instead of polling when possible

## Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "server"]
```

```yaml
# docker-compose.yml
version: '3'
services:
  renderowl:
    build: ./renderowl-remotion
    ports:
      - "3000:3000"
    environment:
      - MAX_CONCURRENT_RENDERS=4
      - PORT=3000
    volumes:
      - ./storage:/storage
```
