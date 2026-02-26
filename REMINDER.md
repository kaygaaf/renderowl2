# ⛔ BEFORE YOU DO ANYTHING - READ THIS

## STOP. CHECKLIST FIRST.

### 1. Skills Check (REQUIRED)
```bash
# Run this before EVERY task:
agents_list
mcporter list
```

### 2. Read SKILL.md (REQUIRED)
- If using Coolify → Read `mcporter/SKILL.md`
- If using GitHub → Read `github/SKILL.md`  
- If creating skills → Read `skill-creator/SKILL.md`
- **DO NOT GUESS. READ THE SKILL.**

### 3. Check Memory (REQUIRED)
- Read `AGENTS.md` → Check user preferences
- Read `MEMORY.md` → Check recent decisions
- Read `memory/YYYY-MM-DD.md` → Check today's context

### 4. User Preferences (DO NOT FORGET)
- ✅ Only Kimi model
- ✅ NO fallbacks
- ✅ Timeout is the issue (not concurrency)
- ✅ Use MCP servers (mcporter), not curl
- ✅ Test before claiming success

### 5. Access I Have (USE IT)
- ✅ MCP server: `mcporter` for Coolify
- ✅ GitHub CLI: `gh` 
- ✅ Direct API: Only if MCP fails

---

## IF YOU SKIP THIS CHECKLIST → YOU WILL MAKE MISTAKES

Recent mistakes from skipping checklist:
- Used curl instead of mcporter (multiple times)
- Added fallbacks when user said NO fallbacks
- Reduced concurrency when timeout was the issue
- Forgot to test before claiming "it works"

**THIS CHECKLIST IS NOT OPTIONAL.**
