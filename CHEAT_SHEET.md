# 💻 COMMAND CHEAT SHEET

**Every command you need, organized by task**

---

## 🚀 SESSION STARTUP

```bash
# Quick status of everything
~/.openclaw/workspace/TOOLS/status-check.sh

# Read startup guide
cat ~/.openclaw/workspace/STARTUP.md

# Read today's work
cat ~/.openclaw/workspace/memory/$(date +%Y-%m-%d).md

# Read tool registry
cat ~/.openclaw/workspace/ACCESS_REGISTRY.md
```

---

## 🐙 GITHUB OPERATIONS

```bash
# Check auth status
gh auth status

# View repo
gh repo view

# Create PR
gh pr create --title "feat: ..." --body "..."

# Check CI/CD
gh run list
gh run watch [ID]

# Clone repo
gh repo clone owner/repo

# Fork repo  
gh repo fork owner/repo

# List issues
gh issue list --label bug --limit 10
```

---

## 🔌 MCP OPERATIONS

```bash
# List servers
mcporter list

# Call Coolify
mcporter call coolify.get_application '{"uuid": "..."}'
mcporter call coolify.list_applications

# Call n8n
mcporter call n8n-mcp.get_workflows
mcporter call n8n-mcp.get_execution '{"id": "..."}'

# Call Cloudflare
mcporter call cloudflare-api.list_zones

# Browser automation (playwright-mcp)
mcporter call playwright-mcp.browser_navigate url=https://example.com
mcporter call playwright-mcp.browser_click selector="#button"
mcporter call playwright-mcp.browser_type selector="#input" text="hello"
mcporter call playwright-mcp.browser_screenshot

# List available tools on a server
mcporter tools coolify
```

**Status:**
- ✅ **playwright-mcp**: 22 tools, fully working for browser automation
- ✅ **n8n-mcp**: Fully working
- ✅ **cloudflare-api**: OAuth working
- ⚠️ **coolify**: Read-only (token lacks deployment perms)

---

## 🔍 RESEARCH

```bash
# Web search
web_search "Next.js 15 deployment best practices"
web_search "WordPress headless CMS 2024"

# Fetch specific page
web_fetch https://docs.example.com/page
web_fetch https://api.github.com/repos/owner/repo

# Search Discord/communities
# Use answeroverflow skill
```

---

## 📁 FILE OPERATIONS

```bash
# Read files
read path/to/file.md
read path/to/file.md offset=50 limit=100

# Write files
write path/to/file.md "content here"

# Edit files (precise replacement)
edit path/to/file.md "old text" "new text"

# Execute commands
exec "npm install"
exec "ls -la" timeout=30000

# Long-running commands
exec "npm run build" background=true
```

---

## 🌐 BROWSER OPERATIONS

### Built-in Browser Tool
```bash
# Start browser (REQUIRED first step)
browser start profile=openclaw

# Open URL
browser open https://example.com

# Take screenshot
browser screenshot

# Get page snapshot (interactive elements)
browser snapshot

# Click element
browser act click ref="button-name"

# Type text
browser act type ref="input-name" text="hello"

# Evaluate JS
browser act evaluate fn="() => document.title"
```

**Status:** ⚠️ Works for basic navigation

---

### Playwright-mcp (Full Automation)
```bash
# Navigate to URL
mcporter call playwright-mcp.browser_navigate url=https://example.com

# Click element
mcporter call playwright-mcp.browser_click selector="#button-id"

# Type text
mcporter call playwright-mcp.browser_type selector="#input-id" text="hello world"

# Get text content
mcporter call playwright-mcp.browser_get_text selector="h1"

# Run JavaScript
mcporter call playwright-mcp.browser_evaluate script="() => document.title"

# Take screenshot
mcporter call playwright-mcp.browser_screenshot

# Fill form/select dropdown
mcporter call playwright-mcp.browser_select_option selector="#dropdown" value="option1"

# Press key
mcporter call playwright-mcp.browser_press key="Enter"

# Upload file
mcporter call playwright-mcp.browser_choose_file selector="#file-input" paths=["/path/to/file.pdf"]

# Get page snapshot (accessible tree)
mcporter call playwright-mcp.browser_snapshot

# Close browser
mcporter call playwright-mcp.browser_close
```

**Status:** ✅ 22 tools available, fully working
**Use for:** Complex automation, form filling, data extraction, screenshots

---

## 🧠 MEMORY OPERATIONS

```bash
# Read today's memory
cat ~/.openclaw/workspace/memory/$(date +%Y-%m-%d).md

# Read long-term memory
cat ~/.openclaw/workspace/MEMORY.md

# Read skill registry
cat ~/.openclaw/workspace/ACCESS_REGISTRY.md

# Read agency guide
cat ~/.openclaw/workspace/AGENCY.md
```

**Important:** Always write to memory files after work:
- `memory/YYYY-MM-DD.md` - daily logs
- `MEMORY.md` - long-term memory

---

## 🎨 PROJECT OPERATIONS

```bash
# Create new project
~/.openclaw/workspace/TOOLS/setup-project.sh

# Navigate to project
cd ~/.openclaw/workspace/PROJECTS/client-name/project-name

# List all projects
ls ~/.openclaw/workspace/PROJECTS/

# List workspace skills
ls ~/.openclaw/workspace/skills/

# Read skill documentation
read ~/.openclaw/workspace/skills/frontend-design/SKILL.md
```

---

## 🔐 CREDENTIAL LOCATIONS

```bash
# All API keys
cat ~/.openclaw/workspace/config/secrets.env

# Trello specific
cat ~/.openclaw/workspace/.trello-env
cat ~/.openclaw/workspace/config/trello.json

# MCP config
cat ~/.openclaw/workspace/config/mcporter.json

# SSH keys
ls -la ~/.ssh/
cat ~/.ssh/renderowl_deploy.pub
```

---

## 🧪 TESTING CONNECTIONS

```bash
# GitHub
curl -s https://api.github.com/user \
  -H "Authorization: token $(gh auth token)" | jq .login

# n8n
curl -s $N8N_BASE_URL/api/v1/workflows \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data | length'

# Coolify (will show "Unauthenticated" for deploy)
curl -s http://91.98.168.113:8000/api/v1/applications \
  -H "Authorization: Bearer $COOLIFY_API_KEY"
```

---

## ⚠️ TROUBLESHOOTING

### "Tool not found"
```bash
# Check if it's installed
which mcporter
ls ~/.openclaw/workspace/skills/
ls /usr/local/lib/node_modules/openclaw/skills/

# Check ACCESS_REGISTRY.md for status
```

### "Unauthenticated"
```bash
# Check specific service in ACCESS_REGISTRY.md
# Don't claim broken - check if it's "partial" (⚠️)
```

### "I forgot what I was doing"
```bash
cat ~/.openclaw/workspace/memory/$(date +%Y-%m-%d).md
cat ~/.openclaw/workspace/MEMORY.md | grep -A 10 "Active Projects"
```

---

## 📋 ONE-LINERS

```bash
# Quick status
./TOOLS/status-check.sh

# Today's work
cat memory/$(date +%Y-%m-%d).md

# All projects
ls -la PROJECTS/

# Git status everywhere
find PROJECTS -name ".git" -type d -exec dirname {} \; -exec git -C {} status --short \;

# Memory search
grep -r "keyword" memory/ MEMORY.md
```

---

*Keep this handy. Copy-paste commands as needed.*
