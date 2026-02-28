#!/bin/bash
# status-check.sh - Quick health check of all tools and access

echo "🔍 ANTIGRAVITY ENVIRONMENT STATUS CHECK"
echo "======================================"
echo ""
echo "Time: $(date)"
echo "Host: $(hostname)"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "📦 CORE TOOLS"
echo "-------------"

# Check GitHub
if gh auth status &>/dev/null; then
    echo -e "${GREEN}✅${NC} GitHub: Authenticated"
else
    echo -e "${RED}❌${NC} GitHub: Not authenticated"
fi

# Check MCP
if command -v mcporter &>/dev/null; then
    echo -e "${GREEN}✅${NC} MCPorter: Installed"
    echo "   Servers:"
    mcporter list 2>/dev/null | grep -E "^\s+\w+" | head -5 | sed 's/^/     - /'
else
    echo -e "${YELLOW}⚠️${NC}  MCPorter: Not in PATH"
fi

echo ""
echo "🔑 API KEYS"
echo "-----------"

if [ -f ~/.openclaw/workspace/config/secrets.env ]; then
    echo -e "${GREEN}✅${NC} Secrets file exists"
    
    # Check individual keys
    source ~/.openclaw/workspace/config/secrets.env 2>/dev/null
    
    [ -n "$COOLIFY_API_KEY" ] && echo -e "  ${YELLOW}⚠️${NC}  Coolify: Configured (limited perms)"
    [ -n "$N8N_API_KEY" ] && echo -e "  ${GREEN}✅${NC} n8n: Configured"
    [ -n "$OPENROUTER_API_KEY" ] && echo -e "  ${GREEN}✅${NC} OpenRouter: Configured"
else
    echo -e "${RED}❌${NC} Secrets file missing!"
fi

if [ -f ~/.openclaw/workspace/.trello-env ]; then
    echo -e "  ${GREEN}✅${NC} Trello: Configured"
fi

echo ""
echo "🔐 SSH KEYS"
echo "-----------"

if [ -f ~/.ssh/renderowl_deploy ]; then
    echo -e "${YELLOW}⚠️${NC}  SSH key exists (NOT authorized on server)"
    echo "     Pubkey: $(cat ~/.ssh/renderowl_deploy.pub | cut -d' ' -f1-2)..."
else
    echo -e "${RED}❌${NC} No SSH keys found"
fi

echo ""
echo "🛠️  SKILLS"
echo "----------"

WORKSPACE_SKILLS=$(ls ~/.openclaw/workspace/skills/ 2>/dev/null | wc -l)
SYSTEM_SKILLS=$(ls /usr/local/lib/node_modules/openclaw/skills/ 2>/dev/null | wc -l)

echo "  Workspace: $WORKSPACE_SKILLS skills"
echo "  System: $SYSTEM_SKILLS skills"

echo ""
echo "📁 WORKSPACE"
echo "------------"

if [ -d ~/.openclaw/workspace/PROJECTS ]; then
    PROJECT_COUNT=$(ls ~/.openclaw/workspace/PROJECTS/ 2>/dev/null | wc -l)
    echo "  Projects: $PROJECT_COUNT directories"
fi

if [ -d ~/.openclaw/workspace/memory ]; then
    MEMORY_FILES=$(ls ~/.openclaw/workspace/memory/*.md 2>/dev/null | wc -l)
    echo "  Memory files: $MEMORY_FILES entries"
fi

echo ""
echo "🌐 CONNECTION TEST"
echo "-----------------"

# Test GitHub API
if curl -s -o /dev/null -w "%{http_code}" https://api.github.com/user -H "Authorization: token $(gh auth token 2>/dev/null)" | grep -q "200"; then
    echo -e "${GREEN}✅${NC} GitHub API: Reachable"
else
    echo -e "${YELLOW}⚠️${NC}  GitHub API: Check token"
fi

# Test n8n
if [ -n "$N8N_BASE_URL" ]; then
    if curl -s -o /dev/null -w "%{http_code}" "$N8N_BASE_URL/healthz" | grep -q "200"; then
        echo -e "${GREEN}✅${NC} n8n: Reachable"
    else
        echo -e "${YELLOW}⚠️${NC}  n8n: Check connection"
    fi
fi

echo ""
echo "📋 CRITICAL FILES"
echo "----------------"

files=("STARTUP.md" "ACCESS_REGISTRY.md" "WORKFLOW_AUTO.md" "MEMORY.md")
for file in "${files[@]}"; do
    if [ -f ~/.openclaw/workspace/$file ]; then
        echo -e "${GREEN}✅${NC} $file"
    else
        echo -e "${RED}❌${NC} $file MISSING!"
    fi
done

echo ""
echo "======================================"
echo "📖 NEXT STEPS:"
echo "   1. Read STARTUP.md if you haven't"
echo "   2. Read ACCESS_REGISTRY.md for details"
echo "   3. Check memory/$(date +%Y-%m-%d).md for today's work"
echo ""
