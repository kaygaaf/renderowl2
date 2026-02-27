# PostgreSQL Automated Backup System for Renderowl 2.0

A complete backup solution for PostgreSQL 15 featuring full backups (pg_dump), continuous WAL archiving for Point-in-Time Recovery (PITR), encryption, compression, and automated retention policies.

## Features

- **Full Backups**: Daily pg_dump with custom format for fast restore
- **WAL Archiving**: Continuous archiving for Point-in-Time Recovery
- **Compression**: zstd compression for efficient storage
- **Encryption**: age encryption for backup security
- **Cloud Storage**: Cloudflare R2 (S3-compatible) for durable off-site storage
- **Retention Policy**: Automated cleanup (7 daily, 4 weekly, 12 monthly)
- **Restore Scripts**: Full backup restore and PITR support

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   PostgreSQL    │────▶│  WAL Archive │────▶│   Cloudflare    │
│      15         │     │    Script    │     │       R2        │
└─────────────────┘     └──────────────┘     └─────────────────┘
         │
         │ pg_dump (daily @ 2 AM)
         ▼
┌─────────────────┐     ┌──────────────┐
│  Backup Script  │────▶│  Compress +  │────▶ R2
│   (backup.sh)   │     │   Encrypt    │
└─────────────────┘     └──────────────┘
         │
         │ Retention (daily @ 3 AM)
         ▼
┌─────────────────┐
│ Retention Script│
│ (retention.sh)  │────▶ Cleanup old backups
└─────────────────┘
```

## Quick Start

### 1. Prerequisites

Install required tools:

```bash
# Debian/Ubuntu
apt-get update
apt-get install -y postgresql-client zstd age awscli

# macOS
brew install postgresql zstd age awscli
```

### 2. Generate Encryption Keys

```bash
# Generate age keypair
age-keygen -o /etc/backup/age.key

# Extract public key for encryption
cat /etc/backup/age.key | grep "public key" | cut -d' ' -f3
```

### 3. Configure Environment Variables

Create `/etc/backup/backup.env`:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=renderowl
ENVIRONMENT=staging

# R2/S3 Configuration
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
S3_BUCKET=renderowl-backups
S3_ACCESS_KEY_ID=your_r2_access_key
S3_SECRET_ACCESS_KEY=your_r2_secret_key

# Encryption
AGE_PUBLIC_KEY=age1...your_public_key

# Optional overrides
BACKUP_DIR=/var/lib/postgresql/backups
LOG_FILE=/var/log/postgresql/backup.log
```

### 4. Setup WAL Archiving (PostgreSQL)

Add to `postgresql.conf`:

```ini
# WAL Archiving for PITR
wal_level = replica
archive_mode = on
archive_command = '/usr/local/bin/wal-archive.sh %p %f'
archive_timeout = 600
wal_keep_size = 1GB
```

Restart PostgreSQL:

```bash
systemctl restart postgresql
```

### 5. Deploy (Choose one)

#### Option A: Kubernetes

```bash
# Create namespace and configs
kubectl apply -f kubernetes/config.yaml
kubectl apply -f kubernetes/scripts-configmap.yaml
kubectl apply -f kubernetes/cronjobs.yaml
```

#### Option B: Systemd (Bare Metal/VM)

```bash
# Copy scripts
sudo cp backup.sh wal-archive.sh retention.sh restore.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/*.sh

# Install systemd timers
sudo cp systemd/postgres-backup.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now postgres-backup.timer
sudo systemctl enable --now postgres-retention.timer
```

## Usage

### Manual Full Backup

```bash
source /etc/backup/backup.env
/usr/local/bin/backup.sh full
```

### List Available Backups

```bash
source /etc/backup/backup.env
/usr/local/bin/restore.sh list
```

### Restore from Full Backup

```bash
source /etc/backup/backup.env

# Restore to same database
/usr/local/bin/restore.sh full postgres/staging/full/2024/01/15/renderowl_20240115_120000.sql.zst.age

# Restore to different database
/usr/local/bin/restore.sh full <path> --target-db renderowl_new
```

### Point-in-Time Recovery (PITR)

```bash
source /etc/backup/backup.env

# Restore to specific timestamp
/usr/local/bin/restore.sh pitr "2024-01-15 14:30:00"
```

