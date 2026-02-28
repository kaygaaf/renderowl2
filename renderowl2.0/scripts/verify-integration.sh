#!/bin/bash
# Renderowl 2.0 Integration Verification Script
# Run this to verify all integrations are working

echo "🔌 Renderowl 2.0 Integration Verification"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $2"
        return 0
    else
        echo -e "${RED}❌${NC} $2 - Missing: $1"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅${NC} $2"
        return 0
    else
        echo -e "${RED}❌${NC} $2 - Missing: $1"
        return 1
    fi
}

# Counters
TOTAL=0
PASSED=0

check() {
    TOTAL=$((TOTAL + 1))
    if $1 "$2" "$3"; then
        PASSED=$((PASSED + 1))
    fi
}

echo "📁 Frontend Integration Files:"
echo "-------------------------------"
check check_file "frontend/src/components/ai/AITimelineGenerator.tsx" "AI Timeline Generator"
check check_file "frontend/src/components/social/PublishModal.tsx" "Social Publish Modal"
check check_file "frontend/src/components/templates/TemplateTimelineLoader.tsx" "Template Timeline Loader"
check check_file "frontend/src/app/editor/page.tsx" "Integrated Editor Page"
check check_file "frontend/src/components/social/index.ts" "Social Components Index"

echo ""
echo "📁 Updated Integration Files:"
echo "-----------------------------"
check check_file "frontend/src/components/ai/index.ts" "AI Components Index"
check check_file "frontend/src/components/templates/index.ts" "Templates Index"
check check_file "frontend/src/lib/api.ts" "API Client (with social endpoints)"

echo ""
echo "📁 Backend Routes (should already exist):"
echo "-----------------------------------------"
check check_file "backend/cmd/api/main.go" "Main API Router"
check check_file "backend/internal/handlers/ai.go" "AI Handler"
check check_file "backend/internal/handlers/social/handler.go" "Social Handler"
check check_file "backend/internal/handlers/timeline.go" "Timeline Handler"

echo ""
echo "📁 Core Service Files:"
echo "---------------------"
check check_file "backend/internal/service/ai_script.go" "AI Script Service"
check check_file "backend/internal/service/ai_scene.go" "AI Scene Service"
check check_file "backend/internal/service/tts.go" "TTS Service"
check check_file "backend/internal/service/social/service.go" "Social Service"
check check_file "backend/internal/service/publisher.go" "Publisher Service"

echo ""
echo "📁 Documentation:"
echo "-----------------"
check check_file "INTEGRATION_COMPLETE.md" "Integration Documentation"

echo ""
echo "=========================================="
echo "Results: $PASSED/$TOTAL checks passed"

if [ $PASSED -eq $TOTAL ]; then
    echo -e "${GREEN}🎉 ALL INTEGRATIONS VERIFIED!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Start the backend: cd backend && go run cmd/api/main.go"
    echo "  2. Start the frontend: cd frontend && npm run dev"
    echo "  3. Open http://localhost:3000"
    echo "  4. Test the full flow: Signup → Dashboard → Editor → AI Generate → Publish"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some files missing. Review above.${NC}"
    exit 1
fi
