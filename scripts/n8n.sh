#!/usr/bin/env bash
set -euo pipefail

# n8n helper
# Usage:
#   scripts/n8n.sh workflows [limit]
#   scripts/n8n.sh executions <workflowId> [limit]

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/config/secrets.env"

api() {
  local path="$1"
  curl -sS -H "X-N8N-API-KEY: ${N8N_API_KEY}" "${N8N_BASE_URL}${path}"
}

cmd="${1:-}"
shift || true

case "$cmd" in
  workflows)
    limit="${1:-20}"
    api "/api/v1/workflows?limit=${limit}" | jq -r '.data[] | "\(.id)\t\(.active)\t\(.name)"'
    ;;
  executions)
    wf="${1:?workflowId required}"
    limit="${2:-10}"
    api "/api/v1/executions?workflowId=${wf}&limit=${limit}" | jq -r '.data[] | "\(.id)\t\(.status)\t\(.startedAt)"'
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    exit 1
    ;;
esac
