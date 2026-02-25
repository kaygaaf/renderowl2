#!/bin/bash
set -euo pipefail

# Wrapper so mcporter doesn't store tokens in mcporter.json.
# Uses supergateway to expose a streamable HTTP MCP server.

SECRETS_FILE="/Users/minion/.openclaw/workspace/config/secrets.env"
if [ -f "$SECRETS_FILE" ]; then
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
fi

: "${N8N_MCP_URL:?Missing N8N_MCP_URL in secrets.env}"
: "${N8N_MCP_BEARER_TOKEN:?Missing N8N_MCP_BEARER_TOKEN in secrets.env}"

exec npx -y supergateway --streamableHttp "$N8N_MCP_URL" --header "authorization:Bearer $N8N_MCP_BEARER_TOKEN"
