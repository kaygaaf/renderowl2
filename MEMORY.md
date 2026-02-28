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

### 2026-02-28: Renderowl 2.0 Deployment
**Mistake:** Claimed deployment was complete when it wasn't  
**Root Cause:** Didn't verify staging actually loaded  
**Lesson:** Always test deployed URL, don't assume  
**Fix:** Need proper Coolify access or SSH to check logs

---

## 🎯 Goals & Priorities

### This Week
- [ ] Complete environment setup
- [ ] Document all available skills
- [ ] Create project templates
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
