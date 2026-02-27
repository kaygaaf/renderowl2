#!/bin/bash
#
# PostgreSQL Restore Script for Renderowl 2.0
# Supports full backup restore and PITR (Point-in-Time Recovery)
#

set -euo pipefail

# Configuration
RESTORE_DIR="${RESTORE_DIR:-/var/lib/postgresql/restore}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-renderowl}"

# S3/R2 Configuration
S3_ENDPOINT="${S3_ENDPOINT:-https://<account>.r2.cloudflarestorage.com}"
S3_BUCKET="${S3_BUCKET:-renderowl-backups}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
S3_PREFIX="${S3_PREFIX:-postgres/${ENVIRONMENT}}"

# Decryption
AGE_KEY_FILE="${AGE_KEY_FILE:-/etc/backup/age-private.key}"

# Logging
LOG_FILE="${LOG_FILE:-/var/log/postgresql/restore.log}"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

usage() {
    cat << EOF
PostgreSQL Restore Script for Renderowl 2.0

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    list                    List available backups
    full <backup_path>      Restore from full backup
    pitr <timestamp>        Point-in-Time Recovery
    verify <backup_path>    Verify backup integrity

OPTIONS:
    -t, --target-db NAME    Target database name (default: $DB_NAME)
    -h, --host HOST         Database host (default: $DB_HOST)
    -f, --force             Skip confirmation prompts

EXAMPLES:
    # List all available backups
    $0 list

    # Restore from specific backup
    $0 full postgres/staging/full/2024/01/15/renderowl_20240115_120000.sql.zst.age

    # Point-in-Time Recovery to specific timestamp
    $0 pitr "2024-01-15 14:30:00"

    # Restore to different database
    $0 full <path> --target-db renderowl_new

EOF
}

# Set AWS credentials
export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY}"

# List available backups
list_backups() {
    log "Fetching backup list from S3..."
    
    echo ""
    echo "=== Available Full Backups ==="
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/full/" \
        --endpoint-url="$S3_ENDPOINT" \
        --recursive 2>/dev/null | grep "\.sql" | tail -20 | while read -r line; do
        echo "$line"
    done
    
    echo ""
    echo "=== Available WAL Archives ==="
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/wal/" \
        --endpoint-url="$S3_ENDPOINT" 2>/dev/null | tail -10
}

# Download and decrypt backup
download_backup() {
    local s3_path="$1"
    local local_file="$2"
    
    log "Downloading backup from S3: $s3_path"
    aws s3 cp "s3://${S3_BUCKET}/${s3_path}" "$local_file" \
        --endpoint-url="$S3_ENDPOINT" || error_exit "Failed to download backup"
    
    # Decrypt if needed
    if [[ "$local_file" == *.age ]]; then
        if [ ! -f "$AGE_KEY_FILE" ]; then
            error_exit "Age private key not found at $AGE_KEY_FILE"
        fi
        
        log "Decrypting backup..."
        local decrypted_file="${local_file%.age}"
        age -d -i "$AGE_KEY_FILE" -o "$decrypted_file" "$local_file" || error_exit "Decryption failed"
        rm -f "$local_file"
        local_file="$decrypted_file"
    fi
    
    # Decompress if needed
    if [[ "$local_file" == *.zst ]]; then
        log "Decompressing backup..."
        local decompressed_file="${local_file%.zst}"
        zstd -d "$local_file" -o "$decompressed_file" || error_exit "Decompression failed"
        rm -f "$local_file"
        local_file="$decompressed_file"
    elif [[ "$local_file" == *.gz ]]; then
        log "Decompressing backup..."
        gunzip "$local_file"
        local_file="${local_file%.gz}"
    fi
    
    echo "$local_file"
}

