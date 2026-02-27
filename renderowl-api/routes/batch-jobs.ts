import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Database from 'better-sqlite3';
import { z } from 'zod';
import { EventEmitter } from 'events';

// ============================================================================
// Batch Job Processing System
// ============================================================================
// Handles queue-based batch render jobs with progress tracking

// ============================================================================
// Database Schema
// ============================================================================

const BATCH_JOBS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS batch_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  
  -- Job configuration
  operations TEXT NOT NULL, -- JSON array of batch operations
  variables_schema TEXT, -- JSON: variable definitions for CSV mode
  csv_data TEXT, -- JSON: parsed CSV data (if CSV upload)
  
  -- Progress tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paused', 'completed', 'failed', 'cancelled')),
  total_jobs INTEGER NOT NULL,
  completed_jobs INTEGER DEFAULT 0,
  failed_jobs INTEGER DEFAULT 0,
  progress REAL DEFAULT 0,
  
  -- Individual job results
  results TEXT, -- JSON: array of {operation_id, render_id, status, error}
  
  -- Metadata
  priority INTEGER DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  estimated_completion_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_user ON batch_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_project ON batch_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_processing ON batch_jobs(status, priority, created_at) 
  WHERE status = 'pending';

-- Individual render jobs spawned from batch
CREATE TABLE IF NOT EXISTS batch_render_jobs (
  id TEXT PRIMARY KEY,
  batch_job_id TEXT NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  render_job_id TEXT, -- Reference to actual render job when created
  operation_index INTEGER NOT NULL,
  variables TEXT NOT NULL, -- JSON: resolved variables for this job
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  credits_charged INTEGER,
  output_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_batch_render_jobs_batch ON batch_render_jobs(batch_job_id);
CREATE INDEX IF NOT EXISTS idx_batch_render_jobs_status ON batch_render_jobs(status);
`;

// ============================================================================
// Validation Schemas
// ============================================================================

const CreateBatchJobSchema = z.object({
  project_id: z.string(),
  template_id: z.string(),
  name: z.string().min(1).max(100),
  operations: z.array(z.object({
    id: z.string(),
    title: z.string(),
    variables: z.record(z.unknown()),
  })).min(1).max(1000),
  priority: z.number().int().min(0).max(10).default(0),
});

const CreateBatchFromCSVSchema = z.object({
  project_id: z.string(),
  template_id: z.string(),
  name: z.string().min(1).max(100),
  csv_data: z.array(z.record(z.string())),
  variable_mapping: z.record(z.string()), // CSV column -> template variable
  priority: z.number().int().min(0).max(10).default(0),
});

// ============================================================================
// Types
// ============================================================================

interface BatchJob {
  id: string;
  userId: string;
  projectId: string;
  templateId: string;
  name: string;
  status: 'pending' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  progress: number;
  operations: Array<{
    id: string;
    title: string;
    variables: Record<string, unknown>;
  }>;
  results?: Array<{
    operationId: string;
    renderId?: string;
    status: string;
    error?: string;
  }>;
  priority: number;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletionAt?: string;
  createdAt: string;
}

interface BatchRenderJob {
  id: string;
  batchJobId: string;
  renderJobId?: string;
  operationIndex: number;
  variables: Record<string, unknown>;
  status: string;
  errorMessage?: string;
  creditsCharged?: number;
  outputUrl?: string;
}

// ============================================================================
// Batch Job Service
// ============================================================================

export class BatchJobService extends EventEmitter {
  private db: Database.Database;
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(dbPath: string) {
    super();
    this.db = new Database(dbPath);
    this.db.exec(BATCH_JOBS_SCHEMA_SQL);
    this.startProcessingLoop();
  }

  // --------------------------------------------------------------------------
  // Job Creation
  // --------------------------------------------------------------------------

  createBatchJob(params: {
    userId: string;
    projectId: string;
    templateId: string;
    name: string;
    operations: Array<{ id: string; title: string; variables: Record<string, unknown> }>;
    priority?: number;
  }): BatchJob {
    const id = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    
    const job: BatchJob = {
      id,
      userId: params.userId,
      projectId: params.projectId,
      templateId: params.templateId,
      name: params.name,
      status: 'pending',
      totalJobs: params.operations.length,
      completedJobs: 0,
      failedJobs: 0,
      progress: 0,
      operations: params.operations,
      priority: params.priority || 0,
      createdAt: new Date().toISOString(),
    };

    this.db.run(
      `INSERT INTO batch_jobs (
        id, user_id, project_id, template_id, name, operations, total_jobs, priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [job.id, job.userId, job.projectId, job.templateId, job.name, 
       JSON.stringify(job.operations), job.totalJobs, job.priority, job.createdAt]
    );

    // Create individual render job records
    const insertRenderJob = this.db.prepare(
      `INSERT INTO batch_render_jobs (id, batch_job_id, operation_index, variables)
       VALUES (?, ?, ?, ?)`
    );

    for (let i = 0; i < params.operations.length; i++) {
      const renderJobId = `brj_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 9)}`;
      insertRenderJob.run(
        renderJobId, 
        job.id, 
        i, 
        JSON.stringify(params.operations[i].variables)
      );
    }

    this.emit('jobCreated', job);
    return job;
  }

  createBatchFromCSV(params: {
    userId: string;
    projectId: string;
    templateId: string;
    name: string;
    csvData: Record<string, string>[];
    variableMapping: Record<string, string>;
    priority?: number;
  }): BatchJob {
    // Convert CSV rows to operations
    const operations = params.csvData.map((row, index) => {
      const variables: Record<string, unknown> = {};
      
      for (const [csvColumn, templateVar] of Object.entries(params.variableMapping)) {
        variables[templateVar] = row[csvColumn] || '';
      }

      return {
        id: `csv_${index}`,
        title: row.title || `Video ${index + 1}`,
        variables,
      };
    });

    return this.createBatchJob({
      userId: params.userId,
      projectId: params.projectId,
      templateId: params.templateId,
      name: params.name,
      operations,
      priority: params.priority,
    });
  }

  // --------------------------------------------------------------------------
  // Job Retrieval
  // --------------------------------------------------------------------------

  getBatchJob(jobId: string, userId: string): BatchJob | null {
    const row = this.db.prepare(
      `SELECT * FROM batch_jobs WHERE id = ? AND user_id = ?`
    ).get(jobId, userId) as any;

    if (!row) return null;

    return this.rowToBatchJob(row);
  }

  getBatchJobs(userId: string, options?: { status?: string; limit?: number; offset?: number }): BatchJob[] {
    let query = `SELECT * FROM batch_jobs WHERE user_id = ?`;
    const params: (string | number)[] = [userId];

    if (options?.status) {
      query += ` AND status = ?`;
      params.push(options.status);
    }

    query += ` ORDER BY created_at DESC`;

    if (options?.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
      if (options?.offset) {
        query += ` OFFSET ?`;
        params.push(options.offset);
      }
    }

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(r => this.rowToBatchJob(r));
  }

  getBatchRenderJobs(batchJobId: string): BatchRenderJob[] {
    const rows = this.db.prepare(
      `SELECT * FROM batch_render_jobs WHERE batch_job_id = ? ORDER BY operation_index`
    ).all(batchJobId) as any[];

    return rows.map(r => ({
      id: r.id,
      batchJobId: r.batch_job_id,
      renderJobId: r.render_job_id,
      operationIndex: r.operation_index,
      variables: JSON.parse(r.variables),
      status: r.status,
      errorMessage: r.error_message,
      creditsCharged: r.credits_charged,
      outputUrl: r.output_url,
    }));
  }

  // --------------------------------------------------------------------------
  // Job Control
  // --------------------------------------------------------------------------

  pauseBatchJob(jobId: string, userId: string): boolean {
    const result = this.db.run(
      `UPDATE batch_jobs 
       SET status = 'paused', updated_at = datetime('now')
       WHERE id = ? AND user_id = ? AND status = 'processing'`,
      [jobId, userId]
    );

    if (result.changes > 0) {
      this.emit('jobPaused', { jobId });
      return true;
    }
    return false;
  }

  resumeBatchJob(jobId: string, userId: string): boolean {
    const result = this.db.run(
      `UPDATE batch_jobs 
       SET status = 'pending', updated_at = datetime('now')
       WHERE id = ? AND user_id = ? AND status = 'paused'`,
      [jobId, userId]
    );

    if (result.changes > 0) {
      this.emit('jobResumed', { jobId });
      return true;
    }
    return false;
  }

  cancelBatchJob(jobId: string, userId: string): boolean {
    const result = this.db.run(
      `UPDATE batch_jobs 
       SET status = 'cancelled', completed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND user_id = ? AND status IN ('pending', 'processing', 'paused')`,
      [jobId, userId]
    );

    if (result.changes > 0) {
      // Cancel any pending render jobs
      this.db.run(
        `UPDATE batch_render_jobs 
         SET status = 'cancelled', completed_at = datetime('now')
         WHERE batch_job_id = ? AND status IN ('pending', 'queued', 'processing')`,
        [jobId]
      );

      this.emit('jobCancelled', { jobId });
      return true;
    }
    return false;
  }

  deleteBatchJob(jobId: string, userId: string): boolean {
    // This will cascade delete batch_render_jobs
    const result = this.db.run(
      `DELETE FROM batch_jobs WHERE id = ? AND user_id = ?`,
      [jobId, userId]
    );

    return result.changes > 0;
  }

  // --------------------------------------------------------------------------
  // Processing Loop
  // --------------------------------------------------------------------------

  private startProcessingLoop(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processPendingJobs();
    }, 5000); // Check every 5 seconds
  }

  stopProcessingLoop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private async processPendingJobs(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Get pending jobs ordered by priority and creation date
      const pendingJobs = this.db.prepare(
        `SELECT * FROM batch_jobs 
         WHERE status IN ('pending', 'processing')
         ORDER BY priority DESC, created_at ASC
         LIMIT 5`
      ).all() as any[];

      for (const row of pendingJobs) {
        await this.processBatchJob(row);
      }
    } catch (error) {
      console.error('Error in batch job processing loop:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBatchJob(jobRow: any): Promise<void> {
    const jobId = jobRow.id;

    // Mark as processing if pending
    if (jobRow.status === 'pending') {
      this.db.run(
        `UPDATE batch_jobs 
         SET status = 'processing', started_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`,
        [jobId]
      );
    }

    // Get pending render jobs for this batch
    const pendingRenderJobs = this.db.prepare(
      `SELECT * FROM batch_render_jobs 
       WHERE batch_job_id = ? AND status = 'pending'
       ORDER BY operation_index
       LIMIT 5`
    ).all(jobId) as any[];

    if (pendingRenderJobs.length === 0) {
      // Check if all jobs are done
      const stats = this.db.prepare(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
         FROM batch_render_jobs WHERE batch_job_id = ?`
      ).get(jobId) as any;

      if (stats.total === stats.completed + stats.failed) {
        const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 100;
        
        this.db.run(
          `UPDATE batch_jobs 
           SET status = 'completed', completed_jobs = ?, failed_jobs = ?, 
               progress = ?, completed_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`,
          [stats.completed, stats.failed, progress, jobId]
        );

        this.emit('jobCompleted', { jobId, completed: stats.completed, failed: stats.failed });
      }
      return;
    }

    // Process each pending render job
    for (const renderJob of pendingRenderJobs) {
      await this.processRenderJob(renderJob, jobRow);
    }

    // Update progress
    const progressStats = this.db.prepare(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM batch_render_jobs WHERE batch_job_id = ?`
    ).get(jobId) as any;

    const progress = progressStats.total > 0 
      ? Math.round(((progressStats.completed + progressStats.failed) / progressStats.total) * 100) 
      : 0;

    this.db.run(
      `UPDATE batch_jobs 
       SET completed_jobs = ?, failed_jobs = ?, progress = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [progressStats.completed, progressStats.failed, progress, jobId]
    );

    this.emit('jobProgress', { jobId, progress, completed: progressStats.completed, failed: progressStats.failed });
  }

  private async processRenderJob(renderJob: any, batchJob: any): Promise<void> {
    try {
      // Mark as queued
      this.db.run(
        `UPDATE batch_render_jobs SET status = 'queued' WHERE id = ?`,
        [renderJob.id]
      );

      // Emit render request event - actual render job creation is handled by the main render service
      this.emit('renderRequest', {
        batchRenderJobId: renderJob.id,
        batchJobId: batchJob.id,
        projectId: batchJob.project_id,
        templateId: batchJob.template_id,
        variables: JSON.parse(renderJob.variables),
        userId: batchJob.user_id,
      });

    } catch (error: any) {
      this.db.run(
        `UPDATE batch_render_jobs 
         SET status = 'failed', error_message = ?, completed_at = datetime('now')
         WHERE id = ?`,
        [error.message || 'Unknown error', renderJob.id]
      );
    }
  }

  // --------------------------------------------------------------------------
  // Render Job Updates
  // --------------------------------------------------------------------------

  updateRenderJobStatus(params: {
    batchRenderJobId: string;
    renderJobId: string;
    status: string;
    errorMessage?: string;
    creditsCharged?: number;
    outputUrl?: string;
  }): void {
    this.db.run(
      `UPDATE batch_render_jobs 
       SET render_job_id = ?, status = ?, error_message = ?, 
           credits_charged = ?, output_url = ?, completed_at = datetime('now')
       WHERE id = ?`,
      [params.renderJobId, params.status, params.errorMessage || null, 
       params.creditsCharged || null, params.outputUrl || null, params.batchRenderJobId]
    );
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  getBatchStats(userId: string): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    totalVideos: number;
  } {
    const stats = this.db.prepare(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(total_jobs) as total_videos
       FROM batch_jobs WHERE user_id = ?`
    ).get(userId) as any;

    return {
      total: stats.total || 0,
      pending: stats.pending || 0,
      processing: stats.processing || 0,
      completed: stats.completed || 0,
      failed: stats.failed || 0,
      totalVideos: stats.total_videos || 0,
    };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private rowToBatchJob(row: any): BatchJob {
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      templateId: row.template_id,
      name: row.name,
      status: row.status,
      totalJobs: row.total_jobs,
      completedJobs: row.completed_jobs,
      failedJobs: row.failed_jobs,
      progress: row.progress,
      operations: JSON.parse(row.operations || '[]'),
      results: row.results ? JSON.parse(row.results) : undefined,
      priority: row.priority,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      estimatedCompletionAt: row.estimated_completion_at,
      createdAt: row.created_at,
    };
  }
}

// ============================================================================
// Route Handlers
// ============================================================================

export default async function batchJobRoutes(fastify: FastifyInstance, opts: any) {
  const service = new BatchJobService(process.env.QUEUE_DB_PATH || './data/queue.db');

  // Pass render requests to the main queue service
  service.on('renderRequest', (data) => {
    // This will be handled by the main application
    fastify.log.info({ batchRender: data }, 'Batch render request');
  });

  // --------------------------------------------------------------------------
  // POST /batch-jobs - Create a new batch job
  // --------------------------------------------------------------------------
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const validation = CreateBatchJobSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Invalid request', details: validation.error.errors });
    }

    const { project_id, template_id, name, operations, priority } = validation.data;

    const job = service.createBatchJob({
      userId,
      projectId: project_id,
      templateId: template_id,
      name,
      operations,
      priority,
    });

    return reply.status(201).send({ batch_job: job });
  });

  // --------------------------------------------------------------------------
  // POST /batch-jobs/from-csv - Create batch from CSV data
  // --------------------------------------------------------------------------
  fastify.post('/from-csv', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const validation = CreateBatchFromCSVSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Invalid request', details: validation.error.errors });
    }

    const { project_id, template_id, name, csv_data, variable_mapping, priority } = validation.data;

    const job = service.createBatchFromCSV({
      userId,
      projectId: project_id,
      templateId: template_id,
      name,
      csvData: csv_data,
      variableMapping: variable_mapping,
      priority,
    });

    return reply.status(201).send({ batch_job: job });
  });

  // --------------------------------------------------------------------------
  // GET /batch-jobs - List batch jobs
  // --------------------------------------------------------------------------
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { status, limit, offset } = request.query as any;

    const jobs = service.getBatchJobs(userId, {
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    const stats = service.getBatchStats(userId);

    return { batch_jobs: jobs, stats };
  });

  // --------------------------------------------------------------------------
  // GET /batch-jobs/:id - Get batch job details
  // --------------------------------------------------------------------------
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = request.params as any;
    const job = service.getBatchJob(id, userId);

    if (!job) {
      return reply.status(404).send({ error: 'Batch job not found' });
    }

    const renderJobs = service.getBatchRenderJobs(id);

    return { batch_job: job, render_jobs: renderJobs };
  });

  // --------------------------------------------------------------------------
  // POST /batch-jobs/:id/pause - Pause batch job
  // --------------------------------------------------------------------------
  fastify.post('/:id/pause', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = request.params as any;
    const success = service.pauseBatchJob(id, userId);

    if (!success) {
      return reply.status(400).send({ error: 'Cannot pause batch job' });
    }

    return { success: true };
  });

  // --------------------------------------------------------------------------
  // POST /batch-jobs/:id/resume - Resume batch job
  // --------------------------------------------------------------------------
  fastify.post('/:id/resume', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = request.params as any;
    const success = service.resumeBatchJob(id, userId);

    if (!success) {
      return reply.status(400).send({ error: 'Cannot resume batch job' });
    }

    return { success: true };
  });

  // --------------------------------------------------------------------------
  // POST /batch-jobs/:id/cancel - Cancel batch job
  // --------------------------------------------------------------------------
  fastify.post('/:id/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = request.params as any;
    const success = service.cancelBatchJob(id, userId);

    if (!success) {
      return reply.status(400).send({ error: 'Cannot cancel batch job' });
    }

    return { success: true };
  });

  // --------------------------------------------------------------------------
  // DELETE /batch-jobs/:id - Delete batch job
  // --------------------------------------------------------------------------
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = request.params as any;
    const success = service.deleteBatchJob(id, userId);

    if (!success) {
      return reply.status(404).send({ error: 'Batch job not found' });
    }

    return reply.status(204).send();
  });

  // --------------------------------------------------------------------------
  // GET /batch-jobs/stats - Get batch statistics
  // --------------------------------------------------------------------------
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const stats = service.getBatchStats(userId);
    return { stats };
  });
}

export { BatchJobService };
