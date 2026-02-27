import { FastifyInstance } from 'fastify';
import { EventEmitter } from 'events';
import Database, { Database as DatabaseType } from 'better-sqlite3';

// ============================================================================
// Enhanced Job Types
// ============================================================================

export type JobStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'dead_letter'
  | 'scheduled';

export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface JobMetrics {
  waitTime: number; // Time in queue before processing
  processingTime: number; // Time spent processing
  totalTime: number; // Total time from creation to completion
  retryCount: number;
}

export interface JobStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  output?: unknown;
  metrics?: {
    durationMs: number;
  };
}

export interface Job<T = unknown> {
  id: string;
  queue: string;
  type: string;
  payload: T;
  status: JobStatus;
  priority: JobPriority;
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string | null;
  steps: JobStep[];
  stepState: Record<string, unknown>;
  error: string | null;
  metrics: JobMetrics;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  timeoutAt: string | null;
  createdAt: string;
  updatedAt: string;
  workerId: string | null;
  tags: string[];
}

export interface JobOptions {
  priority?: JobPriority;
  maxAttempts?: number;
  idempotencyKey?: string;
  delayMs?: number;
  steps?: string[];
  tags?: string[];
  timeoutMs?: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  scheduled: number;
  avgWaitTime: number;
  avgProcessingTime: number;
}

export interface WorkerConfig {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  baseDelayMs: number;
  maxDelayMs: number;
  jobTimeoutMs: number;
  stalledCheckIntervalMs: number;
  batchSize: number;
  concurrency: number;
}

// ============================================================================
// Enhanced Database Schema
// ============================================================================

const ENHANCED_SCHEMA_SQL = `
-- Jobs table with enhanced fields
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
  metrics TEXT NOT NULL DEFAULT '{}',
  tags TEXT NOT NULL DEFAULT '[]',
  scheduled_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  timeout_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  worker_id TEXT
);

-- Optimized indexes
CREATE INDEX IF NOT EXISTS idx_jobs_queue_status_priority ON jobs(queue, status, priority);
CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled ON jobs(status, scheduled_at) WHERE status IN ('pending', 'scheduled');
CREATE INDEX IF NOT EXISTS idx_jobs_idempotency ON jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_worker ON jobs(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_timeout ON jobs(status, timeout_at) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_tags ON jobs(tags);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);

-- Queue stats materialized view
CREATE TABLE IF NOT EXISTS queue_stats (
  queue TEXT PRIMARY KEY,
  pending INTEGER NOT NULL DEFAULT 0,
  processing INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  dead_letter INTEGER NOT NULL DEFAULT 0,
  scheduled INTEGER NOT NULL DEFAULT 0,
  avg_wait_time INTEGER DEFAULT 0,
  avg_processing_time INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dead letter jobs with enhanced info
CREATE TABLE IF NOT EXISTS dead_letter_jobs (
  id TEXT PRIMARY KEY,
  original_job_id TEXT NOT NULL,
  queue TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  final_error TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  step_state TEXT NOT NULL,
  metrics TEXT NOT NULL,
  tags TEXT,
  moved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dlq_queue ON dead_letter_jobs(queue);
CREATE INDEX IF NOT EXISTS idx_dlq_type ON dead_letter_jobs(type);
CREATE INDEX IF NOT EXISTS idx_dlq_moved ON dead_letter_jobs(moved_at DESC);

-- Job metrics history
CREATE TABLE IF NOT EXISTS job_metrics_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  queue TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  wait_time_ms INTEGER,
  processing_time_ms INTEGER,
  total_time_ms INTEGER,
  retry_count INTEGER,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_metrics_job ON job_metrics_history(job_id);
CREATE INDEX IF NOT EXISTS idx_metrics_queue ON job_metrics_history(queue);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded ON job_metrics_history(recorded_at DESC);
`;

// ============================================================================
// Enhanced Job Queue
// ============================================================================

