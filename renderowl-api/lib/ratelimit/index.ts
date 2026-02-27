import { FastifyInstance, FastifyRequest } from 'fastify';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { EventEmitter } from 'events';

// ============================================================================
// Rate Limiting System
// ============================================================================

export interface RateLimitConfig {
  // Requests per window
  requestsPerWindow: number;
  // Window size in seconds
  windowSeconds: number;
  // Burst allowance (additional requests allowed in burst)
  burstAllowance?: number;
  // Cooldown period after hitting limit (seconds)
  cooldownSeconds?: number;
}

export interface RateLimitTier {
  name: string;
  apiKey?: RateLimitConfig;
  authenticated?: RateLimitConfig;
  anonymous?: RateLimitConfig;
}

export interface RateLimitState {
  key: string;
  count: number;
  windowStart: number;
  resetAt: number;
  remaining: number;
  limit: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
  windowStart: number;
}

// Default rate limit tiers
export const DEFAULT_TIERS: Record<string, RateLimitTier> = {
  free: {
    name: 'Free Tier',
    apiKey: { requestsPerWindow: 100, windowSeconds: 60, burstAllowance: 10 },
    authenticated: { requestsPerWindow: 30, windowSeconds: 60, burstAllowance: 5 },
    anonymous: { requestsPerWindow: 10, windowSeconds: 60 },
  },
  starter: {
    name: 'Starter Tier',
    apiKey: { requestsPerWindow: 1000, windowSeconds: 60, burstAllowance: 50 },
    authenticated: { requestsPerWindow: 100, windowSeconds: 60, burstAllowance: 20 },
  },
  creator: {
    name: 'Creator Tier',
    apiKey: { requestsPerWindow: 5000, windowSeconds: 60, burstAllowance: 200 },
    authenticated: { requestsPerWindow: 500, windowSeconds: 60, burstAllowance: 50 },
  },
  pro: {
    name: 'Pro Tier',
    apiKey: { requestsPerWindow: 20000, windowSeconds: 60, burstAllowance: 1000 },
    authenticated: { requestsPerWindow: 2000, windowSeconds: 60, burstAllowance: 200 },
  },
  enterprise: {
    name: 'Enterprise Tier',
    apiKey: { requestsPerWindow: 100000, windowSeconds: 60, burstAllowance: 5000 },
    authenticated: { requestsPerWindow: 10000, windowSeconds: 60, burstAllowance: 1000 },
  },
};

