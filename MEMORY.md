# 🧠 MEMORY.md - Antigravity Agency Long-Term Memory

**Last Updated:** 2026-02-28
**Next Review:** Weekly (every Sunday)

---

## 👤 Client Registry

### Active Clients
| Client | Status | Projects | Contact | Notes |
|--------|--------|----------|---------|-------|
| [None yet] | - | - | - | - |

### Past Clients
| Client | Status | Handover Date | Archive Location |
|--------|--------|---------------|------------------|
| [None yet] | - | - | - |

---

## 🚀 Active Projects

### Current Sprint
| Project | Client | Phase | Deadline | Status |
|---------|--------|-------|----------|--------|
| [None] | - | - | - | - |

### Backlog
| Project | Client | Priority | Estimated Start |
|---------|--------|----------|-----------------|
| [None] | - | - | - |

---

## 🛠️ Tool & Skill Learnings

### MCP Skills Available
| Skill | Location | Status | Notes |
|-------|----------|--------|-------|
| frontend-design | ~/.openclaw/workspace/skills/frontend-design | ✅ Working | Use for UI/UX |
| mcporter | ~/.openclaw/workspace/skills/mcporter | ✅ Working | Coolify, etc |
| github | /usr/local/lib/node_modules/openclaw/skills/github | ✅ Working | gh CLI |
| gh-issues | ~/.openclaw/workspace/skills/gh-issues | ✅ Working | Auto PRs |

### API Keys Configured
| Service | Location | Last Verified | Status |
|---------|----------|---------------|--------|
| Coolify | config/secrets.env | 2026-02-28 | ⚠️ Issues |
| GitHub | System keychain | 2026-02-28 | ✅ Working |
| Trello | config/.trello-env | 2026-02-28 | ✅ Working |

### Lessons Learned
- **Coolify API:** Token doesn't have deployment permissions - needs dashboard access
- **Git Push:** Large files cause issues - always use .gitignore for node_modules
- **SSH Access:** No keys configured on this machine - generate or use existing

---

## 📋 Process Decisions

### Deployment Workflow
1. Code → GitHub (commit + push)
2. GitHub → Coolify (webhook/auto-deploy)
3. Coolify → Staging (build + deploy)
4. Test → Production (manual promotion)

### Project Naming
- `PROJECTS/[client]/[project-name]/`
- Kebab-case for folders
- Number prefixes for phase ordering (00-, 01-, etc.)

### Tech Stack Standards
| Type | Stack | When to Use |
|------|-------|-------------|
| Website | Next.js + Tailwind + shadcn | Marketing sites, blogs |
| Webapp | Next.js + FastAPI/Go + PostgreSQL | SaaS, dashboards |
| WordPress Plugin | PHP + React + @wordpress/scripts | WP extensions |

---

## ❌ Mistakes & Corrections

### 2026-02-28: Complete Environment Rebuild - PHASE 2
**Accomplishment:** Built foolproof environment system
**Files Created:**
- 00-READ_ME_FIRST.md - Obvious startup reminder (numbered 00-)
- STARTUP.md - Step-by-step startup guide
- ACCESS_REGISTRY.md - Complete tool inventory (10k+ lines)
- WORKFLOW_AUTO.md - Operating protocol
- QUICK_REFERENCE.md - Visual quick reference card
- CHEAT_SHEET.md - All commands organized by task
- TOOLS/status-check.sh - Auto health check script
- TOOLS/session-start.sh - Session startup reminder
**Status:** ✅ Complete - Never lose track again

### 2026-02-28: Complete Environment Rebuild - PHASE 1
**Accomplishment:** Built comprehensive agency environment
**Files Created:**
- AGENCY.md - Agency overview and processes
- SKILLS.md - Skill registry with usage guide
- AGENCY_ARCHITECTURE.md - Detailed system design
- memory/2026-02-28.md - Daily log
- TOOLS/setup-project.sh - Project initialization script
**Impact:** Never lose track of tools/access again
**Status:** ✅ Complete

### 2026-02-28: Repository Hygiene Violation
**Mistake:** Committed workspace files (AGENCY.md, MEMORY.md, SKILLS.md) to renderowl2 repo
**Impact:** Polluted project repo with workspace organization files
**Root Cause:** Used `git add -A` from workspace root instead of project directory
**Lesson:** NEVER commit workspace files to project repos. Work from project directory.
**Fix Required:** Clean renderowl2 repo

---

## 🎯 Goals & Priorities

### This Week
- [x] Complete environment setup ✅ DONE
- [x] Document all available skills ✅ DONE (ACCESS_REGISTRY.md)
- [ ] Create project templates (Next.js, WordPress)
- [ ] Clean renderowl2 repo (remove workspace files)
- [ ] Fix Renderowl deployment (if access granted)

### This Month
- [ ] Complete first client project using new system
- [ ] Establish weekly memory review habit
- [ ] Build reusable component library

---

## 🔗 Quick Links

- **Trello Workspace:** https://trello.com/b/69a1a7238ebb11816ce03107
- **GitHub:** https://github.com/kaygaaf
- **Coolify:** https://app.coolify.io
- **Renderowl Staging:** https://staging.renderowl.com (⚠️ 500 error)

## 📚 Critical Files (READ AFTER EVERY RESTART)

| File | Purpose | Read When |
|------|---------|-----------|
| **WORKFLOW_AUTO.md** | Startup protocol, operating rules | After every compaction |
| **ACCESS_REGISTRY.md** | Complete tool inventory & status | Before using any tool |
| **memory/YYYY-MM-DD.md** | Today's work log | Daily |
| **MEMORY.md** | This file - long-term memory | Weekly |
| **AGENCY.md** | Agency overview & processes | As needed |
| **SKILLS.md** | Skill usage guide | When learning new tool |

**Rule:** After context reset, READ WORKFLOW_AUTO.md and ACCESS_REGISTRY.md first!

---

## 📝 How to Update This File

**Add when:**
- New client signed
- Project completed
- Tool/skill learned
- Process decision made
- Mistake + lesson learned

**Format:**
- Date stamp all entries
- Use tables for structured data
- Link to detailed docs when needed
- Archive old entries periodically

---

*This is your long-term memory. Keep it updated. Review weekly.*
