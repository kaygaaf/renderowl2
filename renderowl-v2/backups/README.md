# Renderowl 2.0 - Automated Backups

Comprehensive backup strategy for Renderowl 2.0 database and file storage.

## 📋 Overview

This backup solution provides:
- **Continuous WAL archiving** for Point-in-Time Recovery (PITR)
- **Daily full backups** (pg_dump) with compression and encryption
- **Multi-region storage** on Cloudflare R2
- **Automated retention management** (7 daily, 4 weekly, 12 monthly)
- **Weekly restore testing** with automated reporting
- **RTO: 4 hours, RPO: 1 hour**

## 📁 Directory Structure

```
backups/
├── config/
│   ├── backup.env.example      # Environment configuration template
│   ├── postgresql-wal.conf     # PostgreSQL WAL archiving config
│   ├── pgbackrest.conf         # pgBackRest alternative config
│   └── r2-buckets.tf           # Terraform for R2 bucket setup
├── scripts/
│   ├── pg-backup.sh            # Main backup script
│   ├── health-check.sh         # Health monitoring
│   ├── daily-report.sh         # Daily status reports
│   └── weekly-restore-test.sh  # Automated restore testing
├── restore/
│   └── pg-restore.sh           # Restore procedures
├── docker/
│   ├── docker-compose.yml      # Backup tooling stack
│   └── scheduler/              # Cron scheduler container
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. Configure Environment

```bash
cd ~/workspace/renderowl-v2/backups
cp config/backup.env.example config/backup.env
# Edit config/backup.env with your actual values
```

### 2. Set Up R2 Buckets

```bash
# Using Terraform
cd config
terraform init
terraform apply

# Or configure manually via Cloudflare Dashboard
# - Enable versioning on both buckets
# - Set up cross-region replication
```

### 3. Configure PostgreSQL

Add to `postgresql.conf`:
```ini
wal_level = replica
archive_mode = on
archive_command = 'wal-g wal-push %p'
archive_timeout = 600
max_wal_senders = 10
max_replication_slots = 10
```

Restart PostgreSQL after changes.

### 4. Deploy Backup Stack

```bash
cd docker
docker-compose --profile scheduler up -d
```

## 🔄 Backup Operations

### Manual Backup

```bash
# Full backup
./scripts/pg-backup.sh full

# Daily/weekly/monthly backups
./scripts/pg-backup.sh daily
./scripts/pg-backup.sh weekly
./scripts/pg-backup.sh monthly

# Verify backup integrity
./scripts/pg-backup.sh verify

# Clean up expired backups
./scripts/pg-backup.sh cleanup
```

### Restore Operations

```bash
# Full restore (DESTRUCTIVE - will drop existing database)
./restore/pg-restore.sh full

# Point-in-Time Recovery
PITR_TARGET_TIME="2024-01-15 14:30:00" ./restore/pg-restore.sh pitr

# Selective restore (single table/schema)
SELECTIVE_TARGET="public.users" ./restore/pg-restore.sh selective

# Verify-only mode (test restore without affecting production)
VERIFY_MODE=true ./restore/pg-restore.sh verify
```

## 📅 Backup Schedule

| Frequency | Time (UTC) | Retention | Action |
|-----------|-----------|-----------|--------|
| Hourly | :00 | 24 hours | File/asset backup (Restic) |
| Daily | 02:00 | 7 days | Full pg_dump backup |
| Weekly | Sun 01:00 | 4 weeks | Weekly full backup |
| Monthly | 1st 00:00 | 12 months | Monthly full backup |
| Daily | 03:00 | - | Retention cleanup |
| Daily | 04:00 | - | Backup verification |
| Weekly | Sat 06:00 | - | Automated restore test |

## 🔐 Security

### Encryption
- **At-rest**: AES-256 encryption via GPG
- **In-transit**: TLS 1.3 for R2 transfers
- **WAL archives**: Encrypted via wal-g

### Access Control
- Dedicated backup user with minimal permissions
- R2 bucket policies restrict access
- GPG key-based decryption required for restore

## 📊 Monitoring

### Health Metrics
Prometheus metrics available at `/var/lib/node_exporter/textfile_collector/`:
- `renderowl_backup_status` - Backup success/failure
- `renderowl_backup_duration_seconds` - Backup duration
- `renderowl_backup_size_bytes` - Backup size
- `renderowl_backup_health_hours` - Hours since last backup

### Alerts
Configure in `config/backup.env`:
- Slack webhook for notifications
- Email alerts for failures
- PagerDuty integration for critical issues

## 🧪 Testing

### Weekly Automated Tests
```bash
# Run manually
./scripts/weekly-restore-test.sh
```

This script:
1. Spins up a temporary PostgreSQL container
2. Downloads a random recent backup
3. Restores and validates integrity
4. Reports results to Trello

### Manual Testing
```bash
# Test restore process
./restore/pg-restore.sh verify

# Check backup list
AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx \
  aws s3 ls s3://renderowl-backups-primary/postgres/ \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com
```

## 🚨 Recovery Procedures

### Scenario 1: Full Database Restore
```bash
# 1. Stop application
# 2. Run restore
./restore/pg-restore.sh full
# 3. Verify database
# 4. Restart application
```

### Scenario 2: Point-in-Time Recovery
```bash
# 1. Stop PostgreSQL
# 2. Configure recovery.conf (see restore/pg-restore.sh pitr output)
# 3. Start PostgreSQL in recovery mode
# 4. Monitor recovery progress
# 5. Verify and promote when ready
```

### Scenario 3: Single Table Recovery
```bash
# Restore to temporary database
SELECTIVE_TARGET="schema.table" ./restore/pg-restore.sh selective
```

## 🔧 Troubleshooting

### Check Backup Status
```bash
# View latest logs
tail -f /var/log/renderowl/backup-*.log

# Check health metrics
cat /var/lib/node_exporter/textfile_collector/renderowl_backup*.prom
```

### Common Issues

**Issue**: `pg_dump: connection refused`
- Check PostgreSQL is running: `pg_isready -h localhost`
- Verify credentials in `config/backup.env`

**Issue**: `gpg: decryption failed`
- Ensure GPG private key is imported: `gpg --list-keys`
- Check `GPG_RECIPIENT` matches the key

**Issue**: R2 upload failures
- Verify R2 credentials
- Check endpoint URL format
- Ensure bucket exists and is accessible

## 📈 Capacity Planning

### Storage Requirements
- Base backup: ~1x database size (compressed)
- WAL archives: ~10-20% of database size per day
- File backups: ~1.5x total asset size
- Total with retention: ~5-10x database size

### Bandwidth
- Initial backup: Full database size
- Daily delta: 5-15% of database size
- WAL streaming: Continuous, minimal impact

## 📝 Trello Integration

Progress is automatically posted to Trello card:
https://trello.com/c/dfhA3Cv7/6-automated-backups

The following events trigger updates:
- Daily backup completion
- Weekly restore test results
- Backup failures/alerts

## 🔗 References

- [wal-g documentation](https://github.com/wal-g/wal-g)
- [pgBackRest documentation](https://pgbackrest.org/)
- [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
