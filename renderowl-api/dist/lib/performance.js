import { EventEmitter } from 'events';
// ============================================================================
// Performance Monitor
// ============================================================================
export class PerformanceMonitor extends EventEmitter {
    metrics = [];
    maxMetrics = 10000;
    retentionMs = 24 * 60 * 60 * 1000; // 24 hours
    cleanupInterval = null;
    requestStartTimes = new Map();
    totalRequests = 0;
    errorCount = 0;
    startTime = Date.now();
    constructor(options = {}) {
        super();
        this.maxMetrics = options.maxMetrics || this.maxMetrics;
        this.retentionMs = options.retentionMs || this.retentionMs;
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000); // Hourly
    }
    // Record the start of a request
    recordRequestStart(requestId) {
        this.requestStartTimes.set(requestId, performance.now());
    }
    // Record request completion
    recordRequestEnd(requestId, route, method, statusCode, options = {}) {
        const startTime = this.requestStartTimes.get(requestId);
        this.requestStartTimes.delete(requestId);
        if (!startTime)
            return;
        const responseTimeMs = Math.round(performance.now() - startTime);
        const metric = {
            timestamp: Date.now(),
            route,
            method,
            statusCode,
            responseTimeMs,
            ...options,
        };
        this.metrics.push(metric);
        this.totalRequests++;
        if (statusCode >= 400) {
            this.errorCount++;
        }
        // Emit slow request warning
        if (responseTimeMs > 1000) {
            this.emit('slow-request', {
                route,
                method,
                responseTimeMs,
                statusCode,
            });
        }
        // Emit high error rate warning
        const errorRate = this.getCurrentErrorRate();
        if (errorRate > 0.1) { // 10% error rate
            this.emit('high-error-rate', { errorRate, window: '1m' });
        }
        // Trim metrics if needed
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }
    }
    // Get current error rate (last 1 minute)
    getCurrentErrorRate() {
        const oneMinuteAgo = Date.now() - 60 * 1000;
        const recentMetrics = this.metrics.filter(m => m.timestamp > oneMinuteAgo);
        if (recentMetrics.length === 0)
            return 0;
        const errors = recentMetrics.filter(m => m.statusCode >= 400).length;
        return errors / recentMetrics.length;
    }
    // Cleanup old metrics
    cleanup() {
        const cutoff = Date.now() - this.retentionMs;
        this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    }
    // Get performance summary for all routes
    getRoutePerformance(timeWindowMs = 5 * 60 * 1000) {
        const cutoff = Date.now() - timeWindowMs;
        const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
        const routeGroups = new Map();
        for (const metric of recentMetrics) {
            const key = `${metric.method} ${metric.route}`;
            if (!routeGroups.has(key)) {
                routeGroups.set(key, []);
            }
            routeGroups.get(key).push(metric);
        }
        const results = [];
        for (const [key, metrics] of routeGroups) {
            const [method, ...routeParts] = key.split(' ');
            const route = routeParts.join(' ');
            const responseTimes = metrics.map(m => m.responseTimeMs).sort((a, b) => a - b);
            const errors = metrics.filter(m => m.statusCode >= 400).length;
            const cacheHits = metrics.filter(m => m.cacheHit).length;
            const sum = responseTimes.reduce((a, b) => a + b, 0);
            const avg = sum / responseTimes.length;
            results.push({
                route,
                method,
                requestCount: metrics.length,
                avgResponseTime: Math.round(avg),
                p50ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.5)] || 0,
                p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
                p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
                errorRate: Math.round((errors / metrics.length) * 100) / 100,
                requestsPerMinute: Math.round((metrics.length / (timeWindowMs / 60000)) * 10) / 10,
                cacheHitRate: metrics.some(m => m.cacheHit !== undefined)
                    ? Math.round((cacheHits / metrics.length) * 100) / 100
                    : undefined,
            });
        }
        return results.sort((a, b) => b.avgResponseTime - a.avgResponseTime);
    }
    // Get system performance metrics
    getSystemPerformance() {
        const oneMinuteAgo = Date.now() - 60 * 1000;
        const recentMetrics = this.metrics.filter(m => m.timestamp > oneMinuteAgo);
        const responseTimes = recentMetrics.map(m => m.responseTimeMs);
        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;
        const errors = recentMetrics.filter(m => m.statusCode >= 400).length;
        const errorRate = recentMetrics.length > 0 ? errors / recentMetrics.length : 0;
        return {
            timestamp: Date.now(),
            cpuUsage: process.cpuUsage().user / 1000000, // Convert to ms
            memoryUsage: process.memoryUsage(),
            eventLoopDelay: 0, // Would need event-loop-lag package for accurate measurement
            activeRequests: this.requestStartTimes.size,
            totalRequests: this.totalRequests,
            requestsPerSecond: recentMetrics.length / 60,
            avgResponseTime: Math.round(avgResponseTime * 100) / 100,
            errorRate: Math.round(errorRate * 1000) / 1000,
        };
    }
    // Get slowest routes
    getSlowestRoutes(limit = 10, timeWindowMs = 5 * 60 * 1000) {
        return this.getRoutePerformance(timeWindowMs)
            .sort((a, b) => b.p95ResponseTime - a.p95ResponseTime)
            .slice(0, limit);
    }
    // Get routes with highest error rates
    getErrorProneRoutes(limit = 10, timeWindowMs = 5 * 60 * 1000) {
        return this.getRoutePerformance(timeWindowMs)
            .filter(r => r.errorRate > 0)
            .sort((a, b) => b.errorRate - a.errorRate)
            .slice(0, limit);
    }
    // Get metrics for a specific route
    getRouteMetrics(route, method, timeWindowMs = 60 * 60 * 1000) {
        const cutoff = Date.now() - timeWindowMs;
        return this.metrics.filter(m => m.timestamp > cutoff &&
            m.route === route &&
            (!method || m.method === method));
    }
    // Get response time distribution for a route
    getResponseTimeDistribution(route, method) {
        const metrics = this.getRouteMetrics(route, method);
        const responseTimes = metrics.map(m => m.responseTimeMs);
        const buckets = [
            { max: 10, label: '< 10ms' },
            { max: 50, label: '10-50ms' },
            { max: 100, label: '50-100ms' },
            { max: 250, label: '100-250ms' },
            { max: 500, label: '250-500ms' },
            { max: 1000, label: '500ms-1s' },
            { max: 2500, label: '1-2.5s' },
            { max: 5000, label: '2.5-5s' },
            { max: Infinity, label: '> 5s' },
        ];
        let currentMin = 0;
        return buckets.map(bucket => {
            const count = responseTimes.filter(t => t >= currentMin && t < bucket.max).length;
            currentMin = bucket.max;
            return { bucket: bucket.label, count };
        });
    }
    // Reset all metrics
    reset() {
        this.metrics = [];
        this.totalRequests = 0;
        this.errorCount = 0;
        this.startTime = Date.now();
    }
    // Get monitor uptime in milliseconds
    getUptime() {
        return Date.now() - this.startTime;
    }
    // Stop the monitor
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}
// ============================================================================
// Fastify Plugin
// ============================================================================
export async function performancePlugin(fastify, options) {
    const monitor = new PerformanceMonitor(options);
    // Decorate fastify with the monitor
    fastify.decorate('performanceMonitor', monitor);
    // Add request tracking hook
    fastify.addHook('onRequest', async (request) => {
        monitor.recordRequestStart(request.id);
    });
    // Add response tracking hook
    fastify.addHook('onResponse', async (request, reply) => {
        const userTier = request.user?.tier;
        monitor.recordRequestEnd(request.id, request.routerPath || request.url, request.method, reply.statusCode, {
            requestSizeBytes: request.headers['content-length']
                ? parseInt(request.headers['content-length'])
                : undefined,
            responseSizeBytes: reply.getHeader('content-length')
                ? parseInt(reply.getHeader('content-length'))
                : undefined,
            cacheHit: reply.getHeader('x-cache') === 'HIT',
            userTier,
        });
    });
    // Add performance endpoints
    fastify.get('/internal/performance/routes', async () => {
        return monitor.getRoutePerformance();
    });
    fastify.get('/internal/performance/system', async () => {
        return monitor.getSystemPerformance();
    });
    fastify.get('/internal/performance/slow-routes', async () => {
        return monitor.getSlowestRoutes();
    });
    fastify.get('/internal/performance/error-routes', async () => {
        return monitor.getErrorProneRoutes();
    });
    fastify.get('/internal/performance/routes/:route', async (request) => {
        const { route } = request.params;
        const { method, timeWindow } = request.query;
        return {
            metrics: monitor.getRouteMetrics(route, method, timeWindow ? parseInt(timeWindow) : undefined),
            distribution: monitor.getResponseTimeDistribution(route, method),
        };
    });
}
export default performancePlugin;
//# sourceMappingURL=performance.js.map