export class EnhancedJobQueue extends EventEmitter {
  private db: DatabaseType;
  private workerConfig: WorkerConfig;
  private workerId: string;
  private pollingInterval: NodeJS.Timeout | null = null;
  private stalledCheckInterval: NodeJS.Timeout | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private handlers = new Map<string, (job: Job, step: JobStep) => Promise<void>>();
  private processingJobs = new Set<string>();
  private statementCache = new Map<string, ReturnType<DatabaseType['prepare']>>();

  constructor(dbPath: string, workerConfig: Partial<WorkerConfig> = {}) {
    super();
    this.db = new Database(dbPath);
    this.db.exec(ENHANCED_SCHEMA_SQL);
    
    // Performance optimizations
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('temp_store = memory');
    this.db.pragma('mmap_size = 30000000000');
    this.db.pragma('cache_size = -64000'); // 64MB cache

    this.workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    this.workerConfig = {
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      baseDelayMs: 1000,
      maxDelayMs: 300000,
      jobTimeoutMs: 300000,
      stalledCheckIntervalMs: 30000,
      batchSize: 10,
      concurrency: 5,
      ...workerConfig,
    };
  }

  // ========================================================================
  // Job Creation
  // ========================================================================

  async enqueue<T>(
    queue: string,
    type: string,
    payload: T,
    options: JobOptions = {}
  ): Promise<Job<T>> {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();
    const scheduledAt = options.delayMs 
      ? new Date(Date.now() + options.delayMs).toISOString()
      : now;

    const steps: JobStep[] = (options.steps || ['execute']).map(name => ({
      name,
      status: 'pending',
    }));

    const job: Job<T> = {
      id,
      queue,
      type,
      payload,
      status: options.delayMs ? 'scheduled' : 'pending',
      priority: options.priority || 'normal',
      attempts: 0,
      maxAttempts: options.maxAttempts || this.workerConfig.maxAttempts,
      idempotencyKey: options.idempotencyKey || null,
      steps,
      stepState: {},
      error: null,
      metrics: {
        waitTime: 0,
        processingTime: 0,
        totalTime: 0,
        retryCount: 0,
      },
      scheduledAt,
      startedAt: null,
      completedAt: null,
      timeoutAt: null,
      createdAt: now,
      updatedAt: now,
      workerId: null,
      tags: options.tags || [],
    };

    try {
      const stmt = this.getStatement(`
        INSERT INTO jobs (
          id, queue, type, payload, status, priority, max_attempts,
          idempotency_key, steps, tags, scheduled_at, created_at, updated_at, metrics
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        job.id,
        job.queue,
        job.type,
        JSON.stringify(payload),
        job.status,
        job.priority,
        job.maxAttempts,
        job.idempotencyKey,
        JSON.stringify(steps),
        JSON.stringify(job.tags),
        scheduledAt,
        now,
        now,
        JSON.stringify(job.metrics)
      );

      this.emit('job:created', { jobId: id, queue, type, priority: job.priority });
      return job;
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed: jobs.idempotency_key')) {
        const existing = this.getJobByIdempotencyKey(options.idempotencyKey!);
        if (existing) {
          this.emit('job:deduplicated', { 
            jobId: existing.id, 
            queue, 
            type,
            idempotencyKey: options.idempotencyKey 
          });
          return existing as Job<T>;
        }
      }
      throw error;
    }
  }

  async enqueueBatch<T>(
    queue: string,
    type: string,
    payloads: T[],
    options: JobOptions = {}
  ): Promise<Job<T>[]> {
    const jobs: Job<T>[] = [];
    
    // Use transaction for batch insert
    this.db.prepare('BEGIN').run();
    
    try {
      for (const payload of payloads) {
        const job = await this.enqueue(queue, type, payload, options);
        jobs.push(job);
      }
      this.db.prepare('COMMIT').run();
    } catch (error) {
      this.db.prepare('ROLLBACK').run();
      throw error;
    }

    this.emit('job:batch_created', { count: jobs.length, queue, type });
    return jobs;
  }

  // ========================================================================
  // Job Processing
  // ========================================================================

  registerHandler(type: string, handler: (job: Job, step: JobStep) => Promise<void>): void {
    this.handlers.set(type, handler);
  }

  async start(pollIntervalMs = 1000): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Crash recovery
    this.recoverFromCrash();

    // Start polling
    this.pollingInterval = setInterval(() => this.poll(), pollIntervalMs);
    
    // Start stalled job detection
    this.stalledCheckInterval = setInterval(
      () => this.recoverStalledJobs(),
      this.workerConfig.stalledCheckIntervalMs
    );

    // Start stats aggregation
    this.statsInterval = setInterval(() => this.updateStats(), 60000);

    this.emit('worker:started', { workerId: this.workerId, concurrency: this.workerConfig.concurrency });
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.stalledCheckInterval) {
      clearInterval(this.stalledCheckInterval);
      this.stalledCheckInterval = null;
    }

    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Wait for current jobs to complete (with timeout)
    const maxWait = 30000;
    const start = Date.now();
    
    while (this.processingJobs.size > 0 && Date.now() - start < maxWait) {
      await new Promise(r => setTimeout(r, 100));
    }

    this.emit('worker:stopped', { workerId: this.workerId });
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    // Process up to batchSize jobs
    for (let i = 0; i < this.workerConfig.batchSize; i++) {
      if (this.processingJobs.size >= this.workerConfig.concurrency) break;
      
      const job = this.claimNextJob();
      if (!job) break;

      this.processJob(job).catch(err => {
        this.emit('job:error', { jobId: job.id, error: err.message });
      });
    }
  }

  private claimNextJob(): Job | null {
    const now = new Date().toISOString();
    const timeoutAt = new Date(Date.now() + this.workerConfig.jobTimeoutMs).toISOString();

    // Use a single atomic query to claim a job
    const selectStmt = this.getStatement(`
      SELECT * FROM jobs 
      WHERE status IN ('pending', 'scheduled') 
        AND scheduled_at <= ?
      ORDER BY 
        CASE priority
          WHEN 'urgent' THEN 0
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
        END,
        scheduled_at ASC
      LIMIT 1
    `);

    const row = selectStmt.get(now) as any;
    if (!row) return null;

    // Claim the job atomically
    const updateStmt = this.getStatement(`
      UPDATE jobs 
      SET status = 'processing', 
          worker_id = ?, 
          started_at = ?, 
          timeout_at = ?, 
          attempts = attempts + 1, 
          updated_at = ?
      WHERE id = ? AND status IN ('pending', 'scheduled')
    `);

    const result = updateStmt.run(this.workerId, now, timeoutAt, now, row.id);
    if (result.changes === 0) return null;

    const job = this.hydrateJob({ 
      ...row, 
      status: 'processing', 
      worker_id: this.workerId, 
      started_at: now, 
      timeout_at: timeoutAt,
      attempts: row.attempts + 1
    });

    // Calculate wait time
    job.metrics.waitTime = Date.now() - new Date(job.createdAt).getTime();
    this.updateJobMetrics(job);

    return job;
  }

  private async processJob(job: Job): Promise<void> {
    this.processingJobs.add(job.id);
    const startTime = Date.now();

    this.emit('job:started', { 
      jobId: job.id, 
      type: job.type, 
      attempt: job.attempts,
      workerId: this.workerId 
    });

    try {
      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      // Process each step
      for (let i = 0; i < job.steps.length; i++) {
        const step = job.steps[i];
        if (step.status === 'completed') continue;

        const stepStart = Date.now();
        step.status = 'running';
        step.startedAt = new Date().toISOString();
        this.updateJobSteps(job);

        try {
          await handler(job, step);
          
          step.status = 'completed';
          step.completedAt = new Date().toISOString();
          step.metrics = { durationMs: Date.now() - stepStart };
          this.updateJobSteps(job);
        } catch (error: any) {
          step.status = 'failed';
          step.error = error.message;
          this.updateJobSteps(job);
          throw error;
        }
      }

      // All steps completed successfully
      await this.completeJob(job, startTime);
    } catch (error: any) {
      await this.handleJobError(job, error, startTime);
    } finally {
      this.processingJobs.delete(job.id);
    }
  }

  private async completeJob(job: Job, startTime: number): Promise<void> {
    const now = new Date().toISOString();
    const processingTime = Date.now() - startTime;

    job.metrics.processingTime = processingTime;
    job.metrics.totalTime = Date.now() - new Date(job.createdAt).getTime();

    const stmt = this.getStatement(`
      UPDATE jobs 
      SET status = 'completed', 
          completed_at = ?, 
          updated_at = ?,
          metrics = ?
      WHERE id = ?
    `);

    stmt.run(now, now, JSON.stringify(job.metrics), job.id);

    this.recordMetricsHistory(job, 'completed');

    this.emit('job:completed', { 
      jobId: job.id, 
      type: job.type, 
      duration: processingTime,
      totalTime: job.metrics.totalTime
    });
  }

  private async handleJobError(job: Job, error: Error, startTime: number): Promise<void> {
    job.metrics.processingTime = Date.now() - startTime;
    job.metrics.retryCount = job.attempts;

    const shouldRetry = job.attempts < job.maxAttempts;
    
    if (shouldRetry) {
      const delayMs = this.calculateRetryDelay(job.attempts);
      const scheduledAt = new Date(Date.now() + delayMs).toISOString();
      const now = new Date().toISOString();

      const stmt = this.getStatement(`
        UPDATE jobs 
        SET status = 'pending', 
            scheduled_at = ?, 
            error = ?, 
            worker_id = NULL, 
            started_at = NULL,
            timeout_at = NULL,
            updated_at = ?,
            metrics = ?
        WHERE id = ?
      `);

      stmt.run(scheduledAt, error.message, now, JSON.stringify(job.metrics), job.id);

      this.emit('job:retrying', { 
        jobId: job.id, 
        type: job.type, 
        attempt: job.attempts, 
        maxAttempts: job.maxAttempts,
        delayMs 
      });
    } else {
      await this.moveToDeadLetter(job, error);
    }
  }

  private calculateRetryDelay(attempt: number): number {
    const { backoffStrategy, baseDelayMs, maxDelayMs } = this.workerConfig;
    
    let delay: number;
    switch (backoffStrategy) {
      case 'exponential':
        delay = baseDelayMs * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delay = baseDelayMs * attempt;
        break;
      default:
        delay = baseDelayMs;
    }
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, maxDelayMs);
  }

  // ========================================================================
  // Recovery
  // ========================================================================

  private recoverFromCrash(): void {
    const now = new Date().toISOString();

    // Reset jobs stuck with this worker
    this.getStatement(`
      UPDATE jobs 
      SET status = 'pending', 
          worker_id = NULL, 
          started_at = NULL, 
          timeout_at = NULL, 
          updated_at = ?
      WHERE worker_id = ? AND status = 'processing'
    `).run(now, this.workerId);

    // Also reset any jobs from dead workers (no heartbeat for 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
    this.getStatement(`
      UPDATE jobs 
      SET status = 'pending', 
          worker_id = NULL, 
          started_at = NULL, 
          timeout_at = NULL, 
          updated_at = ?
      WHERE status = 'processing' 
        AND timeout_at < ?
    `).run(now, fiveMinutesAgo);
  }

  private async recoverStalledJobs(): Promise<void> {
    const now = new Date().toISOString();

    const stalledJobs = this.getStatement(`
      SELECT * FROM jobs 
      WHERE status = 'processing' 
        AND timeout_at <= ?
    `).all(now) as any[];

    for (const row of stalledJobs) {
      const job = this.hydrateJob(row);
      
      this.emit('job:stalled', { 
        jobId: job.id, 
        type: job.type, 
        workerId: job.workerId,
        timeoutAt: job.timeoutAt 
      });

      if (job.attempts >= job.maxAttempts) {
        await this.moveToDeadLetter(job, new Error(`Job timed out after ${this.workerConfig.jobTimeoutMs}ms`));
      } else {
        this.getStatement(`
          UPDATE jobs 
          SET status = 'pending', 
              scheduled_at = ?, 
              error = ?, 
              worker_id = NULL, 
              started_at = NULL,
              timeout_at = NULL,
              updated_at = ?
          WHERE id = ?
        `).run(now, `Job timed out after ${this.workerConfig.jobTimeoutMs}ms`, now, job.id);
      }
    }
  }

  private async moveToDeadLetter(job: Job, error: Error): Promise<void> {
    const now = new Date().toISOString();

    this.getStatement(`
      INSERT INTO dead_letter_jobs (
        id, original_job_id, queue, type, payload, final_error, 
        attempts, step_state, metrics, tags, moved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `dlq_${job.id}`,
      job.id,
      job.queue,
      job.type,
      JSON.stringify(job.payload),
      error.message,
      job.attempts,
      JSON.stringify(job.stepState),
      JSON.stringify(job.metrics),
      JSON.stringify(job.tags),
      now
    );

    this.getStatement(`
      UPDATE jobs 
      SET status = 'dead_letter', error = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(error.message, now, now, job.id);

    this.recordMetricsHistory(job, 'dead_letter');

    this.emit('job:dead_letter', { 
      jobId: job.id, 
      type: job.type, 
      error: error.message,
      attempts: job.attempts 
    });
  }

  // ========================================================================
  // Statistics
  // ========================================================================

  private updateStats(): void {
    const queues = this.getStatement(`
      SELECT DISTINCT queue FROM jobs
    `).all() as Array<{ queue: string }>;

    for (const { queue } of queues) {
      const stats = this.getStatement(`
        SELECT 
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) as dead_letter,
          SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
          AVG(CASE WHEN status = 'completed' THEN json_extract(metrics, '$.waitTime') END) as avg_wait,
          AVG(CASE WHEN status = 'completed' THEN json_extract(metrics, '$.processingTime') END) as avg_processing
        FROM jobs
        WHERE queue = ?
      `).get(queue) as any;

      this.getStatement(`
        INSERT INTO queue_stats (
          queue, pending, processing, completed, failed, dead_letter, scheduled,
          avg_wait_time, avg_processing_time, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(queue) DO UPDATE SET
          pending = excluded.pending,
          processing = excluded.processing,
          completed = excluded.completed,
          failed = excluded.failed,
          dead_letter = excluded.dead_letter,
          scheduled = excluded.scheduled,
          avg_wait_time = excluded.avg_wait_time,
          avg_processing_time = excluded.avg_processing_time,
          updated_at = excluded.updated_at
      `).run(
        queue,
        stats?.pending || 0,
        stats?.processing || 0,
        stats?.completed || 0,
        stats?.failed || 0,
        stats?.dead_letter || 0,
        stats?.scheduled || 0,
        Math.round(stats?.avg_wait || 0),
        Math.round(stats?.avg_processing || 0)
      );
    }
  }

  getQueueStats(queue: string): QueueStats {
    const stats = this.getStatement(`
      SELECT * FROM queue_stats WHERE queue = ?
    `).get(queue) as any;

    if (!stats) {
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        deadLetter: 0,
        scheduled: 0,
        avgWaitTime: 0,
        avgProcessingTime: 0,
      };
    }

    return {
      pending: stats.pending,
      processing: stats.processing,
      completed: stats.completed,
      failed: stats.failed,
      deadLetter: stats.dead_letter,
      scheduled: stats.scheduled,
      avgWaitTime: stats.avg_wait_time,
      avgProcessingTime: stats.avg_processing_time,
    };
  }

  getAllStats(): Record<string, QueueStats> {
    const rows = this.getStatement(`SELECT * FROM queue_stats`).all() as any[];
    const stats: Record<string, QueueStats> = {};

    for (const row of rows) {
      stats[row.queue] = {
        pending: row.pending,
        processing: row.processing,
        completed: row.completed,
        failed: row.failed,
        deadLetter: row.dead_letter,
        scheduled: row.scheduled,
        avgWaitTime: row.avg_wait_time,
        avgProcessingTime: row.avg_processing_time,
      };
    }

    return stats;
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private getStatement(sql: string) {
    if (!this.statementCache.has(sql)) {
      this.statementCache.set(sql, this.db.prepare(sql));
    }
    return this.statementCache.get(sql)!;
  }

  private updateJobSteps(job: Job): void {
    const stmt = this.getStatement(`
      UPDATE jobs SET steps = ?, step_state = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(
      JSON.stringify(job.steps),
      JSON.stringify(job.stepState),
      new Date().toISOString(),
      job.id
    );
  }

  private updateJobMetrics(job: Job): void {
    const stmt = this.getStatement(`
      UPDATE jobs SET metrics = ? WHERE id = ?
    `);
    stmt.run(JSON.stringify(job.metrics), job.id);
  }

  private recordMetricsHistory(job: Job, status: string): void {
    this.getStatement(`
      INSERT INTO job_metrics_history (
        job_id, queue, type, status, wait_time_ms, processing_time_ms, 
        total_time_ms, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.id,
      job.queue,
      job.type,
      status,
      job.metrics.waitTime,
      job.metrics.processingTime,
      job.metrics.totalTime,
      job.metrics.retryCount
    );
  }

  getJob(id: string): Job | null {
    const row = this.getStatement('SELECT * FROM jobs WHERE id = ?').get(id) as any;
    return row ? this.hydrateJob(row) : null;
  }

  getJobByIdempotencyKey(key: string): Job | null {
    const row = this.getStatement('SELECT * FROM jobs WHERE idempotency_key = ?').get(key) as any;
    return row ? this.hydrateJob(row) : null;
  }

  private hydrateJob(row: any): Job {
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
      metrics: JSON.parse(row.metrics),
      scheduledAt: row.scheduled_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      timeoutAt: row.timeout_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      workerId: row.worker_id,
      tags: JSON.parse(row.tags || '[]'),
    };
  }

  cancelJob(id: string): boolean {
    const result = this.getStatement(`
      UPDATE jobs 
      SET status = 'cancelled', completed_at = ?, updated_at = ?
      WHERE id = ? AND status IN ('pending', 'scheduled')
    `).run(new Date().toISOString(), new Date().toISOString(), id);

    if (result.changes > 0) {
      this.emit('job:cancelled', { jobId: id });
      return true;
    }
    return false;
  }

  async retryDeadLetter(dlqId: string): Promise<Job | null> {
    const dlqJob = this.getStatement('SELECT * FROM dead_letter_jobs WHERE id = ?').get(dlqId) as any;
    if (!dlqJob) return null;

    const newJob = await this.enqueue(
      dlqJob.queue,
      dlqJob.type,
      JSON.parse(dlqJob.payload),
      { maxAttempts: 3 }
    );

    this.getStatement('DELETE FROM dead_letter_jobs WHERE id = ?').run(dlqId);

    return newJob;
  }

  getDeadLetterJobs(queue?: string, limit = 100): any[] {
    const sql = queue 
      ? 'SELECT * FROM dead_letter_jobs WHERE queue = ? ORDER BY moved_at DESC LIMIT ?'
      : 'SELECT * FROM dead_letter_jobs ORDER BY moved_at DESC LIMIT ?';
    
    const stmt = this.getStatement(sql);
    const rows = queue ? stmt.all(queue, limit) : stmt.all(limit);
    
    return (rows as any[]).map(row => ({
      ...row,
      payload: JSON.parse(row.payload),
      stepState: JSON.parse(row.step_state),
      metrics: JSON.parse(row.metrics),
    }));
  }

  getStalledJobsCount(): number {
    const result = this.getStatement(`
      SELECT COUNT(*) as count FROM jobs 
      WHERE status = 'processing' 
        AND timeout_at <= datetime('now')
    `).get() as any;
    return result?.count || 0;
  }

  close(): void {
    this.stop();
    this.statementCache.clear();
    this.db.close();
  }
}

export default EnhancedJobQueue;
