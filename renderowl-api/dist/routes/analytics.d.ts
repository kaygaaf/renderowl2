import { FastifyInstance } from 'fastify';
interface AnalyticsEvent {
    id: string;
    userId: string;
    projectId?: string;
    eventType: string;
    eventData: Record<string, unknown>;
    createdAt: string;
}
interface DailyStats {
    date: string;
    rendersTotal: number;
    rendersCompleted: number;
    rendersFailed: number;
    rendersCancelled: number;
    totalDurationSeconds: number;
    totalFramesRendered: number;
    creditsUsed: number;
    storageBytesUsed: number;
}
interface RenderStats {
    totalRenders: number;
    completedRenders: number;
    failedRenders: number;
    cancelledRenders: number;
    completionRate: number;
    averageRenderDuration: number;
    totalFramesRendered: number;
    totalCreditsUsed: number;
}
interface TimeSeriesPoint {
    timestamp: string;
    value: number;
    label?: string;
}
interface Notification {
    id: string;
    userId: string;
    type: 'render_complete' | 'render_failed' | 'credit_low' | 'system' | 'batch_complete';
    title: string;
    message: string;
    data?: Record<string, unknown>;
    read: boolean;
    createdAt: string;
    readAt?: string;
}
export declare class AnalyticsService {
    private db;
    constructor(dbPath: string);
    trackEvent(params: {
        userId: string;
        projectId?: string;
        eventType: string;
        eventData?: Record<string, unknown>;
    }): AnalyticsEvent;
    updateDailyStats(params: {
        userId: string;
        date: string;
        rendersTotal?: number;
        rendersCompleted?: number;
        rendersFailed?: number;
        rendersCancelled?: number;
        durationSeconds?: number;
        framesRendered?: number;
        creditsUsed?: number;
        storageBytes?: number;
    }): void;
    getRenderStats(userId: string, projectId?: string, fromDate?: string, toDate?: string): RenderStats;
    getDailyStats(userId: string, days?: number): DailyStats[];
    getTimeSeriesData(userId: string, metric: 'renders' | 'credits' | 'frames' | 'duration', days?: number, projectId?: string): TimeSeriesPoint[];
    getProjectComparison(userId: string): Array<{
        projectId: string;
        projectName: string;
        renderCount: number;
        successRate: number;
        totalCredits: number;
    }>;
    createNotification(params: {
        userId: string;
        type: Notification['type'];
        title: string;
        message: string;
        data?: Record<string, unknown>;
    }): Notification;
    getNotifications(userId: string, options?: {
        unreadOnly?: boolean;
        limit?: number;
    }): Notification[];
    markAsRead(notificationId: string, userId: string): boolean;
    markAllAsRead(userId: string): number;
    deleteNotification(notificationId: string, userId: string): boolean;
    getUnreadCount(userId: string): number;
    trackBatchProgress(batchId: string, userId: string, totalJobs: number, completedJobs: number, failedJobs: number): void;
}
export default function analyticsRoutes(fastify: FastifyInstance, opts: any): Promise<void>;
export {};
//# sourceMappingURL=analytics.d.ts.map