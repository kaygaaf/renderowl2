# 🔑 ACCESS_REGISTRY.md - Complete Tool & Access Inventory

**Last Updated:** 2026-02-28 16:40  
**Purpose:** Single source of truth for all tools, skills, and access  
**Rule:** Check this file before claiming something "doesn't work"

---

## 🎯 Quick Status Overview

| Category | Working | Partial | Broken | Total |
|----------|---------|---------|--------|-------|
| Built-in Tools | 8 | 1 | 0 | 9 |
| System Skills | 12 | 0 | 0 | 12 |
| Workspace Skills | 5 | 2 | 0 | 7 |
| MCP Servers | 2 | 2 | 0 | 4 |
| API Keys | 3 | 1 | 0 | 4 |
| SSH Keys | 1 | 0 | 0 | 1 |

---

## 🛠️ BUILT-IN TOOLS (Always Available)

| Tool | Status | Purpose | How to Use |
|------|--------|---------|------------|
| `read` | ✅ | Read files | `read path/to/file` |
| `write` | ✅ | Write files | `write path content` |
| `edit` | ✅ | Edit files | `edit file oldText newText` |
| `exec` | ✅ | Run commands | `exec "command"` |
| `web_search` | ✅ | Search web | `web_search "query"` |
| `web_fetch` | ✅ | Fetch URLs | `web_fetch https://...` |
| `browser` | ⚠️ | Browser control | `browser start profile=openclaw` |
| `image` | ✅ | Analyze images | `image path` |

### Browser Tool Notes
- **Status:** ⚠️ Partial (for profile=chrome)
- **Setup:** Must run `browser start profile=openclaw` first
- **Issue:** Chrome extension needs to be connected for profile=chrome specifically
- **Fallback:** Use `web_fetch` for static content
- **Alternative:** Use `playwright-mcp` via mcporter for complex automation (fully working)

---

## 📦 SYSTEM SKILLS (/usr/local/lib/node_modules/openclaw/skills/)

### Git & Development
| Skill | Status | Purpose | Credential |
|-------|--------|---------|------------|
| `github` | ✅ | GitHub CLI ops | System keychain |
| `gh-issues` | ✅ | Auto issue fixing | GitHub token |
| `clawhub` | ✅ | Skill management | - |
| `coding-agent` | ✅ | Code assistance | - |

### Media & Content
| Skill | Status | Purpose | Notes |
|-------|--------|---------|-------|
| `nano-pdf` | ✅ | PDF editing | Local tool |
| `video-frames` | ✅ | Video processing | ffmpeg |
| `gifgrep` | ✅ | GIF search | Online |
| `summarize` | ✅ | Text summarization | - |
| `openai-whisper` | ✅ | Audio transcription | Local |
| `openai-whisper-api` | ✅ | Transcription API | API key |

### Apple/macOS Integration
| Skill | Status | Purpose | Notes |
|-------|--------|---------|-------|
| `apple-notes` | ✅ | Apple Notes | Local Mac |
| `apple-reminders` | ✅ | Apple Reminders | Local Mac |
| `imsg` | ✅ | iMessage/SMS | Local Mac |
| `peekaboo` | ✅ | macOS UI automation | Local Mac |
| `bear-notes` | ✅ | Bear.app notes | Local Mac |

### Communication
| Skill | Status | Purpose | Notes |
|-------|--------|---------|-------|
| `discord` | ✅ | Discord ops | Bot token needed |
| `slack` | ✅ | Slack integration | Token needed |
| `notion` | ✅ | Notion API | Token needed |

### Infrastructure
| Skill | Status | Purpose | Notes |
|-------|--------|---------|-------|
| `mcporter` | ✅ | MCP client | Config in `config/mcporter.json` |
| `healthcheck` | ✅ | Security audits | Local tool |
| `openhue` | ✅ | Philips Hue | Local network |

### Other
| Skill | Status | Purpose |
|-------|--------|---------|
| `weather` | ✅ | Weather data |
| `spotify-player` | ✅ | Spotify control |
| `gemini` | ✅ | AI assistance |
| `model-usage` | ✅ | Usage tracking |
| `trello` | ✅ | Trello API |
| `1password` | ✅ | 1Password CLI |

---

## 🎨 WORKSPACE SKILLS (~/.openclaw/workspace/skills/)

