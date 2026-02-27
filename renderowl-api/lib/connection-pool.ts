import { FastifyInstance } from 'fastify';
import { EventEmitter } from 'events';

// ============================================================================
// Connection Pool Optimizer
// ============================================================================
// Manages database connections with pooling, keep-alive, and health checks
// Optimized for SQLite with better-sqlite3 but designed for PostgreSQL migration

interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  keepAliveIntervalMs: number;
  healthCheckIntervalMs: number;
  maxQueueSize: number;
  connectionRetryAttempts: number;
  connectionRetryDelayMs: number;
}

interface PooledConnection {
  id: string;
  connection: any;
  acquiredAt: number | null;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
  healthy: boolean;
  inUse: boolean;
}

interface PoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  avgAcquireTime: number;
  totalRequests: number;
  errors: number;
}

export class ConnectionPool extends EventEmitter {
  private connections: Map<string, PooledConnection> = new Map();
  private waitingQueue: Array<{
    resolve: (conn: any) => void;
    reject: (err: Error) => void;
    timestamp: number;
  }> = [];
  private config: Required<PoolConfig>;
  private metrics = {
    totalRequests: 0,
    totalAcquireTime: 0,
    errors: 0,
  };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionFactory: () => any;
  private connectionValidator: (conn: any) => boolean;

  constructor(
    connectionFactory: () => any,
    connectionValidator: (conn: any) => boolean,
    config: Partial<PoolConfig> = {}
  ) {
    super();
    
    this.connectionFactory = connectionFactory;
    this.connectionValidator = connectionValidator;
    
    this.config = {
      minConnections: 2,
      maxConnections: 10,
      acquireTimeoutMs: 5000,
      idleTimeoutMs: 300000, // 5 minutes
      keepAliveIntervalMs: 60000, // 1 minute
      healthCheckIntervalMs: 30000, // 30 seconds
      maxQueueSize: 100,
      connectionRetryAttempts: 3,
      connectionRetryDelayMs: 1000,
      ...config,
    };
  }

  // ========================================================================
  // Pool Initialization
  // ========================================================================

  async initialize(): Promise<void> {
    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      try {
        await this.createConnection();
      } catch (error) {
        this.emit('error', { phase: 'initialization', error });
      }
    }

    // Start maintenance intervals
    this.cleanupInterval = setInterval(() => this.cleanup(), this.config.keepAliveIntervalMs);
    this.healthCheckInterval = setInterval(() => this.healthCheck(), this.config.healthCheckIntervalMs);

