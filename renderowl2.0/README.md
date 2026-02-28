# 🦉 Renderowl 2.0

> **AI-Powered Video Creation & Social Media Automation Platform**

[![CI](https://img.shields.io/badge/CI-Passing-brightgreen)](https://github.com/kayorama/renderowl2.0)
[![Staging](https://img.shields.io/badge/Staging-Live-blue)](https://staging.renderowl.com)
[![Production](https://img.shields.io/badge/Production-Ready-success)](https://app.renderowl.com)
[![License](https://img.shields.io/badge/License-Private-red)]()

---

## 🎯 What is Renderowl 2.0?

Renderowl 2.0 is the ultimate AI-powered video creation platform that takes you from **idea to published content** in minutes. It's a complete rebuild of Renderowl with modern architecture, AI-first design, and seamless social media integration.

### The Vision: "One Platform to Rule Them All"

Instead of using separate tools for script writing, video editing, voice generation, and social posting — Renderowl 2.0 does it all in one unified platform.

```
Idea → AI Script → AI Scenes → AI Voice → Edit → Export → Publish (6 platforms)
                        ↓
                   All in one tool!
```

---

## ✨ Key Features

### 🤖 AI-Powered Creation
| Feature | Description |
|---------|-------------|
| **AI Script Writer** | Generate professional video scripts from simple prompts |
| **AI Scene Generator** | Auto-create visual scenes with images from Unsplash, Pexels, DALL-E, or Stability AI |
| **AI Voice/Narration** | Professional text-to-speech with 1000+ voices from ElevenLabs and OpenAI |
| **One-Click Timeline** | Convert AI output directly into editable timeline |

### 🎬 Professional Video Editor
| Feature | Description |
|---------|-------------|
| **Multi-track Timeline** | Drag-and-drop editing with Video, Audio, and Text tracks |
| **Real-time Preview** | Remotion-powered player for instant video preview |
| **Template Library** | 10+ professional templates (YouTube, TikTok, Educational, etc.) |
| **Export Options** | 10 presets including 4K, HD, Web, and social-optimized formats |

### 📱 Social Media Automation
| Feature | Description |
|---------|-------------|
| **6 Platform Integration** | YouTube, TikTok, Instagram, X, Facebook, LinkedIn |
| **Cross-posting** | Publish to multiple platforms simultaneously |
| **Auto-Scheduling** | Schedule posts for optimal engagement times |
| **OAuth Connections** | Secure platform authentication |

### 📊 Analytics Dashboard
| Feature | Description |
|---------|-------------|
| **Video Performance** | Track views, engagement, and retention |
| **Platform Breakdown** | Per-platform analytics comparison |
| **Growth Metrics** | Follower/subscriber trends over time |
| **Revenue Tracking** | Monitor subscription and credit usage |

### ⚡ Automation Features
| Feature | Description |
|---------|-------------|
| **Batch Generation** | Create 10-30 videos at once |
| **Content Calendar** | Schedule a month of content in advance |
| **Auto-Optimization** | Improve content based on performance data |
| **AI Content Factory** | Trending topics → Published content pipeline |

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 15 + React 19 + TypeScript | Modern SSR, App Router, type safety |
| **Backend** | Go 1.22 + Gin + PostgreSQL | High-performance API, concurrent processing |
| **Video Processing** | Remotion | React-based video rendering, unified stack |
| **AI/ML** | OpenAI, Together AI, ElevenLabs | LLM for scripts, voice synthesis, image generation |
| **Queue System** | Redis + BullMQ | Job processing, scheduling, rate limiting |
| **Storage** | Cloudflare R2 | S3-compatible, no egress fees |
| **Authentication** | Clerk | Modern auth with JWT |
| **Deployment** | Coolify + Docker | Simplified ops, auto-deploy |

---

## 🚀 Quick Start

### Prerequisites

- **Docker** & Docker Compose
- **Node.js** 20+ (for local development)
- **Go** 1.22+ (for local development)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/kayorama/renderowl2.0.git
cd renderowl2.0
```

### 2. Run Setup Script

```bash
./scripts/setup-local.sh
```

This will:
- ✅ Check all prerequisites
- ✅ Create environment files from templates
- ✅ Start PostgreSQL, Redis, and MinIO containers
- ✅ Install dependencies
- ✅ Setup git hooks

### 3. Start Development

**Option A: Docker (Recommended for quick start)**
```bash
docker-compose up -d
```

**Option B: Local Development (Better for active development)**

Terminal 1 - Frontend:
```bash
cd frontend && npm install && npm run dev
```

Terminal 2 - Backend:
```bash
cd backend && go run ./cmd/api
```

Terminal 3 - Worker (optional):
```bash
cd worker && npm install && npm run dev
```

### 4. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Main application |
| API | http://localhost:8080 | Backend API |
| API Docs | http://localhost:8080/docs | Swagger documentation |
| MinIO Console | http://localhost:9001 | Storage management (minioadmin/minioadmin) |
| Queue Monitor | http://localhost:3002 | Bull Board queue UI |

---

## 📸 Screenshots

### Landing Page
*Hero section with features showcase and CTA*

### Dashboard
*User dashboard with stats, recent projects, and quick actions*

### Timeline Editor
*Multi-track video editor with drag-and-drop interface*

### AI Generation Panel
*AI tools for script, scene, and voice generation*

### Template Gallery
*Browse and preview professional video templates*

### Publish Modal
*Cross-post to multiple social platforms*

### Analytics Dashboard
*Track performance across all platforms*

---

## 📁 Project Structure

```
renderowl2.0/
├── 📁 frontend/              # Next.js 15 application
│   ├── 📁 app/              # App Router
│   │   ├── 📄 page.tsx      # Landing page
│   │   ├── 📁 auth/         # Authentication pages
│   │   ├── 📁 dashboard/    # User dashboard
│   │   ├── 📁 templates/    # Template gallery
│   │   └── 📁 editor/       # Video editor
│   ├── 📁 components/       # React components
│   │   ├── 📁 ai/           # AI generation components
│   │   ├── 📁 social/       # Social publishing components
│   │   ├── 📁 templates/    # Template components
│   │   ├── 📁 dashboard/    # Dashboard components
│   │   └── 📁 editor/       # Editor components
│   ├── 📁 lib/              # Utilities and API client
│   └── 📁 remotion/         # Remotion video components
│
├── 📁 backend/              # Go backend
│   ├── 📁 cmd/api/          # Entry point
│   ├── 📁 internal/
│   │   ├── 📁 handlers/     # HTTP handlers
│   │   ├── 📁 service/      # Business logic
│   │   ├── 📁 repository/   # Database layer
│   │   └── 📁 middleware/   # Auth, CORS, etc.
│   └── 📄 go.mod
│
├── 📁 worker/               # Remotion video worker
│   ├── 📁 src/              # Worker source
│   └── 📄 package.json
│
├── 📁 shared/               # Shared types/contracts
│
├── 📁 docs/                 # Documentation
│   ├── 📄 USER_FLOW.md      # Complete user flow
│   ├── 📄 API_DOCUMENTATION.md
│   ├── 📄 DEPLOYMENT_GUIDE.md
│   ├── 📄 ARCHITECTURE.md
│   └── 📄 CONTRIBUTING.md
│
├── 📁 scripts/              # Deployment and utility scripts
├── 📁 coolify/              # Coolify configuration
├── 📄 docker-compose.yml    # Development Docker config
└── 📄 docker-compose.prod.yml # Production Docker config
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Complete API reference with examples |
| [USER_GUIDE.md](docs/USER_GUIDE.md) | Step-by-step user guide |
| [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Local, staging, and production deployment |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and architecture |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | How to contribute to the project |
| [AI_FEATURES.md](AI_FEATURES.md) | AI capabilities documentation |

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR / Push to any branch | Run tests, lint, build images |
| `deploy-staging.yml` | Push to `develop` | Auto-deploy to staging |
| `deploy-prod.yml` | Push to `main` / Tag | Deploy to production |

### Deployment Flow

```
Feature Branch ──► PR ──► CI Checks ──► Merge to develop ──► Auto Deploy Staging
                                                          │
                                                          ▼
                                              Manual Promote ──► Merge to main ──► Auto Deploy Production
```

---

## 🌐 Environments

| Environment | URL | Status |
|-------------|-----|--------|
| **Staging** | https://staging.renderowl.com | ✅ Live |
| **Staging API** | https://staging-api.renderowl.com | ✅ Live |
| **Production** | https://app.renderowl.com | ✅ Ready |
| **Production API** | https://api.renderowl.com | ✅ Ready |

---

## 🧪 Testing

```bash
# Run integration verification
./scripts/verify-integration.sh

# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && go test ./...

# Worker tests
cd worker && npm test

# E2E tests
cd frontend && npm run test:e2e
```

---

## 📊 Monitoring & Observability

- **Sentry** - Error tracking and performance monitoring
- **Coolify** - Container metrics and logs
- **Bull Board** - Queue monitoring (local development)
- **PostgreSQL** - Database metrics via pg_stat_statements

---

## 🔐 Security

- All secrets managed via GitHub Secrets / Coolify Environment
- JWT-based authentication (Clerk)
- Row-level security in PostgreSQL
- Rate limiting on API endpoints
- Security headers via middleware
- CORS properly configured
- Input validation on all endpoints

---

## 💰 Cost Estimates

### Staging Environment
- **$430/month**
- 2x web servers, 2x workers, PostgreSQL, Redis

### Production Environment
- **$3,000/month**
- 3-10 auto-scaling web servers, 5-20 GPU workers
- Blue-green deployment for zero downtime

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

Quick start:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Commit: `git commit -m "feat: add feature"`
5. Push: `git push origin feature/my-feature`
6. Create a Pull Request

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/kayorama/renderowl2.0/issues)
- **Documentation**: See `/docs` folder
- **Slack**: #renderowl-dev

---

## 📄 License

Private - All rights reserved.

---

## 🎉 Integration Status

**ALL SYSTEMS INTEGRATED!** ✅

- ✅ AI → Timeline: Complete
- ✅ Templates → Editor: Complete
- ✅ Social → Publish: Complete
- ✅ Full User Flow: Complete

---

Built with ❤️ by the Renderowl Team

**[⬆ Back to Top](#-renderowl-20)**
