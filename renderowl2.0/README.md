# 🦉 Renderowl 2.0

**AI-Powered Video Creation Platform**

[![CI](https://github.com/kayorama/renderowl2.0/actions/workflows/ci.yml/badge.svg)](https://github.com/kayorama/renderowl2.0/actions/workflows/ci.yml)
[![Staging](https://github.com/kayorama/renderowl2.0/actions/workflows/deploy-staging.yml/badge.svg)](https://github.com/kayorama/renderowl2.0/actions/workflows/deploy-staging.yml)
[![Production](https://github.com/kayorama/renderowl2.0/actions/workflows/deploy-prod.yml/badge.svg)](https://github.com/kayorama/renderowl2.0/actions/workflows/deploy-prod.yml)

---

## 🏗️ Architecture

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 + React 19 + TypeScript |
| **Backend** | Go 1.22 + Gin + PostgreSQL |
| **Video** | Remotion |
| **Queue** | Redis + BullMQ |
| **Storage** | Cloudflare R2 |
| **Deploy** | Coolify + Docker |

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local dev)
- Go 1.22+ (for local dev)

### Setup Local Environment

```bash
# Clone and setup
git clone https://github.com/kayorama/renderowl2.0.git
cd renderowl2.0
./scripts/setup-local.sh
```

This will:
- ✅ Check all prerequisites
- ✅ Create environment files
- ✅ Start PostgreSQL, Redis, and MinIO
- ✅ Setup git hooks

### Start Development

```bash
# Start all services with Docker
docker-compose up -d

# Or start services individually:

# Terminal 1 - Frontend
cd frontend && npm install && npm run dev

# Terminal 2 - Backend
cd backend && go run ./cmd/api

# Terminal 3 - Worker
cd worker && npm install && npm run dev
```

### Access Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:8080 |
| API Docs | http://localhost:8080/docs |
| MinIO Console | http://localhost:9001 (minioadmin/minioadmin) |
| Queue Monitor | http://localhost:3002 |

---

## 📁 Project Structure

```
renderowl2.0/
├── frontend/              # Next.js 15 application
│   ├── app/              # App Router
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   └── package.json
├── backend/               # Go backend
│   ├── cmd/              # Entry points
│   ├── internal/         # Internal packages
│   ├── pkg/              # Public packages
│   └── go.mod
├── worker/                # Remotion video worker
│   ├── src/              # Worker source
│   └── package.json
├── shared/                # Shared types/contracts
├── .github/workflows/     # CI/CD pipelines
├── scripts/               # Deployment scripts
├── coolify/               # Coolify configuration
└── docker-compose*.yml    # Docker configurations
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR / Push | Run tests, lint, build images |
| `deploy-staging.yml` | Push to `develop` | Deploy to staging |
| `deploy-prod.yml` | Push to `main` / Tag | Deploy to production |

### Deployment Flow

```
Feature Branch → PR → CI Checks → Merge to develop → Auto Deploy Staging
                                      ↓
                              Manual Promote → Merge to main → Auto Deploy Production
```

---

## 🐳 Docker

### Build Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build frontend
docker-compose build backend
docker-compose build worker
```

### Local Development

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Reset (removes volumes!)
docker-compose down -v
```

### Production

```bash
# Production deployment uses Coolify
# See coolify/ directory for configuration
```

---

## 🚀 Deployment

### Staging

Automatically deployed on push to `develop` branch:

```bash
# Manual deployment
./scripts/deploy-staging.sh [tag]
```

**URLs:**
- Frontend: https://staging.renderowl.app
- API: https://api-staging.renderowl.app

### Production

Requires manual trigger with confirmation:

```bash
# Via GitHub Actions (recommended)
# Go to Actions → Deploy to Production → Run workflow

# Or via script
./scripts/deploy-prod.sh v1.0.0
```

**URLs:**
- Frontend: https://renderowl.app
- API: https://api.renderowl.app

---

## 🔧 Environment Variables

### Required for All Environments

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://host:6379

# Storage (S3-compatible)
S3_ENDPOINT=https://...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# Auth
JWT_SECRET=...

# External APIs
OPENAI_API_KEY=...
STRIPE_SECRET_KEY=...
SENTRY_DSN=...
```

See `coolify/.env.*.example` for full templates.

---

## 🧪 Testing

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && go test ./...

# Worker tests
cd worker && npm test

# All tests (CI)
docker-compose -f docker-compose.yml run --rm backend go test ./...
```

---

## 📊 Monitoring

- **Sentry**: Error tracking and performance monitoring
- **Coolify**: Container metrics and logs
- **Bull Board**: Queue monitoring (local dev)

---

## 🔐 Security

- All secrets managed via GitHub Secrets / Coolify Environment
- JWT-based authentication
- Row-level security in PostgreSQL
- Rate limiting on API endpoints
- Security headers via middleware

---

## 📝 Scripts Reference

| Script | Purpose |
|--------|---------|
| `setup-local.sh` | Initial development setup |
| `start.sh` | Start all services |
| `stop.sh` | Stop all services |
| `reset.sh` | Reset environment (destroys data!) |
| `deploy-staging.sh` | Deploy to staging |
| `deploy-prod.sh` | Deploy to production |

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -m "feat: add feature"`
3. Push and create PR: `git push origin feature/my-feature`
4. CI runs automatically
5. Merge to `develop` for staging
6. Promote to `main` for production

---

## 📄 License

Private - All rights reserved.

---

## 🆘 Support

- **Issues**: GitHub Issues
- **Slack**: #renderowl-dev
- **On-call**: See PagerDuty rotation

---

Built with ❤️ by the Renderowl Team
