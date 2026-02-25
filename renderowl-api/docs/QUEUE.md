# Renderowl Job Queue & Automation System

## Overview

This document describes the job queue and automation infrastructure for Renderowl API.

## Components

### 1. Job Queue (`lib/queue.ts`)

A robust, SQLite-backed job queue with the following features:

#### Features
- **Idempotency**: Jobs can have unique idempotency keys to prevent duplicate processing
- **Priority Queueing**: Supports `urgent`, `high`, `normal`, and `low` priorities
- **Retry Logic**: Configurable retry attempts with exponential backoff
- **Dead Letter Queue (DLQ)**: Failed jobs after max retries are moved to DLQ
- **Step State**: Track multi-step job progress with persistent state
- **Crash Recovery**: Automatically resets stuck jobs on worker startup
- **Job Timeouts**: Configurable per-job timeout with automatic stalled job detection
- **Stalled Job Recovery**: Detects and requeues jobs that exceeded their timeout

#### Job Lifecycle
```
pending → processing → completed
                ↓
            (on error)
                ↓
         (retry with backoff)
                ↓
            max attempts reached
                ↓
           dead_letter

processing → (timeout exceeded) → pending (retry) or dead_letter (max attempts)
```

#### Usage
```typescript
import { JobQueue } from './lib/queue.js';

const queue = new JobQueue('./data/queue.db', {
  maxAttempts: 3,
  backoffStrategy: 'exponential',
  baseDelayMs: 1000,
  maxDelayMs: 300000,
  jobTimeoutMs: 300000,      // Jobs timeout after 5 minutes
  stalledCheckIntervalMs: 60000, // Check for stalled jobs every minute
});

// Register a job handler
queue.registerHandler('render', async (job, step) => {
  // Job processing logic
  queue.updateStepState(job.id, 'progress', 50);
});

// Start workers
await queue.start(1000); // Poll every 1 second

// Enqueue a job
const job = await queue.enqueue('renders', 'render', {
  projectId: 'proj_xxx',
  renderId: 'rnd_yyy',
  // ...
}, {
  priority: 'high',
  maxAttempts: 3,
  idempotencyKey: 'unique-key-for-dedup',
  steps: ['prepare', 'render', 'upload'],
});
```

#### Job Timeouts & Stalled Job Detection

Jobs automatically receive a timeout when claimed by a worker. If a job handler crashes, hangs, or never completes, it will be detected and requeued:

```typescript
// Configuration (passed to constructor)
{
  jobTimeoutMs: 300000,          // 5 minute timeout per job
  stalledCheckIntervalMs: 60000, // Check every minute
}

// Events emitted
queue.on('job:stalled', ({ jobId, type, workerId, startedAt, timeoutAt }) => {
  console.warn(`Job ${jobId} stalled (was running on ${workerId})`);
});

queue.on('job:retrying', ({ jobId, type, attempt, maxAttempts, delayMs, reason }) => {
  if (reason === 'timeout') {
    console.log(`Retrying job ${jobId} after timeout`);
  }
});
```

**How it works:**
1. When a job is claimed, `timeout_at` is set to `now + jobTimeoutMs`
2. A background interval checks for jobs where `timeout_at <= now()`
3. Stalled jobs are either:
   - Requeued for retry (if attempts < maxAttempts)
   - Moved to DLQ (if max attempts reached)
4. On worker startup, any jobs stuck with that worker are reset

**Best practices:**
- Set `jobTimeoutMs` longer than your longest expected job
- For very long renders, use step state to track progress within the timeout window
- Monitor `job:stalled` events to detect handler issues

### 2. Automation Runner (`lib/automation-runner.ts`)

Executes automation workflows composed of actions.

#### Features
- **Multi-step Actions**: Each action can spawn sub-jobs
- **Template Interpolation**: Dynamic data injection from triggers
- **Execution Tracking**: Full audit trail of automation runs
- **Sequential Execution**: Actions execute in order with error handling

#### Supported Actions
1. **Render**: Queue a video render job
2. **Notify**: Send notifications via email, webhook, or Slack

#### Usage
```typescript
import { AutomationRunner } from './lib/automation-runner.js';

const runner = new AutomationRunner(queue);

// Trigger an automation
const { executionId, jobId } = await runner.triggerAutomation(
  automation,
  { videoUrl: 'https://...', captionFile: 'https://...' },
  { idempotencyKey: 'webhook-123' }
);

// Get execution status
const execution = runner.getExecution(executionId);
```

### 3. Automation Routes (`routes/automations.ts`)

REST API endpoints for automation management.

