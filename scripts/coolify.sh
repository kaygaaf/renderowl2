#!/usr/bin/env bash
set -euo pipefail

# Coolify helper
# Usage:
#   scripts/coolify.sh projects
#   scripts/coolify.sh apps
#   scripts/coolify.sh app-envs <app_uuid>

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/config/secrets.env"

api() {
  local path="$1"
  curl -sS -H "Authorization: Bearer ${COOLIFY_API_KEY}" "${COOLIFY_BASE_URL}${path}"
}

cmd="${1:-}"
shift || true

case "$cmd" in
  projects)
    api "/api/v1/projects" | jq -r '.[] | "\(.uuid)\t\(.name)"'
    ;;
  apps|applications)
    api "/api/v1/applications" | jq -r '.[] | "\(.uuid)\t\(.name)\t\(.fqdn // "")"'
    ;;
  app-envs)
    app_uuid="${1:?app uuid required}"
    api "/api/v1/applications/${app_uuid}/envs" | jq -r '.[] | "\(.key)=\(.value)"'
    ;;
  servers)
    api "/api/v1/servers" | jq -r '.[] | "\(.uuid)\t\(.name)\t\(.ip // "")"'
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    exit 1
    ;;
esac
