# 🎴 QUICK REFERENCE CARD

**Print this, keep it visible, refer to it constantly**

---

## 🟢 WORKING - Use These Freely

| Service | Status | Quick Command |
|---------|--------|---------------|
| **GitHub** | ✅ Ready | `gh auth status` |
| **n8n** | ✅ Ready | `mcporter call n8n-mcp.get_workflows` |
| **Trello** | ✅ Ready | API key in `config/trello.json` |
| **Web Search** | ✅ Ready | `web_search "query"` |
| **File Ops** | ✅ Ready | `read`, `write`, `edit` |
| **Git CLI** | ✅ Ready | `gh repo view` |
| **Playwright-mcp** | ✅ Ready | `mcporter call playwright-mcp.browser_navigate url=...` |

---

## 🟡 PARTIAL - Know The Limits

| Service | What Works | What Doesn't | What To Say |
|---------|------------|--------------|-------------|
| **Coolify** | Status checks | Deployments | "Token lacks deployment permissions" |
| **SSH** | Key exists | Not authorized | "Key not on server, need authorized_keys" |
| **Browser (chrome)** | - | Extension required | "Use playwright-mcp instead" |

---

## 🔴 BLOCKED - Don't Waste Time

| Service | Why | What To Ask For |
|---------|-----|-----------------|
| **Coolify Deploy** | Token permissions | Dashboard login OR new token |
| **Server SSH** | Key not authorized | Add public key to server |

---

## 📁 WHERE THINGS ARE

```
~/.openclaw/workspace/
├── STARTUP.md           ← READ THIS AFTER RESTART
├── ACCESS_REGISTRY.md   ← CHECK BEFORE USING TOOLS
├── WORKFLOW_AUTO.md     ← HOW TO WORK
├── MEMORY.md            ← LONG-TERM MEMORY
├── memory/              ← DAILY LOGS
├── PROJECTS/            ← CLIENT PROJECTS
├── TOOLS/               ← HELPER SCRIPTS
└── config/              ← API KEYS
    ├── secrets.env
    └── mcporter.json
```

---

## 🔑 KEY LOCATIONS

| What | Where |
|------|-------|
| **GitHub Token** | macOS Keychain (gh auth handles it) |
| **Coolify Key** | `config/secrets.env` (limited perms!) |
| **n8n Key** | `config/secrets.env` (working) |
| **Trello Key** | `.trello-env` + `config/trello.json` |
| **SSH Key** | `~/.ssh/renderowl_deploy` (not authorized) |

---

## 🎯 COMMON TASKS

### Deploy to Coolify?
```
1. Can you deploy? → NO
2. What can you do? → Push to GitHub
3. What do you need? → Dashboard login or new token
```

### Check Server Logs?
```
1. Can you SSH? → NO
2. What can you do? → Check Coolify status via API
3. What do you need? → SSH key added to server
```

### Browser Automation?
```
1. Can you automate? → YES via playwright-mcp
2. How? → mcporter call playwright-mcp.browser_navigate url=...
3. What can you do? → Click, type, screenshots, JS evaluation
4. 22 tools available via mcporter
```

---

## 🆘 EMERGENCY

**Forgot everything? Run:**
```bash
cd ~/.openclaw/workspace
./TOOLS/status-check.sh
cat STARTUP.md
```

**Lost track of project?**
```bash
cat memory/$(date +%Y-%m-%d).md
cat MEMORY.md | grep -A 20 "Active Projects"
```

**Tool not working?**
```bash
cat ACCESS_REGISTRY.md | grep -A 5 "TOOL_NAME"
```

---

## ⚠️ NEVER FORGET

1. ✅ **Read STARTUP.md** after every restart
2. ✅ **Check ACCESS_REGISTRY.md** before using tools
3. ✅ **Be honest** about limitations
4. ❌ **Never claim** something is broken without checking registry
5. ❌ **Never commit** workspace files to project repos

---

*Keep this visible. Check it often.*
