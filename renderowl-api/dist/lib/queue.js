import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
// ============================================================================
// Database Schema
// ============================================================================
const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS jobs (
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
  timeout_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  worker_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_queue_status ON jobs(queue, status);
CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled ON jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_jobs_idempotency ON jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_worker ON jobs(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_timeout ON jobs(status, timeout_at) WHERE status = 'processing';

CREATE TABLE IF NOT EXISTS queue_stats (
  queue TEXT PRIMARY KEY,
  pending INTEGER NOT NULL DEFAULT 0,
  processing INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  dead_letter INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dead_letter_jobs (
  id TEXT PRIMARY KEY,
  original_job_id TEXT NOT NULL,
  queue TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  final_error TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  step_state TEXT NOT NULL,
  moved_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
// ============================================================================
// Queue Class
// ============================================================================
export class JobQueue extends EventEmitter {
    db;
    retryConfig;
    workerId;
    pollingInterval = null;
    stalledCheckInterval = null;
    isRunning = false;
    handlers = new Map();
    constructor(dbPath, retryConfig = {}) {
        super();
        this.db = new Database(dbPath);
        this.db.exec(CREATE_TABLES_SQL);
        this.workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        this.retryConfig = {
            maxAttempts: 3,
            backoffStrategy: 'exponential',
            baseDelayMs: 1000,
            maxDelayMs: 300000, // 5 minutes
            jobTimeoutMs: 300000, // 5 minutes default job timeout
            stalledCheckIntervalMs: 60000, // Check for stalled jobs every minute
            ...retryConfig,
        };
    }
    // ========================================================================
    // Job Creation
    // ========================================================================
    async enqueue(queue, type, payload, options = {}) {
        const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const now = new Date().toISOString();
        const scheduledAt = options.delayMs
            ? new Date(Date.now() + options.delayMs).toISOString()
            : now;
        const steps = (options.steps || ['execute']).map(name => ({
            name,
            status: 'pending',
        }));
        const job = {
            id,
            queue,
            type,
            payload,
            status: 'pending',
            priority: options.priority || 'normal',
            attempts: 0,
            maxAttempts: options.maxAttempts || this.retryConfig.maxAttempts,
            idempotencyKey: options.idempotencyKey || null,
            steps,
            stepState: {},
            error: null,
            scheduledAt,
            startedAt: null,
            completedAt: null,
            timeoutAt: null,
            createdAt: now,
            updatedAt: now,
            workerId: null,
        };
        try {
            const stmt = this.db.prepare(`
        INSERT INTO jobs (
          id, queue, type, payload, status, priority, max_attempts,
          idempotency_key, steps, scheduled_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(job.id, job.queue, job.type, JSON.stringify(payload), job.status, job.priority, job.maxAttempts, job.idempotencyKey, JSON.stringify(steps), scheduledAt, now, now);
            this.emit('job:created', { jobId: id, queue, type });
            return job;
        }
        catch (error) {
            // Handle idempotency key conflict
            if (error.message?.includes('UNIQUE constraint failed: jobs.idempotency_key')) {
                const existing = this.db.prepare('SELECT * FROM jobs WHERE idempotency_key = ?').get(options.idempotencyKey);
                if (existing) {
                    this.emit('job:deduplicated', {
                        jobId: existing.id,
                        queue,
                        type,
                        idempotencyKey: options.idempotencyKey
                    });
                    return this.hydrateJob(existing);
                }
            }
            throw error;
        }
    }
    // ========================================================================
    // Job Processing
    // ========================================================================
    registerHandler(type, handler) {
        this.handlers.set(type, handler);
    }
    async start(pollIntervalMs = 1000) {
        if (this.isRunning)
            return;
        this.isRunning = true;
        // Reset any jobs stuck with this worker (crash recovery)
        this.db.prepare(`
      UPDATE jobs 
      SET status = 'pending', worker_id = NULL, started_at = NULL, timeout_at = NULL, updated_at = ?
      WHERE worker_id = ? AND status = 'processing'
    `).run(new Date().toISOString(), this.workerId);
        this.pollingInterval = setInterval(() => this.poll(), pollIntervalMs);
        // Start stalled job detection
        this.stalledCheckInterval = setInterval(() => this.recoverStalledJobs(), this.retryConfig.stalledCheckIntervalMs);
        this.emit('worker:started', { workerId: this.workerId });
    }
    async stop() {
        this.isRunning = false;
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        if (this.stalledCheckInterval) {
            clearInterval(this.stalledCheckInterval);
            this.stalledCheckInterval = null;
        }
        this.emit('worker:stopped', { workerId: this.workerId });
    }
    async poll() {
        if (!this.isRunning)
            return;
        const job = this.claimNextJob();
        if (!job)
            return;
        await this.processJob(job);
    }
    async recoverStalledJobs() {
        if (!this.isRunning)
            return;
        // Find jobs that have exceeded their timeout
        const stalledJobs = this.db.prepare(`
      SELECT * FROM jobs 
      WHERE status = 'processing' 
        AND timeout_at <= datetime('now')
    `).all();
        for (const row of stalledJobs) {
            const job = this.hydrateJob(row);
            this.emit('job:stalled', {
                jobId: job.id,
                type: job.type,
                workerId: job.workerId,
                startedAt: job.startedAt,
                timeoutAt: job.timeoutAt
            });
            // Reset job to pending for retry (or move to DLQ if max attempts reached)
            if (job.attempts >= job.maxAttempts) {
                await this.moveToDeadLetter(job, new Error(`Job timed out after ${this.retryConfig.jobTimeoutMs}ms`));
            }
            else {
                const delayMs = this.calculateRetryDelay(job.attempts);
                const scheduledAt = new Date(Date.now() + delayMs).toISOString();
                const now = new Date().toISOString();
                this.db.prepare(`
          UPDATE jobs 
          SET status = 'pending', 
              scheduled_at = ?, 
              error = ?, 
              worker_id = NULL, 
              started_at = NULL,
              timeout_at = NULL,
              updated_at = ?
          WHERE id = ?
        `).run(scheduledAt, `Job timed out after ${this.retryConfig.jobTimeoutMs}ms`, now, job.id);
                this.emit('job:retrying', {
                    jobId: job.id,
                    type: job.type,
                    attempt: job.attempts,
                    maxAttempts: job.maxAttempts,
                    delayMs,
                    reason: 'timeout'
                });
            }
        }
    }
    claimNextJob() {
        // Use atomic UPDATE with RETURNING to prevent race conditions
        // The subquery finds the next available job, then we update and return it atomically
        const timeoutAt = new Date(Date.now() + this.retryConfig.jobTimeoutMs).toISOString();
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
      UPDATE jobs 
      SET status = 'processing', 
          worker_id = ?, 
          started_at = ?, 
          timeout_at = ?, 
          attempts = attempts + 1, 
          updated_at = ?
      WHERE id = (
        SELECT id FROM jobs 
        WHERE status = 'pending' 
          AND scheduled_at <= datetime('now')
        ORDER BY 
          CASE priority
            WHEN 'urgent' THEN 0
            WHEN 'high' THEN 1
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 3
          END,
          scheduled_at ASC
        LIMIT 1
      )
      AND status = 'pending'
      RETURNING *
    `);
        const row = stmt.get(this.workerId, now, timeoutAt, now);
        if (!row)
            return null;
        return this.hydrateJob({
            ...row,
            status: 'processing',
            worker_id: this.workerId,
            started_at: now,
            timeout_at: timeoutAt,
            attempts: row.attempts + 1
        });
    }
    async processJob(job) {
        this.emit('job:started', { jobId: job.id, type: job.type, attempt: job.attempts });
        try {
            const handler = this.handlers.get(job.type);
            if (!handler) {
                throw new Error(`No handler registered for job type: ${job.type}`);
            }
            // Process each step
            for (let i = 0; i < job.steps.length; i++) {
                const step = job.steps[i];
                if (step.status === 'completed')
                    continue;
                step.status = 'running';
                step.startedAt = new Date().toISOString();
                this.updateJobSteps(job);
                try {
                    await handler(job, step);
                    step.status = 'completed';
                    step.completedAt = new Date().toISOString();
                    this.updateJobSteps(job);
                }
                catch (error) {
                    step.status = 'failed';
                    step.error = error.message;
                    this.updateJobSteps(job);
                    throw error; // Re-throw to trigger retry/DLQ logic
                }
            }
            // All steps completed successfully
            await this.completeJob(job);
        }
        catch (error) {
            await this.handleJobError(job, error);
        }
    }
    updateJobSteps(job) {
        const stmt = this.db.prepare(`
      UPDATE jobs SET steps = ?, step_state = ?, updated_at = ? WHERE id = ?
    `);
        stmt.run(JSON.stringify(job.steps), JSON.stringify(job.stepState), new Date().toISOString(), job.id);
    }
    async completeJob(job) {
        const now = new Date().toISOString();
        this.db.prepare(`
      UPDATE jobs 
      SET status = 'completed', completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, job.id);
        this.emit('job:completed', { jobId: job.id, type: job.type, duration: Date.now() - new Date(job.startedAt).getTime() });
    }
    async handleJobError(job, error) {
        const shouldRetry = job.attempts < job.maxAttempts;
        if (shouldRetry) {
            const delayMs = this.calculateRetryDelay(job.attempts);
            const scheduledAt = new Date(Date.now() + delayMs).toISOString();
            const now = new Date().toISOString();
            this.db.prepare(`
        UPDATE jobs 
        SET status = 'pending', 
            scheduled_at = ?, 
            error = ?, 
            worker_id = NULL, 
            started_at = NULL,
            updated_at = ?
        WHERE id = ?
      `).run(scheduledAt, error.message, now, job.id);
            this.emit('job:retrying', {
                jobId: job.id,
                type: job.type,
                attempt: job.attempts,
                maxAttempts: job.maxAttempts,
                delayMs
            });
        }
        else {
            await this.moveToDeadLetter(job, error);
        }
    }
    calculateRetryDelay(attempt) {
        const { backoffStrategy, baseDelayMs, maxDelayMs } = this.retryConfig;
        let delay;
        if (backoffStrategy === 'exponential') {
            delay = baseDelayMs * Math.pow(2, attempt - 1);
        }
        else {
            delay = baseDelayMs;
        }
        return Math.min(delay, maxDelayMs);
    }
    async moveToDeadLetter(job, error) {
        const now = new Date().toISOString();
        // Move to DLQ table
        this.db.prepare(`
      INSERT INTO dead_letter_jobs (
        id, original_job_id, queue, type, payload, final_error, 
        attempts, step_state, moved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`dlq_${job.id}`, job.id, job.queue, job.type, JSON.stringify(job.payload), error.message, job.attempts, JSON.stringify(job.stepState), now);
        // Mark original job as dead_letter
        this.db.prepare(`
      UPDATE jobs 
      SET status = 'dead_letter', error = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(error.message, now, now, job.id);
        this.emit('job:dead_letter', {
            jobId: job.id,
            type: job.type,
            error: error.message,
            attempts: job.attempts
        });
    }
    // ========================================================================
    // Step State Management
    // ========================================================================
    updateStepState(jobId, key, value) {
        const job = this.getJob(jobId);
        if (!job)
            throw new Error(`Job not found: ${jobId}`);
        job.stepState[key] = value;
        this.updateJobSteps(job);
    }
    getStepState(jobId, key) {
        const job = this.getJob(jobId);
        if (!job)
            return undefined;
        return job.stepState[key];
    }
    // ========================================================================
    // Job Queries
    // ========================================================================
    getJob(id) {
        const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
        return row ? this.hydrateJob(row) : null;
    }
    getJobByIdempotencyKey(key) {
        const row = this.db.prepare('SELECT * FROM jobs WHERE idempotency_key = ?').get(key);
        return row ? this.hydrateJob(row) : null;
    }
    getQueueStats(queue) {
        const stats = this.db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) as dead_letter
      FROM jobs
      WHERE queue = ?
    `).get(queue);
        return {
            pending: stats.pending || 0,
            processing: stats.processing || 0,
            completed: stats.completed || 0,
            failed: stats.failed || 0,
            deadLetter: stats.dead_letter || 0,
        };
    }
    getDeadLetterJobs(queue, limit = 100) {
        const sql = queue
            ? 'SELECT * FROM dead_letter_jobs WHERE queue = ? ORDER BY moved_at DESC LIMIT ?'
            : 'SELECT * FROM dead_letter_jobs ORDER BY moved_at DESC LIMIT ?';
        const stmt = this.db.prepare(sql);
        const rows = queue ? stmt.all(queue, limit) : stmt.all(limit);
        return rows.map(row => ({
            ...row,
            payload: JSON.parse(row.payload),
            stepState: JSON.parse(row.step_state),
        }));
    }
    // ========================================================================
    // Job Management
    // ========================================================================
    cancelJob(id) {
        const result = this.db.prepare(`
      UPDATE jobs 
      SET status = 'cancelled', completed_at = ?, updated_at = ?
      WHERE id = ? AND status IN ('pending', 'processing')
    `).run(new Date().toISOString(), new Date().toISOString(), id);
        if (result.changes > 0) {
            this.emit('job:cancelled', { jobId: id });
            return true;
        }
        return false;
    }
    async retryDeadLetter(dlqId) {
        const dlqJob = this.db.prepare('SELECT * FROM dead_letter_jobs WHERE id = ?').get(dlqId);
        if (!dlqJob)
            return null;
        // Create a new job with same payload
        const newJob = await this.enqueue(dlqJob.queue, dlqJob.type, JSON.parse(dlqJob.payload), { maxAttempts: 3 });
        // Remove from DLQ
        this.db.prepare('DELETE FROM dead_letter_jobs WHERE id = ?').run(dlqId);
        return newJob;
    }
    getStalledJobsCount() {
        const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM jobs 
      WHERE status = 'processing' 
        AND timeout_at <= datetime('now')
    `).get();
        return result?.count || 0;
    }
    // ========================================================================
    // Helpers
    // ========================================================================
    hydrateJob(row) {
        return {
            id: row.id,
            queue: row.queue,
            type: row.type,
            payload: JSON.parse(row.payload),
            status: row.status,
            priority: row.priority,
            attempts: row.attempts,
            maxAttempts: row.max_attempts,
            idempotencyKey: row.idempotency_key,
            steps: JSON.parse(row.steps),
            stepState: JSON.parse(row.step_state),
            error: row.error,
            scheduledAt: row.scheduled_at,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            timeoutAt: row.timeout_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            workerId: row.worker_id,
        };
    }
    close() {
        this.stop();
        this.db.close();
    }
}
export default JobQueue;
//# sourceMappingURL=queue.js.map