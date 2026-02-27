# ADR 001: Frontend Stack - Next.js 15

## Status
✅ **Accepted** - 2026-02-27

## Context
Renderowl 2.0 requires a timeline-based video editor with AI integration and real-time preview capabilities. We need a frontend stack that supports:

- Complex drag-and-drop timeline interface
- Real-time preview with low latency
- AI feature integration (scene generation, captions, voice synthesis)
- Excellent developer experience for rapid iteration

## Decision
**Adopt Next.js 15 with App Router, React 19, and TypeScript**

### Stack Details
| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.x |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS |
| State (Client) | Zustand |
| State (Server) | React Query |
| Timeline | @dnd-kit + Canvas |
| Preview | React Player + HTML5 Canvas |

## Consequences

### Positive
- **Server Components** reduce client JS by ~70%, critical for video-heavy app
- **Edge runtime** enables global low-latency previews
- **Unified TypeScript** across frontend/backend reduces context switching
- **Vercel AI SDK** provides seamless AI integration
- **Hot reload** accelerates timeline editor iteration

### Negative
- **Learning curve** for team members new to App Router
- **Migration effort** from current React setup (est. 2-3 weeks)
- **Vendor consideration** if heavily using Vercel-specific features

## Alternatives Considered

| Option | Decision | Reason |
|--------|----------|--------|
| React (current) | ❌ Rejected | Missing SSR/edge runtime hurts preview latency |
| Next.js 15 | ✅ Selected | Best balance of performance, ecosystem, DX |
| Remix | ❌ Rejected | Smaller ecosystem for video editing libraries |
| Vue 3 | ❌ Rejected | Team expertise is React; migration cost unjustified |

## Related Decisions
- ADR 002: Backend Stack (Node.js for unified TS codebase)
- ADR 003: Video Processing (Remotion integration with Next.js)

## References
- [Next.js 15 Announcement](https://nextjs.org/blog/next-15)
- [@dnd-kit Documentation](https://dndkit.com/)
- Trello Card: Frontend Stack Evaluation
