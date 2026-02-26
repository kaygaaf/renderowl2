import { FastifyInstance, FastifyRequest } from 'fastify';
import { EventEmitter } from 'events';
export interface RateLimitConfig {
    requestsPerWindow: number;
    windowSeconds: number;
    burstAllowance?: number;
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
export declare const DEFAULT_TIERS: Record<string, RateLimitTier>;
export declare class RateLimiter extends EventEmitter {
    private db;
    private tiers;
    private cleanupInterval;
    constructor(dbPath: string, tiers?: Record<string, RateLimitTier>);
    /**
     * Check and increment rate limit for a key
     */
    checkLimit(key: string, tier?: string, authType?: 'apiKey' | 'authenticated' | 'anonymous'): RateLimitResult;
    /**
     * Get current rate limit state without incrementing
     */
    peekLimit(key: string, tier?: string, authType?: 'apiKey' | 'authenticated' | 'anonymous'): RateLimitResult;
    /**
     * Reset rate limit for a key
     */
    resetLimit(key: string): void;
    /**
     * Get rate limit headers for response
     */
    getHeaders(result: RateLimitResult): Record<string, string>;
    /**
     * Get tier configuration
     */
    getTier(name: string): RateLimitTier | undefined;
    /**
     * List all tiers
     */
    listTiers(): RateLimitTier[];
    /**
     * Get rate limit statistics for a key
     */
    getStats(key: string): {
        currentWindow: RateLimitState | null;
        violations24h: number;
        totalViolations: number;
    };
    private getWindow;
    private saveWindow;
    private estimateLimit;
    private logViolation;
    private cleanup;
    close(): void;
}
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
export declare function rateLimitPlugin(fastify: FastifyInstance, options?: RateLimitPluginOptions): Promise<void>;
export default rateLimitPlugin;
//# sourceMappingURL=index.d.ts.map