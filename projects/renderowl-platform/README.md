# Renderowl Platform

The orchestration layer for video rendering at scale. Sits above the [`renderowl-remotion`](../renderowl-remotion/) renderer to provide multi-tenant project management, asset storage, render queues, and automation workflows.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderowl Platform                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │ Projects│  │ Assets  │  │ Renders │  │  Automations    │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └─────────────────┘ │
│       └─────────────┴───────────┘                            │
│                         │                                    │
│                    Job Queue (Redis)                         │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│ renderowl-remotion   │  │  Future Renderers    │
│ (Captions/Remotion)  │  │  (FFmpeg, GPU, etc)  │
└──────────────────────┘  └──────────────────────┘
```

## Quick Start

```bash
# Install dependencies
cd projects/renderowl-platform
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database and storage credentials

# Run migrations
npm run db:migrate

# Start development server
npm run dev

# Server runs at http://localhost:3001
```

## API Documentation

- [API Contract](./docs/API_CONTRACT.md) — Full API specification
- [TypeScript Schemas](./src/platform-contract.ts) — Zod schemas & types

## Project Structure

```
renderowl-platform/
├── src/
│   ├── platform-contract.ts    # API schemas (Zod)
│   ├── routes/                 # API route handlers
│   ├── services/               # Business logic
│   ├── workers/                # Background job processors
│   ├── queue/                  # Queue management
│   └── db/                     # Database schema & queries
├── docs/
│   └── API_CONTRACT.md         # API specification
├── tickets/
│   └── IMPLEMENTATION_TICKETS.md  # Development tickets
└── sdk/
    └── typescript/             # Official TypeScript SDK
```

## Development Tickets

See [IMPLEMENTATION_TICKETS.md](./tickets/IMPLEMENTATION_TICKETS.md) for the development roadmap:

1. **TICKET-001:** Project API Endpoints
2. **TICKET-002:** Asset Upload Flow
3. **TICKET-003:** Render Job Submission
4. **TICKET-004:** Webhook Event System
5. **TICKET-005:** Automation Engine Core
6. **TICKET-006:** TypeScript SDK Client

## Key Features

### Projects
- Multi-tenant organization
- Isolated asset storage
- Per-project settings & quotas

### Assets
- Videos, fonts, templates, brand kits
- Async metadata extraction
- Signed URL access control

### Renders
- Queue-based job distribution
- Multi-engine support (Remotion, FFmpeg)
- Real-time progress tracking

### Automations
- Webhook-triggered workflows
- Scheduled (cron) renders
- Data mapping & template variables

## License

Private — Renderowl Team
