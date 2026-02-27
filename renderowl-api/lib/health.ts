import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';

// ============================================================================
// Types
// ============================================================================

export interface HealthCheckConfig {
  name: string;
  check: () => Promise<HealthCheckResult> | HealthCheckResult;
  intervalMs?: number;
  timeoutMs?: number;
  critical?: boolean;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime?: number;
  metadata?: Record<string, unknown>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    criticalUnhealthy: number;
  };
}

// ============================================================================
// Health Monitor
// ============================================================================

export class HealthMonitor extends EventEmitter {
  private checks = new Map<string, HealthCheckConfig>();
  private results = new Map<string, HealthCheckResult>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private startTime = Date.now();
  private version: string;

  constructor(version = '1.0.0') {
    super();
    this.version = version;
  }

  // Register a health check
  register(config: HealthCheckConfig): void {
    this.checks.set(config.name, {
      timeoutMs: 5000,
      intervalMs: 30000,
      critical: false,
      ...config,
    });

    // Run immediately
    this.runCheck(config.name);

    // Schedule periodic checks
    if (config.intervalMs) {
      const interval = setInterval(() => this.runCheck(config.name), config.intervalMs);
      this.intervals.set(config.name, interval);
    }
  }

  // Unregister a health check
  unregister(name: string): void {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }
    this.checks.delete(name);
    this.results.delete(name);
  }

  // Run a single health check
  private async runCheck(name: string): Promise<void> {
    const check = this.checks.get(name);
    if (!check) return;

    const startTime = Date.now();
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), check.timeoutMs);
      });

      // Race between check and timeout
      const result = await Promise.race([
        Promise.resolve(check.check()),
        timeoutPromise,
      ]);

      const responseTime = Date.now() - startTime;
      
      this.results.set(name, {
        ...result,
        responseTime,
      });

      // Emit events for status changes
      const previous = this.results.get(name);
      if (previous?.status !== result.status) {
        this.emit('status-change', {
          name,
          previous: previous?.status,
          current: result.status,
          critical: check.critical,
        });

        if (result.status === 'unhealthy' && check.critical) {
          this.emit('critical-failure', { name, result });
        }
      }
    } catch (error) {
      this.results.set(name, {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Health check failed',
        responseTime: Date.now() - startTime,
      });

      if (check.critical) {
        this.emit('critical-failure', { name, error });
      }
    }
  }

  // Get current health status
  getStatus(): HealthStatus {
    const checks: Record<string, HealthCheckResult> = {};
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;
    let criticalUnhealthy = 0;

    for (const [name, result] of this.results) {
      checks[name] = result;
      
      switch (result.status) {
        case 'healthy':
          healthy++;
          break;
        case 'degraded':
          degraded++;
          break;
        case 'unhealthy':
          unhealthy++;
          const check = this.checks.get(name);
          if (check?.critical) {
            criticalUnhealthy++;
          }
          break;
      }
    }

    // Overall status logic
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (criticalUnhealthy > 0) {
      status = 'unhealthy';
    } else if (unhealthy > 0 || degraded > 0) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.version,
      checks,
      summary: {
        total: this.results.size,
        healthy,
        degraded,
        unhealthy,
        criticalUnhealthy,
      },
    };
  }

  // Get status for a specific check
  getCheckStatus(name: string): HealthCheckResult | undefined {
    return this.results.get(name);
  }

  // Stop all health checks
  stop(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
}

// ============================================================================
// Built-in Health Checks
// ============================================================================

export function createDatabaseHealthCheck(dbPath: string): HealthCheckConfig {
  return {
    name: 'database',
    critical: true,
    intervalMs: 30000,
    timeoutMs: 5000,
    check: () => {
      try {
        const db = new Database(dbPath);
        
        // Test query
        const start = Date.now();
        db.prepare('SELECT 1').get();
        const responseTime = Date.now() - start;
        
        // Get database stats
        const pageCount = db.pragma('page_count', { simple: true }) as number;
        const freelistCount = db.pragma('freelist_count', { simple: true }) as number;
        
        db.close();
        
        return {
          status: 'healthy',
          responseTime,
          metadata: {
            pageCount,
            freelistCount,
            utilization: ((pageCount - freelistCount) / pageCount * 100).toFixed(2) + '%',
          },
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Database check failed',
        };
      }
    },
  };
}

