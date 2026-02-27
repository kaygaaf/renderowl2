#!/bin/bash
set -e

# Load environment variables from .env file if it exists
if [ -f /backup/.env ]; then
    set -a
    source /backup/.env
    set +a
fi

# Export all environment variables for cron
printenv | grep -E '^(DB_|R2_|GPG_|AWS_|RESTIC_|SLACK_|ALERT_)' > /tmp/env.sh

# Ensure log directory exists
mkdir -p /var/log/renderowl

# Run initial setup
echo "$(date): Backup scheduler starting..."
echo "$(date): Environment loaded, cron jobs:"
cat /etc/crontabs/backup

exec "$@"
