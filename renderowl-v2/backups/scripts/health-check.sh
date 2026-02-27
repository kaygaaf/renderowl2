#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../config/backup.env"
METRICS_FILE="/var/lib/node_exporter/textfile_collector/renderowl_backup_health.prom"

if [ -f "${CONFIG_FILE}" ]; then set -a; source "${CONFIG_FILE}"; set +a; fi

ALERT_THRESHOLD_HOURS=${ALERT_THRESHOLD_HOURS:-25}
R2_BUCKET_PRIMARY=${R2_BUCKET_PRIMARY:-renderowl-backups-primary}
R2_ENDPOINT_PRIMARY=${R2_ENDPOINT_PRIMARY:-https://<account-id>.r2.cloudflarestorage.com}

check_last_backup() {
    local last_backup=$(AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
        AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
        aws s3 ls "s3://${R2_BUCKET_PRIMARY}/postgres/" \
        --endpoint-url "${R2_ENDPOINT_PRIMARY}" \
        --recursive 2>/dev/null | grep "renderowl-" | sort | tail -1 | awk '{print $1 " " $2}')
    if [ -z "${last_backup}" ]; then echo "999"; return; fi
    local last_epoch=$(date -d "${last_backup}" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "${last_backup}" +%s)
    echo $(( ($(date +%s) - last_epoch) / 3600 ))
}

write_metrics() {
    local hours_since="$1"
    local status="1"; [ "${hours_since}" -gt "${ALERT_THRESHOLD_HOURS}" ] && status="0"
    mkdir -p "$(dirname "${METRICS_FILE}")"
    cat > "${METRICS_FILE}" << EOF
# HELP renderowl_backup_health_hours Hours since last successful backup
# TYPE renderowl_backup_health_hours gauge
renderowl_backup_health_hours ${hours_since}

# HELP renderowl_backup_health_status Backup health status (1=healthy, 0=unhealthy)
# TYPE renderowl_backup_health_status gauge
renderowl_backup_health_status ${status}

# HELP renderowl_backup_health_check_timestamp Last health check timestamp
# TYPE renderowl_backup_health_check_timestamp gauge
renderowl_backup_health_check_timestamp $(date +%s)
EOF
}

send_alert() {
    local hours_since="$1"
    if [ "${hours_since}" -gt "${ALERT_THRESHOLD_HOURS}" ]; then
        local message="ALERT: Renderowl backup is ${hours_since} hours old (threshold: ${ALERT_THRESHOLD_HOURS}h)"
        if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
            curl -s -X POST "${SLACK_WEBHOOK_URL}" -H 'Content-type: application/json' \
                -d "{\"text\":\"${message}\"}" > /dev/null || true
        fi
    fi
}

hours_since=$(check_last_backup)
write_metrics "${hours_since}"
send_alert "${hours_since}"
