# Architecture Decision Records (ADRs)

This directory contains all architectural decisions for Renderowl 2.0.

## Current Decisions

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](./001-frontend-stack.md) | Frontend Stack - Next.js 15 | ✅ Accepted | 2026-02-27 |
| [002](./002-backend-stack.md) | Backend Stack - Node.js + Express | ✅ Accepted | 2026-02-27 |
| [003](./003-video-processing.md) | Video Processing Architecture | ✅ Accepted | 2026-02-27 |

## Quick Reference

### Tech Stack Summary
```
Frontend:  Next.js 15 + React 19 + TypeScript
Backend:   Node.js 20 + Express 5 + TypeScript
Database:  PostgreSQL 16 + Prisma ORM
Queue:     BullMQ + Redis
Video:     FFmpeg 6.0 + node-fluent-ffmpeg
Timeline:  Custom React + Canvas + @dnd-kit
Templates: Remotion
```

### Key Architectural Principles
1. **Unified TypeScript** across frontend and backend
2. **FFmpeg backbone** for all video processing
3. **Custom timeline editor** for differentiated UX
4. **Hybrid rendering** (real-time preview + queued export)
5. **GPU acceleration** for production rendering

## Process
- All significant architectural decisions must be documented as ADRs
- ADRs are immutable once accepted (supersede with new ADR if needed)
- Include "Alternatives Considered" section in every ADR
- Link related ADRs for traceability
