#!/bin/bash
set -euo pipefail

# Wrapper so mcporter doesn't store tokens in mcporter.json.
# Loads secrets from the OpenClaw workspace env file.

SECRETS_FILE="/Users/minion/.openclaw/workspace/config/secrets.env"
if [ -f "$SECRETS_FILE" ]; then
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
fi

: "${COOLIFY_MCP_BASE_URL:?Missing COOLIFY_MCP_BASE_URL in secrets.env}"
: "${COOLIFY_MCP_ACCESS_TOKEN:?Missing COOLIFY_MCP_ACCESS_TOKEN in secrets.env}"

export COOLIFY_BASE_URL="$COOLIFY_MCP_BASE_URL"
export COOLIFY_ACCESS_TOKEN="$COOLIFY_MCP_ACCESS_TOKEN"

exec npx -y @masonator/coolify-mcp
