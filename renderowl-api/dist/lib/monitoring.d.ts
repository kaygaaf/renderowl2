import { FastifyInstance } from 'fastify';
import { EventEmitter } from 'events';
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    service: string;
    host: string;
    traceId?: string;
    spanId?: string;
    userId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
}
export interface MetricValue {
    name: string;
    value: number;
    timestamp: number;
    tags?: Record<string, string>;
    type: 'counter' | 'gauge' | 'histogram' | 'timer';
}
export interface HealthCheck {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    lastChecked: number;
    message?: string;
    metadata?: Record<string, unknown>;
}
export declare class StructuredLogger extends EventEmitter {
    private serviceName;
    private hostName;
    private minLevel;
    private levels;
    constructor(serviceName?: string, minLevel?: LogLevel);
    private shouldLog;
    private log;
    trace(message: string, metadata?: Record<string, unknown>): void;
    debug(message: string, metadata?: Record<string, unknown>): void;
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
    fatal(message: string, metadata?: Record<string, unknown>): void;
    child(metadata: Record<string, unknown>): StructuredLogger;
}
export declare class MetricsCollector extends EventEmitter {
    private metrics;
    private maxSize;
    private aggregations;
    constructor(maxSize?: number);
    counter(name: string, value?: number, tags?: Record<string, string>): void;
    gauge(name: string, value: number, tags?: Record<string, string>): void;
    histogram(name: string, value: number, tags?: Record<string, string>): void;
    timer(name: string, fn: () => void, tags?: Record<string, string>): number;
    timerAsync<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T>;
    private record;
    getMetrics(name?: string, tags?: Record<string, string>, timeWindowMs?: number): MetricValue[];
    getAggregations(name?: string): Array<{
        name: string;
        tags?: Record<string, string>;
        avg: number;
        min: number;
        max: number;
        count: number;
    }>;
    getStats(): {
        totalMetrics: number;
        uniqueNames: number;
        timeRange: {
            start: number;
            end: number;
        };
    };
    clear(): void;
}
export type HealthCheckFn = () => Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
    metadata?: Record<string, unknown>;
}>;
export declare class HealthMonitor extends EventEmitter {
    private checks;
    private results;
    private checkInterval;
    register(name: string, checkFn: HealthCheckFn): void;
    unregister(name: string): boolean;
    runCheck(name: string): Promise<HealthCheck>;
    runAllChecks(): Promise<HealthCheck[]>;
    start(intervalMs?: number): void;
    stop(): void;
    getOverallStatus(): 'healthy' | 'degraded' | 'unhealthy';
    getResults(): HealthCheck[];
    getResult(name: string): HealthCheck | undefined;
}
export interface TraceContext {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    sampled: boolean;
}
export declare class Tracer extends EventEmitter {
    private spans;
    startSpan(name: string, parentContext?: TraceContext, metadata?: Record<string, unknown>): TraceSpan;
    endSpan(spanId: string, status?: 'ok' | 'error', errorMessage?: string): void;
    addTag(spanId: string, key: string, value: string): void;
    getSpan(spanId: string): TraceSpan | undefined;
    getTrace(traceId: string): TraceSpan[];
    private generateId;
}
export interface TraceSpan {
    id: string;
    traceId: string;
    parentId?: string;
    name: string;
    startTime: number;
    endTime: number | null;
    status: 'ok' | 'error';
    metadata: Record<string, unknown>;
    tags: Record<string, string>;
}
declare module 'fastify' {
    interface FastifyInstance {
        logger: StructuredLogger;
        metrics: MetricsCollector;
        health: HealthMonitor;
        tracer: Tracer;
    }
    interface FastifyRequest {
        traceContext?: TraceContext;
        spanId?: string;
    }
}
export interface MonitoringOptions {
    serviceName?: string;
    logLevel?: LogLevel;
    enableTracing?: boolean;
    enableMetrics?: boolean;
    enableHealthChecks?: boolean;
}
export declare function monitoringPlugin(fastify: FastifyInstance, options?: MonitoringOptions): Promise<void>;
export default monitoringPlugin;
//# sourceMappingURL=monitoring.d.ts.map