#!/bin/bash
#
# Backup Retention Policy Script
# Manages 7 daily, 4 weekly, 12 monthly backups
#

set -euo pipefail

# Configuration
S3_ENDPOINT="${S3_ENDPOINT:-https://<account>.r2.cloudflarestorage.com}"
S3_BUCKET="${S3_BUCKET:-renderowl-backups}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
S3_PREFIX="${S3_PREFIX:-postgres/${ENVIRONMENT}}"

# Retention settings
DAILY_RETENTION_DAYS=7
WEEKLY_RETENTION_DAYS=28    # 4 weeks
MONTHLY_RETENTION_DAYS=365  # 12 months

# Logging
LOG_FILE="${LOG_FILE:-/var/log/postgresql/retention.log}"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Set AWS credentials
export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY}"

# Get list of backups from S3
get_backups() {
    local backup_type="$1"
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/full/" \
        --endpoint-url="$S3_ENDPOINT" \
        --recursive 2>/dev/null | grep "\.sql" || true
}

# Parse date from backup path
parse_backup_date() {
    local path="$1"
    # Extract date from path like: postgres/staging/full/2024/01/15/db_20240115_120000.sql.zst.age
    local date_str=$(echo "$path" | grep -oE '[0-9]{4}/[0-9]{2}/[0-9]{2}' | tr '/' '-')
    if [ -n "$date_str" ]; then
        date -d "$date_str" +%s 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Determine if backup should be kept based on retention policy
should_keep() {
    local backup_date="$1"
    local current_date="$2"
    local backup_path="$3"
    
    local age_days=$(( (current_date - backup_date) / 86400 ))
    
    # Always keep if less than 7 days old (daily)
    if [ $age_days -lt $DAILY_RETENTION_DAYS ]; then
        return 0
    fi
    
    # Keep weekly backups (7, 14, 21, 28 days)
    if [ $age_days -lt $WEEKLY_RETENTION_DAYS ]; then
        # Check if it's a Sunday backup (weekly)
        local weekday=$(date -d "@$backup_date" +%u)
        if [ "$weekday" == "7" ]; then
            return 0
        fi
    fi
    
    # Keep monthly backups (first of month)
    if [ $age_days -lt $MONTHLY_RETENTION_DAYS ]; then
        local day_of_month=$(date -d "@$backup_date" +%d)
        if [ "$day_of_month" == "01" ]; then
            return 0
        fi
    fi
    
    return 1
}

# Delete old backups
apply_retention() {
    log "Applying retention policy for ${ENVIRONMENT}"
    log "Daily: ${DAILY_RETENTION_DAYS} days, Weekly: ${WEEKLY_RETENTION_DAYS} days, Monthly: ${MONTHLY_RETENTION_DAYS} days"
    
    local current_date=$(date +%s)
    local deleted_count=0
    local kept_count=0
    
    # Get all full backups
    local backups
    backups=$(get_backups "full")
    
    if [ -z "$backups" ]; then
        log "No backups found"
        return 0
    fi
    
    # Process each backup
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        
        # Parse S3 ls output: "2024-01-15 12:00:00    1234567 path/to/file"
        local file_path=$(echo "$line" | awk '{$1=$2=$3=""; print $0}' | sed 's/^[[:space:]]*//')
        local backup_date=$(parse_backup_date "$file_path")
        
        if [ "$backup_date" == "0" ]; then
            log "WARNING: Could not parse date from $file_path"
            continue
        fi
        
        if should_keep "$backup_date" "$current_date" "$file_path"; then
            log "KEEP: $file_path"
            ((kept_count++))
        else
            log "DELETE: $file_path"
            if aws s3 rm "s3://${S3_BUCKET}/${file_path}" \
                --endpoint-url="$S3_ENDPOINT" 2>> "$LOG_FILE"; then
                ((deleted_count++))
            else
                log "ERROR: Failed to delete $file_path"
            fi
        fi
    done <<< "$backups"
    
    log "Retention policy applied: $deleted_count deleted, $kept_count kept"
}

# Clean old WAL files (keep 30 days)
cleanup_wal() {
    log "Cleaning up old WAL files"
    
    local cutoff_date=$(date -d '30 days ago' +%Y/%m/%d)
    local wal_prefix="${S3_PREFIX}/wal"
    
    # List and delete old WAL directories
    local old_wal_dirs
    old_wal_dirs=$(aws s3 ls "s3://${S3_BUCKET}/${wal_prefix}/" \
        --endpoint-url="$S3_ENDPOINT" 2>/dev/null | awk '{print $2}' | sed 's|/$||' || true)
    
    local deleted_wal=0
    
    while IFS= read -r dir; do
        [ -z "$dir" ] && continue
        
        # Compare dates (format: YYYY/MM/DD)
        if [[ "$dir" < "$cutoff_date" ]]; then
            log "DELETE WAL dir: $dir"
            if aws s3 rm "s3://${S3_BUCKET}/${wal_prefix}/${dir}/" \
                --endpoint-url="$S3_ENDPOINT" \
                --recursive 2>> "$LOG_FILE"; then
                ((deleted_wal++))
            fi
        fi
    done <<< "$old_wal_dirs"
    
    log "WAL cleanup: $deleted_wal old directories removed"
}

# Main execution
case "${1:-all}" in
    backups)
        apply_retention
        ;;
    wal)
        cleanup_wal
        ;;
    all)
        apply_retention
        cleanup_wal
        ;;
    *)
        echo "Usage: $0 {backups|wal|all}"
        exit 1
        ;;
esac
