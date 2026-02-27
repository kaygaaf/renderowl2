import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EventEmitter } from 'events';
import crypto from 'crypto';

// ============================================================================
// Request Deduplication Middleware
// ============================================================================
// Prevents duplicate requests from being processed concurrently
// Useful for preventing double-submissions and reducing server load

interface DeduplicationConfig {
  ttlMs: number;
  maxEntries: number;
  keyGenerator?: (request: FastifyRequest) => string;
  excludePaths?: string[];
  excludeMethods?: string[];
}

interface InFlightRequest {
  key: string;
  timestamp: number;
  promise: Promise<any>;
  response?: any;
  completed: boolean;
}

export class RequestDeduplicator extends EventEmitter {
  private inFlight = new Map<string, InFlightRequest>();
  private completed = new Map<string, { response: any; timestamp: number }>();
  private config: Required<DeduplicationConfig>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<DeduplicationConfig> = {}) {
    super();
    this.config = {
      ttlMs: 30000, // 30 seconds default
      maxEntries: 10000,
      keyGenerator: this.defaultKeyGenerator,
      excludePaths: ['/health', '/live', '/ready', '/internal/'],
      excludeMethods: ['GET', 'HEAD', 'OPTIONS'],
      ...config,
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  // ========================================================================
  // Key Generation
  // ========================================================================

  private defaultKeyGenerator(request: FastifyRequest): string {
    // Create a hash from method, URL, body, and user ID
    const method = request.method;
    const url = request.url;
    const userId = (request.user as any)?.id || 'anonymous';
    const body = JSON.stringify(request.body || {});
    
    const data = `${method}:${url}:${userId}:${body}`;
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
  }

  // ========================================================================
  // Deduplication Logic
  // ========================================================================

  async deduplicate<T>(
    request: FastifyRequest,
    handler: () => Promise<T>
  ): Promise<T> {
    // Check if this request should be excluded
    if (this.shouldExclude(request)) {
      return handler();
    }

    const key = this.config.keyGenerator(request);
    const now = Date.now();

    // Check completed cache first
    const cached = this.completed.get(key);
    if (cached && now - cached.timestamp < this.config.ttlMs) {
      this.emit('cache:hit', { key, requestId: request.id });
      return cached.response;
    }

    // Check if there's an in-flight request
    const inFlight = this.inFlight.get(key);
    if (inFlight && !inFlight.completed) {
      this.emit('deduplicate', { key, requestId: request.id, original: inFlight.key });
      
      // Wait for the in-flight request to complete
      try {
        const response = await inFlight.promise;
        return response;
      } catch (error) {
        throw error;
      }
    }

    // Create new request entry
    const promise = this.executeHandler(key, handler);
    
    this.inFlight.set(key, {
      key,
      timestamp: now,
      promise,
      completed: false,
    });

    this.emit('request:start', { key, requestId: request.id });

    try {
      const result = await promise;
      return result;
    } finally {
      // Cleanup will happen in executeHandler
    }
  }

  private async executeHandler<T>(
    key: string,
    handler: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await handler();
      
      // Cache successful response
      this.completed.set(key, {
        response: result,
        timestamp: Date.now(),
      });

      // Mark in-flight as completed
      const inFlight = this.inFlight.get(key);
      if (inFlight) {
        inFlight.completed = true;
        inFlight.response = result;
      }

      this.emit('request:complete', { key, success: true });
      
      return result;
    } catch (error) {
      // Mark in-flight as completed (with error)
      const inFlight = this.inFlight.get(key);
      if (inFlight) {
        inFlight.completed = true;
      }

      this.emit('request:complete', { key, success: false, error });
      
      throw error;
    }
  }

  private shouldExclude(request: FastifyRequest): boolean {
    // Check excluded methods
    if (this.config.excludeMethods.includes(request.method)) {
      return true;
    }

    // Check excluded paths
    const url = request.url;
    for (const path of this.config.excludePaths) {
      if (url.includes(path)) {
        return true;
      }
    }

    return false;
  }

  // ========================================================================
  // Cleanup
  // ========================================================================

  private cleanup(): void {
    const now = Date.now();
    let cleanedInFlight = 0;
    let cleanedCompleted = 0;

    // Clean old in-flight requests (shouldn't happen often, but safety check)
    for (const [key, entry] of this.inFlight) {
      if (entry.completed && now - entry.timestamp > this.config.ttlMs) {
        this.inFlight.delete(key);
        cleanedInFlight++;
      }
    }

    // Clean old completed responses
    for (const [key, entry] of this.completed) {
      if (now - entry.timestamp > this.config.ttlMs) {
        this.completed.delete(key);
        cleanedCompleted++;
      }
    }

    // Enforce max entries limit
    if (this.completed.size > this.config.maxEntries) {
      const entries = Array.from(this.completed.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - this.config.maxEntries);
      for (const [key] of toRemove) {
        this.completed.delete(key);
        cleanedCompleted++;
      }
    }

    if (cleanedInFlight > 0 || cleanedCompleted > 0) {
      this.emit('cleanup', { cleanedInFlight, cleanedCompleted });
    }
  }

  // ========================================================================
  // Statistics
  // ========================================================================

  getStats(): {
    inFlightCount: number;
    completedCount: number;
    totalMemory: number;
  } {
    return {
      inFlightCount: this.inFlight.size,
      completedCount: this.completed.size,
      totalMemory: this.inFlight.size + this.completed.size,
    };
  }

  clear(): void {
    this.inFlight.clear();
    this.completed.clear();
    this.emit('clear');
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ============================================================================
// Fastify Plugin
// ============================================================================

export async function deduplicationPlugin(
  fastify: FastifyInstance,
  options: Partial<DeduplicationConfig> = {}
) {
  const deduplicator = new RequestDeduplicator(options);

  // Decorate fastify
  fastify.decorate('deduplicator', deduplicator);

  // Add preHandler hook for deduplication
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip if route is marked with noDedup
    if ((request.routeOptions as any)?.config?.noDedup) {
      return;
    }

    // Store the original handler
    const originalHandler = (request as any).routeOptions?.handler;
    
    // We'll handle deduplication at the route level
  });

  // Cleanup on close
  fastify.addHook('onClose', async () => {
    deduplicator.stop();
  });
}

// ============================================================================
// Route Decorator Helper
// ============================================================================

export function withDeduplication<T>(
  handler: () => Promise<T>,
  options?: { ttlMs?: number }
): () => Promise<T> {
  // This is a placeholder for route-level deduplication
  // In practice, you'd use the deduplicator instance from the request
  return handler;
}

export default deduplicationPlugin;
