# ADR 002: Backend Stack - Node.js + Express

## Status
✅ **Accepted** - 2026-02-27

## Context
Renderowl 2.0 backend needs to handle:
- Video processing at scale (batch generation)
- Real-time preview generation (sub-100ms target)
- AI service orchestration (OpenAI, ElevenLabs)
- WebSocket connections for progress updates

Current stack is FastAPI + PostgreSQL, but Python's GIL limits concurrent video processing.

## Decision
**Migrate to Node.js 20 LTS + Express 5 + TypeScript**

Keep PostgreSQL as the database (zero data migration risk).

### Stack Details
| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 LTS |
| Framework | Express 5 |
| Language | TypeScript 5.x |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Queue | BullMQ + Redis |
| Video | node-fluent-ffmpeg + FFmpeg 6.0 |
| WebSockets | Socket.io |
| API | tRPC or OpenAPI + Zod |

## Consequences

### Positive
- **Unified language** (TypeScript) across full stack
- **Worker threads** enable true parallelism for video rendering (no GIL!)
- **Streams API** perfect for real-time preview generation
- **Non-blocking I/O** handles 100+ concurrent AI API calls efficiently
- **Shared types** between frontend and backend

### Negative
- **Migration timeline** of 4 weeks for full cutover
- **FFmpeg bindings** need validation on target platform
- **Team retraining** from Python async patterns to Node.js

## Migration Strategy
1. **Phase 1** (Week 1): Set up Node.js project structure, Prisma schema
2. **Phase 2** (Week 2): Migrate auth + user endpoints (feature flag)
3. **Phase 3** (Week 3): Migrate project + video endpoints
4. **Phase 4** (Week 4): Full cutover, decommission FastAPI

Run both stacks in parallel during migration using feature flags.

## Alternatives Considered

| Option | Decision | Reason |
|--------|----------|--------|
| FastAPI (current) | ❌ Rejected | Python GIL limits concurrent video processing |
| Node.js + Express | ✅ Selected | Best for unified stack + video/AI workloads |
| Go + Gin | ❌ Rejected | Excellent performance but smaller video/AI ecosystem |
| Rust + Actix | ❌ Rejected | Overkill for v2; revisit for v3 at scale |

## Performance Targets
- **Concurrent renders per worker**: 4-8 videos
- **Preview generation latency**: <100ms
- **AI caption generation**: 100+ concurrent requests

## Related Decisions
- ADR 001: Frontend Stack (unified TypeScript)
- ADR 003: Video Processing (FFmpeg integration)

## References
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [node-fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)
- Trello Card: Backend Stack Evaluation