**Note**: PITR requires stopping PostgreSQL and will perform full recovery.

### Verify Backup Integrity

```bash
/usr/local/bin/restore.sh verify <backup_path>
```

## Retention Policy

The system maintains:

- **7 daily backups** (last 7 days)
- **4 weekly backups** (Sundays)
- **12 monthly backups** (1st of month)
- **30 days of WAL files**

Old backups are automatically cleaned up by the retention job.

## Backup Storage Structure

```
s3://renderowl-backups/
└── postgres/
    └── staging/          # or production
        ├── full/
        │   └── 2024/
        │       └── 01/
        │           └── 15/
        │               └── renderowl_20240115_020000.sql.zst.age
        └── wal/
            └── 2024/
                └── 01/
                    └── 15/
                        └── 000000010000000000000001.zst.age
```

## Monitoring

### Check Backup Job Status (Kubernetes)

```bash
# View recent jobs
kubectl get jobs -n renderowl

# Check logs
kubectl logs -n renderowl -l component=full-backup --tail=50

# Check cronjob status
kubectl get cronjobs -n renderowl
```

### Check Backup Job Status (Systemd)

```bash
# View timer status
systemctl status postgres-backup.timer

# View last job result
systemctl status postgres-backup.service

# View logs
journalctl -u postgres-backup.service -f
```

### Prometheus Metrics (optional)

Add to your monitoring:

```yaml
- name: postgres_backup_last_success
  help: Timestamp of last successful backup
- name: postgres_backup_size_bytes
  help: Size of last backup in bytes
- name: postgres_backup_duration_seconds
  help: Duration of last backup in seconds
```

## Security Considerations

1. **Encryption**: All backups are encrypted with age before upload
2. **Key Management**: Store age private key securely (not in version control)
3. **Credentials**: Use Kubernetes Secrets or environment files with restricted permissions
4. **Network**: Use private endpoints where possible
5. **Access**: R2 credentials should have minimal permissions (read/write only to backup bucket)

## Troubleshooting

### Backup fails with "pg_dump failed"

```bash
# Check connectivity
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"

# Check disk space
df -h /var/lib/postgresql/backups
```

### WAL archive failing

```bash
# Check archive_command in PostgreSQL
psql -c "SHOW archive_command"

# Test manually
/usr/local/bin/wal-archive.sh /path/to/wal/file WAL_FILENAME

# Check logs
tail -f /var/log/postgresql/wal-archive.log
```

### S3 upload fails

```bash
# Test credentials
aws s3 ls s3://$S3_BUCKET --endpoint-url=$S3_ENDPOINT

# Check network connectivity
curl -I $S3_ENDPOINT
```

### Restore fails with decryption error

Ensure you have the correct age private key:

```bash
# Verify key
cat /etc/backup/age-private.key

# Test decryption
age -d -i /etc/backup/age-private.key -o output.sql.zst input.sql.zst.age
```

## Disaster Recovery Playbook

### Scenario 1: Database corruption (use full backup)

```bash
# 1. Stop application
kubectl scale deployment renderowl-app --replicas=0

# 2. Restore from backup
/usr/local/bin/restore.sh full <latest_backup_path> --force

# 3. Start application
kubectl scale deployment renderowl-app --replicas=3
```

### Scenario 2: Point-in-Time Recovery

```bash
# 1. Note the target time (before corruption)
TARGET_TIME="2024-01-15 14:30:00"

# 2. Stop PostgreSQL
systemctl stop postgresql

# 3. Move old data directory
mv /var/lib/postgresql/15/main /var/lib/postgresql/15/main.corrupted

# 4. Restore base backup and start PITR
/usr/local/bin/restore.sh pitr "$TARGET_TIME" --force

# 5. Monitor recovery
journalctl -u postgresql -f
```

## Files

| File | Description |
|------|-------------|
| `backup.sh` | Main backup script (full + WAL setup) |
| `wal-archive.sh` | WAL archiving script (called by PostgreSQL) |
| `retention.sh` | Retention policy and cleanup |
| `restore.sh` | Restore and PITR script |
| `kubernetes/` | Kubernetes CronJob manifests |
| `systemd/` | Systemd timer/service files |

## License

MIT - Internal use for Renderowl 2.0
