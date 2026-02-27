import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EventEmitter } from 'events';

// ============================================================================
// Response Size Limiter
// ============================================================================
// Prevents excessively large responses that could cause memory issues
// and protects against accidental DoS from unbounded queries

interface SizeLimitConfig {
  maxResponseSizeBytes: number;
  maxArrayItems: number;
  maxDepth: number;
  warnThresholdBytes: number;
  excludedPaths: string[];
}

interface SizeCheckResult {
  allowed: boolean;
  size: number;
  itemCount: number;
  maxDepth: number;
  reason?: string;
}

export class ResponseSizeLimiter extends EventEmitter {
  private config: Required<SizeLimitConfig>;

  constructor(config: Partial<SizeLimitConfig> = {}) {
    super();
    this.config = {
      maxResponseSizeBytes: 10 * 1024 * 1024, // 10MB default
      maxArrayItems: 10000,
      maxDepth: 10,
      warnThresholdBytes: 5 * 1024 * 1024, // 5MB warning
      excludedPaths: ['/health', '/live', '/ready', '/internal/', '/docs'],
      ...config,
    };
  }

  // ========================================================================
  // Size Checking
  // ========================================================================

  checkSize(data: any): SizeCheckResult {
    const result: SizeCheckResult = {
      allowed: true,
      size: 0,
      itemCount: 0,
      maxDepth: 0,
    };

    try {
      const stats = this.analyzeObject(data, 0);
      result.size = stats.size;
      result.itemCount = stats.itemCount;
      result.maxDepth = stats.maxDepth;

      if (stats.size > this.config.maxResponseSizeBytes) {
        result.allowed = false;
        result.reason = `Response size ${this.formatBytes(stats.size)} exceeds limit ${this.formatBytes(this.config.maxResponseSizeBytes)}`;
      } else if (stats.itemCount > this.config.maxArrayItems) {
        result.allowed = false;
        result.reason = `Array item count ${stats.itemCount} exceeds limit ${this.config.maxArrayItems}`;
      } else if (stats.maxDepth > this.config.maxDepth) {
        result.allowed = false;
        result.reason = `Object depth ${stats.maxDepth} exceeds limit ${this.config.maxDepth}`;
      }

      // Emit warning if over threshold
      if (stats.size > this.config.warnThresholdBytes && result.allowed) {
        this.emit('warning', {
          size: stats.size,
          itemCount: stats.itemCount,
          maxDepth: stats.maxDepth,
          threshold: this.config.warnThresholdBytes,
        });
      }

      return result;
    } catch (error) {
      return {
        allowed: false,
        size: 0,
        itemCount: 0,
        maxDepth: 0,
        reason: 'Size analysis failed: ' + (error instanceof Error ? error.message : 'unknown error'),
      };
    }
  }

  private analyzeObject(obj: any, depth: number): { size: number; itemCount: number; maxDepth: number } {
    let size = 0;
    let itemCount = 0;
    let maxDepth = depth;

    if (obj === null || obj === undefined) {
      return { size: 4, itemCount, maxDepth }; // "null" or undefined
    }

    const type = typeof obj;

    if (type === 'string') {
      size = obj.length * 2; // UTF-16 estimation
    } else if (type === 'number' || type === 'boolean') {
      size = 8;
    } else if (type === 'object') {
      if (Array.isArray(obj)) {
        itemCount += obj.length;
        for (const item of obj) {
          const stats = this.analyzeObject(item, depth + 1);
          size += stats.size;
          itemCount += stats.itemCount;
          maxDepth = Math.max(maxDepth, stats.maxDepth);
        }
      } else {
        for (const [key, value] of Object.entries(obj)) {
          size += key.length * 2; // Key size
          const stats = this.analyzeObject(value, depth + 1);
          size += stats.size;
          itemCount += stats.itemCount;
          maxDepth = Math.max(maxDepth, stats.maxDepth);
        }
      }
    }

    return { size, itemCount, maxDepth };
  }

  // ========================================================================
  // Truncation Helpers
  // ========================================================================

  truncateArray<T>(arr: T[], maxItems: number = this.config.maxArrayItems): T[] {
    if (arr.length <= maxItems) {
      return arr;
    }

    this.emit('truncate', { type: 'array', original: arr.length, truncated: maxItems });

    return arr.slice(0, maxItems);
  }

  truncateResponse<T>(data: T, options?: { maxItems?: number; maxDepth?: number }): T {
    const maxItems = options?.maxItems || this.config.maxArrayItems;
    const maxDepth = options?.maxDepth || this.config.maxDepth;

    return this.truncateObject(data, 0, maxItems, maxDepth) as T;
  }

  private truncateObject(obj: any, depth: number, maxItems: number, maxDepth: number): any {
    if (depth >= maxDepth) {
      return '[Max Depth Reached]';
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      const truncated = obj.slice(0, maxItems);
      return truncated.map(item => this.truncateObject(item, depth + 1, maxItems, maxDepth));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.truncateObject(value, depth + 1, maxItems, maxDepth);
    }

    return result;
  }

  // ========================================================================
  // Utilities
  // ========================================================================

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  shouldExcludePath(path: string): boolean {
    return this.config.excludedPaths.some(excluded => path.includes(excluded));
  }

  // ========================================================================
  // Pagination Helpers
  // ========================================================================

  createPaginatedResponse<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number
  ): {
    data: T[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const totalPages = Math.ceil(total / pageSize);
    
    return {
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

// ============================================================================
// Fastify Plugin
// ============================================================================

export async function sizeLimiterPlugin(
  fastify: FastifyInstance,
  options: Partial<SizeLimitConfig> = {}
) {
  const limiter = new ResponseSizeLimiter(options);

  // Decorate fastify
  fastify.decorate('sizeLimiter', limiter);

  // Add onSend hook to check response sizes
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    // Skip excluded paths
    if (limiter.shouldExcludePath(request.url)) {
      return payload;
    }

    // Parse JSON payload if string
    let data = payload;
    if (typeof payload === 'string') {
      try {
        data = JSON.parse(payload);
      } catch {
        // Not JSON, skip check
        return payload;
      }
    }

    // Check size
    const check = limiter.checkSize(data);

    if (!check.allowed) {
      fastify.log.warn({
        requestId: request.id,
        url: request.url,
        ...check,
      }, 'Response size limit exceeded');

      reply.header('X-Response-Truncated', 'true');
      
      // Return truncated response
      const truncated = limiter.truncateResponse(data);
      return JSON.stringify({
        ...truncated,
        _meta: {
          truncated: true,
          originalSize: check.size,
          reason: check.reason,
        },
      });
    }

    // Add size headers
    reply.header('X-Response-Size', check.size.toString());
    reply.header('X-Response-Items', check.itemCount.toString());

    return payload;
  });
}

export default sizeLimiterPlugin;
