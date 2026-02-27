#!/bin/bash
#
# WAL Archive Script for PostgreSQL
# Called by PostgreSQL's archive_command
# Usage: wal-archive.sh %p %f
#   %p = full path to WAL file
#   %f = filename only
#

set -euo pipefail

# Arguments
WAL_PATH="${1:-}"
WAL_FILENAME="${2:-}"

if [ -z "$WAL_PATH" ] || [ -z "$WAL_FILENAME" ]; then
    echo "Usage: $0 <wal_path> <wal_filename>"
    exit 1
fi

# Configuration
S3_ENDPOINT="${S3_ENDPOINT:-https://<account>.r2.cloudflarestorage.com}"
S3_BUCKET="${S3_BUCKET:-renderowl-backups}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
S3_PREFIX="${S3_PREFIX:-postgres/${ENVIRONMENT}/wal}"

AGE_PUBLIC_KEY="${AGE_PUBLIC_KEY:-}"
AGE_KEY_FILE="${AGE_KEY_FILE:-/etc/backup/age.key}"

# Logging
LOG_FILE="${LOG_FILE:-/var/log/postgresql/wal-archive.log}"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Verify WAL file exists
if [ ! -f "$WAL_PATH" ]; then
    log "ERROR: WAL file not found: $WAL_PATH"
    exit 1
fi

# Create temp directory for processing
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Compress WAL file
COMPRESSED_FILE="${TEMP_DIR}/${WAL_FILENAME}.zst"
if ! zstd -3 "$WAL_PATH" -o "$COMPRESSED_FILE" 2>/dev/null; then
    log "ERROR: Failed to compress $WAL_FILENAME"
    exit 1
fi

# Encrypt if key available
UPLOAD_FILE="$COMPRESSED_FILE"
if [ -n "$AGE_PUBLIC_KEY" ] || [ -f "$AGE_KEY_FILE" ]; then
    ENCRYPTED_FILE="${COMPRESSED_FILE}.age"
    if [ -n "$AGE_PUBLIC_KEY" ]; then
        age -r "$AGE_PUBLIC_KEY" -o "$ENCRYPTED_FILE" "$COMPRESSED_FILE" 2>/dev/null
    else
        age -r "$(cat "$AGE_KEY_FILE")" -o "$ENCRYPTED_FILE" "$COMPRESSED_FILE" 2>/dev/null
    fi
    UPLOAD_FILE="$ENCRYPTED_FILE"
fi

# Upload to S3/R2 with date-based organization
DATE_PREFIX=$(date +%Y/%m/%d)
S3_KEY="${S3_PREFIX}/${DATE_PREFIX}/${WAL_FILENAME}.zst"
[ -f "${COMPRESSED_FILE}.age" ] && S3_KEY="${S3_KEY}.age"

# Upload with retry logic
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID}" \
       AWS_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY}" \
       aws s3 cp "$UPLOAD_FILE" "s3://${S3_BUCKET}/${S3_KEY}" \
           --endpoint-url="$S3_ENDPOINT" \
           --storage-class STANDARD 2>> "$LOG_FILE"; then
        log "SUCCESS: Archived $WAL_FILENAME to $S3_KEY"
        exit 0
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log "RETRY $RETRY_COUNT/$MAX_RETRIES: Failed to upload $WAL_FILENAME"
    sleep 2
done

log "ERROR: Failed to archive $WAL_FILENAME after $MAX_RETRIES attempts"
exit 1
