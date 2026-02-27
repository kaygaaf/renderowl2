import { FastifyInstance } from 'fastify';
import { EventEmitter } from 'events';
import { hostname } from 'os';

// ============================================================================
// Log Levels and Types
// ============================================================================

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

// ============================================================================
// Structured Logger
// ============================================================================

export class StructuredLogger extends EventEmitter {
  private serviceName: string;
  private hostName: string;
  private minLevel: LogLevel;
  private levels: Record<LogLevel, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
  };

  constructor(
    serviceName = 'renderowl-api',
    minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
  ) {
    super();
    this.serviceName = serviceName;
    this.hostName = hostname();
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      host: this.hostName,
      ...metadata,
    };

    // Output structured JSON to stdout
    console.log(JSON.stringify(entry));

    // Emit for any custom handlers
    this.emit('log', entry);

    // Emit level-specific event
    this.emit(level, entry);
  }

  trace(message: string, metadata?: Record<string, unknown>): void {
    this.log('trace', message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log('error', message, metadata);
  }

  fatal(message: string, metadata?: Record<string, unknown>): void {
    this.log('fatal', message, metadata);
  }

  child(metadata: Record<string, unknown>): StructuredLogger {
    const child = new StructuredLogger(this.serviceName, this.minLevel);
    const parentLog = this.log.bind(this);
    
    child.log = (level: LogLevel, message: string, childMetadata?: Record<string, unknown>) => {
      parentLog(level, message, { ...metadata, ...childMetadata });
    };

    return child;
  }
}

// ============================================================================
// Metrics Collector
// ============================================================================

export class MetricsCollector extends EventEmitter {
  private metrics: MetricValue[] = [];
  private maxSize: number;
  private aggregations: Map<string, { sum: number; count: number; min: number; max: number }> = new Map();

  constructor(maxSize = 10000) {
    super();
    this.maxSize = maxSize;
  }

  counter(name: string, value = 1, tags?: Record<string, string>): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'counter',
    });
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'gauge',
    });
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'histogram',
    });

    // Update aggregations
    const key = tags ? `${name}:${JSON.stringify(tags)}` : name;
    const existing = this.aggregations.get(key);
    
    if (existing) {
      existing.sum += value;
      existing.count++;
      existing.min = Math.min(existing.min, value);
      existing.max = Math.max(existing.max, value);
    } else {
      this.aggregations.set(key, { sum: value, count: 1, min: value, max: value });
    }
  }

  timer(name: string, fn: () => void, tags?: Record<string, string>): number {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    
    this.histogram(name, duration, tags);
    return duration;
  }

  async timerAsync<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    this.histogram(name, duration, tags);
    return result;
  }

  private record(metric: MetricValue): void {
    this.metrics.push(metric);

    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize / 2);
    }

    this.emit('metric', metric);
  }

  getMetrics(
    name?: string,
    tags?: Record<string, string>,
    timeWindowMs = 3600000
  ): MetricValue[] {
    const cutoff = Date.now() - timeWindowMs;
    
    return this.metrics.filter(m => {
      if (m.timestamp < cutoff) return false;
      if (name && m.name !== name) return false;
      if (tags) {
        for (const [key, value] of Object.entries(tags)) {
          if (m.tags?.[key] !== value) return false;
        }
      }
      return true;
    });
  }

  getAggregations(name?: string): Array<{
    name: string;
    tags?: Record<string, string>;
    avg: number;
    min: number;
    max: number;
    count: number;
  }> {
    const result = [];
    
    for (const [key, agg] of this.aggregations) {
      if (name && !key.startsWith(name)) continue;
      
      const parts = key.split(':');
      const metricName = parts[0];
      const tags = parts[1] ? JSON.parse(parts[1]) : undefined;

      result.push({
        name: metricName,
        tags,
        avg: agg.sum / agg.count,
        min: agg.min,
        max: agg.max,
        count: agg.count,
      });
    }

    return result;
  }

  getStats(): {
    totalMetrics: number;
    uniqueNames: number;
    timeRange: { start: number; end: number };
  } {
    const names = new Set(this.metrics.map(m => m.name));
    const timestamps = this.metrics.map(m => m.timestamp);
    
    return {
      totalMetrics: this.metrics.length,
      uniqueNames: names.size,
      timeRange: {
        start: Math.min(...timestamps),
        end: Math.max(...timestamps),
      },
    };
  }

  clear(): void {
    this.metrics = [];
    this.aggregations.clear();
  }
}

