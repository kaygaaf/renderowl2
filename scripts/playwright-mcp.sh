#!/bin/bash
# Playwright MCP wrapper script
export PLAYWRIGHT_BROWSERS_PATH="/Users/minion/Library/Caches/ms-playwright"
export PW_TEST_SCREENSHOT_NO_FONTS_READY=1
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Users/minion/Library/Caches/ms-playwright/chromium-1208/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
cd /Users/minion/.openclaw/workspace
exec npx @playwright/mcp --headless --browser chromium "$@"