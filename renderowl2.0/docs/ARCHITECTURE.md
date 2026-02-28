# 🏗️ Renderowl 2.0 - Architecture Documentation

System design, database schema, API design, and frontend architecture for Renderowl 2.0.

---

## Table of Contents

1. [System Design](#system-design)
2. [Database Schema](#database-schema)
3. [API Design](#api-design)
4. [Frontend Architecture](#frontend-architecture)
5. [Technology Decisions](#technology-decisions)

---

## System Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Web Browser   │  │   Mobile App    │  │   Third-party   │              │
│  │   (Next.js)     │  │   (Future)      │  │   Integrations  │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
└───────────┼────────────────────┼────────────────────┼────────────────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │ HTTPS/WebSocket
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY / LOAD BALANCER                        │
│                              (Traefik / Nginx)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    FRONTEND     │  │     BACKEND     │  │    WORKER       │
│    SERVICE      │  │     SERVICE     │  │    SERVICE      │
│  (Next.js 15)   │  │   (Go + Gin)    │  │  (Remotion)     │
│                 │  │                 │  │                 │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │   Pages   │  │  │  │  Handlers │  │  │  │  Queue    │  │
│  │   App     │  │  │  │   REST    │  │  │  │ Consumer  │  │
│  │  Router   │  │  │  │   API     │  │  │  │           │  │
│  └─────┬─────┘  │  │  └─────┬─────┘  │  │  └─────┬─────┘  │
│        │        │  │        │        │  │        │        │
│  ┌─────▼─────┐  │  │  ┌─────▼─────┐  │  │  ┌─────▼─────┐  │
│  │Components │  │  │  │  Services │  │  │  │  Render   │  │
│  │   React   │  │  │  │  Business │  │  │  │  Engine   │  │
│  └───────────┘  │  │  │   Logic   │  │  │  └───────────┘  │
│                 │  │  └─────┬─────┘  │  │                 │
│  ┌───────────┐  │  │        │        │  │  ┌───────────┐  │
│  │ Remotion  │  │  │  ┌─────▼─────┐  │  │  │  Upload   │  │
│  │  Player   │  │  │  │Repository │  │  │  │  Service  │  │
│  └───────────┘  │  │  │    DB     │  │  │  └───────────┘  │
└─────────────────┘  │  └───────────┘  │  └─────────────────┘
                     └─────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
   ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
   │   PostgreSQL   │ │     Redis      │ │    Cloudflare  │
   │   (Primary)    │ │   (Queue/      │ │       R2       │
   │                │ │    Cache)      │ │   (Storage)    │
   │  ┌──────────┐  │ │                │ │                │
   │  │  Users   │  │ │  ┌──────────┐  │ │  ┌──────────┐  │
   │  │ Projects │  │ │  │ Job Queue│  │ │  │  Videos  │  │
   │  │ Timelines│  │ │  │ Sessions │  │ │  │  Images  │  │
   │  │  Renders │  │ │  │   Cache  │  │ │  │  Assets  │  │
   │  └──────────┘  │ │  └──────────┘  │ │  └──────────┘  │
   └────────────────┘ └────────────────┘ └────────────────┘
```

### Component Interactions

**Video Creation Flow:**
```
User → Frontend → Backend → Queue → Worker → Storage
  │        │         │        │        │        │
  │        │         │        │        │        └──► Video stored in R2
  │        │         │        │        └──► Remotion renders video
  │        │         │        └──► Job queued in Redis
  │        │         └──► Timeline saved to PostgreSQL
  │        └──► Real-time preview via Remotion Player
  └──► User edits timeline
```

**AI Generation Flow:**
```
User Prompt → Frontend → Backend → AI Services
                              │
                              ├──► OpenAI (Scripts)
                              ├──► Together AI (Scripts)
                              ├──► DALL-E (Images)
                              ├──► Stability AI (Images)
                              └──► ElevenLabs (Voice)
                              │
                              └──► Results → Frontend → Timeline
```

**Social Publishing Flow:**
```
User → Publish Request → Backend → Queue → Social APIs
                                           │
                                           ├──► YouTube API
                                           ├──► TikTok API
                                           ├──► Instagram API
                                           ├──► Twitter API
                                           ├──► Facebook API
                                           └──► LinkedIn API
                                           │
                                           └──► Analytics → Database
```

### Service Responsibilities

| Service | Responsibility | Scaling |
|---------|---------------|---------|
| **Frontend** | User interface, preview player | Horizontal (3-10 instances) |
| **Backend** | API, business logic, AI orchestration | Horizontal (2-4 instances) |
| **Worker** | Video rendering, social publishing | Vertical + Horizontal (GPU) |
| **PostgreSQL** | Persistent data storage | Vertical + Read replicas |
| **Redis** | Caching, sessions, job queues | Vertical + Cluster |
| **R2 Storage** | File storage, CDN | Managed |

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │   projects   │     │  timelines   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │◄────┤ id (PK)      │◄────┤ id (PK)      │
│ clerk_id     │     │ user_id (FK) │     │ project_id   │
│ email        │     │ name         │     │ name         │
│ name         │     │ description  │     │ duration     │
│ credits      │     │ created_at   │     │ resolution   │
│ tier         │     └──────────────┘     │ fps          │
└──────────────┘                          │ status       │
                                          └──────┬───────┘
                                                 │
                   ┌─────────────────────────────┼─────────────────────────────┐
                   │                             │                             │
                   ▼                             ▼                             ▼
          ┌──────────────┐              ┌──────────────┐              ┌──────────────┐
          │    tracks    │              │    clips     │              │   renders    │
          ├──────────────┤              ├──────────────┤              ├──────────────┤
          │ id (PK)      │              │ id (PK)      │              │ id (PK)      │
          │ timeline_id  │              │ track_id     │              │ timeline_id  │
          │ name         │              │ type         │              │ status       │
          │ type         │              │ start_time   │              │ progress     │
          │ order        │              │ duration     │              │ output_url   │
          └──────────────┘              │ content      │              │ credits_used │
                                        │ source_url   │              │ created_at   │
                                        └──────────────┘              └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ social_accts │     │ scheduled_j  │     │  analytics   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ user_id (FK) │     │ user_id (FK) │     │ video_id     │
│ platform     │     │ name         │     │ platform     │
│ username     │     │ cron_expr    │     │ views        │
│ access_token │     │ is_active    │     │ likes        │
│ refresh_token│     │ last_run     │     │ shares       │
└──────────────┘     └──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  templates   │     │ credit_txns  │     │   batches    │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ name         │     │ user_id (FK) │     │ user_id (FK) │
│ category     │     │ type         │     │ name         │
│ structure    │     │ amount       │     │ status       │
│ is_premium   │     │ description  │     │ progress     │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Table Definitions

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    credits_balance INTEGER DEFAULT 0,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    subscription_status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### timelines
```sql
CREATE TABLE timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 60,
    resolution VARCHAR(50) DEFAULT '1920x1080',
    fps INTEGER DEFAULT 30,
    background_color VARCHAR(7) DEFAULT '#000000',
    transition_type VARCHAR(50) DEFAULT 'fade',
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### tracks
```sql
CREATE TABLE tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- video, audio, text, image, effect
    "order" INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### clips
```sql
CREATE TABLE clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- video, audio, text, image
    start_time DECIMAL(10,3) DEFAULT 0,
    duration DECIMAL(10,3) NOT NULL,
    source_url TEXT,
    thumbnail_url TEXT,
    content JSONB, -- Type-specific content
    metadata JSONB, -- Codec, dimensions, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### renders
```sql
CREATE TABLE renders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'queued', -- queued, rendering, completed, failed
    progress INTEGER DEFAULT 0,
    preset VARCHAR(50) NOT NULL,
    output_url TEXT,
    error_message TEXT,
    credits_used INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### social_accounts
```sql
CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    username VARCHAR(255),
    channel_name VARCHAR(255),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    connected_at TIMESTAMP DEFAULT NOW()
);
```

#### credit_transactions
```sql
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- purchase, deduction, refund, grant
    amount INTEGER NOT NULL, -- Negative for deductions
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_timelines_user_id ON timelines(user_id);
CREATE INDEX idx_timelines_project_id ON timelines(project_id);
CREATE INDEX idx_tracks_timeline_id ON tracks(timeline_id);
CREATE INDEX idx_clips_track_id ON clips(track_id);
CREATE INDEX idx_renders_timeline_id ON renders(timeline_id);
CREATE INDEX idx_renders_status ON renders(status);
CREATE INDEX idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
```

---

## API Design

### RESTful API Structure

```
/api/v1/
├── /auth
│   ├── POST /login
│   ├── POST /logout
│   └── POST /refresh
│
├── /user
│   ├── GET    /         → Get current user
│   └── PATCH  /         → Update profile
│
├── /timelines
│   ├── GET    /                    → List timelines
│   ├── POST   /                    → Create timeline
│   ├── GET    /:id                 → Get timeline
│   ├── PUT    /:id                 → Update timeline
│   ├── DELETE /:id                 → Delete timeline
│   ├── GET    /:id/tracks          → List tracks
│   ├── POST   /:id/tracks          → Create track
│   ├── GET    /:id/clips           → List clips
│   └── POST   /:id/clips           → Create clip
│
├── /tracks
│   ├── PUT    /:id                 → Update track
│   └── DELETE /:id                 → Delete track
│
├── /clips
│   ├── PUT    /:id                 → Update clip
│   └── DELETE /:id                 → Delete clip
│
├── /ai
│   ├── POST   /script              → Generate script
│   ├── POST   /script/enhance      → Enhance script
│   ├── GET    /script-styles       → List styles
│   ├── POST   /scenes              → Generate scenes
│   ├── GET    /image-sources       → List image sources
│   ├── POST   /voice               → Generate voice
│   └── GET    /voices              → List voices
│
├── /templates
│   ├── GET    /                    → List templates
│   ├── GET    /:id                 → Get template
│   └── POST   /:id/use             → Use template
│
├── /social
│   ├── GET    /accounts            → List accounts
│   ├── GET    /auth/:platform      → Get OAuth URL
│   ├── POST   /callback/:platform  → OAuth callback
│   ├── DELETE /accounts/:id        → Disconnect
│   ├── POST   /crosspost           → Cross-post video
│   └── POST   /schedule            → Schedule post
│
├── /credits
│   ├── GET    /balance             → Get balance
│   ├── GET    /transactions        → List transactions
│   └── POST   /purchase            → Purchase credits
│
├── /analytics
│   ├── GET    /dashboard           → Dashboard stats
│   ├── GET    /videos              → Video performance
│   └── GET    /videos/:id          → Video details
│
├── /render
│   ├── POST   /                    → Start render
│   ├── GET    /:id                 → Get status
│   └── DELETE /:id                 → Cancel render
│
└── /batch
    ├── POST   /                    → Create batch
    └── GET    /:id                 → Get status
```

### API Response Format

**Success:**
```json
{
  "data": {
    "id": "uuid",
    "...": "..."
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-02-28T04:30:00Z"
  }
}
```

**List Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {"field": "email", "message": "Required"}
    ]
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

### Authentication Flow

```
┌──────────┐                              ┌──────────┐
│  Client  │                              │  Server  │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  1. Login Request                       │
     │ ──────────────────────────────────────► │
     │                                         │
     │  2. Validate with Clerk                 │
     │     (or other auth provider)            │
     │                                         │
     │  3. Return JWT Token                    │
     │ ◄────────────────────────────────────── │
     │                                         │
     │  4. Store Token (httpOnly cookie)       │
     │                                         │
     │  5. Subsequent Requests                 │
     │ ──────────────────────────────────────► │
     │     Authorization: Bearer {token}       │
     │                                         │
     │  6. Validate JWT                        │
     │     Extract user_id                     │
     │                                         │
     │  7. Process Request                     │
     │ ◄────────────────────────────────────── │
```

---

## Frontend Architecture

### Next.js 15 App Router Structure

```
frontend/src/
├── app/                        # App Router (Next.js 15)
│   ├── layout.tsx             # Root layout with providers
│   ├── page.tsx               # Landing page
│   ├── globals.css            # Global styles
│   │
│   ├── auth/
│   │   └── page.tsx           # Authentication page
│   │
│   ├── dashboard/
│   │   ├── page.tsx           # Dashboard
│   │   ├── layout.tsx         # Dashboard layout
│   │   └── analytics/
│   │       └── page.tsx       # Analytics page
│   │
│   ├── editor/
│   │   ├── page.tsx           # Video editor
│   │   └── layout.tsx         # Editor layout (no nav)
│   │
│   ├── templates/
│   │   └── page.tsx           # Template gallery
│   │
│   └── api/                   # API routes (if needed)
│       └── webhooks/
│           └── route.ts       # Webhook handlers
│
├── components/                # React components
│   ├── ui/                    # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   └── ...
│   │
│   ├── ai/                    # AI-related components
│   │   ├── AIPanel.tsx
│   │   ├── ScriptGenerator.tsx
│   │   ├── SceneGenerator.tsx
│   │   ├── VoiceSelector.tsx
│   │   └── AITimelineGenerator.tsx
│   │
│   ├── editor/                # Editor components
│   │   ├── Timeline.tsx
│   │   ├── Track.tsx
│   │   ├── Clip.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── PropertiesPanel.tsx
│   │   └── Toolbar.tsx
│   │
│   ├── social/                # Social publishing
│   │   ├── PublishModal.tsx
│   │   ├── PlatformSelector.tsx
│   │   └── ScheduleForm.tsx
│   │
│   ├── templates/             # Template components
│   │   ├── TemplateGallery.tsx
│   │   ├── TemplateCard.tsx
│   │   └── TemplatePreview.tsx
│   │
│   └── dashboard/             # Dashboard components
│       ├── DashboardContent.tsx
│       ├── StatsCards.tsx
│       ├── RecentProjects.tsx
│       └── AnalyticsChart.tsx
│
├── hooks/                     # Custom React hooks
│   ├── useAuth.ts
│   ├── useTimeline.ts
│   ├── useRender.ts
│   └── useAnalytics.ts
│
├── lib/                       # Utilities
│   ├── api.ts                 # API client
│   ├── utils.ts               # General utilities
│   ├── constants.ts           # Constants
│   └── ssml.ts                # SSML builder
│
├── contexts/                  # React contexts
│   ├── AuthContext.tsx
│   ├── EditorContext.tsx
│   └── TimelineContext.tsx
│
├── types/                     # TypeScript types
│   ├── index.ts
│   ├── timeline.ts
│   ├── ai.ts
│   └── social.ts
│
└── remotion/                  # Remotion components
    ├── Root.tsx
    ├── compositions/
    │   ├── VideoComposition.tsx
    │   └── PreviewComposition.tsx
    ├── components/
    │   ├── VideoClip.tsx
    │   ├── AudioClip.tsx
    │   ├── TextClip.tsx
    │   └── ImageClip.tsx
    └── hooks/
        └── useTimelineData.ts
```

### State Management

**Local State (useState):**
- Form inputs
- UI toggles
- Modal visibility

**Context (React Context):**
- Authentication state
- Editor state (current timeline)
- Theme preferences

**Server State (React Query/SWR):**
- API data caching
- Real-time sync
- Optimistic updates

**Global State (Zustand):**
- Timeline editor state
- Undo/redo history
- UI preferences

### Component Architecture

**Container/Presentational Pattern:**
```typescript
// Container - Handles data and logic
function TimelineEditorContainer() {
  const { timeline, updateTimeline } = useTimeline();
  const [selectedClip, setSelectedClip] = useState(null);
  
  const handleClipMove = (clipId, newPosition) => {
    updateTimeline({ ... });
  };
  
  return (
    <TimelineEditor
      timeline={timeline}
      selectedClip={selectedClip}
      onClipMove={handleClipMove}
    />
  );
}

// Presentational - Renders UI
function TimelineEditor({ timeline, selectedClip, onClipMove }) {
  return (
    <div className="timeline-editor">
      {timeline.tracks.map(track => (
        <Track key={track.id} track={track} />
      ))}
    </div>
  );
}
```

### Data Flow

```
User Action → Component → Hook → API Client → Backend
                                               │
State Update ← Component ←─── Hook ←───────────┘
     │
     └──► UI Re-render
```

---

## Technology Decisions

### Why Next.js 15?

| Feature | Benefit |
|---------|---------|
| App Router | Simplified routing, layouts |
| Server Components | Reduced client JS |
| Streaming | Progressive loading |
| Edge Runtime | Global performance |
| Image Optimization | Automatic optimization |

### Why Go?

| Feature | Benefit |
|---------|---------|
| Performance | Compiled, fast execution |
| Concurrency | Goroutines for parallel work |
| Type Safety | Strong typing without overhead |
| Deployment | Single binary |
| Ecosystem | Great for microservices |

### Why Remotion?

| Feature | Benefit |
|---------|---------|
| React-based | Same language as frontend |
| Preview/Export | Same code for both |
| Flexibility | Full programmatic control |
| Ecosystem | npm packages work |
| Type Safety | TypeScript throughout |

### Why PostgreSQL?

| Feature | Benefit |
|---------|---------|
| ACID | Data integrity |
| JSONB | Flexible schema |
| Full-text search | Built-in search |
| Extensions | Rich ecosystem |
| Maturity | Battle-tested |

### Architecture Principles

1. **Separation of Concerns**
   - Clear boundaries between layers
   - Each service has single responsibility

2. **Scalability**
   - Horizontal scaling where possible
   - Queue-based job processing
   - CDN for static assets

3. **Type Safety**
   - TypeScript frontend
   - Go backend with strong types
   - Shared type contracts

4. **Developer Experience**
   - Hot reload in development
   - Clear error messages
   - Comprehensive logging

5. **Security**
   - Authentication at API gateway
   - Row-level security in DB
   - Input validation at boundaries

---

**[⬆ Back to Top](#-renderowl-20---architecture-documentation)**
