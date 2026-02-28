#!/bin/bash
# Renderowl 2.0 - Production Deployment Script
# Usage: ./scripts/deploy-prod.sh [version]

set -e

VERSION=${1:-latest}
COOLIFY_PROJECT_ID="dw8koss8w0ock4kwkg8kgcs4"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Renderowl 2.0 Production Deployer${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if version is provided
if [ "$VERSION" == "latest" ]; then
    echo -e "${YELLOW}⚠️  No version specified. Using 'latest' tag.${NC}"
    echo -e "${YELLOW}   Recommended: Use a specific version tag (e.g., v1.0.0)${NC}"
    echo ""
fi

echo -e "${BLUE}Deployment Details:${NC}"
echo "  Version: $VERSION"
echo "  Project: Renderowl2 Production"
echo "  Project ID: $COOLIFY_PROJECT_ID"
echo ""

# Confirmation
if [ "$VERSION" != "latest" ]; then
    echo -e "${YELLOW}⚠️  You are deploying to PRODUCTION!${NC}"
    read -p "Type 'DEPLOY' to confirm: " confirm
    
    if [ "$confirm" != "DEPLOY" ]; then
        echo -e "${RED}❌ Deployment cancelled.${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}Starting deployment...${NC}"
echo ""

# Check required environment variables
if [ -z "$COOLIFY_API_KEY" ]; then
    echo -e "${RED}❌ COOLIFY_API_KEY not set${NC}"
    exit 1
fi

if [ -z "$COOLIFY_URL" ]; then
    echo -e "${RED}❌ COOLIFY_URL not set${NC}"
    exit 1
fi

# Application UUIDs
FRONTEND_UUID="q4scks4osww0g0osc0s00o8k"
BACKEND_UUID="fkk0cswckcos4ossoo0cks0g"
WORKER_UUID="ew4084gcc844400g80sscskk"

echo -e "${BLUE}Step 1: Deploying Frontend...${NC}"
curl -X POST \
    "${COOLIFY_URL}/api/v1/applications/${FRONTEND_UUID}/deploy" \
    -H "Authorization: Bearer ${COOLIFY_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"tag\": \"${VERSION}\", \"force\": false}" || true

echo -e "${GREEN}✅ Frontend deployment triggered${NC}"
echo ""

sleep 5

echo -e "${BLUE}Step 2: Deploying Backend...${NC}"
curl -X POST \
    "${COOLIFY_URL}/api/v1/applications/${BACKEND_UUID}/deploy" \
    -H "Authorization: Bearer ${COOLIFY_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"tag\": \"${VERSION}\", \"force\": false}" || true

echo -e "${GREEN}✅ Backend deployment triggered${NC}"
echo ""

sleep 5

echo -e "${BLUE}Step 3: Deploying Worker...${NC}"
curl -X POST \
    "${COOLIFY_URL}/api/v1/applications/${WORKER_UUID}/deploy" \
    -H "Authorization: Bearer ${COOLIFY_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"tag\": \"${VERSION}\", \"force\": false}" || true

echo -e "${GREEN}✅ Worker deployment triggered${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ All deployments triggered!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Monitor deployment status at:"
echo "  $COOLIFY_URL/project/$COOLIFY_PROJECT_ID"
echo ""
echo "Health check endpoints:"
echo "  Frontend: https://app.renderowl.com/api/health"
echo "  Backend:  https://api.renderowl.com/health"
echo ""
