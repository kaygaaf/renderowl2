# 🚀 Renderowl 2.0 - Deployment Guide

Complete guide for deploying Renderowl 2.0 in local development, staging, and production environments.

---

## Table of Contents

1. [Local Development](#local-development)
2. [Environment Variables](#environment-variables)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Docker Deployment](#docker-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites

Ensure you have the following installed:

| Tool | Version | Install Command |
|------|---------|-----------------|
| Docker | 24.0+ | [Download](https://docs.docker.com/get-docker/) |
| Docker Compose | 2.20+ | Included with Docker Desktop |
| Node.js | 20.x | `brew install node` or [Download](https://nodejs.org/) |
| Go | 1.22+ | `brew install go` or [Download](https://go.dev/) |
| Git | 2.40+ | `brew install git` |
| Make | 4.0+ | `brew install make` |

### Quick Setup

#### Option 1: Automated Setup (Recommended)

```bash
# Clone repository
git clone https://github.com/kayorama/renderowl2.0.git
cd renderowl2.0

# Run setup script
./scripts/setup-local.sh
```

The setup script will:
1. Check all prerequisites
2. Create environment files from templates
3. Start PostgreSQL, Redis, and MinIO containers
4. Install dependencies
5. Setup git hooks

#### Option 2: Manual Setup

**Step 1: Clone and Setup**
```bash
git clone https://github.com/kayorama/renderowl2.0.git
cd renderowl2.0
```

**Step 2: Create Environment Files**
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local

# Worker
cp worker/.env.example worker/.env
```

**Step 3: Start Infrastructure Services**
```bash
docker-compose up -d postgres redis minio
```

**Step 4: Install Dependencies**
```bash
# Frontend
cd frontend && npm install

# Backend (no install needed for Go)
cd ../backend

# Worker
cd ../worker && npm install
```

**Step 5: Run Database Migrations**
```bash
cd backend
make migrate-up
```

### Running Locally

#### Method 1: Docker Compose (All Services)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (destroys data!)
docker-compose down -v
```

#### Method 2: Individual Services (Better for Development)

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 - Backend:**
```bash
cd backend
go run ./cmd/api
# Runs on http://localhost:8080
```

**Terminal 3 - Worker (Optional):**
```bash
cd worker
npm run dev
# Processes render jobs
```

**Terminal 4 - Queue Monitor (Optional):**
```bash
cd worker
npm run bull-board
# Runs on http://localhost:3002
```

### Local Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| API | http://localhost:8080 | - |
| API Docs | http://localhost:8080/docs | - |
| PostgreSQL | localhost:5432 | postgres/postgres |
| Redis | localhost:6379 | - |
| MinIO Console | http://localhost:9001 | minioadmin/minioadmin |
| Queue Monitor | http://localhost:3002 | - |

### Local Development Tips

**Hot Reload:**
- Frontend: Automatic (Next.js)
- Backend: Use `air` for Go hot reload
  ```bash
  cd backend
  air
  ```

**Database Management:**
```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d renderowl

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

**View Logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

---

## Environment Variables

### Backend (.env)

```bash
# ==========================================
# Database
# ==========================================
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/renderowl?sslmode=disable
DATABASE_MAX_CONNECTIONS=20

# ==========================================
# Redis
# ==========================================
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=

# ==========================================
# Storage (S3-compatible)
# ==========================================
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=renderowl
S3_REGION=us-east-1
S3_USE_SSL=false

# ==========================================
# Authentication (Clerk)
# ==========================================
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
JWT_SECRET=your-jwt-secret-min-32-characters

# ==========================================
# AI Service API Keys
# ==========================================
OPENAI_API_KEY=sk-...
TOGETHER_API_KEY=...
ELEVENLABS_API_KEY=...
STABILITY_API_KEY=...
UNSPLASH_ACCESS_KEY=...
PEXELS_API_KEY=...

# ==========================================
# Social Platform OAuth
# ==========================================
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REDIRECT_URL=http://localhost:8080/api/v1/social/callback/youtube

TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
TIKTOK_REDIRECT_URL=http://localhost:8080/api/v1/social/callback/tiktok

INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
INSTAGRAM_REDIRECT_URL=http://localhost:8080/api/v1/social/callback/instagram

TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
TWITTER_REDIRECT_URL=http://localhost:8080/api/v1/social/callback/twitter

FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_REDIRECT_URL=http://localhost:8080/api/v1/social/callback/facebook

LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URL=http://localhost:8080/api/v1/social/callback/linkedin

# ==========================================
# Payment (Stripe)
# ==========================================
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# ==========================================
# Monitoring
# ==========================================
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=development

# ==========================================
# Application
# ==========================================
APP_ENV=development
APP_PORT=8080
LOG_LEVEL=debug
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Frontend (.env.local)

```bash
# ==========================================
# API
# ==========================================
NEXT_PUBLIC_API_URL=http://localhost:8080
API_URL=http://localhost:8080

# ==========================================
# Authentication (Clerk)
# ==========================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ==========================================
# External Services
# ==========================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ==========================================
# Application
# ==========================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Renderowl
```

### Worker (.env)

```bash
# ==========================================
# API
# ==========================================
API_URL=http://localhost:8080
API_KEY=worker-api-key

# ==========================================
# Redis
# ==========================================
REDIS_URL=redis://localhost:6379/0

# ==========================================
# Storage
# ==========================================
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=renderowl
S3_REGION=us-east-1

# ==========================================
# Remotion
# ==========================================
REMOTION_AWS_ACCESS_KEY_ID=
REMOTION_AWS_SECRET_ACCESS_KEY=
REMOTION_AWS_REGION=us-east-1

# ==========================================
# Application
# ==========================================
NODE_ENV=development
LOG_LEVEL=debug
```

### Production Environment Variables

For production, additional variables are needed:

```bash
# ==========================================
# SSL/TLS
# ==========================================
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# ==========================================
# Scaling
# ==========================================
WEB_CONCURRENCY=4
WORKER_CONCURRENCY=2
MAX_WORKERS=10

# ==========================================
# Backups
# ==========================================
BACKUP_S3_BUCKET=renderowl-backups
BACKUP_RETENTION_DAYS=30

# ==========================================
# Feature Flags
# ==========================================
ENABLE_AI_FEATURES=true
ENABLE_SOCIAL_PUBLISH=true
ENABLE_BATCH_PROCESSING=true
```

---

## Staging Deployment

### Overview

Staging environment mirrors production configuration for testing.

**URLs:**
- Frontend: https://staging.renderowl.com
- API: https://staging-api.renderowl.com

### Deployment Process

#### Automatic Deployment

Staging deploys automatically on push to `develop` branch:

```bash
# Make changes
git checkout develop
git add .
git commit -m "feat: new feature"
git push origin develop

# GitHub Actions automatically deploys to staging
```

#### Manual Deployment

```bash
# Deploy specific tag to staging
./scripts/deploy-staging.sh v1.2.3

# Or deploy current branch
./scripts/deploy-staging.sh
```

### Staging Infrastructure

| Component | Specification | Cost |
|-----------|--------------|------|
| Web Servers | 2x 2 vCPU / 4GB RAM | $40/mo |
| Workers | 2x 2 vCPU / 4GB RAM | $40/mo |
| PostgreSQL | 2 vCPU / 4GB RAM | $50/mo |
| Redis | 1 vCPU / 2GB RAM | $20/mo |
| Storage | 100GB SSD | $20/mo |
| Load Balancer | 1 instance | $10/mo |
| **Total** | | **~$180/mo** |

### Verifying Staging Deployment

```bash
# Check health
curl https://staging-api.renderowl.com/health

# Run smoke tests
./scripts/smoke-tests.sh staging

# Check logs
coolify logs staging-renderowl-frontend
coolify logs staging-renderowl-backend
```

---

## Production Deployment

### Overview

Production deployment requires manual approval and follows a blue-green strategy.

**URLs:**
- Frontend: https://app.renderowl.com
- API: https://api.renderowl.com

### Deployment Process

#### Via GitHub Actions (Recommended)

1. Ensure staging is stable
2. Create a release:
   ```bash
   git checkout main
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```

3. Go to GitHub → Actions → "Deploy to Production"
4. Click "Run workflow"
5. Enter version tag: `v1.2.3`
6. Confirm deployment

#### Via Script

```bash
# Deploy specific version
./scripts/deploy-prod.sh v1.2.3

# This will:
# 1. Verify staging health
# 2. Ask for confirmation
# 3. Deploy blue-green
# 4. Run health checks
# 5. Switch traffic
```

### Production Infrastructure

| Component | Specification | Cost |
|-----------|--------------|------|
| Web Servers | 3-10 auto-scaling | $300-1000/mo |
| Workers | 5-20 GPU-enabled | $1500-4000/mo |
| PostgreSQL | 4 vCPU / 16GB RAM | $200/mo |
| Redis | 2 vCPU / 4GB RAM | $50/mo |
| Storage | 1TB SSD + CDN | $100/mo |
| Load Balancers | 2 (HA) | $50/mo |
| Monitoring | Full stack | $100/mo |
| **Total** | | **~$2,300-5,500/mo** |

### Blue-Green Deployment

Production uses blue-green deployment for zero downtime:

```
┌─────────────────┐     ┌─────────────────┐
│   Blue (Live)   │◄────┤   Load Balancer │◄──── Users
│   v1.2.2        │     └─────────────────┘
└─────────────────┘
         │
    Deploy v1.2.3
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Green (New)   │────►│  Health Checks  │
│   v1.2.3        │     └─────────────────┘
└─────────────────┘              │
         │                       │ Pass
         └───────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │  Switch Traffic │
         │  Green → Live   │
         └─────────────────┘
```

### Rollback Procedure

If issues are detected:

```bash
# Quick rollback
./scripts/rollback-prod.sh v1.2.2

# Or via Coolify dashboard:
# 1. Go to Coolify → Projects → renderowl-prod
# 2. Click "Rollback"
# 3. Select previous version
```

### Production Checklist

Before deploying to production:

- [ ] All tests passing in CI
- [ ] Staging environment verified stable for 24h
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] On-call engineer available
- [ ] Monitoring dashboards ready
- [ ] Feature flags configured

---

## Docker Deployment

### Building Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build frontend
docker-compose build backend
docker-compose build worker

# Build for production
docker-compose -f docker-compose.prod.yml build
```

### Running with Docker

**Development:**
```bash
docker-compose up -d
```

**Production:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Pushing to Registry

```bash
# Login
docker login ghcr.io

# Tag images
docker tag renderowl-frontend:latest ghcr.io/kayorama/renderowl-frontend:v1.2.3
docker tag renderowl-backend:latest ghcr.io/kayorama/renderowl-backend:v1.2.3
docker tag renderowl-worker:latest ghcr.io/kayorama/renderowl-worker:v1.2.3

# Push
docker push ghcr.io/kayorama/renderowl-frontend:v1.2.3
docker push ghcr.io/kayorama/renderowl-backend:v1.2.3
docker push ghcr.io/kayorama/renderowl-worker:v1.2.3
```

### Docker Image Structure

**Frontend:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Backend:**
```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o api ./cmd/api

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/api .
EXPOSE 8080
CMD ["./api"]
```

---

## Coolify Deployment

### Setup

1. **Add Server:**
   - Go to Coolify Dashboard
   - Add your VPS (91.98.168.113)
   - Verify connection

2. **Create Project:**
   - Name: `renderowl-prod`
   - Connect GitHub repository

3. **Configure Services:**
   - Import `coolify/docker-compose.prod.yml`
   - Set environment variables
   - Configure domains

4. **Deploy:**
   - Click "Deploy"
   - Monitor logs
   - Verify health checks

### Coolify Configuration Files

**coolify/docker-compose.prod.yml:**
```yaml
version: '3.8'
services:
  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`app.renderowl.com`)"
  
  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    environment:
      - APP_ENV=production
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`api.renderowl.com`)"
```

---

## Troubleshooting

### Common Issues

#### Database Connection Failed
```
Error: connection refused
```
**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart database
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

#### Redis Connection Failed
```
Error: Redis connection failed
```
**Solution:**
```bash
# Check Redis
docker-compose exec redis redis-cli ping

# Should return PONG
```

#### Frontend Build Errors
```
Module not found
```
**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Backend Won't Start
```
port already in use
```
**Solution:**
```bash
# Find process using port 8080
lsof -ti:8080 | xargs kill -9

# Or change port in .env
APP_PORT=8081
```

#### Migration Errors
```
migration failed
```
**Solution:**
```bash
cd backend

# Rollback last migration
make migrate-down

# Re-run
make migrate-up

# Or reset all
make migrate-reset
```

### Health Check Commands

```bash
# Check all services
curl http://localhost:8080/health
curl http://localhost:3000
docker-compose ps

# Check database
docker-compose exec postgres pg_isready -U postgres

# Check Redis
docker-compose exec redis redis-cli ping

# Check storage
aws --endpoint-url=http://localhost:9000 s3 ls
```

### Getting Help

If issues persist:

1. Check logs: `docker-compose logs`
2. Review error messages carefully
3. Check environment variables
4. Verify all services are running
5. Consult [GitHub Issues](https://github.com/kayorama/renderowl2.0/issues)

---

**[⬆ Back to Top](#-renderowl-20---deployment-guide)**
