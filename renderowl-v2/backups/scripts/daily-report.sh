#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../config/backup.env"

if [ -f "${CONFIG_FILE}" ]; then set -a; source "${CONFIG_FILE}"; set +a; fi

R2_BUCKET_PRIMARY=${R2_BUCKET_PRIMARY:-renderowl-backups-primary}
R2_ENDPOINT_PRIMARY=${R2_ENDPOINT_PRIMARY:-https://<account-id>.r2.cloudflarestorage.com}

gather_stats() {
    local count=$(AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
        AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
        aws s3 ls "s3://${R2_BUCKET_PRIMARY}/postgres/" \
        --endpoint-url "${R2_ENDPOINT_PRIMARY}" \
        --recursive 2>/dev/null | wc -l || echo "0")
    echo "Backups: ${count}"
}

generate_report() {
    local report_date=$(date '+%Y-%m-%d')
    local stats=$(gather_stats)
    local last_backup=$(AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
        AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
        aws s3 ls "s3://${R2_BUCKET_PRIMARY}/postgres/" \
        --endpoint-url "${R2_ENDPOINT_PRIMARY}" \
        --recursive 2>/dev/null | grep "renderowl-" | sort | tail -1 | awk '{print $4}' || echo "No backups")
    
    cat << EOF
Renderowl Backup Report - ${report_date}
======================================
${stats}
Last Backup: ${last_backup}
Retention: 7 daily, 4 weekly, 12 monthly
RTO: 4 hours, RPO: 1 hour
EOF
}

echo "$(generate_report)" >> /var/log/renderowl/daily-reports.log