#### Endpoints
- `GET /v1/projects/:project_id/automations` - List automations
- `POST /v1/projects/:project_id/automations` - Create automation
- `GET /v1/projects/:project_id/automations/:id` - Get automation
- `PATCH /v1/projects/:project_id/automations/:id` - Update automation
- `DELETE /v1/projects/:project_id/automations/:id` - Delete automation
- `POST /v1/projects/:project_id/automations/:id/trigger` - Trigger automation
- `GET /v1/projects/:project_id/automations/:id/executions` - List executions
- `GET /v1/projects/:project_id/automations/:id/executions/:execution_id` - Get execution

#### Idempotency
Trigger requests support idempotency via the `Idempotency-Key` header:
```
POST /v1/projects/proj_xxx/automations/auto_yyy/trigger
Idempotency-Key: webhook-signature-123

{ ... }
```

## Database Schema

### jobs Table
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  queue TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  idempotency_key TEXT UNIQUE,
  steps TEXT NOT NULL DEFAULT '[]',
  step_state TEXT NOT NULL DEFAULT '{}',
  error TEXT,
  scheduled_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  timeout_at TEXT,              -- Job timeout for stalled detection
  created_at TEXT,
  updated_at TEXT,
  worker_id TEXT
);

-- Indexes
CREATE INDEX idx_jobs_queue_status ON jobs(queue, status);
CREATE INDEX idx_jobs_status_scheduled ON jobs(status, scheduled_at);
CREATE INDEX idx_jobs_idempotency ON jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_jobs_worker ON jobs(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX idx_jobs_timeout ON jobs(status, timeout_at) WHERE status = 'processing';
```

### dead_letter_jobs Table
```sql
CREATE TABLE dead_letter_jobs (
  id TEXT PRIMARY KEY,
  original_job_id TEXT NOT NULL,
  queue TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  final_error TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  step_state TEXT NOT NULL,
  moved_at TEXT
);
```

## Configuration

### Environment Variables
- `QUEUE_DB_PATH` - Path to SQLite database (default: `./data/queue.db`)
- `LOG_LEVEL` - Fastify log level (default: `info`)
- `PORT` - Server port (default: `8000`)
- `HOST` - Server host (default: `0.0.0.0`)

### Retry Configuration
```typescript
{
  maxAttempts: 3,                   // Max retry attempts
  backoffStrategy: 'exponential',   // 'fixed' or 'exponential'
  baseDelayMs: 1000,                // Initial retry delay
  maxDelayMs: 300000,               // Maximum retry delay (5 min)
  jobTimeoutMs: 300000,             // Job timeout (5 min)
  stalledCheckIntervalMs: 60000,    // Stalled job check interval (1 min)
}
```

**Timeout recommendations by job type:**
| Job Type | Recommended Timeout | Reason |
|----------|-------------------|--------|
| `render:prepare` | 5 min | Asset validation/download |
| `render:render` | 30-60 min | Video encoding (use step state for progress) |
| `render:upload` | 10 min | File upload to storage |
| `notification` | 30 sec | External API call |
| `automation` | 5 min | Action orchestration |

## Monitoring

### Queue Stats Endpoint
```
GET /queue/stats
```

Response:
```json
{
  "timestamp": "2026-02-25T05:00:00.000Z",
  "queues": {
    "renders": {
      "pending": 5,
      "processing": 2,
      "completed": 100,
      "failed": 0,
      "deadLetter": 1
    }
  },
  "deadLetter": [...]
}
```

### Events
The queue emits events for monitoring:
- `job:created` - New job queued
- `job:deduplicated` - Duplicate prevented by idempotency key
- `job:started` - Job processing started
- `job:completed` - Job finished successfully
- `job:retrying` - Job failed, scheduled for retry (includes `reason`: 'error' | 'timeout')
- `job:stalled` - Job exceeded timeout and was detected as stalled
- `job:dead_letter` - Job moved to DLQ after max retries
- `job:cancelled` - Job cancelled
- `worker:started` - Worker started
- `worker:stopped` - Worker stopped

### Stalled Job Monitoring
Track stalled jobs via events or the API:

```typescript
// Event-based monitoring
queue.on('job:stalled', ({ jobId, type, workerId, timeoutAt }) => {
  // Alert on-call if many jobs stalling from same worker
  metrics.increment('jobs.stalled', { type, workerId });
});

// API endpoint (already in server.ts)
GET /queue/stats
// Returns includes: processing jobs count

// Get stalled count directly
const stalledCount = queue.getStalledJobsCount();
```

## Future Improvements

1. **Horizontal Scaling**: Support for multiple worker instances with Redis/Postgres backend
2. **Scheduled Jobs**: Cron-based recurring automations
3. **Job Batching**: Group similar jobs for efficient processing
4. **Rate Limiting**: Per-queue rate limits
5. **Observability**: Metrics export (Prometheus/OpenTelemetry)
6. **WebSocket Progress**: Real-time job progress updates
