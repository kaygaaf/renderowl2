# renderowl-remotion (Captions MVP)

Minimal Remotion project to burn-in captions from **SRT / VTT / JSON**.

## Install

```bash
cd projects/renderowl-remotion
npm i
```

## Render (SRT)

```bash
npm run render:captions -- \
  --subtitles examples/transcript.srt \
  --out out/sample-srt.mp4 \
  --durationSec 8 \
  --fps 30 --width 1080 --height 1920
```

## Render with an input video

```bash
npm run render:captions -- \
  --subtitles examples/transcript.srt \
  --video /absolute/path/to/input.mp4 \
  --out out/with-video.mp4
```

## Render (JSON word timestamps)

```bash
npm run render:captions -- \
  --subtitles examples/words.json \
  --out out/sample-words.mp4 \
  --durationSec 5
```

## API Server (Backend Integration)

Start the HTTP API server for programmatic rendering:

```bash
npm run server
# Server running on http://localhost:3000
```

See [INTEGRATION.md](./INTEGRATION.md) for complete API documentation.

### Quick API Example

```bash
# Submit a render job
curl -X POST http://localhost:3000/render \
  -H "Content-Type: application/json" \
  -d '{
    "captions": [{"startMs":0,"endMs":2000,"text":"Hello world"}],
    "output": {"path":"/tmp/out.mp4"},
    "style": {"highlightMode":"pill"}
  }'

# Check job status
curl http://localhost:3000/render/{jobId}
```

## Supported subtitle formats

- `.srt` (basic)
- `.vtt` (basic; `WEBVTT` header is ignored)
- `.json`
  - `CaptionSegment[]`: `[{startMs,endMs,text}]`
  - `WordTimestamp[]`: `[{startMs,endMs,word}]` (auto-grouped)
  - `{words: WordTimestamp[]}`

## Composition

- Composition id: `CaptionedVideo`
- Default: 1080x1920, 30fps, 10s (overridden by the render script flags)

## CaptionStyle Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxCharsPerLine` | `number` | `28` | Max characters per line before wrapping |
| `maxLines` | `number` | `2` | Maximum number of lines to show |
| `fontFamily` | `string` | `Inter, system-ui...` | Font family stack |
| `fontSize` | `number` | `64` | Font size in pixels |
| `textColor` | `string` | `#FFFFFF` | Normal text color |
| `highlightColor` | `string` | `#FFD54A` | Active word highlight color |
| `highlightMode` | `'color' \| 'pill' \| 'underline' \| 'glow' \| 'fill'` | `'color'` | Per-word highlight style |
| `highlightTransitionMs` | `number` | `120` | Animation duration for highlight transitions |
| `highlightScale` | `number` | `1.05` | Scale effect for active word (1.0 = no scale) |
| `wordEntryAnimation` | `'fade' \| 'pop' \| 'slideUp' \| 'scale' \| 'none'` | `'fade'` | **NEW** Entry animation for words as they appear |
| `wordEntryDurationMs` | `number` | `200` | **NEW** Duration for word entry animation |
| `bottomOffset` | `number` | `160` | Distance from bottom in pixels |

### Highlight Modes

When using word-level timestamps (JSON), you can choose how words are highlighted:

- **`color`** (default): Simple color change with subtle opacity boost
- **`pill`**: Rounded background pill behind the active word
- **`underline`**: Animated underline that grows beneath the active word  
- **`glow`**: Text shadow glow effect that intensifies for the active word
- **`fill`**: Progressive fill effect - words fill with highlight color gradually as they're spoken (like YouTube captions)

### Word Entry Animations

Words can animate in as they appear with different entry effects:

- **`fade`** (default): Smooth fade in
- **`pop`**: Bouncy pop-in effect
- **`slideUp`**: Slide up from below
- **`scale`**: Scale up from center with overshoot
- **`none`**: Instant appearance (no animation)

Example with highlight mode and entry animation:

```typescript
const style: CaptionStyle = {
  highlightMode: 'pill',
  highlightColor: '#FFD54A',
  highlightScale: 1.08,
  highlightTransitionMs: 150,
  wordEntryAnimation: 'pop',
  wordEntryDurationMs: 250
};
```