// ============================================================================
// Health Check System
// ============================================================================

export type HealthCheckFn = () => Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  metadata?: Record<string, unknown>;
}>;

export class HealthMonitor extends EventEmitter {
  private checks: Map<string, HealthCheckFn> = new Map();
  private results: Map<string, HealthCheck> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  register(name: string, checkFn: HealthCheckFn): void {
    this.checks.set(name, checkFn);
  }

  unregister(name: string): boolean {
    return this.checks.delete(name);
  }

  async runCheck(name: string): Promise<HealthCheck> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      throw new Error(`Health check "${name}" not found`);
    }

    const start = performance.now();
    
    try {
      const result = await checkFn();
      const responseTime = Math.round(performance.now() - start);

      const healthCheck: HealthCheck = {
        name,
        status: result.status,
        responseTime,
        lastChecked: Date.now(),
        message: result.message,
        metadata: result.metadata,
      };

      this.results.set(name, healthCheck);
      this.emit('check:complete', healthCheck);

      if (result.status === 'unhealthy') {
        this.emit('check:unhealthy', healthCheck);
      }

      return healthCheck;
    } catch (error) {
      const responseTime = Math.round(performance.now() - start);
      const healthCheck: HealthCheck = {
        name,
        status: 'unhealthy',
        responseTime,
        lastChecked: Date.now(),
        message: error instanceof Error ? error.message : 'Unknown error',
      };

      this.results.set(name, healthCheck);
      this.emit('check:unhealthy', healthCheck);

      return healthCheck;
    }
  }

  async runAllChecks(): Promise<HealthCheck[]> {
    const checks: Promise<HealthCheck>[] = [];
    
    for (const name of this.checks.keys()) {
      checks.push(this.runCheck(name));
    }

    return Promise.all(checks);
  }

  start(intervalMs = 30000): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.runAllChecks();
    }, intervalMs);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getOverallStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const results = Array.from(this.results.values());
    
    if (results.length === 0) return 'healthy';

    const unhealthy = results.filter(r => r.status === 'unhealthy').length;
    const degraded = results.filter(r => r.status === 'degraded').length;

    if (unhealthy > 0) return 'unhealthy';
    if (degraded > 0) return 'degraded';
    return 'healthy';
  }

  getResults(): HealthCheck[] {
    return Array.from(this.results.values());
  }

  getResult(name: string): HealthCheck | undefined {
    return this.results.get(name);
  }
}

// ============================================================================
// Distributed Tracing
// ============================================================================

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

export class Tracer extends EventEmitter {
  private spans: Map<string, TraceSpan> = new Map();

  startSpan(
    name: string,
    parentContext?: TraceContext,
    metadata?: Record<string, unknown>
  ): TraceSpan {
    const spanId = this.generateId();
    const traceId = parentContext?.traceId || this.generateId();

    const span: TraceSpan = {
      id: spanId,
      traceId,
      parentId: parentContext?.spanId,
      name,
      startTime: Date.now(),
      endTime: null,
      status: 'ok',
      metadata: metadata || {},
      tags: {},
    };

    this.spans.set(spanId, span);
    this.emit('span:start', span);

    return span;
  }

  endSpan(spanId: string, status: 'ok' | 'error' = 'ok', errorMessage?: string): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.status = status;
    
    if (errorMessage) {
      span.metadata.error = errorMessage;
    }

    this.emit('span:end', span);
  }

  addTag(spanId: string, key: string, value: string): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  getSpan(spanId: string): TraceSpan | undefined {
    return this.spans.get(spanId);
  }

  getTrace(traceId: string): TraceSpan[] {
    return Array.from(this.spans.values()).filter(s => s.traceId === traceId);
  }

  private generateId(): string {
    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
  }
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

// ============================================================================
// Fastify Plugin
// ============================================================================

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

