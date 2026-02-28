# 🏢 Antigravity Creative Agency - AI Environment Architecture

## Executive Summary

Complete rebuild of the AI agent environment to function as a professional creative agency capable of long-term project creation, maintenance, and upgrades across websites, webapps, and WordPress plugins.

---

## 🎯 Core Problems Solved

### 1. Memory Issues
**Problem:** Context loss, forgetting project details, repeating work  
**Solution:** Multi-tier memory system with structured file organization

### 2. Repository Chaos  
**Problem:** Creating multiple repos for same project, losing track  
**Solution:** Single monorepo approach with clear project boundaries

### 3. Tool/Skill Confusion
**Problem:** Forgetting available tools, not using MCP skills properly  
**Solution:** Centralized skill registry with clear documentation

---

## 🏗️ Environment Architecture

```
/Users/minion/.openclaw/workspace/
│
├── 📋 AGENCY.md              # Agency overview, capabilities, workflows
├── 🧠 MEMORY.md              # Curated long-term memory (projects, clients, decisions)
├── 🛠️ SKILLS.md              # Available tools/skills with usage examples
├── ⚙️ CONFIG.md              # Environment configuration, API keys, settings
├── 📁 TEMPLATES/             # Reusable project templates
│   ├── website-nextjs/       # Next.js website starter
│   ├── webapp-react/         # React webapp starter  
│   ├── wordpress-plugin/     # WordPress plugin starter
│   └── saas-starter/         # Full SaaS starter
│
├── 📁 PROJECTS/              # All client projects
│   ├── [client-name]/        # One folder per client
│   │   ├── project-brief.md
│   │   ├── [project-1]/
│   │   └── [project-2]/
│   └── _internal/            # Agency internal projects
│
├── 📁 MEMORY/                # Daily/weekly memory files
│   ├── 2026-02-28.md         # Today's log
│   ├── _archive/             # Old memory files
│   └── _templates/           # Memory entry templates
│
├── 📁 TOOLS/                 # Custom scripts and utilities
│   ├── deploy.sh
│   ├── setup-project.sh
│   └── backup.sh
│
└── 📁 DOCS/                  # Agency documentation
    ├── processes/
    ├── checklists/
    └── standards/
```

---

## 🧠 Memory System Design

### Three-Tier Memory

#### 1. Working Memory (Context Window)
- Current conversation
- Active project files loaded
- Recent tool outputs

#### 2. Short-Term Memory (Daily Files)
**Location:** `memory/YYYY-MM-DD.md`  
**Purpose:** Raw logs of day's work  
**Format:** Bullet points, quick notes  
**Retention:** 30 days, then archive

#### 3. Long-Term Memory (Curated)
**Location:** `MEMORY.md`  
**Purpose:** Important decisions, client info, project status  
**Format:** Structured sections  
**Maintenance:** Weekly review and update

### Memory Writing Rules

**ALWAYS write to memory when:**
- Starting/completing a project
- Making architectural decisions
- Discovering client preferences
- Learning from mistakes
- Setting up new tools/skills

**NEVER rely on "mental notes" - they don't persist.**

---

## 🛠️ Skill Registry

### Available Skills (MCP + Built-in)

#### Core Development
| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `frontend-design` | UI/UX creation | New websites, components |
| `mcporter` | MCP server tools | External APIs (Coolify, etc) |
| `gh-issues` | GitHub automation | Bug fixing, PR management |
| `github` | Git operations | Repos, commits, PRs |

#### Platform Specific
| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `nano-pdf` | PDF editing | Document generation |
| `video-frames` | Video processing | Media handling |
| `weather` | Weather data | Content, features |

#### Research
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `web_search` | Find information | Research, solutions |
| `web_fetch` | Extract content | Documentation |
| `answeroverflow` | Community search | Discord/forums |

#### Infrastructure
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `browser` | Web automation | Testing, scraping |
| `cron` | Scheduling | Automated tasks |
| `nodes` | Device management | Paired devices |

### Skill Usage Protocol

**BEFORE using any skill:**
1. Check if skill exists in registry
2. Read SKILL.md for usage examples
3. Verify credentials are configured
4. Test on small scale first

**AFTER using skill:**
1. Document results in memory
2. Note any issues or workarounds
3. Update skill registry if needed

---

## 📁 Project Organization

### Client Project Structure

