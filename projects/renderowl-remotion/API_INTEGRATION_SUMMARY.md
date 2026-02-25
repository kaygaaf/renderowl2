# Renderowl Remotion - API Server Integration

## Summary

Implemented a complete **HTTP API server** with type-safe Zod schemas for backend integration into the Renderowl Remotion captions MVP.

## What Was Added

### 1. API Contract (`src/api-contract.ts`)
- **Zod schemas** for complete type-safe API validation:
  - `WordTimestampSchema` - Individual word timing
  - `CaptionSegmentSchema` - Caption segments with optional word timestamps
  - `CaptionStyleSchema` - Complete styling options (font, colors, highlight modes)
  - `VideoInputSchema` - Discriminated union for `none` | `file` | `url`
  - `SettingsSchema` - Render dimensions, fps, duration
  - `RenderRequestSchema` - Complete request validation
  - `RenderResponseSchema` - Union of success/error/queued/processing states
  - `HealthResponseSchema` - Health check response

### 2. HTTP API Server (`src/server/index.ts`)
- **Endpoints**:
  - `GET /health` - Server health and capabilities
  - `POST /render` - Submit render job (202 Accepted)
  - `GET /render/:jobId` - Check job status/progress
- **Features**:
  - Job queue with configurable concurrency (default: 2)
  - Progress tracking during render
  - CORS enabled for browser clients
  - Graceful error handling with typed error codes

### 3. Integration Documentation (`INTEGRATION.md`)
- Complete API reference with examples
- TypeScript integration patterns
- Docker and systemd deployment guides
- Performance notes and error codes

### 4. Public API Exports (`src/public-api.ts`)
- Clean exports for backend SDK integration
- All schemas and types available for import

## API Usage Example

```typescript
// Submit render job
const response = await fetch('http://localhost:3000/render', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    captions: [
      {
        startMs: 0,
        endMs: 2500,
        text: 'Welcome to the future',
        words: [
          {startMs: 0, endMs: 400, word: 'Welcome'},
          {startMs: 400, endMs: 600, word: 'to'},
          {startMs: 600, endMs: 900, word: 'the'},
          {startMs: 900, endMs: 2500, word: 'future'}
        ]
      }
    ],
    video: {type: 'file', path: '/input.mp4'},
    style: {
      highlightMode: 'pill',
      highlightColor: '#FFD54A'
    },
    output: {path: '/output.mp4'}
  })
});

const job = await response.json();
// {status: 'queued', jobId: '...', queuePosition: 1}
```

## Running the Server

```bash
cd projects/renderowl-remotion
npm install
npm run server
# Server running on http://localhost:3000
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `MAX_CONCURRENT_RENDERS` - Parallel render limit (default: 2)

## What's Already Implemented

✅ Pixel-accurate text wrapping with binary search (`wrapCaptionWords.ts`)
✅ Per-word highlighting (4 modes: color, pill, underline, glow) (`CaptionsOverlay.tsx`)
✅ **Per-word entry animations (5 modes: fade, pop, slideUp, scale, none)** (`CaptionsOverlay.tsx`)
✅ Binary search performance for caption/word lookup (`getActiveCaption.ts`, `getActiveWord.ts`)
✅ **Type-safe HTTP API with Zod validation** (NEW)
✅ **Job queue with progress tracking** (NEW)
✅ **Complete integration documentation** (NEW)
✅ **Performance: Memoized word progress calculations** (NEW - pre-computes spring animations)
✅ **Performance: React.memo on AnimatedWord component** (NEW - prevents unnecessary re-renders)

## Integration Status

The captions MVP is now ready for backend integration. The API provides:
- Type-safe request/response contracts
- Async job processing with queue
- Progress reporting
- Error handling with structured error codes
