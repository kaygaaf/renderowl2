#!/bin/bash
# session-start.sh - Run at the beginning of every session

clear
echo "🦉 ANTIGRAVITY AGENCY - SESSION START"
echo "======================================"
echo ""
echo "⚠️  IMPORTANT: Context has been reset"
echo ""
echo "📖 REQUIRED READING:"
echo "   1. STARTUP.md"
echo "   2. ACCESS_REGISTRY.md"  
echo "   3. memory/$(date +%Y-%m-%d).md"
echo ""
echo "📍 Your workspace: ~/.openclaw/workspace/"
echo "🔧 Your tools: Run ./TOOLS/status-check.sh"
echo ""
echo "🎯 Remember:"
echo "   • Check tool status BEFORE using"
echo "   • Be honest about limitations"
echo "   • Write to memory files"
echo ""
echo "======================================"
echo ""

# Offer to show status
read -p "Run status check now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ~/.openclaw/workspace/TOOLS/status-check.sh
fi
