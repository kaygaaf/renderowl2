/**
 * Queue Manager — BullMQ-based Job Queue
 * 
 * Phase 2: Credit Deduction + Automation Features
 * 
 * Features:
 * - Priority-based job scheduling
 * - Automatic retry with backoff
 * - Dead letter queue for failed jobs
 * - Progress tracking and events
 * - Credit refund on permanent failure
 */

import {Queue, Worker, Job, QueueEvents, FlowProducer} from 'bullmq';
import IORedis from 'ioredis';
import {v4 as uuidv4} from 'uuid';
import {
  RenderJob,
  JobStatus,
  SubmitRender,
  Automation,
  AutomationRun,
} from '../platform-contract';
import {CreditService} from './credit';

// ============================================================================
// Configuration
// ============================================================================

export interface QueueManagerConfig {
  redis: IORedis;
  creditService: CreditService;
  webhookUrl?: string; // For sending job status updates
}

export const QUEUE_NAMES = {
  RENDER: 'render-jobs',
  AUTOMATION: 'automation-jobs',
  YOUTUBE_UPLOAD: 'youtube-uploads',
  WEBHOOK_DELIVERY: 'webhook-delivery',
  DEAD_LETTER: 'dead-letter',
} as const;

export const JOB_ATTEMPTS = {
  RENDER: 3,
  AUTOMATION: 3,
  YOUTUBE_UPLOAD: 5,
  WEBHOOK: 5,
} as const;

export const JOB_BACKOFF = {
  type: 'exponential' as const,
  delay: 5000, // 5 seconds initial delay
};

// ============================================================================
// Job Data Types
// ============================================================================

export interface RenderJobData {
  jobId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  input: SubmitRender['input'];
  engine: SubmitRender['engine'];
  webhook?: SubmitRender['webhook'];
  priority: number;
  creditTransactionId?: string;
  creditsDeducted: number;
}

export interface AutomationJobData {
  automationId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  triggerData: Record<string, unknown>;
  runId: string;
}

export interface YouTubeUploadJobData {
  videoJobId: string;
  scheduledJobId?: string;
  userId: string;
  organizationId: string;
  title: string;
  description?: string;
  tags?: string[];
  privacyStatus: 'private' | 'unlisted' | 'public';
  playlistId?: string;
  credentials: Record<string, unknown>; // OAuth tokens
}

export interface WebhookDeliveryJobData {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  url: string;
  secret?: string;
  attempt: number;
  maxAttempts: number;
}

// ============================================================================
// Queue Manager
// ============================================================================

export class QueueManager {
  public readonly renderQueue: Queue<RenderJobData>;
  public readonly automationQueue: Queue<AutomationJobData>;
  public readonly youtubeQueue: Queue<YouTubeUploadJobData>;
  public readonly webhookQueue: Queue<WebhookDeliveryJobData>;
  public readonly deadLetterQueue: Queue;
  
  public readonly flowProducer: FlowProducer;
  
  private workers: Worker[] = [];

  constructor(private readonly config: QueueManagerConfig) {
    const {redis} = config;

    // Initialize queues
    this.renderQueue = new Queue<RenderJobData>(QUEUE_NAMES.RENDER, {
      connection: redis,
      defaultJobOptions: {
        attempts: JOB_ATTEMPTS.RENDER,
        backoff: JOB_BACKOFF,
        removeOnComplete: {count: 100},
        removeOnFail: {count: 100},
      },
    });

    this.automationQueue = new Queue<AutomationJobData>(QUEUE_NAMES.AUTOMATION, {
      connection: redis,
      defaultJobOptions: {
        attempts: JOB_ATTEMPTS.AUTOMATION,
        backoff: JOB_BACKOFF,
        removeOnComplete: {count: 100},
        removeOnFail: {count: 100},
      },
    });

    this.youtubeQueue = new Queue<YouTubeUploadJobData>(QUEUE_NAMES.YOUTUBE_UPLOAD, {
      connection: redis,
      defaultJobOptions: {
        attempts: JOB_ATTEMPTS.YOUTUBE_UPLOAD,
        backoff: JOB_BACKOFF,
        removeOnComplete: {count: 100},
        removeOnFail: {count: 100},
      },
    });

    this.webhookQueue = new Queue<WebhookDeliveryJobData>(QUEUE_NAMES.WEBHOOK_DELIVERY, {
      connection: redis,
      defaultJobOptions: {
        attempts: JOB_ATTEMPTS.WEBHOOK,
        backoff: JOB_BACKOFF,
        removeOnComplete: {count: 500},
        removeOnFail: {count: 500},
      },
    });

    this.deadLetterQueue = new Queue(QUEUE_NAMES.DEAD_LETTER, {
      connection: redis,
    });

    this.flowProducer = new FlowProducer({connection: redis});
  }

