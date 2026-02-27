# ADR 003: Video Processing Architecture

## Status
✅ **Accepted** - 2026-02-27

## Context
Renderowl 2.0's core differentiator is a timeline-based video editor with AI features. We need:
- Drag-and-drop timeline with multi-track support
- Real-time preview without full re-rendering
- Batch generation at scale (100 videos/hour target)
- Template system for reusable compositions
- AI-generated overlays (captions, lower-thirds)

## Decision
**Hybrid Architecture: FFmpeg (core) + Custom Timeline Editor + Remotion (templates)**

### Architecture Overview
```
┌─────────────────────────────────────────────┐
│  Timeline Editor (React + Canvas)           │
│  ├── Drag-drop segments (@dnd-kit)          │
│  ├── Waveform visualization (wavesurfer.js) │
│  └── Overlays (fabric.js)                   │
└────────────┬────────────────────────────────┘
             │ WebSocket (preview frame request)
             ▼
┌─────────────────────────────────────────────┐
│  Preview Server (Node.js + FFmpeg)          │
│  ├── Fast frame extraction (1-2 sec)        │
│  └── MJPEG/WebRTC stream to client          │
└────────────┬────────────────────────────────┘
             │ (full render on export)
             ▼
┌─────────────────────────────────────────────┐
│  Render Queue (BullMQ + Workers)            │
│  ├── FFmpeg full composition render         │
│  ├── GPU acceleration (NVENC)               │
│  └── Progress tracking → WebSocket          │
└─────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Core Processing: FFmpeg (Enhanced)
**Why FFmpeg remains the backbone:**
- Industry standard for 20+ years
- Supports all codecs/formats we'll need
- Hardware acceleration (NVENC, AMD, VAAPI)
- **10x cheaper** than cloud transcoding services

**Enhancement: Modern Orchestration**
- JSON-based composition specification
- Structured pipeline replacing manual FFmpeg commands
- Preview: Frame extraction vs full render

#### 2. Timeline Editor: Custom React + Canvas
**Why custom-built:**
- No mature open-source timeline editor meets requirements
- Need multi-track + AI-generated layer support
- Real-time waveform visualization

**Libraries Used:**
| Component | Library |
|-----------|---------|
| Drag-drop | @dnd-kit |
| Audio viz | wavesurfer.js |
| Overlays | fabric.js |
| Rendering | HTML5 Canvas API |

#### 3. Template System: Remotion
**Why Remotion for templates:**
- React-based = seamless Next.js integration
- JSX-based animations (no After Effects license)
- Server-side rendering via Remotion Lambda
- Hot reload during template development

## Consequences

### Positive
- **Proven FFmpeg foundation** minimizes codec/format risk
- **Custom timeline** gives exact UX control needed
- **Remotion templates** enable designer-friendly workflow
- **Scalable architecture** supports horizontal growth
- **Cost efficient** vs cloud transcoding

### Negative
- **Custom timeline editor** = 3-4 weeks development time
- **Remotion licensing** may require commercial license
- **GPU requirements** for performant rendering
- **Complexity** of managing three different technologies

## Technology Matrix

| Component | Technology | Purpose |
|-----------|------------|---------|
| Timeline UI | React + Canvas API | Drag-drop editor |
| Audio viz | wavesurfer.js | Waveform rendering |
| Overlays | HTML5 Canvas / fabric.js | Captions, lower-thirds |
| Preview gen | FFmpeg (frame extraction) | Fast scrubbing |
| Full render | FFmpeg (GPU) | Final export |
| Templates | Remotion | Reusable compositions |
| Queue | BullMQ + Redis | Job orchestration |
| Storage | S3-compatible | Source + rendered assets |

## Performance Targets

| Metric | Target |
|--------|--------|
| Preview latency | <500ms |
| Timeline scrub FPS | 60fps |
| Per-worker capacity | 4-8 concurrent renders |
| Batch throughput | 100 videos/hour |
| Infrastructure cost | ~$500/mo for target scale |

## Alternatives Considered

| Option | Decision | Reason |
|--------|----------|--------|
| FFmpeg only (current) | ❌ Rejected | Needs better orchestration layer |
| Remotion (full) | ❌ Rejected | Not suitable for timeline-based editing |
| Motion Canvas | ❌ Rejected | Great for programmatic, not timeline editing |
| Custom WebGL | ❌ Rejected | 6+ month dev time, high maintenance |
| Cloud transcoding | ❌ Rejected | 50x more expensive than self-hosted |
| **Hybrid (chosen)** | ✅ Selected | Best balance of capability and timeline |

## Open Questions

### For Frontend Lead
1. Timeline canvas performance target (60fps during scrub)?
2. Acceptable preview latency (target: <500ms)?
3. Remotion commercial licensing requirements?

### For Backend Lead
1. GPU availability in production environment?
2. S3-compatible storage already configured?
3. Max video duration to support?

## Next Steps
1. **POC**: FFmpeg preview pipeline (2 days)
2. **Prototype**: Timeline canvas with @dnd-kit (3 days)
3. **Evaluate**: Remotion commercial licensing (1 day)
4. **Validate**: GPU rendering performance on target hardware

## Related Decisions
- ADR 001: Frontend Stack (Next.js for timeline editor)
- ADR 002: Backend Stack (Node.js for FFmpeg orchestration)

## References
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Remotion](https://www.remotion.dev/)
- [@dnd-kit](https://dndkit.com/)
- [wavesurfer.js](https://wavesurfer-js.org/)
- Trello Card: Video Processing Evaluation