```
PROJECTS/[client-name]/
├── 📋 00-BRIEF.md           # Project requirements, goals
├── 📋 01-RESEARCH.md        # Research findings
├── 📋 02-PLANNING.md        # Technical decisions, architecture
├── 📁 03-design/            # Design files, mockups
├── 📁 04-development/       # Source code
├── 📁 05-content/           # Copy, images, assets
├── 📁 06-testing/           # Test plans, QA results
├── 📁 07-deployment/        # Configs, scripts
├── 📋 99-HANDOVER.md        # Documentation for client
└── 📋 _CHANGELOG.md         # Version history
```

### Project Numbering System

**Status Prefixes:**
- `00-` Planning & Requirements
- `01-` Research & Discovery  
- `02-` Architecture & Planning
- `03-` Design Phase
- `04-` Development Phase
- `05-` Content Phase
- `06-` Testing Phase
- `07-` Deployment Phase
- `99-` Documentation & Handover

---

## 🔄 Agency Workflows

### New Project Workflow

1. **Discovery** (Research skill + web_search)
   - Client requirements gathering
   - Competitor analysis
   - Technical research
   - Document in 00-BRIEF.md and 01-RESEARCH.md

2. **Planning** (MEMORY.md + SKILLS.md)
   - Architecture decisions
   - Tech stack selection
   - Skill/tool verification
   - Document in 02-PLANNING.md

3. **Setup** (Template + GitHub skill)
   - Copy appropriate template
   - Initialize repo
   - Configure deployment
   - Update PROJECTS/ structure

4. **Development** (Frontend + Backend skills)
   - Daily commits
   - Regular memory updates
   - Test continuously

5. **Deployment** (DevOps tools + Coolify)
   - Staging deployment
   - Client review
   - Production deployment
   - Update 99-HANDOVER.md

6. **Maintenance** (Cron + monitoring)
   - Schedule updates
   - Monitor performance
   - Document in MEMORY.md

### Daily Workflow

**Morning Startup:**
1. Read MEMORY.md for context
2. Check today's memory file
3. Review active projects
4. Load relevant skills

**During Work:**
1. Write to memory immediately after decisions
2. Commit code regularly
3. Document blockers/issues
4. Update project files

**Evening Shutdown:**
1. Summarize day's work in memory
2. Note tomorrow's priorities
3. Ensure all files committed
4. Update MEMORY.md with key learnings

---

## 🎨 Tech Stack Standards

### Websites
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **CMS:** Sanity or WordPress headless
- **Hosting:** Coolify or Vercel
- **Domain:** Cloudflare

### Webapps
- **Frontend:** Next.js 15 + React 19
- **Backend:** FastAPI (Python) or Go + Gin
- **Database:** PostgreSQL + Redis
- **Auth:** Clerk or Auth0
- **Payments:** Stripe
- **Storage:** Cloudflare R2

### WordPress Plugins
- **Structure:** Modern PHP + React admin
- **Build:** @wordpress/scripts
- **Standards:** WordPress Coding Standards
- **Testing:** PHPUnit + Jest
- **Distribution:** WordPress.org or private

---

## 🔐 Security & Access Management

### API Keys & Credentials

**Stored in:** `config/secrets.env` (gitignored)  
**Never:** Hardcode in files, commit to git  
**Always:** Use environment variables

### Required Credentials Registry

Track in `CONFIG.md`:
- Service name
- Key location
- Last verified date
- Rotation schedule

---

## 📊 Quality Standards

### Code Quality
- TypeScript for all new projects
- ESLint + Prettier configured
- Husky pre-commit hooks
- Test coverage > 70%

### Documentation
- README.md in every project
- API documentation for backends
- User guides for clients
- Internal process docs

### Deployment
- Staging environment mandatory
- Automated tests before deploy
- Rollback capability
- Monitoring and alerts

---

## 🚀 Implementation Plan

### Phase 1: Foundation (Today)
- [ ] Create file structure
- [ ] Set up MEMORY.md template
- [ ] Create AGENCY.md
- [ ] Document all available skills
- [ ] Set up project templates

### Phase 2: Process (This Week)
- [ ] Create workflow checklists
- [ ] Set up automated backups
- [ ] Test deployment pipeline
- [ ] Document client handover process

### Phase 3: Optimization (Ongoing)
- [ ] Weekly memory reviews
- [ ] Skill registry updates
- [ ] Template improvements
- [ ] Process refinements

---

## ✅ Success Metrics

- **Memory retention:** 100% of important decisions documented
- **Project organization:** One repo per client, clear structure
- **Tool usage:** All relevant skills used appropriately
- **Deployment success:** >95% successful deployments
- **Client satisfaction:** Clear handovers, documented projects

---

*Environment designed for long-term agency operations with sustainable memory management and clear organizational structure.*
