#!/bin/bash
# Deploy to Production Environment
# Usage: ./scripts/deploy-prod.sh [version]

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
PROD_HOST="${PROD_HOST:-renderowl.app}"
PROD_USER="${PROD_USER:-root}"
VERSION="${1:-}"
REGISTRY="${REGISTRY:-ghcr.io/kayorama}"

if [ -z "$VERSION" ]; then
    error "Version is required. Usage: ./scripts/deploy-prod.sh v1.0.0"
fi

log "🚀 Starting PRODUCTION deployment..."
log "   Version: $VERSION"
log "   Host: $PROD_HOST"

# Safety check
echo -e "${YELLOW}"
echo "⚠️  WARNING: You are about to deploy to PRODUCTION!"
echo "   Version: $VERSION"
echo -e "${NC}"
read -p "Type 'DEPLOY' to continue: " confirm

if [ "$confirm" != "DEPLOY" ]; then
    error "Deployment cancelled by user"
fi

# Check prerequisites
command -v ssh >/dev/null 2>&1 || error "ssh is required"

# Verify staging is healthy first
log "🔍 Verifying staging health before production deploy..."
STAGING_HEALTH=$(curl -sf "https://staging.renderowl.app/api/health" && echo "healthy" || echo "unhealthy")

if [ "$STAGING_HEALTH" != "healthy" ]; then
    error "❌ Staging is unhealthy! Fix staging before deploying to production."
fi
success "✅ Staging is healthy"

# Verify images exist
log "🔍 Verifying images in registry..."
docker manifest inspect "${REGISTRY}/renderowl-frontend:${VERSION}" >/dev/null 2>&1 || error "Frontend image not found: ${REGISTRY}/renderowl-frontend:${VERSION}"
docker manifest inspect "${REGISTRY}/renderowl-backend:${VERSION}" >/dev/null 2>&1 || error "Backend image not found: ${REGISTRY}/renderowl-backend:${VERSION}"
success "Images verified"

# Pre-deployment backup
log "💾 Creating pre-deployment backup..."
ssh "${PROD_USER}@${PROD_HOST}" "cd /opt/renderowl/production && docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U renderowl renderowl_prod > backup-pre-$(date +%Y%m%d-%H%M%S).sql" || warn "Backup may have failed, continuing..."

# Deploy to production (blue-green style)
log "📦 Deploying to production..."
ssh "${PROD_USER}@${PROD_HOST}" << EOF
    set -e
    
    cd /opt/renderowl/production
    
    # Pull new images
    echo "Pulling images version ${VERSION}..."
    docker pull "${REGISTRY}/renderowl-frontend:${VERSION}"
    docker pull "${REGISTRY}/renderowl-backend:${VERSION}"
    docker pull "${REGISTRY}/renderowl-worker:${VERSION}"
    
    # Update environment
    echo "TAG=${VERSION}" > .env.deploy
    
    # Rolling update - backend first
    echo "Updating backend..."
    docker-compose -f docker-compose.prod.yml up -d --no-deps --scale backend=2 backend
    sleep 10
    docker-compose -f docker-compose.prod.yml up -d --no-deps --scale backend=1 backend
    
    # Then frontend
    echo "Updating frontend..."
    docker-compose -f docker-compose.prod.yml up -d --no-deps --scale frontend=2 frontend
    sleep 10
    docker-compose -f docker-compose.prod.yml up -d --no-deps --scale frontend=1 frontend
    
    # Finally workers
    echo "Updating workers..."
    docker-compose -f docker-compose.prod.yml up -d --no-deps worker
    
    # Clean up
    docker image prune -f
    
    echo "Deployment complete!"
EOF

# Health checks
log "⏳ Running production health checks..."
sleep 15

MAX_RETRIES=15
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    FRONTEND_HEALTH=$(curl -sf "https://${PROD_HOST}/api/health" && echo "healthy" || echo "unhealthy")
    BACKEND_HEALTH=$(curl -sf "https://api.${PROD_HOST}/health" && echo "healthy" || echo "unhealthy")
    
    if [ "$FRONTEND_HEALTH" = "healthy" ] && [ "$BACKEND_HEALTH" = "healthy" ]; then
        success "✅ All production services are healthy!"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    warn "Health check attempt $RETRY_COUNT/$MAX_RETRIES failed. Retrying..."
    sleep 10
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    error "❌ Production health checks failed! Consider rollback."
fi

# Notify
success "🎉 PRODUCTION deployment complete!"
log "   Frontend: https://${PROD_HOST}"
log "   API: https://api.${PROD_HOST}"
log "   Version: ${VERSION}"
