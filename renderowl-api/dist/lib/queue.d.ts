import { EventEmitter } from 'events';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'dead_letter';
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';
export interface JobStep {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    error?: string;
    output?: unknown;
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
    scheduledAt: string;
    startedAt: string | null;
    completedAt: string | null;
    timeoutAt: string | null;
    createdAt: string;
    updatedAt: string;
    workerId: string | null;
}
export interface JobOptions {
    priority?: JobPriority;
    maxAttempts?: number;
    idempotencyKey?: string;
    delayMs?: number;
    steps?: string[];
}
export interface QueueStats {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
}
export interface RetryConfig {
    maxAttempts: number;
    backoffStrategy: 'fixed' | 'exponential';
    baseDelayMs: number;
    maxDelayMs: number;
    jobTimeoutMs: number;
    stalledCheckIntervalMs: number;
}
export declare class JobQueue extends EventEmitter {
    private db;
    private retryConfig;
    private workerId;
    private pollingInterval;
    private stalledCheckInterval;
    private isRunning;
    private handlers;
    constructor(dbPath: string, retryConfig?: Partial<RetryConfig>);
    enqueue<T>(queue: string, type: string, payload: T, options?: JobOptions): Promise<Job<T>>;
    registerHandler(type: string, handler: (job: Job, step: JobStep) => Promise<void>): void;
    start(pollIntervalMs?: number): Promise<void>;
    stop(): Promise<void>;
    private poll;
    private recoverStalledJobs;
    private claimNextJob;
    private processJob;
    private updateJobSteps;
    private completeJob;
    private handleJobError;
    private calculateRetryDelay;
    private moveToDeadLetter;
    updateStepState<T>(jobId: string, key: string, value: T): void;
    getStepState<T>(jobId: string, key: string): T | undefined;
    getJob(id: string): Job | null;
    getJobByIdempotencyKey(key: string): Job | null;
    getQueueStats(queue: string): QueueStats;
    getDeadLetterJobs(queue?: string, limit?: number): any[];
    cancelJob(id: string): boolean;
    retryDeadLetter(dlqId: string): Promise<Job | null>;
    getStalledJobsCount(): number;
    private hydrateJob;
    close(): void;
}
export default JobQueue;
//# sourceMappingURL=queue.d.ts.map