# Full backup restore
restore_full() {
    local s3_path="$1"
    local target_db="${2:-$DB_NAME}"
    
    log "Starting full restore to database: $target_db"
    log "Backup source: $s3_path"
    
    # Create restore directory
    mkdir -p "$RESTORE_DIR"
    local temp_file="${RESTORE_DIR}/restore_$(date +%s).sql.age"
    
    # Download and prepare backup
    local backup_file
    backup_file=$(download_backup "$s3_path" "$temp_file")
    
    log "Backup file ready: $backup_file"
    
    # Confirm if database exists
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$target_db'" | grep -q 1; then
        if [ "${FORCE:-false}" != "true" ]; then
            read -p "Database '$target_db' exists. Drop and recreate? [y/N] " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log "Restore cancelled"
                rm -f "$backup_file"
                exit 1
            fi
        fi
        
        log "Dropping existing database: $target_db"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
            -c "DROP DATABASE IF EXISTS \"$target_db\";" || error_exit "Failed to drop database"
    fi
    
    # Create database
    log "Creating database: $target_db"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "CREATE DATABASE \"$target_db\";" || error_exit "Failed to create database"
    
    # Restore from backup
    log "Restoring from backup..."
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" \
        --verbose "$backup_file" 2>> "$LOG_FILE" || error_exit "Restore failed"
    
    # Cleanup
    rm -f "$backup_file"
    
    # Verify
    local table_count
    table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" \
        -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" | xargs)
    
    log "Restore completed successfully!"
    log "Tables restored: $table_count"
    
    # Show database size
    local db_size
    db_size=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" \
        -t -c "SELECT pg_size_pretty(pg_database_size('$target_db'));" | xargs)
    log "Database size: $db_size"
}

# Point-in-Time Recovery (PITR)
restore_pitr() {
    local target_time="$1"
    local target_db="${2:-$DB_NAME}"
    
    log "Starting Point-in-Time Recovery"
    log "Target time: $target_time"
    log "WARNING: This will stop PostgreSQL and perform full recovery"
    
    if [ "${FORCE:-false}" != "true" ]; then
        read -p "Continue with PITR? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "PITR cancelled"
            exit 1
        fi
    fi
    
    # Stop PostgreSQL
    log "Stopping PostgreSQL..."
    systemctl stop postgresql || pg_ctlcluster 15 main stop || error_exit "Failed to stop PostgreSQL"
    
    # Create recovery configuration
    local pg_data="${PGDATA:-/var/lib/postgresql/15/main}"
    
    cat > "${pg_data}/recovery.conf" << EOF
# Point-in-Time Recovery Configuration
restore_command = 'AWS_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID} AWS_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY} aws s3 cp s3://${S3_BUCKET}/${S3_PREFIX}/wal/%f %p --endpoint-url=${S3_ENDPOINT}'
recovery_target_time = '${target_time}'
recovery_target_action = 'promote'
EOF
    
    # Create standby.signal for PostgreSQL 12+
    touch "${pg_data}/recovery.signal"
    
    # Start PostgreSQL in recovery mode
    log "Starting PostgreSQL in recovery mode..."
    systemctl start postgresql || pg_ctlcluster 15 main start
    
    log "PITR initiated. Monitor logs: tail -f /var/log/postgresql/postgresql-15-main.log"
    log "PostgreSQL will promote to primary once recovery target is reached"
}

# Verify backup integrity
verify_backup() {
    local s3_path="$1"
    
    log "Verifying backup: $s3_path"
    
    mkdir -p "$RESTORE_DIR"
    local temp_file="${RESTORE_DIR}/verify_$(date +%s).sql.age"
    
    # Download
    local backup_file
    backup_file=$(download_backup "$s3_path" "$temp_file")
    
    # Test with pg_restore
    log "Testing backup with pg_restore --list..."
    if pg_restore --list "$backup_file" > /dev/null 2>> "$LOG_FILE"; then
        log "✓ Backup verification passed"
        local result=0
    else
        log "✗ Backup verification failed"
        local result=1
    fi
    
    rm -f "$backup_file"
    return $result
}

# Parse arguments
FORCE=false
COMMAND=""
TARGET_DB="$DB_NAME"

while [[ $# -gt 0 ]]; do
    case $1 in
        list)
            COMMAND="list"
            shift
            ;;
        full)
            COMMAND="full"
            shift
            ;;
        pitr)
            COMMAND="pitr"
            shift
            ;;
        verify)
            COMMAND="verify"
            shift
            ;;
        -t|--target-db)
            TARGET_DB="$2"
            shift 2
            ;;
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            ARG="$1"
            shift
            ;;
    esac
done

# Execute command
case "$COMMAND" in
    list)
        list_backups
        ;;
    full)
        [ -z "${ARG:-}" ] && { usage; exit 1; }
        restore_full "$ARG" "$TARGET_DB"
        ;;
    pitr)
        [ -z "${ARG:-}" ] && { usage; exit 1; }
        restore_pitr "$ARG" "$TARGET_DB"
        ;;
    verify)
        [ -z "${ARG:-}" ] && { usage; exit 1; }
        verify_backup "$ARG"
        ;;
    *)
        usage
        exit 1
        ;;
esac
