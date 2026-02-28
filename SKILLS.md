# 🛠️ SKILLS.md - Available Tools & Skills

**Last Updated:** 2026-02-28  
**Purpose:** Central registry of all tools, skills, and capabilities

---

## 🎯 Quick Reference

| Need This | Use This | Location |
|-----------|----------|----------|
| Create UI/UX | `frontend-design` skill | ~/.openclaw/workspace/skills/frontend-design |
| Deploy to Coolify | `mcporter` skill | ~/.openclaw/workspace/skills/mcporter |
| Git operations | `github` skill | /usr/local/lib/node_modules/openclaw/skills/github |
| Auto-fix GitHub issues | `gh-issues` skill | ~/.openclaw/workspace/skills/gh-issues |
| Search web | `web_search` tool | Built-in |
| Control browser | `browser` tool | Built-in |
| Schedule tasks | `cron` tool | Built-in |

---

## 🎨 Design & Frontend

### frontend-design
**Location:** `~/.openclaw/workspace/skills/frontend-design/`  
**Purpose:** Create production-grade UI/UX  
**When to Use:**
- Building new websites
- Creating components
- Design system setup
- UI improvements

**Usage:**
```bash
# Read skill first
read ~/.openclaw/workspace/skills/frontend-design/SKILL.md

# Then use for design tasks
```

**Status:** ✅ Working

---

## 🚀 DevOps & Infrastructure

### mcporter (MCP Client)
**Location:** `~/.openclaw/workspace/skills/mcporter/`  
**Purpose:** Connect to MCP servers (Coolify, etc.)  
**When to Use:**
- Deploy applications
- Check server status
- Manage infrastructure

**Usage:**
```bash
# List available servers
mcporter list

# Call Coolify
mcporter call coolify.get_application --uuid [UUID]

# Or use JSON format
mcporter call coolify.get_application '{"uuid": "..."}'
```

**Status:** ⚠️ Partial - API auth issues with deployment

**Known Issues:**
- Coolify API token doesn't have deployment permissions
- Need dashboard access for full functionality

---

## 🔧 Development Tools

### github
**Location:** `/usr/local/lib/node_modules/openclaw/skills/github/`  
**Purpose:** GitHub CLI operations  
**When to Use:**
- Create repos
- Manage PRs
- Check CI status
- Clone/fork repos

**Usage:**
```bash
# Check status
gh repo view

# Create PR
gh pr create --title "..." --body "..."

# Check actions
gh run list
```

**Status:** ✅ Working (authenticated)

---

### gh-issues
**Location:** `~/.openclaw/workspace/skills/gh-issues/`  
**Purpose:** Automated GitHub issue fixing  
**When to Use:**
- Batch fix issues
- Auto-create PRs
- Monitor reviews

**Usage:**
```bash
# Read skill first
read ~/.openclaw/workspace/skills/gh-issues/SKILL.md
```

**Status:** ✅ Working

---

## 🔍 Research & Data

### web_search
**Type:** Built-in tool  
**Purpose:** Search the internet  
**When to Use:**
- Research solutions
- Find documentation
- Check best practices
- Troubleshoot errors

**Usage:**
```bash
web_search "Next.js 15 deployment best practices"
```

**Status:** ✅ Working

---

### web_fetch
**Type:** Built-in tool  
**Purpose:** Extract content from URLs  
**When to Use:**
- Read documentation
- Extract article content
- Check API responses

**Usage:**
```bash
web_fetch https://docs.example.com/page
```

**Status:** ✅ Working

---

### answeroverflow
**Location:** `~/.openclaw/workspace/skills/answeroverflow/`  
**Purpose:** Search Discord/forum discussions  
**When to Use:**
- Find community solutions
- Check Discord discussions
- Troubleshoot issues

**Status:** ✅ Working

---

## 🌐 Browser & Automation

### browser
**Type:** Built-in tool  
**Purpose:** Control web browser  
**When to Use:**
- Test websites
- Scrape data
- Take screenshots
- Automated testing

**Usage:**
```bash
# Start browser
browser start

# Open page
browser open https://example.com

# Take screenshot
browser screenshot
```

**Status:** ⚠️ Limited - Chrome extension not always connected

**Note:** For best results, connect Chrome extension first

---

## ⏰ Scheduling & Automation

### cron
**Type:** Built-in tool  
**Purpose:** Schedule tasks  
**When to Use:**
- Daily standups
- Regular checks
- Automated reports

**Usage:**
```bash
# List jobs
cron list

# Add job
cron add --job '{...}'

# Remove job
cron remove --id [ID]
```

**Status:** ✅ Working

**Note:** Currently disabled per user request

---

## 📱 Device Management

### nodes
**Type:** Built-in tool  
**Purpose:** Manage paired devices  
**When to Use:**
- Phone automation
- Camera access
- Device commands

**Status:** ✅ Working (if devices paired)

---

## 📝 Documentation & Content

### nano-pdf
**Location:** `~/.openclaw/workspace/skills/nano-pdf/`  
**Purpose:** Edit PDFs  
**When to Use:**
- Document generation
- PDF modifications

**Status:** ✅ Working

---

### video-frames
**Location:** `/usr/local/lib/node_modules/openclaw/skills/video-frames/`  
**Purpose:** Extract video frames  
**When to Use:**
- Video processing
- Thumbnail generation

**Status:** ✅ Working

---

## 🗄️ Data & Storage

### Trello
**Type:** External integration  
**Purpose:** Project management  
**When to Use:**
- Track tasks
- Organize work
- Client collaboration

**API:** Direct REST API  
**Credentials:** `~/.openclaw/workspace/.trello-env`

**Status:** ✅ Working

---

## ⚠️ Skill Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully working |
| ⚠️ | Working with limitations |
| ❌ | Not working / blocked |
| ⏳ | Not tested yet |

---

## 🎯 Skill Selection Guide

### New Website Project
1. `frontend-design` - Create UI
2. `github` - Setup repo
3. `mcporter` - Deploy (if working)
4. `web_search` - Research

### Debugging Production Issue
1. `browser` - Test site
2. `web_search` - Find solutions
3. `answeroverflow` - Check community
4. `mcporter` - Check logs (if accessible)

### Automated Maintenance
1. `cron` - Schedule tasks
2. `gh-issues` - Auto-fix issues
3. `github` - Monitor PRs

---

## 📝 Adding New Skills

**When a new skill is installed:**
1. Read SKILL.md file
2. Test basic functionality
3. Document in this file
4. Note any limitations
5. Add to MEMORY.md

---

*Keep this updated as skills are added/removed/updated.*
