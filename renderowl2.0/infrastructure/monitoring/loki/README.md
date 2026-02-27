# Loki Log Aggregation Stack for Renderowl 2.0

Complete log aggregation deployment using Grafana Loki for the Renderowl 2.0 video rendering platform.

## Overview

This deployment provides centralized logging for:
- **Go Backend Application** - API logs, structured JSON logging
- **Next.js Frontend** - SSR logs, client-side error tracking
- **Nginx** - Access and error logs
- **PostgreSQL** - Database query logs
- **Redis** - Cache logs
- **System Logs** - Syslog, kernel, auth logs
- **Video Workers** - Video processing job logs

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Applications                             │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│  Backend    │  Frontend   │    Nginx    │  PostgreSQL │  Redis  │
│   (Go)      │  (Next.js)  │             │             │         │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴────┬────┘
       │             │             │             │           │
       └─────────────┴─────────────┴─────────────┴───────────┘
                                   │
                          ┌────────▼────────┐
                          │    Promtail     │
                          │  (Log Shipper)  │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │      Loki       │
                          │  (Log Storage)  │
                          │  30d hot / 90d  │
                          │    cold storage │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │     Grafana     │
                          │ (Visualization) │
                          └─────────────────┘
```

## Retention Policy

| Storage Tier | Duration | Backend |
|-------------|----------|---------|
| Hot Storage | 30 days | Local filesystem |
| Cold Storage | 90 days | S3/R2 compatible (configurable) |

## Quick Start

### Docker Compose (Recommended for Staging)

```bash
# Clone/copy the loki directory
cd /projects/renderowl2.0/infrastructure/monitoring/loki

# Create required directories
mkdir -p /projects/renderowl2.0/data/loki
mkdir -p /projects/renderowl2.0/data/grafana
mkdir -p /projects/renderowl2.0/logs/backend
mkdir -p /projects/renderowl2.0/logs/worker
mkdir -p /projects/renderowl2.0/logs/frontend

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the stack
docker-compose up -d

# View logs
docker-compose logs -f loki
docker-compose logs -f promtail
```

### Kubernetes

```bash
# Apply the manifests
kubectl apply -f k8s-deployment.yml

# Verify deployment
kubectl get pods -n monitoring
kubectl logs -n monitoring -l app=loki
kubectl logs -n monitoring -l app=promtail
```

## Configuration

### Loki Configuration (`loki-config.yml`)

Key settings:
- **HTTP Port**: 3100
- **GRPC Port**: 9096
- **Retention**: 90 days (2160h)
- **Hot Storage**: Local filesystem
- **Cold Storage**: S3/R2 compatible (uncomment in config)

### Promtail Configuration (`promtail-config.yml`)

Collects logs from:
- `/var/log/renderowl/backend/*.log`
- `/var/log/renderowl/worker/*.log`
- `/var/log/renderowl/frontend/*.log`
- `/var/log/nginx/*.log`
- `/var/log/postgresql/*.log`
- `/var/log/redis/*.log`
- `/var/log/syslog`, `/var/log/auth.log`

### Environment Variables

Create a `.env` file:

```bash
# Grafana credentials
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-password
GRAFANA_ROOT_URL=http://logs.renderowl.local

# Optional: S3/R2 credentials for cold storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=renderowl-logs
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
```

## LogQL Query Examples

See [logql-examples.md](./logql-examples.md) for comprehensive query examples.

### Quick Examples

```logql
# All backend errors
{app="renderowl", component="backend", level="error"}

# Slow API requests (>1s)
{app="renderowl", component="backend"}
| json
| duration_ms > 1000

# Video processing failures
{app="renderowl", component="worker"}
| json
| msg =~ "(?i)(failed|error)"

# Nginx 5xx errors
{app="renderowl", component="nginx", log_type="access"}
| json
| status >= 500

# PostgreSQL slow queries
{app="renderowl", component="database"}
|~ "duration:"
```

## Accessing Logs

### Grafana UI
- URL: http://localhost:3000 (or your configured URL)
- Default login: admin / admin (or from `.env`)
- Add Loki data source: http://loki:3100

### API Direct

```bash
# Query logs
curl -G -s "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={app="renderowl"}' \
  --data-urlencode 'limit=100' \
  --data-urlencode 'start=$(date -v-1H +%s)000000000' \
  --data-urlencode 'end=$(date +%s)000000000'

# Push logs (for testing)
curl -X POST http://localhost:3100/loki/api/v1/push \
  -H "Content-Type: application/json" \
  -d '{
    "streams": [{
      "stream": {"app": "renderowl", "component": "test"},
      "values": [["'$(date +%s%N)'", "Test log message"]]
    }]
  }'
```

## Integration with Applications

### Go Backend

```go
import "github.com/sirupsen/logrus"

log := logrus.New()
log.SetFormatter(&logrus.JSONFormatter{
    TimestampFormat: time.RFC3339Nano,
})

// Structured logging
log.WithFields(logrus.Fields{
    "request_id": requestID,
    "user_id":    userID,
    "duration_ms": elapsed.Milliseconds(),
}).Info("Request processed")
```

Log file: `/var/log/renderowl/backend/app.log`

### Next.js Frontend

```javascript
// Structured logging middleware
const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      page: meta.page || 'unknown',
      ...meta
    }));
  },
  error: (message, error, meta = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};
```

### Nginx

Enable JSON logging in nginx.conf:

```nginx
log_format json_analytics escape=json '{'
  '"remote_addr": "$remote_addr",'
  '"time_local": "$time_local",'
  '"request": "$request",'
  '"status": $status,'
  '"body_bytes_sent": $body_bytes_sent,'
  '"request_time": $request_time,'
  '"http_referer": "$http_referer",'
  '"http_user_agent": "$http_user_agent",'
  '"request_id": "$request_id"'
'}';

access_log /var/log/nginx/access.log json_analytics;
```

### PostgreSQL

Enable logging in postgresql.conf:

```ini
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_line_prefix = '%t [%p] %l %c '
log_statement = 'mod'
log_min_duration_statement = 1000  # Log queries > 1s
log_duration = on
log_destination = 'stderr'
```

## Monitoring & Alerting

### Health Checks

```bash
# Loki health
curl http://localhost:3100/ready

# Promtail health
curl http://localhost:9080/ready

# Metrics
curl http://localhost:3100/metrics
curl http://localhost:9080/metrics
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Logs not appearing | Check Promtail positions file, verify paths |
| High memory usage | Reduce `chunk_target_size`, increase `chunk_idle_period` |
| Slow queries | Enable query caching, reduce time range |
| Disk full | Adjust retention, enable cold storage to S3 |

## Maintenance

### Backup

```bash
# Backup Loki data
tar -czf loki-backup-$(date +%Y%m%d).tar.gz /projects/renderowl2.0/data/loki

# Backup positions
cp /tmp/positions.yaml positions-backup-$(date +%Y%m%d).yaml
```

### Cleanup

```bash
# Clean old chunks manually (if needed)
find /projects/renderowl2.0/data/loki/chunks -type f -mtime +90 -delete

# Restart services
docker-compose restart loki promtail
```

## Security Considerations

1. **Access Control**: Use Grafana's authentication
2. **Log Sanitization**: Filter sensitive data in Promtail
3. **TLS**: Enable HTTPS for Loki and Grafana
4. **Network**: Isolate monitoring network from public

## Resources

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [LogQL Reference](https://grafana.com/docs/loki/latest/query/)
- [Promtail Configuration](https://grafana.com/docs/loki/latest/clients/promtail/)

## License

Part of Renderowl 2.0 - Internal Use Only
