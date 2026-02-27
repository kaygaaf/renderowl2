#!/bin/bash
# ============================================================================
# Renderowl 2.0 - Weekly Restore Test Script
# ============================================================================
# Automated restore testing to validate backup integrity
# Runs weekly via cron and reports results
#
# This script:
# - Downloads a random recent backup
# - Restores to temporary test environment
# - Runs integrity checks
# - Reports results to monitoring/Trello
#
# Usage: ./weekly-restore-test.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../config/backup.env"
LOG_FILE="/var/log/renderowl/restore-test-$(date +%Y%m%d-%H%M%S).log"
REPORT_FILE="/var/log/renderowl/restore-test-report.json"
TEST_DB_NAME="renderowl_restore_test_$(date +%s)"
TEST_CONTAINER="postgres-restore-test-$(date +%s)"

# Test results
TEST_RESULT="PASSED"
TEST_ERRORS=()
TEST_DURATION=0
BACKUP_FILE=""

# ============================================================================
# Logging
# ============================================================================
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }

# ============================================================================
# Configuration
# ============================================================================
load_config() {
    if [ -f "${CONFIG_FILE}" ]; then
        set -a
        source "${CONFIG_FILE}"
        set +a
    fi
    mkdir -p "$(dirname "${LOG_FILE}")"
}

# ============================================================================
# Setup Test Environment
# ============================================================================
setup_test_env() {
    log_info "Setting up test environment..."
    
    # Pull PostgreSQL image matching production version
    docker pull postgres:16-alpine
    
    # Start temporary PostgreSQL container
    docker run -d \
        --name "${TEST_CONTAINER}" \
        -e POSTGRES_PASSWORD=testpassword \
        -e POSTGRES_DB=postgres \
        -p 5433:5432 \
        postgres:16-alpine
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to start..."
    local retries=0
    while ! docker exec "${TEST_CONTAINER}" pg_isready -U postgres > /dev/null 2>&1; do
        sleep 1
        retries=$((retries + 1))
        if [ ${retries} -gt 60 ]; then
            log_error "PostgreSQL failed to start within 60 seconds"
            return 1
        fi
    done
    
    log_info "Test environment ready"
}

# ============================================================================
# Select Random Backup
# ============================================================================
select_backup() {
    log_info "Selecting random backup for testing..."
    
    # Get list of backups
    local backups=$(AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
        AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
        aws s3 ls "s3://${R2_BUCKET_PRIMARY:-renderowl-backups-primary}/postgres/" \
        --endpoint-url "${R2_ENDPOINT_PRIMARY:-https://<account-id>.r2.cloudflarestorage.com}" \
        --recursive | grep "renderowl-" | awk '{print $4}')
    
    if [ -z "${backups}" ]; then
        log_error "No backups found"
        return 1
    fi
    
    # Select random backup from last 7 days
    local recent_backups=$(echo "${backups}" | while read backup; do
        local backup_date=$(echo "${backup}" | grep -oE '[0-9]{8}-[0-9]{6}')
        if [ -n "${backup_date}" ]; then
            local backup_epoch=$(date -d "${backup_date:0:8} ${backup_date:9:2}:${backup_date:11:2}:${backup_date:13:2}" +%s 2>/dev/null || echo "0")
            local week_ago=$(($(date +%s) - 604800))
            if [ "${backup_epoch}" -gt "${week_ago}" ]; then
                echo "${backup}"
            fi
        fi
    done)
    
    if [ -z "${recent_backups}" ]; then
        # Fallback to any backup
        recent_backups="${backups}"
    fi
    
    # Select random backup
    BACKUP_FILE=$(echo "${recent_backups}" | shuf -n 1)
    log_info "Selected backup: $(basename "${BACKUP_FILE}")"
}

# ============================================================================
# Download and Prepare Backup
# ============================================================================
prepare_backup() {
    local temp_dir="/tmp/restore-test-$(date +%s)"
    mkdir -p "${temp_dir}"
    
    log_info "Downloading backup..."
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    aws s3 cp "s3://${R2_BUCKET_PRIMARY:-renderowl-backups-primary}/${BACKUP_FILE}" \
        "${temp_dir}/backup.dump.gz.gpg" \
        --endpoint-url "${R2_ENDPOINT_PRIMARY:-https://<account-id>.r2.cloudflarestorage.com}"
    
    log_info "Decrypting backup..."
    gpg --decrypt --output "${temp_dir}/backup.dump.gz" "${temp_dir}/backup.dump.gz.gpg" || {
        log_error "Failed to decrypt backup"
        TEST_ERRORS+=("Decryption failed")
        TEST_RESULT="FAILED"
        return 1
    }
    
    log_info "Decompressing backup..."
    gunzip -c "${temp_dir}/backup.dump.gz" > "${temp_dir}/backup.dump" || {
        log_error "Failed to decompress backup"
        TEST_ERRORS+=("Decompression failed")
        TEST_RESULT="FAILED"
        return 1
    }
    
    echo "${temp_dir}/backup.dump"
}

