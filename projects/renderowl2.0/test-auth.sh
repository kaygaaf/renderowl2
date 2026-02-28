#!/bin/bash
# Test script for Renderowl 2.0 Auth Integration

echo "🧪 Testing Renderowl 2.0 Auth Integration"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo ""
echo "📡 Checking Backend..."
if curl -s http://localhost:8080/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
    curl -s http://localhost:8080/health | jq .
else
    echo -e "${RED}❌ Backend is not running on localhost:8080${NC}"
    echo "   Start it with: cd backend && go run cmd/api/main.go"
fi

# Check if frontend is running
echo ""
echo "🎨 Checking Frontend..."
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend is not running on localhost:3000${NC}"
    echo "   Start it with: cd frontend && npm run dev"
fi

# Check environment files
echo ""
echo "🔐 Checking Environment Configuration..."

if [ -f "backend/.env" ]; then
    if grep -q "CLERK_SECRET_KEY" backend/.env; then
        echo -e "${GREEN}✅ Backend .env has CLERK_SECRET_KEY${NC}"
    else
        echo -e "${RED}❌ Backend .env missing CLERK_SECRET_KEY${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Backend .env not found (copy from .env.example)${NC}"
fi

if [ -f "frontend/.env.local" ]; then
    if grep -q "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" frontend/.env.local; then
        echo -e "${GREEN}✅ Frontend .env.local has Clerk key${NC}"
    else
        echo -e "${RED}❌ Frontend .env.local missing Clerk key${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Frontend .env.local not found (copy from .env.example)${NC}"
fi

# Check builds
echo ""
echo "🔨 Checking Builds..."

if [ -d "frontend/.next" ]; then
    echo -e "${GREEN}✅ Frontend has been built${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend not built yet (run: npm run build)${NC}"
fi

if [ -f "/tmp/renderowl-api" ]; then
    echo -e "${GREEN}✅ Backend builds successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Backend binary not found${NC}"
fi

# Test API endpoints (without auth)
echo ""
echo "🌐 Testing API Endpoints..."

# Health check
echo -n "Health check: "
if curl -s http://localhost:8080/health | grep -q "healthy"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
fi

# Auth endpoints (should return 401 without token)
echo -n "Auth /me (no token): "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/auth/me)
if [ "$RESPONSE" = "401" ]; then
    echo -e "${GREEN}OK (401 as expected)${NC}"
else
    echo -e "${YELLOW}Got $RESPONSE (expected 401)${NC}"
fi

echo ""
echo "=========================================="
echo "🚀 Ready to test! Follow these steps:"
echo ""
echo "1. Ensure backend is running:"
echo "   cd backend && go run cmd/api/main.go"
echo ""
echo "2. Ensure frontend is running:"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Visit http://localhost:3000 and click 'Get Started'"
echo ""
echo "4. Sign up with Clerk"
echo ""
echo "5. Verify:"
echo "   - Redirected to /dashboard"
echo "   - User created in backend"
echo "   - 100 credits assigned"
echo "   - Can create timelines"
echo ""
echo "=========================================="