  /**
   * Submit a render job to the queue with atomic credit deduction.
   * 
   * This is the PRIMARY entry point for render job submission.
   * It guarantees:
   * 1. Credits are deducted atomically before job is queued
   * 2. If credit deduction fails, no job is queued
   * 3. Job ID is returned immediately for tracking
   * 
   * @throws InsufficientCreditsError if user lacks credits
   * @throws CreditOperationError for credit system errors
   */
  async submitRenderJob(params: {
    projectId: string;
    organizationId: string;
    userId: string;
    submitData: SubmitRender;
    creditsRequired: number;
  }): Promise<{jobId: string; status: JobStatus; queueJobId: string}> {
    const {projectId, organizationId, userId, submitData, creditsRequired} = params;

    const jobId = `rnd_${uuidv4().replace(/-/g, '')}`;

    // Step 1: ATOMIC CREDIT DEDUCTION
    // This ensures credits are deducted BEFORE job is queued
    const creditResult = await this.config.creditService.deductCredits({
      userId,
      organizationId,
      amount: creditsRequired,
      jobId,
      jobType: 'render',
      description: `Render job ${jobId} for project ${projectId}`,
    });

    if (!creditResult.success) {
      // Credit deduction failed - don't queue job
      throw new Error(creditResult.error?.message || 'Credit deduction failed');
    }

    // Step 2: Queue the job (now guaranteed to have credits)
    const jobData: RenderJobData = {
      jobId,
      projectId,
      organizationId,
      userId,
      input: submitData.input,
      engine: submitData.engine || 'remotion',
      webhook: submitData.webhook,
      priority: submitData.priority || 5,
      creditTransactionId: creditResult.transactionId,
      creditsDeducted: creditsRequired,
    };

    const queueJob = await this.renderQueue.add(jobId, jobData, {
      priority: submitData.priority || 5,
      jobId, // Use same ID for consistency
    });

    return {
      jobId,
      status: 'queued',
      queueJobId: queueJob.id as string,
    };
  }

  /**
   * Cancel a queued job and refund credits if applicable.
   * 
   * Only jobs in 'queued' or 'pending' state can be cancelled.
   * Processing jobs cannot be cancelled (but can be marked for cancellation).
   */
  async cancelRenderJob(jobId: string): Promise<{success: boolean; refunded: number}> {
    const job = await this.renderQueue.getJob(jobId);
    
    if (!job) {
      return {success: false, refunded: 0};
    }

    const state = await job.getState();
    
    // Can only cancel waiting/delayed jobs
    if (state !== 'waiting' && state !== 'delayed') {
      return {success: false, refunded: 0};
    }

    const jobData = job.data as RenderJobData;
    
    // Remove from queue
    await job.remove();

    // Refund credits
    if (jobData.creditTransactionId) {
      await this.config.creditService.refundCredits({
        originalTransactionId: jobData.creditTransactionId,
        reason: 'job_cancelled',
        description: `Job ${jobId} cancelled by user`,
      });
    }

    return {success: true, refunded: jobData.creditsDeducted};
  }

  /**
   * Schedule an automation to run on a cron schedule.
   */
  async scheduleAutomation(params: {
    automation: Automation;
    userId: string;
  }): Promise<{jobId: string; nextRun: Date}> {
    const {automation, userId} = params;

    if (automation.trigger.type !== 'schedule') {
      throw new Error('Automation trigger is not a schedule');
    }

    const jobId = `atm_${automation.id}`;
    const runId = `run_${uuidv4().replace(/-/g, '')}`;

    const jobData: AutomationJobData = {
      automationId: automation.id,
      projectId: automation.projectId,
      organizationId: automation.organizationId || '', // Add to schema if missing
      userId,
      triggerData: {},
      runId,
    };

    const repeatOpts = {
      pattern: automation.trigger.cron,
      tz: automation.trigger.timezone || 'UTC',
    };

    const job = await this.automationQueue.add(jobId, jobData, {
      repeat: repeatOpts,
      jobId,
    });

    // Calculate next run time
    const nextRun = await job?.getDelay();

    return {
      jobId,
      nextRun: nextRun ? new Date(Date.now() + nextRun) : new Date(),
    };
  }

  /**
   * Remove a scheduled automation.
   */
  async unscheduleAutomation(automationId: string): Promise<void> {
    const jobId = `atm_${automationId}`;
    const job = await this.automationQueue.getJob(jobId);
    
    if (job) {
      await job.remove();
    }

    // Also remove repeatable job
    const repeatables = await this.automationQueue.getRepeatableJobs();
    const repeatable = repeatables.find((r) => r.id === jobId);
    
    if (repeatable) {
      await this.automationQueue.removeRepeatableByKey(repeatable.key);
    }
  }

  /**
   * Queue a YouTube upload task.
   * 
   * This is called after successful video generation.
   */
  async queueYouTubeUpload(params: {
    videoJobId: string;
    userId: string;
    organizationId: string;
    config: YouTubeUploadJobData;
  }): Promise<{taskId: string}> {
    const {videoJobId, userId, organizationId, config} = params;

    const taskId = `yt_${uuidv4().replace(/-/g, '')}`;

    const jobData: YouTubeUploadJobData = {
      ...config,
      videoJobId,
      userId,
      organizationId,
    };

    await this.youtubeQueue.add(taskId, jobData, {
      jobId: taskId,
      delay: 5000, // Small delay to ensure video is fully processed
    });

    return {taskId};
  }

