import { JobQueue, JobOptions } from './queue.js';
import { EnhancedJobQueue } from './enhanced-queue.js';
import { Automation } from '../schemas.js';
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
export declare class AutomationRunner {
    private queue;
    private executionStore;
    private cleanupInterval;
    private readonly MAX_EXECUTIONS;
    private readonly TTL_MS;
    constructor(queue: JobQueue | EnhancedJobQueue);
    private registerHandlers;
    triggerAutomation(automation: Automation, triggerData: Record<string, unknown>, options?: JobOptions): Promise<{
        executionId: string;
        jobId: string;
    }>;
    private executeAutomation;
    private executeAction;
    private queueRenderAction;
    private queueNotificationAction;
    private executeRender;
    private executeNotification;
    private interpolateTemplate;
    private interpolateString;
    private serializeAutomation;
    private deserializeAutomation;
    private simulateWork;
    getExecution(executionId: string): AutomationExecution | undefined;
    getExecutionsByAutomation(automationId: string): AutomationExecution[];
    getRecentExecutions(limit?: number): AutomationExecution[];
    private startCleanupInterval;
    private cleanupOldExecutions;
    stopCleanup(): void;
}
//# sourceMappingURL=automation-runner.d.ts.map