// Database schema
const RATELIMIT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS rate_limit_windows (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_reset ON rate_limit_windows(reset_at);

CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  tier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  count_at_violation INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_violations_key ON rate_limit_violations(key);
CREATE INDEX IF NOT EXISTS idx_violations_timestamp ON rate_limit_violations(timestamp);
`;

// ============================================================================
// Rate Limiter Class
// ============================================================================

export class RateLimiter extends EventEmitter {
  private db: DatabaseType;
  private tiers: Record<string, RateLimitTier>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(dbPath: string, tiers: Record<string, RateLimitTier> = DEFAULT_TIERS) {
    super();
    this.db = new Database(dbPath);
    this.db.exec(RATELIMIT_SCHEMA_SQL);
    this.tiers = tiers;

    // Cleanup old windows every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Check and increment rate limit for a key
   */
  checkLimit(
    key: string,
    tier: string = 'free',
    authType: 'apiKey' | 'authenticated' | 'anonymous' = 'anonymous'
  ): RateLimitResult {
    const tierConfig = this.tiers[tier] || this.tiers.free;
    const config = tierConfig[authType] || tierConfig.anonymous || DEFAULT_TIERS.free.anonymous!;

    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / config.windowSeconds) * config.windowSeconds;
    const resetAt = windowStart + config.windowSeconds;
    const limit = config.requestsPerWindow + (config.burstAllowance || 0);
    const windowKey = `${key}:${windowStart}`;

    // Get or create window
    let state = this.getWindow(windowKey);

    if (!state || state.windowStart < windowStart) {
      // New window
      state = {
        key: windowKey,
        count: 0,
        windowStart,
        resetAt,
        remaining: limit,
        limit,
      };
    }

    // Increment count
    state.count++;
    state.remaining = Math.max(0, limit - state.count);

    // Save window
    this.saveWindow(windowKey, state.count, windowStart, resetAt);

    // Check if over limit
    const allowed = state.count <= limit;

    if (!allowed) {
      // Log violation
      this.logViolation(key, tier, authType, state.count);
      this.emit('rate_limit:exceeded', { key, tier, authType, count: state.count, limit });
    }

    return {
      allowed,
      limit,
      remaining: state.remaining,
      resetAt,
      retryAfter: allowed ? undefined : resetAt - now,
      windowStart,
    };
  }

  /**
   * Get current rate limit state without incrementing
   */
  peekLimit(
    key: string,
    tier: string = 'free',
    authType: 'apiKey' | 'authenticated' | 'anonymous' = 'anonymous'
  ): RateLimitResult {
    const tierConfig = this.tiers[tier] || this.tiers.free;
    const config = tierConfig[authType] || tierConfig.anonymous || DEFAULT_TIERS.free.anonymous!;

    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / config.windowSeconds) * config.windowSeconds;
    const resetAt = windowStart + config.windowSeconds;
    const limit = config.requestsPerWindow + (config.burstAllowance || 0);
    const windowKey = `${key}:${windowStart}`;

    const state = this.getWindow(windowKey);
    const count = state?.count || 0;

    return {
      allowed: count < limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      windowStart,
    };
  }

  /**
   * Reset rate limit for a key
   */
  resetLimit(key: string): void {
    const now = Math.floor(Date.now() / 1000);
    // Delete all windows for this key
    this.db.prepare("DELETE FROM rate_limit_windows WHERE key LIKE ?").run(`${key}:%`);
    this.emit('rate_limit:reset', { key, timestamp: now });
  }

  /**
   * Get rate limit headers for response
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toString(),
      'X-RateLimit-Window': result.windowStart.toString(),
    };

    if (result.retryAfter !== undefined) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }

  /**
   * Get tier configuration
   */
  getTier(name: string): RateLimitTier | undefined {
    return this.tiers[name];
  }

  /**
   * List all tiers
   */
  listTiers(): RateLimitTier[] {
    return Object.values(this.tiers);
  }

  /**
   * Get rate limit statistics for a key
   */
  getStats(key: string): {
    currentWindow: RateLimitState | null;
    violations24h: number;
    totalViolations: number;
  } {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / 60) * 60;
    const windowKey = `${key}:${windowStart}`;

    const currentWindow = this.getWindow(windowKey);

    const violations24h = this.db.prepare(
      'SELECT COUNT(*) as count FROM rate_limit_violations WHERE key = ? AND timestamp > ?'
    ).get(key, now - 86400) as { count: number };

    const totalViolations = this.db.prepare(
      'SELECT COUNT(*) as count FROM rate_limit_violations WHERE key = ?'
    ).get(key) as { count: number };

    return {
      currentWindow,
      violations24h: violations24h.count,
      totalViolations: totalViolations.count,
    };
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private getWindow(key: string): RateLimitState | null {
    const row = this.db.prepare(
      'SELECT * FROM rate_limit_windows WHERE key = ?'
    ).get(key) as any;

    if (!row) return null;

    const limit = this.estimateLimit(row.key);

    return {
      key: row.key,
      count: row.count,
      windowStart: row.window_start,
      resetAt: row.reset_at,
      remaining: Math.max(0, limit - row.count),
      limit,
    };
  }

  private saveWindow(key: string, count: number, windowStart: number, resetAt: number): void {
    this.db.prepare(`
      INSERT INTO rate_limit_windows (key, count, window_start, reset_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        count = excluded.count,
        reset_at = excluded.reset_at
    `).run(key, count, windowStart, resetAt);
  }

  private estimateLimit(key: string): number {
    // Extract tier from key (format: tier:identifier:timestamp)
    const parts = key.split(':');
    const tierName = parts[0] || 'free';
    const tier = this.tiers[tierName];
    
    if (!tier) return 100;
    
    // Use API key limit if available, otherwise authenticated
    const config = tier.apiKey || tier.authenticated || { requestsPerWindow: 100, burstAllowance: 0 };
    return config.requestsPerWindow + ((config as any).burstAllowance || 0);
  }

  private logViolation(key: string, tier: string, endpoint: string, count: number): void {
    const id = `rv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const timestamp = Math.floor(Date.now() / 1000);

    this.db.prepare(`
      INSERT INTO rate_limit_violations (id, key, tier, endpoint, timestamp, count_at_violation)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, key, tier, endpoint, timestamp, count);
  }

  private cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    // Delete expired windows (older than 1 hour)
    const result = this.db.prepare(
      'DELETE FROM rate_limit_windows WHERE reset_at < ?'
    ).run(now - 3600);

    // Delete old violations (older than 30 days)
    this.db.prepare(
      'DELETE FROM rate_limit_violations WHERE timestamp < ?'
    ).run(now - 2592000);

    if (result.changes > 0) {
      this.emit('cleanup', { deletedWindows: result.changes });
    }
  }

  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.db.close();
  }
}

// ============================================================================
// Fastify Plugin
// ============================================================================

export interface RateLimitPluginOptions {
  dbPath?: string;
  tiers?: Record<string, RateLimitTier>;
  keyGenerator?: (request: FastifyRequest) => string;
  tierResolver?: (request: FastifyRequest) => string;
  authTypeResolver?: (request: FastifyRequest) => 'apiKey' | 'authenticated' | 'anonymous';
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  addHeadersOnExceeding?: boolean;
  errorResponse?: (result: RateLimitResult) => Record<string, unknown>;
}

export async function rateLimitPlugin(
  fastify: FastifyInstance,
  options: RateLimitPluginOptions = {}
) {
  const limiter = new RateLimiter(options.dbPath || './data/ratelimit.db', options.tiers);

  // Store limiter on fastify instance
  fastify.decorate('rateLimiter', limiter);

  // Add hook to check rate limits on every request
  fastify.addHook('onRequest', async (request, reply) => {
    // Apply stricter rate limiting for public endpoints
    const isPublicEndpoint = request.url === '/health' || 
                             request.url === '/live' || 
                             request.url.startsWith('/docs');
    
    if (isPublicEndpoint) {
      // Use IP-based rate limiting for public endpoints
      const ip = request.ip || request.socket.remoteAddress || 'unknown';
      const result = limiter.checkLimit(`public:${ip}`, 'free', 'anonymous');
      
      // Add rate limit headers
      const headers = limiter.getHeaders(result);
      for (const [name, value] of Object.entries(headers)) {
        reply.header(name, value);
      }
      
      // If limit exceeded, return 429
      if (!result.allowed) {
        reply.status(429).send({
          type: 'https://api.renderowl.com/errors/rate-limit-exceeded',
          title: 'Rate Limit Exceeded',
          status: 429,
          detail: `Public endpoint rate limit exceeded. Retry after ${result.retryAfter} seconds.`,
          instance: request.url,
          retry_after: result.retryAfter,
        });
        return;
      }
      
      // Public endpoint rate limit passed, continue
      return;
    }

    // Generate rate limit key
    const key = options.keyGenerator 
      ? options.keyGenerator(request)
      : generateDefaultKey(request);

    // Resolve tier
    const tier = options.tierResolver 
      ? options.tierResolver(request)
      : (request.user as any)?.tier || 'free';

    // Resolve auth type
    const authType = options.authTypeResolver
      ? options.authTypeResolver(request)
      : resolveAuthType(request);

    // Check rate limit
    const result = limiter.checkLimit(key, tier, authType);

    // Add rate limit headers
    const headers = limiter.getHeaders(result);
    for (const [name, value] of Object.entries(headers)) {
      reply.header(name, value);
    }

    // If limit exceeded, return 429
    if (!result.allowed) {
      const errorResponse = options.errorResponse 
        ? options.errorResponse(result)
        : {
            type: 'https://api.renderowl.com/errors/rate-limit-exceeded',
            title: 'Rate Limit Exceeded',
            status: 429,
            detail: `Rate limit of ${result.limit} requests per minute exceeded. Retry after ${result.retryAfter} seconds.`,
            instance: request.url,
            retry_after: result.retryAfter,
          };

      reply.status(429).send(errorResponse);
      return;
    }
  });

  // Cleanup on close
  fastify.addHook('onClose', async () => {
    limiter.close();
  });
}

function generateDefaultKey(request: FastifyRequest): string {
  // Use user ID if authenticated, otherwise IP address
  const userId = (request.user as any)?.id;
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const ip = request.ip || request.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

function resolveAuthType(request: FastifyRequest): 'apiKey' | 'authenticated' | 'anonymous' {
  // Check for API key
  const apiKey = request.headers['x-api-key'] as string;
  if (apiKey) {
    return 'apiKey';
  }

  // Check for authenticated user
  const userId = (request.user as any)?.id;
  if (userId) {
    return 'authenticated';
  }

  return 'anonymous';
}

export default rateLimitPlugin;
