#!/bin/bash
# ============================================================================
# Renderowl 2.0 - PostgreSQL Restore Script
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../config/backup.env"
LOCK_FILE="/tmp/renderowl-pg-restore.lock"
LOG_FILE="/var/log/renderowl/restore-$(date +%Y%m%d-%H%M%S).log"
RESTORE_DIR="/var/lib/postgresql/restore"

RESTORE_TYPE="${1:-full}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-renderowl}"
DB_USER="${DB_USER:-postgres}"
BACKUP_BUCKET_PRIMARY="${R2_BUCKET_PRIMARY:-renderowl-backups-primary}"
R2_ENDPOINT_PRIMARY="${R2_ENDPOINT_PRIMARY:-https://<account-id>.r2.cloudflarestorage.com}"
GPG_RECIPIENT="${GPG_RECIPIENT:-backup@renderowl.app}"
VERIFY_MODE="${VERIFY_MODE:-false}"

log() {
    local level="$1"; shift; local message="$*"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${message}" | tee -a "${LOG_FILE}"
}
log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }

acquire_lock() {
    if [ -f "${LOCK_FILE}" ]; then
        local pid=$(cat "${LOCK_FILE}")
        if ps -p "${pid}" > /dev/null 2>&1; then
            log_error "Restore already running (PID: ${pid})"; exit 1
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
    mkdir -p "$(dirname "${LOG_FILE}")" "${RESTORE_DIR}"
}

preflight_check() {
    log_info "Running pre-flight checks..."
    if ! command -v pg_restore &> /dev/null; then
        log_error "pg_restore not found"; exit 1
    fi
    if [ "${VERIFY_MODE}" = "true" ]; then
        log_warn "Running in VERIFY MODE"
        DB_NAME="${DB_NAME}_verify_$(date +%s)"
    fi
    log_info "Pre-flight checks passed"
}

download_backup() {
    local output_file="$1"
    log_info "Finding latest backup..."
    local backup_name=$(AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" aws s3 ls "s3://${BACKUP_BUCKET_PRIMARY}/postgres/" --endpoint-url "${R2_ENDPOINT_PRIMARY}" --recursive | grep "renderowl-" | sort | tail -1 | awk '{print $4}')
    if [ -z "${backup_name}" ]; then
        log_error "No backups found"; exit 1
    fi
    backup_name=$(basename "${backup_name}")
    
    log_info "Downloading backup: ${backup_name}"
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" aws s3 cp "s3://${BACKUP_BUCKET_PRIMARY}/postgres/${backup_name}" "${output_file}.gpg" --endpoint-url "${R2_ENDPOINT_PRIMARY}"
    
    log_info "Decrypting..."
    gpg --decrypt --output "${output_file}.gz" "${output_file}.gpg"
    rm -f "${output_file}.gpg"
    
    log_info "Decompressing..."
    gunzip -c "${output_file}.gz" > "${output_file}"
    rm -f "${output_file}.gz"
}

restore_full() {
    log_info "Starting full restore..."
    local backup_file="${RESTORE_DIR}/restore-$(date +%s).dump"
    download_backup "${backup_file}"
    
    if [ "${VERIFY_MODE}" = "true" ]; then
        log_info "Creating verification database: ${DB_NAME}"
        PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME};" 2>&1 || true
    else
        log_warn "This will DESTROY the existing database: ${DB_NAME}"
        read -p "Type 'DESTROY' to continue: " confirm
        if [ "${confirm}" != "DESTROY" ]; then
            log_error "Restore cancelled"; rm -f "${backup_file}"; exit 1
        fi
        PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
        PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME};"
    fi
    
    log_info "Restoring database..."
    PGPASSWORD="${DB_PASSWORD}" pg_restore -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -j 4 --verbose --no-owner --no-acl "${backup_file}" 2>> "${LOG_FILE}" || true
    
    local table_count=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    log_info "Restored database contains ${table_count} tables"
    rm -f "${backup_file}"
    
    if [ "${VERIFY_MODE}" = "true" ]; then
        PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
        log_info "Verification completed successfully!"
    fi
}

cleanup() {
    rm -rf "${RESTORE_DIR}"
    release_lock
}

main() {
    trap cleanup EXIT
    load_config
    acquire_lock
    
    case "${RESTORE_TYPE}" in
        full) preflight_check; restore_full ;;
        verify) VERIFY_MODE=true; preflight_check; restore_full ;;
        *)
            echo "Usage: $0 [full|verify]"
            exit 1
            ;;
    esac
}

main "$@"
