import { JobQueue, Job, JobOptions } from './queue.js';
import { EnhancedJobQueue } from './enhanced-queue.js';
import {
  Automation,
  AutomationAction,
  RenderActionConfig,
  NotificationActionConfig,
} from '../schemas.js';

// ============================================================================
// Types
// ============================================================================

export interface AutomationExecution {
  id: string;
  automationId: string;
  projectId: string;
  triggerType: string;
  triggerData: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  totalSteps: number;
  results: StepResult[];
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface StepResult {
  step: number;
  actionType: string;
  status: 'success' | 'failed' | 'skipped';
  output?: unknown;
  error?: string;
  durationMs: number;
}

export interface RenderJobPayload {
  type: 'render';
  projectId: string;
  renderId: string;
  compositionId: string;
  inputProps: Record<string, unknown>;
  outputSettings: {
    format: string;
    codec: string;
    width: number;
    height: number;
    fps: number;
  };
}

export interface NotificationJobPayload {
  type: 'notify';
  channel: 'email' | 'webhook' | 'slack';
  target: string;
  template?: string;
  data: Record<string, unknown>;
}

export interface AutomationJobPayload {
  type: 'automation';
  executionId: string;
  automation: Automation;
  triggerData: Record<string, unknown>;
}

// ============================================================================
// Automation Runner
// ============================================================================

interface ExecutionEntry {
  execution: AutomationExecution;
  completedAt: number; // timestamp for TTL cleanup
}

export class AutomationRunner {
  private queue: JobQueue | EnhancedJobQueue;
  private executionStore = new Map<string, ExecutionEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly MAX_EXECUTIONS = 10000; // Maximum executions to store
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hour TTL

  constructor(queue: JobQueue | EnhancedJobQueue) {
    this.queue = queue;
    this.registerHandlers();
    this.startCleanupInterval();
  }

  private registerHandlers(): void {
    // Handle automation job execution
    this.queue.registerHandler('automation', async (job) => {
      const payload = job.payload as AutomationJobPayload;
      await this.executeAutomation(payload.executionId, payload.automation, payload.triggerData);
    });

    // Handle render jobs
    this.queue.registerHandler('render', async (job) => {
      const payload = job.payload as RenderJobPayload;
      await this.executeRender(payload, job as Job);
    });

    // Handle notification jobs
    this.queue.registerHandler('notify', async (job) => {
      const payload = job.payload as NotificationJobPayload;
      await this.executeNotification(payload, job as Job);
    });
  }

  // ========================================================================
  // Automation Execution
  // ========================================================================

  async triggerAutomation(
    automation: Automation,
    triggerData: Record<string, unknown>,
    options: JobOptions = {}
  ): Promise<{ executionId: string; jobId: string }> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    
    const execution: AutomationExecution = {
      id: executionId,
      automationId: automation.id,
      projectId: automation.project_id,
      triggerType: automation.trigger.type,
      triggerData,
      status: 'running',
      currentStep: 0,
      totalSteps: automation.actions.length,
      results: [],
      startedAt: new Date().toISOString(),
    };

    this.executionStore.set(executionId, { execution, completedAt: Date.now() });

    // Create job with idempotency key if automation has unique constraints
    const idempotencyKey = options.idempotencyKey || `${automation.id}:${Date.now()}`;
    
    const job = await this.queue.enqueue(
      `automation:${automation.project_id}`,
      'automation',
      {
        type: 'automation',
        executionId,
        automation: this.serializeAutomation(automation),
        triggerData,
      },
      {
        priority: 'high',
        idempotencyKey,
        steps: ['validate', 'execute_actions', 'cleanup'],
        ...options,
      }
    );

    return { executionId, jobId: job.id };
  }

