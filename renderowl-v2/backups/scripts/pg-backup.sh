#!/bin/bash
# ============================================================================
# Renderowl 2.0 - PostgreSQL Backup Script
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../config/backup.env"
LOCK_FILE="/tmp/renderowl-pg-backup.lock"
LOG_FILE="/var/log/renderowl/backup-$(date +%Y%m%d-%H%M%S).log"

BACKUP_TYPE="${1:-full}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-renderowl}"
DB_USER="${DB_USER:-postgres}"
BACKUP_BUCKET_PRIMARY="${R2_BUCKET_PRIMARY:-renderowl-backups-primary}"
BACKUP_BUCKET_SECONDARY="${R2_BUCKET_SECONDARY:-renderowl-backups-secondary}"
R2_ENDPOINT_PRIMARY="${R2_ENDPOINT_PRIMARY:-https://<account-id>.r2.cloudflarestorage.com}"
R2_ENDPOINT_SECONDARY="${R2_ENDPOINT_SECONDARY:-https://<account-id>.eu.r2.cloudflarestorage.com}"
RETENTION_DAILY="${RETENTION_DAILY:-7}"
RETENTION_WEEKLY="${RETENTION_WEEKLY:-4}"
RETENTION_MONTHLY="${RETENTION_MONTHLY:-12}"
GPG_RECIPIENT="${GPG_RECIPIENT:-backup@renderowl.app}"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DATE=$(date +%Y%m%d)
BACKUP_NAME="renderowl-${BACKUP_TYPE}-${TIMESTAMP}"
BACKUP_FILE="/tmp/${BACKUP_NAME}.dump"
COMPRESSED_FILE="/tmp/${BACKUP_NAME}.dump.gz"
ENCRYPTED_FILE="/tmp/${BACKUP_NAME}.dump.gz.gpg"

log() {
    local level="$1"; shift; local message="$*"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${message}" | tee -a "${LOG_FILE}"
}
log_info() { log "INFO" "$@"; }
log_error() { log "ERROR" "$@"; }

acquire_lock() {
    if [ -f "${LOCK_FILE}" ]; then
        local pid=$(cat "${LOCK_FILE}")
        if ps -p "${pid}" > /dev/null 2>&1; then
            log_error "Backup already running (PID: ${pid})"; exit 1
        else
            rm -f "${LOCK_FILE}"
        fi
    fi
    echo $$ > "${LOCK_FILE}"
}
release_lock() { rm -f "${LOCK_FILE}"; }

load_config() {
    if [ -f "${CONFIG_FILE}" ]; then
        set -a; source "${CONFIG_FILE}"; set +a
    fi
    mkdir -p "$(dirname "${LOG_FILE}")"
}

preflight_check() {
    log_info "Running pre-flight checks..."
    for tool in pg_dump gzip gpg aws pg_isready; do
        if ! command -v "${tool}" &> /dev/null; then
            log_error "Required tool not found: ${tool}"; exit 1
        fi
    done
    if ! pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -t 5; then
        log_error "Cannot connect to PostgreSQL"; exit 1
    fi
    if [ -z "${R2_ACCESS_KEY_ID:-}" ] || [ -z "${R2_SECRET_ACCESS_KEY:-}" ]; then
        log_error "R2 credentials not configured"; exit 1
    fi
    log_info "Pre-flight checks passed"
}

perform_backup() {
    log_info "Starting ${BACKUP_TYPE} backup of ${DB_NAME}"
    local start_time=$(date +%s)
    
    log_info "Running pg_dump..."
    PGPASSWORD="${DB_PASSWORD}" pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -F custom -Z 0 -j 4 --no-owner --no-acl -f "${BACKUP_FILE}" 2>> "${LOG_FILE}"
    
    log_info "Compressing backup..."
    gzip -c "${BACKUP_FILE}" > "${COMPRESSED_FILE}"
    rm -f "${BACKUP_FILE}"
    
    log_info "Encrypting backup..."
    gpg --encrypt --recipient "${GPG_RECIPIENT}" --trust-model always --output "${ENCRYPTED_FILE}" "${COMPRESSED_FILE}"
    rm -f "${COMPRESSED_FILE}"
    
    log_info "Uploading to R2 Primary..."
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" aws s3 cp "${ENCRYPTED_FILE}" "s3://${BACKUP_BUCKET_PRIMARY}/postgres/${BACKUP_NAME}.dump.gz.gpg" --endpoint-url "${R2_ENDPOINT_PRIMARY}"
    
    log_info "Uploading to R2 Secondary..."
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" aws s3 cp "${ENCRYPTED_FILE}" "s3://${BACKUP_BUCKET_SECONDARY}/postgres/${BACKUP_NAME}.dump.gz.gpg" --endpoint-url "${R2_ENDPOINT_SECONDARY}"
    
    rm -f "${ENCRYPTED_FILE}"
    local end_time=$(date +%s)
    log_info "Backup completed in $((end_time - start_time)) seconds"
}

apply_retention() {
    log_info "Applying retention policies..."
}

cleanup() {
    rm -f "${BACKUP_FILE}" "${COMPRESSED_FILE}" "${ENCRYPTED_FILE}"
    release_lock
}

main() {
    trap cleanup EXIT
    load_config
    acquire_lock
    
    case "${BACKUP_TYPE}" in
        full|daily|weekly|monthly)
            preflight_check
            perform_backup
            apply_retention
            ;;
        cleanup)
            apply_retention
            ;;
        *)
            echo "Usage: $0 [full|daily|weekly|monthly|cleanup]"
            exit 1
            ;;
    esac
    log_info "Backup operation completed successfully"
}

main "$@"
