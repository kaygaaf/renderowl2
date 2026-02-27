import { FastifyInstance, FastifyRequest } from 'fastify';
import { EventEmitter } from 'events';
export interface CacheEntry {
    key: string;
    data: string;
    contentType: string;
    etag: string;
    createdAt: number;
    expiresAt: number;
    tags: string[];
    size: number;
    hits: number;
}
export interface CacheConfig {
    defaultTtlSeconds: number;
    maxSize: number;
    maxSizeBytes: number;
    checkIntervalMs: number;
    compressionThreshold: number;
}
export interface CacheOptions {
    ttl?: number;
    tags?: string[];
    vary?: string[];
    private?: boolean;
    noStore?: boolean;
}
export interface CacheStats {
    totalEntries: number;
    totalSizeBytes: number;
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    expired: number;
}
export declare function generateETag(data: string | Buffer): string;
export declare function generateCacheKey(request: FastifyRequest, vary?: string[]): string;
export declare class CacheService extends EventEmitter {
    private db;
    private config;
    private cleanupInterval;
    constructor(dbPath: string, config?: Partial<CacheConfig>);
    get(key: string): CacheEntry | null;
    set(key: string, data: string, contentType: string, options?: CacheOptions): CacheEntry;
    delete(key: string): boolean;
    invalidateByTag(tag: string): number;
    invalidateByPattern(pattern: string): number;
    clear(): void;
    checkETag(request: FastifyRequest, entry: CacheEntry): 'match' | 'stale' | 'none';
    getStats(): CacheStats;
    resetStats(): void;
    private maybeEvict;
    private cleanup;
    private incrementHits;
    private incrementMisses;
    private hydrateEntry;
    close(): void;
}
export interface CachePluginOptions {
    dbPath?: string;
    config?: Partial<CacheConfig>;
    defaultOptions?: CacheOptions;
}
declare module 'fastify' {
    interface FastifyInstance {
        cache: CacheService;
    }
    interface FastifyReply {
        cache(ttl?: number, options?: CacheOptions): FastifyReply;
        noCache(): FastifyReply;
        etag(value?: string): FastifyReply;
    }
}
export declare function cachePlugin(fastify: FastifyInstance, options?: CachePluginOptions): Promise<void>;
export default cachePlugin;
//# sourceMappingURL=cache.d.ts.map