  private async executeAutomation(
    executionId: string,
    automationData: any,
    triggerData: Record<string, unknown>
  ): Promise<void> {
    const entry = this.executionStore.get(executionId);
    if (!entry) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const execution = entry.execution;
    const automation = this.deserializeAutomation(automationData);

    try {
      // Execute each action in sequence
      for (let i = 0; i < automation.actions.length; i++) {
        execution.currentStep = i + 1;
        const action = automation.actions[i];
        
        const startTime = Date.now();
        let result: StepResult;

        try {
          const output = await this.executeAction(action, execution, triggerData);
          result = {
            step: i + 1,
            actionType: action.type,
            status: 'success',
            output,
            durationMs: Date.now() - startTime,
          };
        } catch (error: any) {
          result = {
            step: i + 1,
            actionType: action.type,
            status: 'failed',
            error: error.message,
            durationMs: Date.now() - startTime,
          };
          
          execution.results.push(result);
          execution.status = 'failed';
          execution.error = error.message;
          execution.completedAt = new Date().toISOString();
          entry.completedAt = Date.now(); // Update cleanup timestamp
          throw error;
        }

        execution.results.push(result);
      }

      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();
      entry.completedAt = Date.now(); // Update cleanup timestamp
    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date().toISOString();
      entry.completedAt = Date.now(); // Update cleanup timestamp
      throw error;
    }
  }