  /**
   * Queue a webhook delivery.
   */
  async queueWebhookDelivery(params: {
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
    url: string;
    secret?: string;
  }): Promise<void> {
    const jobData: WebhookDeliveryJobData = {
      ...params,
      attempt: 0,
      maxAttempts: JOB_ATTEMPTS.WEBHOOK,
    };

    await this.webhookQueue.add(`wh_${params.eventId}`, jobData);
  }

  /**
   * Get queue statistics for monitoring.
   */
  async getQueueStats(): Promise<{
    render: {waiting: number; active: number; completed: number; failed: number};
    automation: {waiting: number; active: number; completed: number; failed: number};
    youtube: {waiting: number; active: number; completed: number; failed: number};
    webhook: {waiting: number; active: number; completed: number; failed: number};
  }> {
    const [render, automation, youtube, webhook] = await Promise.all([
      this.getSingleQueueStats(this.renderQueue),
      this.getSingleQueueStats(this.automationQueue),
      this.getSingleQueueStats(this.youtubeQueue),
      this.getSingleQueueStats(this.webhookQueue),
    ]);

    return {render, automation, youtube, webhook};
  }

  private async getSingleQueueStats(queue: Queue): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return {waiting, active, completed, failed};
  }

  /**
   * Gracefully close all queues and workers.
   */
  async close(): Promise<void> {
    await Promise.all([
      this.renderQueue.close(),
      this.automationQueue.close(),
      this.youtubeQueue.close(),
      this.webhookQueue.close(),
      this.deadLetterQueue.close(),
      this.flowProducer.close(),
    ]);

    // Close all workers
    await Promise.all(this.workers.map((w) => w.close()));
  }
}

// ============================================================================
// Worker Setup
// ============================================================================

export interface WorkerHandlers {
  onRenderJob: (job: Job<RenderJobData>) => Promise<void>;
  onAutomationJob: (job: Job<AutomationJobData>) => Promise<void>;
  onYouTubeUpload: (job: Job<YouTubeUploadJobData>) => Promise<void>;
  onWebhookDelivery: (job: Job<WebhookDeliveryJobData>) => Promise<void>;
}

/**
 * Create and start workers for processing jobs.
 */
export function createWorkers(
  queueManager: QueueManager,
  redis: IORedis,
  handlers: WorkerHandlers,
  creditService: CreditService
): Worker[] {
  const workers: Worker[] = [];

  // Render job worker
  const renderWorker = new Worker<RenderJobData>(
    QUEUE_NAMES.RENDER,
    async (job) => {
      await handlers.onRenderJob(job);
    },
    {connection: redis, concurrency: 5}
  );

  // Handle render job failures - trigger credit refund
  renderWorker.on('failed', async (job, err) => {
    if (!job) return;

    const jobData = job.data;
    const attemptsMade = job.attemptsMade || 0;

    // Only refund on permanent failure (all retries exhausted)
    if (attemptsMade >= JOB_ATTEMPTS.RENDER - 1) {
      console.log(`[RenderWorker] Job ${jobData.jobId} failed permanently, refunding ${jobData.creditsDeducted} credits`);
      
      try {
        await creditService.refundCredits({
          originalTransactionId: jobData.creditTransactionId!,
          reason: 'job_failed',
          description: `Render job failed after ${attemptsMade + 1} attempts: ${err.message}`,
        });

        // Send to dead letter queue for analysis
        await queueManager.deadLetterQueue.add('failed-render', {
          jobId: jobData.jobId,
          error: err.message,
          stack: err.stack,
          data: jobData,
        });
      } catch (refundErr) {
        console.error(`[RenderWorker] Failed to refund credits for job ${jobData.jobId}:`, refundErr);
      }
    }
  });

  workers.push(renderWorker);

  // Automation worker
  const automationWorker = new Worker<AutomationJobData>(
    QUEUE_NAMES.AUTOMATION,
    async (job) => {
      await handlers.onAutomationJob(job);
    },
    {connection: redis, concurrency: 3}
  );

  workers.push(automationWorker);

  // YouTube upload worker
  const youtubeWorker = new Worker<YouTubeUploadJobData>(
    QUEUE_NAMES.YOUTUBE_UPLOAD,
    async (job) => {
      await handlers.onYouTubeUpload(job);
    },
    {connection: redis, concurrency: 2}
  );

  workers.push(youtubeWorker);

  // Webhook delivery worker
  const webhookWorker = new Worker<WebhookDeliveryJobData>(
    QUEUE_NAMES.WEBHOOK_DELIVERY,
    async (job) => {
      await handlers.onWebhookDelivery(job);
    },
    {connection: redis, concurrency: 10}
  );

  workers.push(webhookWorker);

  // Track workers in queue manager
  queueManager['workers'] = workers;

  return workers;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createQueueManager(config: QueueManagerConfig): QueueManager {
  return new QueueManager(config);
}
