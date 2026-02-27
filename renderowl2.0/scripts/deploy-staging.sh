#!/bin/bash
# Deploy to Staging Environment
# Usage: ./scripts/deploy-staging.sh [tag]

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
    exit 1
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

# Configuration
STAGING_HOST="${STAGING_HOST:-staging.renderowl.app}"
STAGING_USER="${STAGING_USER:-root}"
TAG="${1:-staging-latest}"
REGISTRY="${REGISTRY:-ghcr.io/kayorama}"

log "🚀 Starting staging deployment..."
log "   Tag: $TAG"
log "   Host: $STAGING_HOST"

# Check prerequisites
command -v ssh >/dev/null 2>&1 || error "ssh is required"
command -v scp >/dev/null 2>&1 || error "scp is required"

# Verify images exist
log "🔍 Verifying images in registry..."
docker manifest inspect "${REGISTRY}/renderowl-frontend:${TAG}" >/dev/null 2>&1 || error "Frontend image not found: ${REGISTRY}/renderowl-frontend:${TAG}"
docker manifest inspect "${REGISTRY}/renderowl-backend:${TAG}" >/dev/null 2>&1 || error "Backend image not found: ${REGISTRY}/renderowl-backend:${TAG}"
success "Images verified"

# Deploy to staging server
log "📦 Deploying to staging server..."
ssh "${STAGING_USER}@${STAGING_HOST}" << EOF
    set -e
    
    echo "Pulling latest images..."
    cd /opt/renderowl/staging
    
    # Pull new images
    docker pull "${REGISTRY}/renderowl-frontend:${TAG}"
    docker pull "${REGISTRY}/renderowl-backend:${TAG}"
    docker pull "${REGISTRY}/renderowl-worker:${TAG}"
    
    # Update environment
    echo "TAG=${TAG}" > .env.deploy
    
    # Restart services
    echo "Restarting services..."
    docker-compose -f docker-compose.prod.yml up -d --no-deps --build frontend backend worker
    
    # Clean up old images
    docker image prune -f
    
    echo "Deployment complete!"
EOF

# Wait for services to be ready
log "⏳ Waiting for services to be healthy..."
sleep 10

# Health checks
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    FRONTEND_HEALTH=$(curl -sf "https://${STAGING_HOST}/api/health" && echo "healthy" || echo "unhealthy")
    BACKEND_HEALTH=$(curl -sf "https://api-${STAGING_HOST}/health" && echo "healthy" || echo "unhealthy")
    
    if [ "$FRONTEND_HEALTH" = "healthy" ] && [ "$BACKEND_HEALTH" = "healthy" ]; then
        success "✅ All services are healthy!"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    warn "Health check attempt $RETRY_COUNT/$MAX_RETRIES failed. Retrying..."
    sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    error "❌ Health checks failed after $MAX_RETRIES attempts"
fi

success "🎉 Staging deployment complete!"
log "   Frontend: https://${STAGING_HOST}"
log "   API: https://api-${STAGING_HOST}"
