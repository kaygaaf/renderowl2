# Stack Runbook (Kay / Antigravity)

This is the quick “where do I click / what do I run” doc for Kay’s stack.

## Contents
- [Coolify](#coolify)
- [n8n](#n8n)
- [VidAI](#vidai)
- [GitHub](#github)
- [Secrets & Safety](#secrets--safety)

---

## Coolify

### Credentials
- Stored in `config/secrets.env`
  - `COOLIFY_BASE_URL`
  - `COOLIFY_API_KEY`

### CLI helpers
- List projects:
  - `scripts/coolify.sh projects`
- List applications:
  - `scripts/coolify.sh apps`
- Dump app envs (for debugging; be careful sharing output):
  - `scripts/coolify.sh app-envs <app_uuid>`

### Common tasks
- **Find what’s deployed where**
  1) `scripts/coolify.sh apps`
  2) Identify the app UUID + FQDN
- **Check env vars for an app**
  - `scripts/coolify.sh app-envs <app_uuid>`

### Notes
- Coolify API observed reachable at: `http://91.98.168.113:8000/api/v1/...`

---

## n8n

### Credentials
- Stored in `config/secrets.env`
  - `N8N_BASE_URL`
  - `N8N_API_KEY`

### CLI helpers
- List workflows:
  - `scripts/n8n.sh workflows [limit]`
- List executions for workflow:
  - `scripts/n8n.sh executions <workflowId> [limit]`

### Common tasks
- **Find failing workflow executions**
  1) `scripts/n8n.sh workflows 50`
  2) Pick workflowId
  3) `scripts/n8n.sh executions <workflowId> 20`

### Switching Gemini → OpenAI
If a workflow uses a Gemini node/model and you want OpenAI:
1) Open the workflow in n8n UI
2) Locate the Gemini node (e.g. Google Gemini / Gemini Chat Model)
3) Replace with OpenAI equivalent:
   - For chat: **OpenAI Chat Model** / **ChatOpenAI** (LangChain)
   - For images: **OpenAI image** (or route images through VidAI pipeline)
4) Update credentials and model name, then re-run with a small test payload

---

## VidAI

### Health
- Public health endpoint:
  - `https://vidai.kayorama.nl/health`

### Known caveat
- `GET /api/status/<job_id>` requires an auth header that is currently stored inside n8n as an `httpHeaderAuth` credential ("Header Auth account 2").
- From this machine, direct curl attempts returned `401 Could not validate credentials`.

### What to do when debugging jobs
- Use n8n execution details to confirm `job_id` returned from `POST /api/generate`.
- If status polling fails outside of n8n, verify the exact header key/value used by the n8n credential.

---

## GitHub

### Auth
- `gh auth status`

### Common
- List repos: `gh repo list --limit 50`
- Clone: `gh repo clone kaygaaf/<repo>`
- PRs: `gh pr list --limit 20`

---

## Secrets & Safety

- Secrets live in: `config/secrets.env` (git-ignored)
- Don’t paste secrets into chat if avoidable.
- When sharing logs/output, sanitize tokens/URLs with credentials.

### Rotating keys
Recommended later:
- Rotate Coolify API key in Coolify UI, update `config/secrets.env`, verify, then revoke old key.
- Rotate n8n API key similarly.