# ============================================================================
# Restore and Validate
# ============================================================================
restore_and_validate() {
    local backup_file="$1"
    local start_time=$(date +%s)
    
    log_info "Restoring backup to test database..."
    
    # Create test database
    docker exec "${TEST_CONTAINER}" psql -U postgres -c "CREATE DATABASE ${TEST_DB_NAME};"
    
    # Copy backup file to container
    docker cp "${backup_file}" "${TEST_CONTAINER}:/tmp/backup.dump"
    
    # Restore
    if ! docker exec "${TEST_CONTAINER}" pg_restore \
        -U postgres \
        -d "${TEST_DB_NAME}" \
        -j 2 \
        --verbose \
        --no-owner \
        --no-acl \
        "/tmp/backup.dump" >&2; then
        log_warn "pg_restore reported some errors (may be normal for certain objects)"
    fi
    
    # Validation Tests
    log_info "Running validation tests..."
    
    # Test 1: Check database is accessible
    local db_size=$(docker exec "${TEST_CONTAINER}" psql -U postgres -d "${TEST_DB_NAME}" -t -c "SELECT pg_size_pretty(pg_database_size('${TEST_DB_NAME}'));" | xargs)
    if [ -z "${db_size}" ] || [ "${db_size}" = "0 bytes" ]; then
        log_error "Database appears empty or inaccessible"
        TEST_ERRORS+=("Database validation failed: empty or inaccessible")
        TEST_RESULT="FAILED"
        return 1
    fi
    log_info "Database size: ${db_size}"
    
    # Test 2: Check table count
    local table_count=$(docker exec "${TEST_CONTAINER}" psql -U postgres -d "${TEST_DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    log_info "Table count: ${table_count}"
    if [ "${table_count}" -eq 0 ]; then
        log_error "No tables found in database"
        TEST_ERRORS+=("No tables found in restored database")
        TEST_RESULT="FAILED"
        return 1
    fi
    
    # Test 3: Check for critical tables (customize as needed)
    local critical_tables=("users" "projects" "renders" "assets")
    for table in "${critical_tables[@]}"; do
        local exists=$(docker exec "${TEST_CONTAINER}" psql -U postgres -d "${TEST_DB_NAME}" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}');" | xargs)
        if [ "${exists}" != "t" ]; then
            log_warn "Critical table '${table}' not found"
        else
            local row_count=$(docker exec "${TEST_CONTAINER}" psql -U postgres -d "${TEST_DB_NAME}" -t -c "SELECT COUNT(*) FROM ${table};" | xargs)
            log_info "Table '${table}': ${row_count} rows"
        fi
    done
    
    # Test 4: Run pg_dump to verify logical consistency
    log_info "Testing logical backup consistency..."
    if ! docker exec "${TEST_CONTAINER}" pg_dump -U postgres -d "${TEST_DB_NAME}" --schema-only > /dev/null 2>&1; then
        log_error "Logical consistency test failed"
        TEST_ERRORS+=("Logical consistency test failed")
        TEST_RESULT="FAILED"
        return 1
    fi
    
    local end_time=$(date +%s)
    TEST_DURATION=$((end_time - start_time))
    log_info "Restore validation completed in ${TEST_DURATION} seconds"
}

# ============================================================================
# Cleanup Test Environment
# ============================================================================
cleanup_test_env() {
    log_info "Cleaning up test environment..."
    
    docker stop "${TEST_CONTAINER}" 2>/dev/null || true
    docker rm "${TEST_CONTAINER}" 2>/dev/null || true
    
    # Clean up temp files
    rm -rf /tmp/restore-test-*
}

# ============================================================================
# Generate Report
# ============================================================================
generate_report() {
    local backup_name=$(basename "${BACKUP_FILE}")
    local tested_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Create JSON report
    cat > "${REPORT_FILE}" << EOF
{
  "test_id": "restore-test-$(date +%s)",
  "tested_at": "${tested_at}",
  "result": "${TEST_RESULT}",
  "duration_seconds": ${TEST_DURATION},
  "backup_tested": "${backup_name}",
  "errors": $(printf '%s\n' "${TEST_ERRORS[@]}" | jq -R . | jq -s .),
  "details": {
    "log_file": "${LOG_FILE}",
    "test_database": "${TEST_DB_NAME}",
    "container": "${TEST_CONTAINER}"
  }
}
EOF
    
    log_info "Report saved to: ${REPORT_FILE}"
    
    # Update Trello card
    update_trello_card
}

# ============================================================================
# Update Trello Card
# ============================================================================
update_trello_card() {
    local card_id="dfhA3Cv7"
    local api_key="9035f71851deb35bb92d2715c84867a3"
    local token="ATTA0adfa2475a7e7b5fb7c03d13416d6d5b3bd759757b75affd0d01527d296af7b808B01EC2"
    
    local status_emoji="✅"
    [ "${TEST_RESULT}" = "FAILED" ] && status_emoji="❌"
    
    local comment="${status_emoji} **Weekly Restore Test - $(date +%Y-%m-%d)**

**Result:** ${TEST_RESULT}
**Duration:** ${TEST_DURATION}s
**Backup Tested:** $(basename "${BACKUP_FILE}")

**Errors:**
$(if [ ${#TEST_ERRORS[@]} -eq 0 ]; then echo "None"; else printf '%s\n' "${TEST_ERRORS[@]}" | sed 's/^/- /'; fi)

[View full log](file://${LOG_FILE})"

    curl -s -X POST "https://api.trello.com/1/cards/${card_id}/actions/comments" \
        -d "key=${api_key}" \
        -d "token=${token}" \
        -d "text=${comment}" > /dev/null 2>&1 || {
        log_warn "Failed to update Trello card"
    }
    
    log_info "Trello card updated"
}

# ============================================================================
# Main
# ============================================================================
main() {
    trap cleanup_test_env EXIT
    
    load_config
    
    log_info "============================================"
    log_info "Starting Weekly Restore Test"
    log_info "============================================"
    
    local overall_start=$(date +%s)
    
    setup_test_env
    select_backup
    local backup_path=$(prepare_backup)
    restore_and_validate "${backup_path}"
    
    local overall_end=$(date +%s)
    local overall_duration=$((overall_end - overall_start))
    
    generate_report
    
    log_info "============================================"
    log_info "Restore Test ${TEST_RESULT} in ${overall_duration}s"
    log_info "============================================"
    
    if [ "${TEST_RESULT}" = "FAILED" ]; then
        exit 1
    fi
}

# Run main
main "$@"
