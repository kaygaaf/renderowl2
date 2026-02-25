# Renderowl API Changelog

## 2026-02-25 - Server Connection Hardening (Infra/Stability)

### Added
- **Connection & Request Timeouts**: Prevent resource exhaustion during traffic spikes
  - `connectionTimeout: 30000ms` — max time to establish connection
  - `keepAliveTimeout: 65000ms` — connection keepalive (>
 load balancer timeout)
  - `requestTimeout: 120000ms` — max time for any request to complete
  - `bodyLimit: 10MB` — max request body size
  - `maxRequestsPerSocket: 1000` — prevent connection leaks

- **Request Monitoring Hooks**:
  - `onTimeout` hook logs timed-out requests for debugging
  - `onResponse` hook logs slow requests (>30s) for performance monitoring

- **Graceful Shutdown Hardening**:
  - Added 15-second hard timeout to force exit if shutdown hangs
  - Prevents deployment stuck states caused by shutdown blocking

- **Enhanced Health Endpoint**:
  - Added `uptime` in human-readable format
  - Added `memory` usage (heap used/total in MB)
  - Added `queue.stalledJobs` count for operational visibility

### Stability Impact
- Prevents container memory exhaustion from large request bodies
- Eliminates hanging connections that can cause deploy failures
- Faster detection of slow endpoints causing user-facing latency
- Guaranteed shutdown prevents "in_progress" deployment stuck states

---

## 2026-02-25 - Job Timeout & Stalled Job Detection

### Added
- **Job Timeout Handling**: Jobs now have a configurable timeout (`jobTimeoutMs`, default 5 minutes)
  - Timeout is set when a job is claimed by a worker
  - Prevents jobs from hanging indefinitely in "processing" state
  - Stored in new `timeout_at` column in jobs table

- **Stalled Job Detection**: Background process detects and recovers stalled jobs
  - Runs every `stalledCheckIntervalMs` (default 1 minute)
  - Finds jobs where `timeout_at <= now()` and `status = 'processing'`
  - Automatically requeues jobs for retry or moves to DLQ if max attempts reached
  - New event: `job:stalled` emitted when a stalled job is detected

- **New Configuration Options**:
  - `jobTimeoutMs`: Duration before a job is considered stalled (default: 300000ms / 5min)
  - `stalledCheckIntervalMs`: How often to check for stalled jobs (default: 60000ms / 1min)

- **New API Methods**:
  - `queue.getStalledJobsCount()`: Returns count of currently stalled jobs

- **New Event**:
  - `job:stalled`: Emitted when a job exceeds its timeout
    - Payload: `{ jobId, type, workerId, startedAt, timeoutAt }`
  - `job:retrying` now includes `reason` field ('error' | 'timeout')

### Database Changes
- Added `timeout_at TEXT` column to `jobs` table
- Added `idx_jobs_timeout` index for efficient stalled job queries

### Migration
Existing databases will be automatically migrated on startup (SQLite `CREATE IF NOT EXISTS` handles new columns gracefully).

### Documentation
- Updated `docs/QUEUE.md` with timeout configuration, monitoring, and best practices
