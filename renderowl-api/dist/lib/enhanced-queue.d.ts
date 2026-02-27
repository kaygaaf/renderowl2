import { EventEmitter } from 'events';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'dead_letter' | 'scheduled';
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';
export interface JobMetrics {
    waitTime: number;
    processingTime: number;
    totalTime: number;
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
export declare class EnhancedJobQueue extends EventEmitter {
    private db;
    private workerConfig;
    private workerId;
    private pollingInterval;
    private stalledCheckInterval;
    private statsInterval;
    private isRunning;
    private handlers;
    private processingJobs;
    private statementCache;
    get retryConfig(): WorkerConfig;
    constructor(dbPath: string, workerConfig?: Partial<WorkerConfig>);
    enqueue<T>(queue: string, type: string, payload: T, options?: JobOptions): Promise<Job<T>>;
    enqueueBatch<T>(queue: string, type: string, payloads: T[], options?: JobOptions): Promise<Job<T>[]>;
    registerHandler(type: string, handler: (job: Job, step: JobStep) => Promise<void>): void;
    start(pollIntervalMs?: number): Promise<void>;
    stop(): Promise<void>;
    private poll;
    private claimNextJob;
    private processJob;
    private completeJob;
    private handleJobError;
    private calculateRetryDelay;
    private recoverFromCrash;
    private recoverStalledJobs;
    private moveToDeadLetter;
    private updateStats;
    getQueueStats(queue: string): QueueStats;
    getAllStats(): Record<string, QueueStats>;
    private getStatement;
    private updateJobSteps;
    private updateJobMetrics;
    private recordMetricsHistory;
    getJob(id: string): Job | null;
    getJobByIdempotencyKey(key: string): Job | null;
    private hydrateJob;
    cancelJob(id: string): boolean;
    retryDeadLetter(dlqId: string): Promise<Job | null>;
    getDeadLetterJobs(queue?: string, limit?: number): any[];
    getStalledJobsCount(): number;
    updateStepState<T>(jobId: string, key: string, value: T): void;
    getStepState<T>(jobId: string, key: string): T | undefined;
    close(): void;
}
export default EnhancedJobQueue;
//# sourceMappingURL=enhanced-queue.d.ts.map