| Skill | Status | Purpose | Location |
|-------|--------|---------|----------|
| `frontend-design` | ✅ | UI/UX creation | `skills/frontend-design/` |
| `mcporter` | ✅ | MCP client (local) | `skills/mcporter/` |
| `answeroverflow` | ✅ | Discord search | `skills/answeroverflow/` |
| `humanizer` | ✅ | Text humanization | `skills/humanizer/` |
| `agent-browser` | ✅ | Browser automation | `skills/agent-browser/` |
| `playwright-mcp` | ⚠️ | Browser MCP | `skills/playwright-mcp/` |
| `self-improving-agent` | ✅ | Learning capture | `skills/self-improving-agent/` |

### playwright-mcp
**Status:** ✅ Working (via mcporter)
- **22 tools available** - Full browser automation
- **Browser:** Chromium (headless by default)
- **Location:** Configured in `config/mcporter.json`
- **Script:** `scripts/playwright-mcp.sh`

**How to Use:**
```bash
# Via mcporter
mcporter call playwright-mcp.browser_navigate url=https://example.com
mcporter call playwright-mcp.browser_click selector="#button"
mcporter call playwright-mcp.browser_type selector="#input" text="hello"
```

**Note:** This is SEPARATE from the built-in `browser` tool. Use this for complex automation.

---

## 🔌 MCP SERVERS (via mcporter)

Config Location: `~/.openclaw/workspace/config/mcporter.json`

### coolify
```json
{
  "command": "/Users/minion/.openclaw/workspace/scripts/coolify-mcp.sh"
}
```
- **Status:** ⚠️ Partial
- **Working:** API calls, status checks
- **Issue:** Token lacks deployment permissions
- **Script:** `scripts/coolify-mcp.sh`

### n8n-mcp
```json
{
  "command": "/Users/minion/.openclaw/workspace/scripts/n8n-mcp.sh"
}
```
- **Status:** ✅ Working
- **Uses:** Bearer token auth
- **Script:** `scripts/n8n-mcp.sh`

### cloudflare-api
```json
{
  "baseUrl": "https://mcp.cloudflare.com/mcp",
  "auth": "oauth",
  "oauthRedirectUrl": "http://127.0.0.1:17171/callback"
}
```
- **Status:** ✅ Working
- **Auth:** OAuth (manual browser flow)
- **Note:** Token cached in `.tokens/mcporter/`

### playwright-mcp
```json
{
  "command": "/Users/minion/.openclaw/workspace/scripts/playwright-mcp.sh"
}
```
- **Status:** ⚠️ Partial
- **Issue:** Browser connection required
- **Script:** `scripts/playwright-mcp.sh`

### How to Use mcporter
```bash
# List servers
mcporter list

# Call a server
mcporter call coolify.get_application '{"uuid": "..."}'
mcporter call n8n-mcp.get_workflows
mcporter call cloudflare-api.list_zones
```

---

## 🔐 API KEYS & CREDENTIALS

Location: `~/.openclaw/workspace/config/secrets.env`

### Coolify (Direct API)
```
COOLIFY_HOST=91.98.168.113
COOLIFY_PORT=8000
COOLIFY_BASE_URL=http://91.98.168.113:8000
COOLIFY_API_KEY=6|FWL8fysdgmNuJLlTTQAEgsTc62rZKo2I09c835Y656353708
```
- **Status:** ⚠️ Partial
- **Issue:** Token lacks deployment permissions
- **Working:** Status checks, read operations
- **Broken:** Deployments, restarts

### Coolify (MCP)
```
COOLIFY_MCP_BASE_URL=https://cool.kayorama.nl
COOLIFY_MCP_ACCESS_TOKEN=1|efi1pf9hMUP4TaUNnViS2jfJ8oVw3V5CjPhDPUfM91c0902d
```
- **Status:** ⚠️ Same issue as direct API

### n8n
```
N8N_BASE_URL=https://n8n.kayorama.nl
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

N8N_MCP_URL=https://n8n.kayorama.nl/mcp-server/http
N8N_MCP_BEARER_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- **Status:** ✅ Working
- **Both API and MCP access available**

### Trello
```
Location: ~/.openclaw/workspace/.trello-env
Format: TRELLO_KEY=...
        TRELLO_TOKEN=...
        TRELLO_SECRET=...
