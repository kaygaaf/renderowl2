#!/bin/bash
# Setup Local Development Environment
# Usage: ./scripts/setup-local.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARN:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

log "🚀 Setting up Renderowl 2.0 local development environment..."

# Check prerequisites
log "🔍 Checking prerequisites..."

# Docker
if ! command -v docker >/dev/null 2>&1; then
    error "Docker is not installed. Please install Docker: https://docs.docker.com/get-docker/"
fi
DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
log "   ✓ Docker: $DOCKER_VERSION"

# Docker Compose
if ! docker compose version >/dev/null 2>&1; then
    error "Docker Compose is not available"
fi
success "   ✓ Docker Compose"

# Node.js
if ! command -v node >/dev/null 2>&1; then
    warn "Node.js is not installed. You'll need it for local development."
    warn "   Install from: https://nodejs.org/ (v20 recommended)"
else
    NODE_VERSION=$(node --version)
    log "   ✓ Node.js: $NODE_VERSION"
fi

# Go
if ! command -v go >/dev/null 2>&1; then
    warn "Go is not installed. You'll need it for backend development."
    warn "   Install from: https://go.dev/dl/ (v1.22 recommended)"
else
    GO_VERSION=$(go version | awk '{print $3}')
    log "   ✓ Go: $GO_VERSION"
fi

# Create environment files
log "📝 Creating environment files..."

# Root .env
cat > "$PROJECT_DIR/.env" << 'EOF'
# Renderowl 2.0 - Local Development Environment
# Copy this to .env.local and add your secrets

# Database
DATABASE_URL=postgres://renderowl:renderowl_dev@localhost:5432/renderowl_dev?sslmode=disable

# Redis
REDIS_URL=redis://localhost:6379

# Storage (MinIO for local dev)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_UPLOADS=renderowl-uploads
S3_BUCKET_EXPORTS=renderowl-exports

# JWT
JWT_SECRET=dev-jwt-secret-change-in-production

# External Services (add your keys to .env.local)
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
SENTRY_DSN=

# Application URLs
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# Frontend .env
cat > "$PROJECT_DIR/frontend/.env.local" << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EOF

# Backend .env
cat > "$PROJECT_DIR/backend/.env" << 'EOF'
ENVIRONMENT=development
PORT=8080
DATABASE_URL=postgres://renderowl:renderowl_dev@localhost:5432/renderowl_dev?sslmode=disable
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-change-in-production

S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_UPLOADS=renderowl-uploads
S3_BUCKET_EXPORTS=renderowl-exports

OPENAI_API_KEY=
STRIPE_SECRET_KEY=
SENTRY_DSN=
EOF

# Worker .env
cat > "$PROJECT_DIR/worker/.env" << 'EOF'
NODE_ENV=development
REDIS_URL=redis://localhost:6379
API_URL=http://localhost:8080

S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_UPLOADS=renderowl-uploads
S3_BUCKET_EXPORTS=renderowl-exports

OPENAI_API_KEY=
CONCURRENT_JOBS=2
EOF

success "Environment files created"

# Start infrastructure services
log "🐳 Starting infrastructure services (PostgreSQL, Redis, MinIO)..."
cd "$PROJECT_DIR"
docker-compose up -d postgres redis minio minio-create-buckets

# Wait for services to be ready
log "⏳ Waiting for services to be ready..."
sleep 5

# Check PostgreSQL
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose exec -T postgres pg_isready -U renderowl >/dev/null 2>&1; then
        success "PostgreSQL is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log "Waiting for PostgreSQL... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    error "PostgreSQL failed to start"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
    success "Redis is ready"
else
    error "Redis failed to start"
fi

# Check MinIO
if curl -sf http://localhost:9000/minio/health/live >/dev/null 2>&1; then
    success "MinIO is ready"
    log "   MinIO Console: http://localhost:9001 (minioadmin / minioadmin)"
else
    warn "MinIO may not be fully ready yet"
fi

# Setup git hooks (optional)
log "🔗 Setting up git hooks..."
if [ -d "$PROJECT_DIR/.git" ]; then
    cat > "$PROJECT_DIR/.git/hooks/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit hook for Renderowl

echo "Running pre-commit checks..."

# Check for secrets
git diff --cached --name-only | xargs grep -l "password\|secret\|token" 2>/dev/null | while read file; do
    if echo "$file" | grep -q "\.env"; then
        echo "⚠️  Warning: You may be committing a file with credentials: $file"
        echo "    Make sure this is intentional!"
    fi
done

# Run linting if package.json exists
if [ -f "frontend/package.json" ]; then
    (cd frontend && npm run lint) || exit 1
fi

exit 0
EOF
    chmod +x "$PROJECT_DIR/.git/hooks/pre-commit"
    success "Git pre-commit hook installed"
fi

# Create convenience scripts
log "📜 Creating convenience scripts..."

# Start script
cat > "$PROJECT_DIR/scripts/start.sh" << 'EOF'
#!/bin/bash
# Start all services for local development

echo "🚀 Starting Renderowl services..."
docker-compose up -d

echo ""
echo "Services starting up..."
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8080"
echo "  MinIO Console: http://localhost:9001 (minioadmin / minioadmin)"
echo "  Bull Board: http://localhost:3002"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
EOF
chmod +x "$PROJECT_DIR/scripts/start.sh"

# Stop script
cat > "$PROJECT_DIR/scripts/stop.sh" << 'EOF'
#!/bin/bash
# Stop all services

echo "🛑 Stopping Renderowl services..."
docker-compose down
EOF
chmod +x "$PROJECT_DIR/scripts/stop.sh"

# Reset script
cat > "$PROJECT_DIR/scripts/reset.sh" << 'EOF'
#!/bin/bash
# Reset local environment (WARNING: destroys all data!)

echo "⚠️  WARNING: This will delete all local data!"
read -p "Type 'RESET' to continue: " confirm

if [ "$confirm" = "RESET" ]; then
    docker-compose down -v
    docker-compose up -d
    echo "✅ Environment reset"
else
    echo "Cancelled"
fi
EOF
chmod +x "$PROJECT_DIR/scripts/reset.sh"

success "Convenience scripts created"

# Summary
echo ""
echo "=========================================="
success "🎉 Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Add your API keys to .env.local files"
echo "  2. Start all services: ./scripts/start.sh"
echo "  3. Or start specific services:"
echo "     - Frontend: cd frontend && npm install && npm run dev"
echo "     - Backend: cd backend && go run ./cmd/api"
echo "     - Worker: cd worker && npm install && npm run dev"
echo ""
echo "Services will be available at:"
echo "  🌐 Frontend: http://localhost:3000"
echo "  🔌 API: http://localhost:8080"
echo "  💾 MinIO: http://localhost:9001 (minioadmin / minioadmin)"
echo "  📊 Bull Board: http://localhost:3002"
echo ""
echo "Happy coding! 🚀"