export function createMemoryHealthCheck(thresholds = { warning: 0.8, critical: 0.9 }): HealthCheckConfig {
  return {
    name: 'memory',
    critical: false,
    intervalMs: 30000,
    check: () => {
      const usage = process.memoryUsage();
      const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
      const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const rssMB = Math.round(usage.rss / 1024 / 1024);
      const ratio = usage.heapUsed / usage.heapTotal;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (ratio > thresholds.critical) {
        status = 'unhealthy';
      } else if (ratio > thresholds.warning) {
        status = 'degraded';
      }

      return {
        status,
        message: `${usedMB}MB / ${totalMB}MB heap used`,
        metadata: {
          heapUsed: usedMB,
          heapTotal: totalMB,
          rss: rssMB,
          usagePercent: (ratio * 100).toFixed(2) + '%',
        },
      };
    },
  };
}

export function createDiskHealthCheck(dbPath: string, thresholdGB = 1): HealthCheckConfig {
  return {
    name: 'disk',
    critical: true,
    intervalMs: 60000,
    check: async () => {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const { execSync } = await import('child_process');

        const dir = path.dirname(dbPath);
        
        // Get disk usage (Unix-like systems)
        let availableGB = null;
        try {
          const output = execSync(`df -BG "${dir}" | tail -1`, { encoding: 'utf-8' });
          const parts = output.trim().split(/\s+/);
          availableGB = parseInt(parts[3]);
        } catch {
          // Fallback: check if we can write
        }

        // Get database file size
        const stats = fs.statSync(dbPath);
        const sizeMB = Math.round(stats.size / 1024 / 1024);

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (availableGB !== null && availableGB < thresholdGB) {
          status = 'unhealthy';
        }

        return {
          status,
          message: availableGB !== null 
            ? `${availableGB}GB available, ${sizeMB}MB used`
            : `${sizeMB}MB used`,
          metadata: {
            dbSizeMB: sizeMB,
            availableGB,
          },
        };
      } catch (error) {
        return {
          status: 'degraded',
          message: error instanceof Error ? error.message : 'Disk check failed',
        };
      }
    },
  };
}

export function createQueueHealthCheck(queueStats: () => { pending: number; processing: number; failed: number }): HealthCheckConfig {
  return {
    name: 'queue',
    critical: false,
    intervalMs: 15000,
    check: () => {
      const stats = queueStats();
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (stats.failed > 100) {
        status = 'unhealthy';
      } else if (stats.pending > 1000 || stats.failed > 10) {
        status = 'degraded';
      }

      return {
        status,
        message: `${stats.pending} pending, ${stats.processing} processing, ${stats.failed} failed`,
        metadata: stats,
      };
    },
  };
}

// ============================================================================
// Fastify Plugin
// ============================================================================

export async function healthCheckPlugin(
  fastify: FastifyInstance,
  options: {
    version?: string;
    dbPath?: string;
    queueStats?: () => { pending: number; processing: number; failed: number };
  }
) {
  const monitor = new HealthMonitor(options.version);

  // Register built-in checks
  if (options.dbPath) {
    monitor.register(createDatabaseHealthCheck(options.dbPath));
    monitor.register(createDiskHealthCheck(options.dbPath));
  }
  
  monitor.register(createMemoryHealthCheck());
  
  if (options.queueStats) {
    monitor.register(createQueueHealthCheck(options.queueStats));
  }

  // Decorate fastify
  fastify.decorate('healthMonitor', monitor);

  // Health check endpoints
  
  // Liveness probe - basic server status
  fastify.get('/live', async () => ({
    status: 'ok',
    service: 'renderowl-api',
    timestamp: new Date().toISOString(),
  }));

  // Readiness probe - includes dependency checks
  fastify.get('/ready', async () => {
    const status = monitor.getStatus();
    const ready = status.summary.criticalUnhealthy === 0;
    
    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: status.summary.total,
      healthy: status.summary.healthy,
    };
  });

  // Full health check
  fastify.get('/health', async () => {
    return monitor.getStatus();
  });

  // Individual check status
  fastify.get('/health/:check', async (request: FastifyRequest, reply: FastifyReply) => {
    const { check } = request.params as { check: string };
    const result = monitor.getCheckStatus(check);
    
    if (!result) {
      reply.code(404);
      return { error: 'Health check not found' };
    }
    
    const code = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
    reply.code(code);
    return result;
  });
}

export default healthCheckPlugin;
