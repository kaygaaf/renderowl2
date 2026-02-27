import { FastifyInstance } from 'fastify';
import { EventEmitter } from 'events';
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
export declare class BatchJobService extends EventEmitter {
    private db;
    private isProcessing;
    private processingInterval;
    constructor(dbPath: string);
    createBatchJob(params: {
        userId: string;
        projectId: string;
        templateId: string;
        name: string;
        operations: Array<{
            id: string;
            title: string;
            variables: Record<string, unknown>;
        }>;
        priority?: number;
    }): BatchJob;
    createBatchFromCSV(params: {
        userId: string;
        projectId: string;
        templateId: string;
        name: string;
        csvData: Record<string, string>[];
        variableMapping: Record<string, string>;
        priority?: number;
    }): BatchJob;
    getBatchJob(jobId: string, userId: string): BatchJob | null;
    getBatchJobs(userId: string, options?: {
        status?: string;
        limit?: number;
        offset?: number;
    }): BatchJob[];
    getBatchRenderJobs(batchJobId: string): BatchRenderJob[];
    pauseBatchJob(jobId: string, userId: string): boolean;
    resumeBatchJob(jobId: string, userId: string): boolean;
    cancelBatchJob(jobId: string, userId: string): boolean;
    deleteBatchJob(jobId: string, userId: string): boolean;
    private startProcessingLoop;
    stopProcessingLoop(): void;
    private processPendingJobs;
    private processBatchJob;
    private processRenderJob;
    updateRenderJobStatus(params: {
        batchRenderJobId: string;
        renderJobId: string;
        status: string;
        errorMessage?: string;
        creditsCharged?: number;
        outputUrl?: string;
    }): void;
    getBatchStats(userId: string): {
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
        totalVideos: number;
    };
    private rowToBatchJob;
    close(): void;
}
export default function batchJobRoutes(fastify: FastifyInstance, opts: any): Promise<void>;
export {};
//# sourceMappingURL=batch-jobs.d.ts.map