export async function monitoringPlugin(
  fastify: FastifyInstance,
  options: MonitoringOptions = {}
) {
  const {
    serviceName = 'renderowl-api',
    logLevel = 'info',
    enableTracing = true,
    enableMetrics = true,
    enableHealthChecks = true,
  } = options;

  // Initialize logger
  const logger = new StructuredLogger(serviceName, logLevel);
  fastify.decorate('logger', logger);

  // Initialize metrics
  let metrics: MetricsCollector | undefined;
  if (enableMetrics) {
    metrics = new MetricsCollector();
    fastify.decorate('metrics', metrics);
  }

  // Initialize health monitor
  let health: HealthMonitor | undefined;
  if (enableHealthChecks) {
    health = new HealthMonitor();
    fastify.decorate('health', health);
    health.start();
  }

  // Initialize tracer
  let tracer: Tracer | undefined;
  if (enableTracing) {
    tracer = new Tracer();
    fastify.decorate('tracer', tracer);
  }

  // Request tracing hook
  if (enableTracing) {
    fastify.addHook('onRequest', async (request, reply) => {
      // Extract trace context from headers or create new
      const traceHeader = request.headers['x-trace-id'] as string;
      const parentSpanHeader = request.headers['x-parent-span-id'] as string;
      const sampled = request.headers['x-trace-sampled'] !== '0';

      const traceContext: TraceContext = {
        traceId: traceHeader || tracer!.startSpan('request').traceId,
        spanId: tracer!.startSpan(`${request.method} ${request.url}`, {
          traceId: traceHeader || tracer!.startSpan('request').traceId,
          spanId: parentSpanHeader || '',
          sampled,
        }).id,
        parentSpanId: parentSpanHeader,
        sampled,
      };

      request.traceContext = traceContext;
      request.spanId = traceContext.spanId;

      // Add trace headers to response
      reply.header('X-Trace-Id', traceContext.traceId);
      reply.header('X-Span-Id', traceContext.spanId);
    });

    fastify.addHook('onResponse', async (request, reply) => {
      if (request.spanId) {
        const status = reply.statusCode >= 400 ? 'error' : 'ok';
        tracer!.endSpan(request.spanId, status);
      }
    });
  }

  // Metrics collection hook
  if (enableMetrics) {
    fastify.addHook('onResponse', async (request, reply) => {
      const duration = reply.elapsedTime;
      const route = request.url;
      const method = request.method;
      const status = reply.statusCode.toString();

      metrics!.histogram('http.request.duration', duration, {
        route,
        method,
        status,
      });

      metrics!.counter('http.request.count', 1, {
        route,
        method,
        status,
      });
    });
  }

  // Enhanced health check endpoint
  fastify.get('/health', async () => {
    const checks = health ? await health.runAllChecks() : [];
    const overall = health ? health.getOverallStatus() : 'healthy';
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      memory: {
        used_mb: Math.round(memory.heapUsed / 1024 / 1024),
        total_mb: Math.round(memory.heapTotal / 1024 / 1024),
        rss_mb: Math.round(memory.rss / 1024 / 1024),
      },
      checks,
    };
  });

  // Metrics endpoint (Prometheus format)
  fastify.get('/metrics', async (request, reply) => {
    if (!metrics) {
      reply.status(503).send({ error: 'Metrics not enabled' });
      return;
    }

    const output: string[] = [];
    
    // Format as Prometheus exposition format
    const aggregations = metrics.getAggregations();
    
    for (const agg of aggregations) {
      const tags = agg.tags 
        ? Object.entries(agg.tags).map(([k, v]) => `${k}="${v}"`).join(',')
        : '';
      
      output.push(`# HELP ${agg.name} ${agg.name} metric`);
      output.push(`# TYPE ${agg.name} ${agg.name.includes('duration') ? 'histogram' : 'counter'}`);
      output.push(`${agg.name}_count{${tags}} ${agg.count}`);
      output.push(`${agg.name}_sum{${tags}} ${(agg.avg * agg.count).toFixed(2)}`);
    }

    reply.header('Content-Type', 'text/plain');
    return output.join('\n');
  });

  // Cleanup on close
  fastify.addHook('onClose', async () => {
    health?.stop();
  });
}

export default monitoringPlugin;
