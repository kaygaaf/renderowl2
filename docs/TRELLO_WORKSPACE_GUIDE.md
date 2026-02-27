# Renderowl Inc. - Trello Workspace Documentation

## 🏢 Organization Structure

### Team Boards

| Team | Board URL | Purpose |
|------|-----------|---------|
| **🚀 DevOps** | https://trello.com/b/LvG5nRSt | Infrastructure, deployments, monitoring |
| **⚙️ Backend** | https://trello.com/b/UNlPr4di | API development, database, integrations |
| **🎨 Frontend** | https://trello.com/b/PzF1oOvk | React UI, design system, UX |
| **🧪 QA** | https://trello.com/b/8qQq7XFW | Testing, bug tracking, quality |
| **💡 Product** | https://trello.com/b/C2P4nRSk | Features, roadmap, user stories |

## 📋 Board Structure

Each board follows this standard list structure:

1. **📋 Backlog** - Unprioritized tasks and ideas
2. **🔄 In Progress** - Currently being worked on
3. **👀 Review** - Ready for code review/QA
4. **🚧 Blocked** - Blocked by dependencies or issues
5. **✅ Done** - Completed tasks

## 🏷️ Label System

### Priority Labels
- 🔴 **Critical** - Production down, security issues
- 🟠 **High** - Major feature, significant bug
- 🟡 **Medium** - Standard work
- 🟢 **Low** - Nice to have

### Type Labels
- 🐛 **Bug** - Something is broken
- ✨ **Feature** - New functionality
- 🔧 **Tech Debt** - Code cleanup, refactoring
- 📚 **Documentation** - Docs, README, comments
- 🔒 **Security** - Security-related tasks

### Team Labels
- 🚀 **DevOps** - Infrastructure work
- ⚙️ **Backend** - API/database work
- 🎨 **Frontend** - UI/UX work
- 🧪 **QA** - Testing work

## 🔄 Workflow Process

### 1. Task Creation
- Product Owner creates card in Product board
- Card includes: Description, Acceptance Criteria, Priority
- Labels applied based on type and priority

### 2. Sprint Planning
- Team reviews Backlog
- Cards moved to In Progress based on capacity
- Assignee added to card

### 3. Development
- Developer moves card to In Progress
- Branch naming: `feature/TRELLO-CARD-ID-short-description`
- Daily updates in card comments

### 4. Code Review
- Card moved to Review
- PR linked in card description
- Reviewer assigned

### 5. QA/Testing
- After approval, card moved to QA board
- QA tests against acceptance criteria
- Bugs reported as new cards linked to original

### 6. Deployment
- DevOps moves card to Done after production deploy
- Card includes deployment notes

## 📝 Card Template

```
## Description
[Clear description of what needs to be done]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Technical Notes
[Implementation details, links, references]

## Related
- PR: [link]
- Docs: [link]
- Related Cards: [links]
```

## 🎯 Current Priorities (Q1 2026)

### P0 - Critical (Fix Immediately)
- API stability issues
- Video playback broken
- Login/authentication problems

### P1 - High (This Sprint)
- Analytics dashboard
- Video templates system
- Batch generation

### P2 - Medium (Next Sprint)
- UI/UX improvements
- Mobile responsiveness
- Performance optimization

### P3 - Low (Backlog)
- Feature enhancements
- Tech debt cleanup
- Documentation

## 👥 Team Members

| Role | Name | Trello Handle | Responsibilities |
|------|------|---------------|------------------|
| Tech Lead | AI Assistant | @aiassistant | Architecture, code review |
| Backend Dev | AI Subagent | @backend-bot | API, database |
| Frontend Dev | AI Subagent | @frontend-bot | React, UI |
| DevOps | AI Subagent | @devops-bot | Infrastructure |
| QA | AI Subagent | @qa-bot | Testing |

## 🚨 Escalation Process

1. **Card blocked > 24 hours** → Move to Blocked list, add comment
2. **Production issue** → Create Critical label card, notify immediately
3. **Dependencies needed** → Link blocking cards, tag responsible team

## 📊 Metrics We Track

- Cycle Time: Backlog → Done
- WIP Limits: Max 3 cards per developer
- Bug Escape Rate: Bugs found in production
- Deployment Frequency: Deploys per week

## 🔗 Quick Links

- **Production:** https://app.renderowl.com
- **API Docs:** https://api.renderowl.com/docs
- **GitHub:** https://github.com/kaygaaf/videogen
- **Coolify:** https://cool.kayorama.nl

---

*Last Updated: February 27, 2026*
*Document Owner: AI Assistant*
*Next Review: March 6, 2026*
