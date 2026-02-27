import { FastifyInstance } from 'fastify';
import { EventEmitter } from 'events';
export interface PerformanceMetric {
    timestamp: number;
    route: string;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    requestSizeBytes?: number;
    responseSizeBytes?: number;
    cacheHit?: boolean;
    userTier?: string;
}
export interface RoutePerformance {
    route: string;
    method: string;
    requestCount: number;
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
    cacheHitRate?: number;
}
export interface SystemPerformance {
    timestamp: number;
    cpuUsage: number;
    memoryUsage: NodeJS.MemoryUsage;
    eventLoopDelay: number;
    activeRequests: number;
    totalRequests: number;
    requestsPerSecond: number;
    avgResponseTime: number;
    errorRate: number;
}
export declare class PerformanceMonitor extends EventEmitter {
    private metrics;
    private maxMetrics;
    private retentionMs;
    private cleanupInterval;
    private requestStartTimes;
    private totalRequests;
    private errorCount;
    private startTime;
    constructor(options?: {
        maxMetrics?: number;
        retentionMs?: number;
    });
    recordRequestStart(requestId: string): void;
    recordRequestEnd(requestId: string, route: string, method: string, statusCode: number, options?: {
        requestSizeBytes?: number;
        responseSizeBytes?: number;
        cacheHit?: boolean;
        userTier?: string;
    }): void;
    private getCurrentErrorRate;
    private cleanup;
    getRoutePerformance(timeWindowMs?: number): RoutePerformance[];
    getSystemPerformance(): SystemPerformance;
    getSlowestRoutes(limit?: number, timeWindowMs?: number): RoutePerformance[];
    getErrorProneRoutes(limit?: number, timeWindowMs?: number): RoutePerformance[];
    getRouteMetrics(route: string, method?: string, timeWindowMs?: number): PerformanceMetric[];
    getResponseTimeDistribution(route: string, method?: string): {
        bucket: string;
        count: number;
    }[];
    reset(): void;
    getUptime(): number;
    stop(): void;
}
export declare function performancePlugin(fastify: FastifyInstance, options: {
    maxMetrics?: number;
    retentionMs?: number;
}): Promise<void>;
export default performancePlugin;
//# sourceMappingURL=performance.d.ts.map