```
- **Status:** ✅ Working
- **Also in:** `config/trello.json`

### GitHub
```
Location: System keychain (macOS)
Token: gho_************************************
Scopes: gist, read:org, repo, workflow
```
- **Status:** ✅ Working
- **Verified:** `gh auth status`

### OpenRouter
```
Env: OPENROUTER_API_KEY
```
- **Status:** ✅ Working
- **Used for:** AI model access

---

## 🔑 SSH KEYS

Location: `~/.ssh/`

### renderowl_deploy
```
Files: renderowl_deploy (private), renderowl_deploy.pub (public)
Generated: 2026-02-28 14:16
Status: ⚠️ Not authorized on server
Issue: Key not added to 91.98.168.113 authorized_keys
```

**Public Key:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG+nFcV1hJLpYr0Z2yP8Q+...
```

**How to Use:**
```bash
ssh -i ~/.ssh/renderowl_deploy root@91.98.168.113
```

---

## 🔧 HELPER SCRIPTS

Location: `~/.openclaw/workspace/scripts/`

| Script | Purpose | Usage |
|--------|---------|-------|
| `coolify-mcp.sh` | MCP wrapper for Coolify | Auto-called by mcporter |
| `coolify.sh` | Direct Coolify API | `source scripts/coolify.sh` |
| `n8n-mcp.sh` | MCP wrapper for n8n | Auto-called by mcporter |
| `n8n.sh` | Direct n8n API | `source scripts/n8n.sh` |
| `playwright-mcp.sh` | MCP wrapper for Playwright | Auto-called by mcporter |
| `trello.sh` | Trello CLI wrapper | `source scripts/trello.sh` |

---

## ✅ VERIFIED WORKING COMBINATIONS

### GitHub Operations
```bash
# All working
gh repo view
gh pr create --title "..." --body "..."
gh run list
gh auth status
```

### n8n Operations
```bash
# Via MCP
mcporter call n8n-mcp.get_workflows
mcporter call n8n-mcp.get_execution '{"id": "..."}'

# Via Direct API
source config/secrets.env
curl "$N8N_BASE_URL/api/v1/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

### Web Operations
```bash
# Research
web_search "query"
web_fetch https://example.com

# Browse (if started)
browser start profile=openclaw
browser open https://example.com
browser snapshot
```

### File Operations
```bash
read path/to/file
write path/to/file "content"
edit path/to/file "old" "new"
exec "command"
```

### Trello Operations
```bash
# Via trello skill (read SKILL.md first)
# Via script
source scripts/trello.sh
trello list-boards
```

---

## ❌ KNOWN BROKEN / LIMITED

### Coolify Deployment
- **Symptom:** "Unauthenticated" on deployment/restart calls
- **Root Cause:** API token lacks deployment permissions
- **Impact:** Cannot trigger redeploys via API
- **Workaround:** Manual dashboard access needed
- **Fix Required:** Generate new token with full permissions OR use dashboard

### SSH to Renderowl Server
- **Symptom:** Permission denied
- **Root Cause:** SSH key not authorized on 91.98.168.113
- **Impact:** Cannot access server logs directly
- **Fix Required:** Add public key to server's authorized_keys

### Playwright Browser Automation
- **Status:** ✅ Working via mcporter
- **22 tools available** for complex automation
- **Use:** `mcporter call playwright-mcp.browser_navigate url=...`

**Note:** The built-in `browser` tool (profile=chrome) needs extension connection, but `playwright-mcp` via mcporter works fully in headless mode.
- **Workaround:** Use web_fetch for static, browser tool for basic

---

## 🎯 DECISION TREE

### Need to deploy to Coolify?
1. Try mcporter → If "Unauthenticated" → Ask for dashboard login OR SSH key
2. Do NOT claim "it's not working" without checking this registry

### Need browser automation?
1. Try playwright-mcp → `mcporter call playwright-mcp.browser_navigate url=...`
2. 22 tools available: click, type, evaluate, screenshot, etc.
3. Built-in `browser` tool also works for basic navigation (profile=openclaw)
4. Both are working - use playwright-mcp for complex workflows

### Need server logs?
1. Check if SSH key authorized → No → Cannot access
2. Check Coolify MCP → Partial access only
3. Honest answer: "Need dashboard login or authorized SSH key"

---

## 📝 MAINTENANCE

**Update this file when:**
- New skill installed
- API key rotated
- Access status changes
- New script added
- Issue resolved/broken

**Review:** Weekly

---

*This is your complete access inventory. Check it before saying something doesn't work.*
