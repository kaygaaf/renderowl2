#!/bin/bash
#
# PostgreSQL Backup Script for Renderowl 2.0
# Handles full backups (pg_dump) and WAL archiving for PITR
#

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/lib/postgresql/backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-renderowl}"
ENVIRONMENT="${ENVIRONMENT:-staging}"

# S3/R2 Configuration
S3_ENDPOINT="${S3_ENDPOINT:-https://<account>.r2.cloudflarestorage.com}"
S3_BUCKET="${S3_BUCKET:-renderowl-backups}"
S3_PREFIX="${S3_PREFIX:-postgres/${ENVIRONMENT}}"

# Encryption (age)
AGE_PUBLIC_KEY="${AGE_PUBLIC_KEY:-}"
AGE_KEY_FILE="${AGE_KEY_FILE:-/etc/backup/age.key}"

# Compression
COMPRESSION="${COMPRESSION:-zstd}"
ZSTD_LEVEL="${ZSTD_LEVEL:-3}"

# Logging
LOG_FILE="${LOG_FILE:-/var/log/postgresql/backup.log}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_PATH=$(date +%Y/%m/%d)

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check dependencies
check_dependencies() {
    local deps=("pg_dump" "psql" "aws" "age" "zstd")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error_exit "Required dependency not found: $dep"
        fi
    done
}

# Get database size for monitoring
get_db_size() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null || echo "unknown"
}

# Create full backup using pg_dump
full_backup() {
    log "Starting full backup for database: $DB_NAME"
    log "Database size: $(get_db_size)"
    
    local backup_file="${BACKUP_DIR}/full_${DB_NAME}_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.${COMPRESSION}"
    local encrypted_file="${compressed_file}.age"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Perform pg_dump
    log "Running pg_dump..."
    PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --verbose \
        --file="$backup_file" 2>> "$LOG_FILE" || error_exit "pg_dump failed"
    
    # Compress
    log "Compressing backup with $COMPRESSION..."
    if [ "$COMPRESSION" == "zstd" ]; then
        zstd -${ZSTD_LEVEL} --rm "$backup_file" -o "$compressed_file" 2>> "$LOG_FILE"
    else
        gzip --best "$backup_file"
        compressed_file="${backup_file}.gz"
    fi
    
    # Encrypt with age
    log "Encrypting backup..."
    if [ -n "$AGE_PUBLIC_KEY" ]; then
        age -r "$AGE_PUBLIC_KEY" -o "$encrypted_file" "$compressed_file" 2>> "$LOG_FILE"
    elif [ -f "$AGE_KEY_FILE" ]; then
        age -r "$(cat "$AGE_KEY_FILE")" -o "$encrypted_file" "$compressed_file" 2>> "$LOG_FILE"
    else
        log "WARNING: No age public key provided, skipping encryption"
        encrypted_file="$compressed_file"
    fi
    
    # Remove uncompressed file
    [ -f "$compressed_file" ] && rm -f "$compressed_file"
    
    # Upload to R2/S3
    local s3_key="${S3_PREFIX}/full/${DATE_PATH}/${DB_NAME}_${TIMESTAMP}.sql.${COMPRESSION}.age"
    log "Uploading to S3: $s3_key"
    
    AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY}" \
    aws s3 cp "$encrypted_file" "s3://${S3_BUCKET}/${s3_key}" \
        --endpoint-url="$S3_ENDPOINT" \
        --storage-class STANDARD 2>> "$LOG_FILE" || error_exit "S3 upload failed"
    
    # Get file size
    local file_size=$(du -h "$encrypted_file" | cut -f1)
    
    # Cleanup local file
    rm -f "$encrypted_file"
    
    log "Full backup completed: $s3_key (size: $file_size)"
    
    # Output for monitoring
    echo "BACKUP_SUCCESS=1"
    echo "BACKUP_SIZE=$file_size"
    echo "BACKUP_PATH=$s3_key"
    echo "BACKUP_TIMESTAMP=$TIMESTAMP"
}

# Setup WAL archiving
setup_wal_archiving() {
    log "Setting up WAL archiving configuration"
    
    cat << 'EOF'

# Add these settings to postgresql.conf:

# WAL Archiving for PITR
wal_level = replica                    # or 'logical' for logical replication
archive_mode = on
archive_command = '/usr/local/bin/wal-archive.sh %p %f'
archive_timeout = 600                  # Force archive every 10 minutes

# Retention (adjust based on disk space)
wal_keep_size = 1GB                    # Keep 1GB of WAL files locally
max_slot_wal_keep_size = -1            # Unlimited for replication slots

# Recovery settings
max_wal_size = 2GB
min_wal_size = 512MB

EOF
    
    log "WAL archiving configuration displayed. Add to postgresql.conf and restart PostgreSQL."
}

# Main execution
case "${1:-full}" in
    full)
        check_dependencies
        full_backup
        ;;
    setup-wal)
        setup_wal_archiving
        ;;
    *)
        echo "Usage: $0 {full|setup-wal}"
        exit 1
        ;;
esac
