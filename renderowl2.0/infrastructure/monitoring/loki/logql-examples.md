# LogQL Query Examples for Renderowl 2.0

This document contains common LogQL queries for debugging and monitoring the Renderowl 2.0 platform.

## Table of Contents
1. [Basic Queries](#basic-queries)
2. [Backend Debugging](#backend-debugging)
3. [Frontend Monitoring](#frontend-monitoring)
4. [Nginx Analysis](#nginx-analysis)
5. [Database Monitoring](#database-monitoring)
6. [Video Processing (Worker)](#video-processing-worker)
7. [Error Investigation](#error-investigation)
8. [Performance Analysis](#performance-analysis)
9. [Security Monitoring](#security-monitoring)
10. [Advanced Queries](#advanced-queries)

---

## Basic Queries

### View all logs from last hour
```logql
{app="renderowl"}
```

### View logs by component
```logql
{app="renderowl", component="backend"}
{app="renderowl", component="frontend"}
{app="renderowl", component="worker"}
{app="renderowl", component="nginx"}
{app="renderowl", component="database"}
```

### View logs by environment
```logql
{environment="staging"}
{environment="production"}
```

### View logs by level
```logql
{level="error"}
{level=~"error|fatal|panic"}
{level="warn"}
{level="info"}
{level="debug"}
```

---

## Backend Debugging

### All backend errors in last 15 minutes
```logql
{app="renderowl", component="backend", level=~"error|fatal"}
| json
```

### Backend logs for specific user
```logql
{app="renderowl", component="backend"}
| json
| user_id = "user_12345"
```

### Backend API requests with duration > 1 second
```logql
{app="renderowl", component="backend", level="info"}
| json
| duration_ms > 1000
```

### Backend slow API endpoints
```logql
{app="renderowl", component="backend"}
| json
| line_format "{{.msg}} - {{.duration_ms}}ms"
| duration_ms > 500
```

### Backend authentication failures
```logql
{app="renderowl", component="backend"}
|~ "(?i)(auth|login|unauthorized|forbidden|401|403)"
```

### Backend panic/stack trace detection
```logql
{app="renderowl", component="backend", level="fatal"}
|~ "(?i)(panic|runtime error|stack trace)"
```

### Backend database connection errors
```logql
{app="renderowl", component="backend"}
|~ "(?i)(connection refused|timeout|deadlock|too many connections)"
```

### Backend Redis/cache errors
```logql
{app="renderowl", component="backend"}
|~ "(?i)(redis|cache|memcached).*error"
```

---

## Frontend Monitoring

### All frontend errors
```logql
{app="renderowl", component="frontend", level="error"}
| json
```

### Frontend 500 errors by page
```logql
{app="renderowl", component="frontend"}
| json
| status_code = 500
| line_format "{{.page}}: {{.message}}"
```

### Frontend 404 errors (broken links)
```logql
{app="renderowl", component="frontend"}
| json
| status_code = 404
```

### Frontend API call failures
```logql
{app="renderowl", component="frontend"}
| json
| status_code >= 400
| line_format "{{.method}} {{.url}} - {{.statusCode}}"
```

---

## Nginx Analysis

### Top 10 most requested URLs
```logql
sum by (request) (
  rate({app="renderowl", component="nginx", log_type="access"}[1h])
)
| topk(10)
```

### 5xx errors from nginx
```logql
{app="renderowl", component="nginx", log_type="access"}
| json
| status >= 500
| line_format "{{.status}} - {{.request}}"
```

### Slow requests (> 2s response time)
```logql
{app="renderowl", component="nginx", log_type="access"}
| json
| request_time > 2
| line_format "{{.request_time}}s - {{.request}}"
```

### Client IP with most 404 errors
```logql
sum by (remote_addr) (
  {app="renderowl", component="nginx", log_type="access"}
  | json
  | status = 404
)
| topk(10)
```

### Nginx upstream timeout errors
```logql
{app="renderowl", component="nginx", log_type="error"}
|~ "upstream timed out"
```

### Nginx rate limiting hits
```logql
{app="renderowl", component="nginx", log_type="error"}
|~ "limiting requests"
```

---

## Database Monitoring

### PostgreSQL slow queries
```logql
{app="renderowl", component="database"}
|~ "duration:"
| pattern "duration: <_ms> ms"
| ms > 1000
```

### PostgreSQL connection errors
```logql
{app="renderowl", component="database", level=~"error|fatal"}
|~ "(?i)(connection|could not connect|FATAL)"
```

### PostgreSQL lock waits
```logql
{app="renderowl", component="database"}
|~ "(?i)(lock|waiting|deadlock)"
```

### PostgreSQL checkpoints
```logql
{app="renderowl", component="database"}
|~ "checkpoint"
```

### Database queries by user
```logql
{app="renderowl", component="database", job="postgresql-csv"}
| json
| user != ""
| line_format "{{.user}}@{{.database}}: {{.message}}"
```

---

## Video Processing (Worker)

### Worker errors
```logql
{app="renderowl", component="worker", level="error"}
| json
```

### Video processing failures
```logql
{app="renderowl", component="worker"}
| json
| msg =~ "(?i)(failed|error|abort)"
```

### Long-running video jobs (> 5 minutes)
```logql
{app="renderowl", component="worker"}
| json
| duration_sec > 300
| line_format "Job {{.job_id}}: {{.stage}} - {{.duration_sec}}s"
```

### Video processing progress by stage
```logql
{app="renderowl", component="worker"}
| json
| stage != ""
| line_format "Job {{.job_id}} - Stage: {{.stage}} - Progress: {{.progress}}%"
```

### Failed video encoding attempts
```logql
{app="renderowl", component="worker"}
| json
| stage = "encoding"
| msg =~ "(?i)(fail|error)"
```

---

## Error Investigation

### All errors across all components (last hour)
```logql
{app="renderowl", level=~"error|fatal|panic"}
| json
```

### Error rate by component (last 5 minutes)
```logql
sum by (component) (
  rate({app="renderowl", level=~"error|fatal"}[5m])
)
```

### Recent unique errors
```logql
{app="renderowl", level="error"}
| json
| line_format "{{.msg}}"
| distinct
```

### Errors with stack traces
```logql
{app="renderowl", level=~"error|fatal"}
|~ "(?m)^[\t]+.*\\.go:[0-9]+"
```

### Out of memory errors
```logql
{app="renderowl"}
|~ "(?i)(out of memory|oom|cannot allocate)"
```

---

## Performance Analysis

### Request duration percentiles from nginx
```logql
quantile_over_time(0.95,
  {app="renderowl", component="nginx", log_type="access"}
  | json
  | unwrap request_time [5m]
) by ()
```

### Average request duration by endpoint
```logql
avg by (request) (
  {app="renderowl", component="nginx", log_type="access"}
  | json
  | unwrap request_time [5m]
)
```

### Backend p99 response time
```logql
quantile_over_time(0.99,
  {app="renderowl", component="backend"}
  | json
  | unwrap duration_ms [5m]
) by ()
```

### High traffic endpoints
```logql
topk(10,
  sum by (request) (
    rate({app="renderowl", component="nginx"}[1h])
  )
)
```

---

## Security Monitoring

### Failed SSH attempts
```logql
{job="auth", service="sshd"}
|~ "Failed password"
```

### Successful SSH logins
```logql
{job="auth", service="sshd"}
|~ "Accepted"
```

### Sudo/authentication failures
```logql
{job="auth", service=~"sudo|su"}
|~ "(?i)(fail|incorrect|not allowed)"
```

### Suspicious nginx requests (SQL injection attempts)
```logql
{app="renderowl", component="nginx", log_type="access"}
| json
| request =~ "(?i)(union|select|drop|insert|delete|update|script|javascript)"
```

### Rate limit hits
```logql
{app="renderowl", component="nginx", log_type="error"}
|~ "limiting requests"
```

---

## Advanced Queries

### Trace a request through all components
```logql
{app="renderowl"}
| json
| request_id = "req-abc-123"
```

### Multi-line stack trace aggregation
```logql
{app="renderowl", level="error"}
|~ "(?m)^[\t]+.*\\.go:[0-9]+"
| pattern "<function> @ <file>:<line>"
| line_format "{{.file}}:{{.line}} - {{.function}}"
```

### Error trend over time
```logql
sum(
  rate({app="renderowl", level=~"error|fatal"}[5m])
) by (component)
```

### Log volume by component
```logql
sum by (component) (
  bytes_over_time({app="renderowl"}[1h])
)
```

### Correlation between nginx 500s and backend errors
```logql
{app="renderowl", component="backend", level="error"}
| json
| line_format "Backend Error: {{.msg}}"
and
{app="renderowl", component="nginx", log_type="access"}
| json
| status >= 500
| line_format "Nginx {{.status}}: {{.request}}"
```

---

## Alerting Rules (for Ruler)

### Example alert rules to add to Loki ruler:

```yaml
groups:
  - name: renderowl_alerts
    interval: 1m
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate({app="renderowl", level=~"error|fatal"}[5m])) by (component) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in {{ $labels.component }}"
          
      # Video processing failures
      - alert: VideoProcessingFailures
        expr: |
          sum(rate({app="renderowl", component="worker"} |= "failed"[5m])) > 0.1
        for: 10m
        labels:
          severity: critical
          
      # Database slow queries
      - alert: DatabaseSlowQueries
        expr: |
          sum(rate({app="renderowl", component="database"} |~ "duration:"[5m])) > 10
        for: 5m
        labels:
          severity: warning
```

---

## Quick Reference

| Query | Description |
|-------|-------------|
| `{app="renderowl"}` | All Renderowl logs |
| `\|= "error"` | Contains "error" |
| `\|~ "(?i)error"` | Contains "error" (case insensitive) |
| `\|~ "regex"` | Regex match |
| `\| json` | Parse JSON |
| `\| pattern` | Pattern match |
| `\| line_format` | Format output |
| `\| label_format` | Format labels |
| `rate()[1m]` | Rate per second |
| `count_over_time()[1h]` | Count in range |
| `bytes_over_time()[1h]` | Bytes in range |
| `sum by (label)` | Aggregate |
| `topk(10, ...)` | Top 10 values |
| `quantile_over_time(0.95, ...)` | 95th percentile |