  private async executeAction(
    action: AutomationAction,
    execution: AutomationExecution,
    triggerData: Record<string, unknown>
  ): Promise<unknown> {
    switch (action.type) {
      case 'render':
        return this.queueRenderAction(action.config as RenderActionConfig, execution, triggerData);
      
      case 'notify':
        return this.queueNotificationAction(action.config as NotificationActionConfig, execution);
      
      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  private async queueRenderAction(
    config: RenderActionConfig,
    execution: AutomationExecution,
    triggerData: Record<string, unknown>
  ): Promise<{ renderId: string; jobId: string }> {
    const renderId = `rnd_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    // Template interpolation for input props
    const inputProps = this.interpolateTemplate(
      config.input_props_template,
      triggerData
    );

    const payload: RenderJobPayload = {
      type: 'render',
      projectId: execution.projectId,
      renderId,
      compositionId: config.composition_id,
      inputProps,
      outputSettings: config.output_settings_override ? {
        format: config.output_settings_override.format ?? 'mp4',
        codec: config.output_settings_override.codec ?? 'h264',
        width: config.output_settings_override.width ?? 1080,
        height: config.output_settings_override.height ?? 1920,
        fps: config.output_settings_override.fps ?? 30,
      } : {
        format: 'mp4',
        codec: 'h264',
        width: 1080,
        height: 1920,
        fps: 30,
      },
    };

    const job = await this.queue.enqueue(
      `renders:${execution.projectId}`,
      'render',
      payload,
      {
        priority: 'normal',
        maxAttempts: 3,
        steps: ['prepare', 'render', 'upload'],
      }
    );

    return { renderId, jobId: job.id };
  }

  private async queueNotificationAction(
    config: NotificationActionConfig,
    execution: AutomationExecution
  ): Promise<{ notificationId: string; jobId: string }> {
    const notificationId = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const payload: NotificationJobPayload = {
      type: 'notify',
      channel: config.channel,
      target: config.target,
      template: config.template,
      data: {
        executionId: execution.id,
        automationId: execution.automationId,
        projectId: execution.projectId,
        results: execution.results,
      },
    };

    const job = await this.queue.enqueue(
      'notifications',
      'notify',
      payload,
      {
        priority: 'normal',
        maxAttempts: 5, // More retries for notifications
        steps: ['send'],
      }
    );

    return { notificationId, jobId: job.id };
  }

  // ========================================================================
  // Job Handlers (called by queue workers)
  // ========================================================================

  private async executeRender(payload: RenderJobPayload, job: Job): Promise<void> {
    // This would integrate with the actual render worker
    // For now, we simulate the render process with step state tracking

    const currentStep = job.steps.find(s => s.status === 'running');
    
    if (currentStep?.name === 'prepare') {
      // Validate assets, download inputs
      this.queue.updateStepState(job.id, 'prepareStarted', new Date().toISOString());
      
      // Simulate preparation
      await this.simulateWork(100);
      
      this.queue.updateStepState(job.id, 'prepareCompleted', new Date().toISOString());
      this.queue.updateStepState(job.id, 'assetsValidated', true);
    }
    
    if (currentStep?.name === 'render') {
      // Actual render work would happen here
      this.queue.updateStepState(job.id, 'renderStarted', new Date().toISOString());
      this.queue.updateStepState(job.id, 'framesTotal', 1800); // 60s @ 30fps
      this.queue.updateStepState(job.id, 'framesRendered', 0);
      
      // Simulate render progress (in real impl, this would be actual render worker)
      await this.simulateWork(500);
      
      this.queue.updateStepState(job.id, 'framesRendered', 1800);
      this.queue.updateStepState(job.id, 'renderCompleted', new Date().toISOString());
    }
    
    if (currentStep?.name === 'upload') {
      // Upload to storage
      this.queue.updateStepState(job.id, 'uploadStarted', new Date().toISOString());
      
      await this.simulateWork(200);
      
      this.queue.updateStepState(job.id, 'uploadUrl', `https://storage.renderowl.com/renders/${payload.renderId}.mp4`);
      this.queue.updateStepState(job.id, 'uploadCompleted', new Date().toISOString());
    }
  }

  private async executeNotification(payload: NotificationJobPayload, job: Job): Promise<void> {
    // This would integrate with actual notification providers
    // For now, we log and simulate

    const logEntry = {
      timestamp: new Date().toISOString(),
      channel: payload.channel,
      target: payload.target,
      template: payload.template,
      data: payload.data,
    };

    this.queue.updateStepState(job.id, 'notificationLog', logEntry);
    this.queue.updateStepState(job.id, 'sentAt', new Date().toISOString());

    // Simulate API call
    await this.simulateWork(50);

    // In real implementation:
    // - Email: Send via SendGrid/AWS SES
    // - Webhook: POST to target URL
    // - Slack: Send via Slack API
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private interpolateTemplate(
    template: Record<string, unknown>,
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(template)) {
      if (typeof value === 'string') {
        result[key] = this.interpolateString(value, data);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateTemplate(value as Record<string, unknown>, data);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private interpolateString(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = data[key];
      return value !== undefined ? String(value) : match;
    });
  }

  private serializeAutomation(automation: Automation): any {
    return JSON.parse(JSON.stringify(automation));
  }

  private deserializeAutomation(data: any): Automation {
    return data as Automation;
  }

  private simulateWork(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================================================
  // Queries
  // ========================================================================

  getExecution(executionId: string): AutomationExecution | undefined {
    const entry = this.executionStore.get(executionId);
    return entry?.execution;
  }

  getExecutionsByAutomation(automationId: string): AutomationExecution[] {
    return Array.from(this.executionStore.values())
      .filter(e => e.execution.automationId === automationId)
      .map(e => e.execution)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  getRecentExecutions(limit = 50): AutomationExecution[] {
    return Array.from(this.executionStore.values())
      .map(e => e.execution)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }

  // ========================================================================
  // Cleanup
  // ========================================================================

  private startCleanupInterval(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldExecutions();
    }, 60 * 60 * 1000);
  }

  private cleanupOldExecutions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, entry] of this.executionStore) {
      // Remove entries older than TTL
      if (now - entry.completedAt > this.TTL_MS) {
        this.executionStore.delete(id);
        cleaned++;
      }
    }

    // If still over max, remove oldest
    if (this.executionStore.size > this.MAX_EXECUTIONS) {
      const sorted = Array.from(this.executionStore.entries())
        .sort((a, b) => a[1].completedAt - b[1].completedAt);
      
      const toRemove = sorted.slice(0, this.executionStore.size - this.MAX_EXECUTIONS);
      for (const [id] of toRemove) {
        this.executionStore.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[AutomationRunner] Cleaned up ${cleaned} old executions`);
    }
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