    this.emit('initialized', { connections: this.connections.size });
  }

  // ========================================================================
  // Connection Management
  // ========================================================================

  private async createConnection(): Promise<PooledConnection> {
    const id = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.connectionRetryAttempts; attempt++) {
      try {
        const connection = this.connectionFactory();
        
        const pooled: PooledConnection = {
          id,
          connection,
          acquiredAt: null,
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          useCount: 0,
          healthy: true,
          inUse: false,
        };

        this.connections.set(id, pooled);
        this.emit('connection:created', { id });
        
        return pooled;
      } catch (error) {
        lastError = error as Error;
        this.emit('connection:error', { id, attempt, error });
        
        if (attempt < this.config.connectionRetryAttempts - 1) {
          await this.delay(this.config.connectionRetryDelayMs * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Failed to create connection after retries');
  }

  async acquire(): Promise<any> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    // Try to get an available connection
    const available = this.getAvailableConnection();
    if (available) {
      this.markAcquired(available);
      this.metrics.totalAcquireTime += Date.now() - startTime;
      return available.connection;
    }

    // Create new connection if under max
    if (this.connections.size < this.config.maxConnections) {
      try {
        const pooled = await this.createConnection();
        this.markAcquired(pooled);
        this.metrics.totalAcquireTime += Date.now() - startTime;
        return pooled.connection;
      } catch (error) {
        this.metrics.errors++;
        throw error;
      }
    }

    // Queue request if under max queue size
    if (this.waitingQueue.length >= this.config.maxQueueSize) {
      this.metrics.errors++;
      throw new Error('Connection pool queue is full');
    }

    // Wait for a connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex(r => r.resolve === resolve);
        if (index > -1) {
          this.waitingQueue.splice(index, 1);
        }
        this.metrics.errors++;
        reject(new Error('Connection acquire timeout'));
      }, this.config.acquireTimeoutMs);

      this.waitingQueue.push({
        resolve: (conn) => {
          clearTimeout(timeout);
          this.metrics.totalAcquireTime += Date.now() - startTime;
          resolve(conn);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
        timestamp: Date.now(),
      });

      this.emit('request:queued', { queueSize: this.waitingQueue.length });
    });
  }

  release(connection: any): void {
    const pooled = Array.from(this.connections.values()).find(c => c.connection === connection);
    
    if (!pooled) {
      this.emit('release:error', { reason: 'Connection not found in pool' });
      return;
    }

    pooled.inUse = false;
    pooled.acquiredAt = null;
    pooled.lastUsedAt = Date.now();
    pooled.useCount++;

    // Serve waiting request
    const waiting = this.waitingQueue.shift();
    if (waiting) {
      this.markAcquired(pooled);
      waiting.resolve(pooled.connection);
    }

    this.emit('connection:released', { id: pooled.id, useCount: pooled.useCount });
  }

  private getAvailableConnection(): PooledConnection | null {
    for (const pooled of this.connections.values()) {
      if (!pooled.inUse && pooled.healthy) {
        return pooled;
      }
    }
    return null;
  }

  private markAcquired(pooled: PooledConnection): void {
    pooled.inUse = true;
    pooled.acquiredAt = Date.now();
    this.emit('connection:acquired', { id: pooled.id });
  }

  // ========================================================================
  // Health Checks
  // ========================================================================

  private async healthCheck(): Promise<void> {
    for (const pooled of this.connections.values()) {
      if (!pooled.inUse) {
        try {
          const healthy = this.connectionValidator(pooled.connection);
          pooled.healthy = healthy;
          
          if (!healthy) {
            this.emit('connection:unhealthy', { id: pooled.id });
            this.removeConnection(pooled.id);
          }
        } catch (error) {
          pooled.healthy = false;
          this.emit('connection:unhealthy', { id: pooled.id, error });
          this.removeConnection(pooled.id);
        }
      }
    }

    // Ensure minimum connections
    while (this.connections.size < this.config.minConnections) {
      try {
        await this.createConnection();
      } catch (error) {
        this.emit('error', { phase: 'min-connections', error });
        break;
      }
    }
  }

  // ========================================================================
  // Cleanup
  // ========================================================================

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, pooled] of this.connections) {
      // Remove idle connections above minimum
      if (!pooled.inUse && this.connections.size > this.config.minConnections) {
        if (now - pooled.lastUsedAt > this.config.idleTimeoutMs) {
          this.removeConnection(id);
          cleaned++;
        }
      }
    }

    // Clean old waiting requests
    const cutoff = now - this.config.acquireTimeoutMs;
    const expiredRequests = this.waitingQueue.filter(r => r.timestamp < cutoff);
    
    for (const request of expiredRequests) {
      request.reject(new Error('Connection request expired'));
    }
    
    this.waitingQueue = this.waitingQueue.filter(r => r.timestamp >= cutoff);

    if (cleaned > 0 || expiredRequests.length > 0) {
      this.emit('cleanup', { connectionsRemoved: cleaned, requestsExpired: expiredRequests.length });
    }
  }

  private removeConnection(id: string): void {
    const pooled = this.connections.get(id);
    if (pooled) {
      this.connections.delete(id);
      
      try {
        // Close connection if it has a close method
        if (typeof pooled.connection.close === 'function') {
          pooled.connection.close();
        }
      } catch (error) {
        this.emit('connection:close-error', { id, error });
      }
      
      this.emit('connection:removed', { id });
    }
  }

  // ========================================================================
  // Metrics
  // ========================================================================

  getMetrics(): PoolMetrics {
    const connections = Array.from(this.connections.values());
    const activeConnections = connections.filter(c => c.inUse).length;
    const totalAcquireTime = this.metrics.totalAcquireTime;
    const totalRequests = this.metrics.totalRequests;

    return {
      totalConnections: connections.length,
      activeConnections,
      idleConnections: connections.length - activeConnections,
      waitingRequests: this.waitingQueue.length,
      avgAcquireTime: totalRequests > 0 ? totalAcquireTime / totalRequests : 0,
      totalRequests,
      errors: this.metrics.errors,
    };
  }

  // ========================================================================
  // Utilities
  // ========================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================================================
  // Shutdown
  // ========================================================================

  async shutdown(): Promise<void> {
    // Stop intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Reject all waiting requests
    for (const request of this.waitingQueue) {
      request.reject(new Error('Pool is shutting down'));
    }
    this.waitingQueue = [];

    // Close all connections
    for (const id of this.connections.keys()) {
      this.removeConnection(id);
    }

    this.emit('shutdown');
  }
}

// ============================================================================
// Fastify Plugin
// ============================================================================

export async function connectionPoolPlugin(
  fastify: FastifyInstance,
  options: {
    connectionFactory: () => any;
    connectionValidator: (conn: any) => boolean;
    config?: Partial<PoolConfig>;
  }
) {
  const pool = new ConnectionPool(
    options.connectionFactory,
    options.connectionValidator,
    options.config
  );

  await pool.initialize();

  // Decorate fastify
  fastify.decorate('connectionPool', pool);

  // Add shutdown hook
  fastify.addHook('onClose', async () => {
    await pool.shutdown();
  });
}

export default connectionPoolPlugin;
