# 📚 INDEX - Complete File Guide

**Your roadmap to everything in the workspace**

---

## 🚨 START HERE (After Every Restart)

| Order | File | Why Read |
|-------|------|----------|
| 1 | **00-READ_ME_FIRST.md** | Immediate context reminder |
| 2 | **STARTUP.md** | Step-by-step startup guide |
| 3 | **ACCESS_REGISTRY.md** | Know your tools |
| 4 | **memory/YYYY-MM-DD.md** | Today's work |

---

## 📖 CORE DOCUMENTATION

| File | Purpose | When to Read |
|------|---------|--------------|
| **AGENCY.md** | Agency overview, services, processes | Planning work |
| **MEMORY.md** | Long-term memory, clients, projects | Weekly review |
| **SKILLS.md** | How to use tools/skills | Learning new tool |
| **WORKFLOW_AUTO.md** | Operating protocols, rules | After restart |
| **ACCESS_REGISTRY.md** | Tool inventory with status | Before using tools |

---

## 🎯 QUICK REFERENCE

| File | Purpose | When to Read |
|------|---------|--------------|
| **QUICK_REFERENCE.md** | Visual status card | Quick lookup |
| **CHEAT_SHEET.md** | All commands by task | Need specific command |
| **ENVIRONMENT_COMPLETE.md** | Setup summary | Understanding system |

---

## 📁 DIRECTORY STRUCTURE

```
~/.openclaw/workspace/
│
├── 📄 00-READ_ME_FIRST.md      ← START HERE
├── 📄 STARTUP.md                ← Startup guide
├── 📄 ACCESS_REGISTRY.md        ← Tool inventory
├── 📄 WORKFLOW_AUTO.md          ← Operating rules
├── 📄 MEMORY.md                 ← Long-term memory
├── 📄 AGENCY.md                 ← Agency overview
├── 📄 SKILLS.md                 ← Skill guide
├── 📄 QUICK_REFERENCE.md        ← Quick lookup
├── 📄 CHEAT_SHEET.md            ← Commands
├── 📄 ENVIRONMENT_COMPLETE.md   ← Setup summary
├── 📄 AGENCY_ARCHITECTURE.md    ← System design
├── 📄 INDEX.md                  ← This file
│
├── 📁 PROJECTS/                 ← Client projects
├── 📁 TEMPLATES/                ← Project templates
├── 📁 MEMORY/                   ← Daily logs
│   └── _templates/
│       └── daily-template.md
│
├── 📁 TOOLS/                    ← Helper scripts
│   ├── setup-project.sh
│   ├── status-check.sh
│   └── session-start.sh
│
├── 📁 DOCS/                     ← Documentation
│   ├── processes/
│   ├── checklists/
│   └── standards/
│
├── 📁 skills/                   ← Workspace skills
│   ├── frontend-design/
│   ├── mcporter/
│   ├── answeroverflow/
│   └── ...
│
└── 📁 config/                   ← API keys & config
    ├── secrets.env              ← API keys (gitignored)
    ├── mcporter.json            ← MCP config
    └── trello.json              ← Trello config
```

---

## 🛠️ SCRIPTS

| Script | Purpose | Usage |
|--------|---------|-------|
| **TOOLS/setup-project.sh** | Create new project | `./TOOLS/setup-project.sh` |
| **TOOLS/status-check.sh** | Health check | `./TOOLS/status-check.sh` |
| **TOOLS/session-start.sh** | Session reminder | `./TOOLS/session-start.sh` |

---

## 🎨 SKILLS

### Workspace Skills (`~/.openclaw/workspace/skills/`)
| Skill | Purpose | Read First |
|-------|---------|------------|
| frontend-design | UI/UX creation | SKILL.md |
| mcporter | MCP client | SKILL.md |
| answeroverflow | Discord search | SKILL.md |
| humanizer | Text humanization | SKILL.md |
| agent-browser | Browser automation | SKILL.md |
| playwright-mcp | Browser MCP | SKILL.md |
| self-improving-agent | Learning capture | SKILL.md |

### System Skills (`/usr/local/lib/node_modules/openclaw/skills/`)
52 system-wide skills available. Check SKILLS.md for full list.

Key ones:
- github - GitHub CLI
- gh-issues - Automated issue fixing
- nano-pdf - PDF editing
- video-frames - Video processing
- web_search - Internet search
- browser - Browser control

---

## 🔑 CREDENTIALS

| Service | Location | Status |
|---------|----------|--------|
| Coolify | `config/secrets.env` | ⚠️ Limited perms |
| n8n | `config/secrets.env` | ✅ Working |
| Trello | `.trello-env` + `config/trello.json` | ✅ Working |
| GitHub | macOS Keychain | ✅ Working |
| SSH | `~/.ssh/renderowl_deploy` | ⚠️ Not authorized |

---

## 📋 WORKFLOW

### Daily Startup
```bash
1. Read 00-READ_ME_FIRST.md
2. Run ./TOOLS/status-check.sh
3. Read memory/$(date +%Y-%m-%d).md
4. Check MEMORY.md for active projects
```

### During Work
```bash
1. Do work
2. Write progress to memory/YYYY-MM-DD.md
3. Update MEMORY.md if major decisions
4. Commit project changes (from project dir!)
```

### End of Session
```bash
1. Summarize in memory/YYYY-MM-DD.md
2. Ensure all files saved
3. Commit changes
```

---

## 🆘 EMERGENCY

### Lost Everything?
```bash
cd ~/.openclaw/workspace
cat 00-READ_ME_FIRST.md
./TOOLS/status-check.sh
```

### Forgot What Tools You Have?
```bash
cat ACCESS_REGISTRY.md
```

### Forgot Commands?
```bash
cat CHEAT_SHEET.md
```

### Forgot Project Status?
```bash
cat MEMORY.md | grep -A 20 "Active Projects"
cat memory/$(date +%Y-%m-%d).md
```

---

## 📊 STATISTICS

- **Total files:** 11 core documents
- **Total lines:** 53,877 lines of documentation
- **Scripts:** 3 helper scripts
- **Skills:** 59 total (7 workspace + 52 system)
- **MCP servers:** 4 configured
- **API keys:** 5 configured

---

*This index helps you navigate the complete environment.*
*When in doubt, read 00-READ_ME_FIRST.md*
