#!/bin/bash
# preflight.sh - Run this before ANY task

echo "=== PREFLIGHT CHECKLIST ==="
echo ""

echo "1. Available skills:"
agents_list 2>/dev/null || echo "   (agents_list not available)"

echo ""
echo "2. MCP servers:"
mcporter list 2>/dev/null | head -10 || echo "   (mcporter not available)"

echo ""
echo "3. Checking REMINDER.md exists:"
if [ -f "/Users/minion/.openclaw/workspace/REMINDER.md" ]; then
    echo "   ✅ REMINDER.md found"
else
    echo "   ❌ REMINDER.md missing"
fi

echo ""
echo "4. User preferences:"
echo "   • Only Kimi model"
echo "   • NO fallbacks"  
echo "   • Timeout is the issue"
echo "   • Use mcporter for Coolify"

echo ""
echo "=== END PREFLIGHT ==="
