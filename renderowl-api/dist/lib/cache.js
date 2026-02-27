import crypto from 'crypto';
import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
// ============================================================================
// ETag Generation
// ============================================================================
export function generateETag(data) {
    const hash = crypto.createHash('sha256');
    hash.update(typeof data === 'string' ? data : data);
    return `W/"${hash.digest('hex').slice(0, 16)}"`;
}
export function generateCacheKey(request, vary = []) {
    const parts = [
        request.method,
        request.url,
    ];
    // Add vary headers
    for (const header of vary) {
        const value = request.headers[header.toLowerCase()];
        if (value) {
            parts.push(`${header}:${value}`);
        }
    }
    // Add user context for private caching
    const userId = request.user?.id;
    if (userId) {
        parts.push(`user:${userId}`);
    }
    return parts.join('|');
}
// ============================================================================
// Cache Service
// ============================================================================
const CACHE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS cache_entries (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  content_type TEXT NOT NULL,
  etag TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  size INTEGER NOT NULL DEFAULT 0,
  hits INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_tags ON cache_entries(tags);

-- Stats table
CREATE TABLE IF NOT EXISTS cache_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  hits INTEGER NOT NULL DEFAULT 0,
  misses INTEGER NOT NULL DEFAULT 0,
  evictions INTEGER NOT NULL DEFAULT 0,
  expired INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO cache_stats (id, hits, misses, evictions, expired) 
VALUES (1, 0, 0, 0, 0);
`;
export class CacheService extends EventEmitter {
    db;
    config;
    cleanupInterval = null;
    constructor(dbPath, config = {}) {
        super();
        this.db = new Database(dbPath);
        this.db.exec(CACHE_SCHEMA_SQL);
        this.config = {
            defaultTtlSeconds: 300, // 5 minutes
            maxSize: 10000,
            maxSizeBytes: 100 * 1024 * 1024, // 100MB
            checkIntervalMs: 60000, // 1 minute
            compressionThreshold: 1024, // 1KB
            ...config,
        };
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => this.cleanup(), this.config.checkIntervalMs);
    }
    // ========================================================================
    // Core Operations
    // ========================================================================
    get(key) {
        const row = this.db.prepare('SELECT * FROM cache_entries WHERE key = ? AND expires_at > ?').get(key, Date.now());
        if (!row) {
            this.incrementMisses();
            return null;
        }
        // Increment hit counter
        this.db.prepare('UPDATE cache_entries SET hits = hits + 1 WHERE key = ?').run(key);
        this.incrementHits();
        return this.hydrateEntry(row);
    }
    set(key, data, contentType, options = {}) {
        if (options.noStore) {
            return null;
        }
        const now = Date.now();
        const ttl = options.ttl || this.config.defaultTtlSeconds;
        const expiresAt = now + ttl * 1000;
        const etag = generateETag(data);
        const tags = JSON.stringify(options.tags || []);
        const size = Buffer.byteLength(data, 'utf8');
        // Check if we need to evict entries
        this.maybeEvict(size);
        const entry = {
            key,
            data,
            contentType,
            etag,
            createdAt: now,
            expiresAt,
            tags: options.tags || [],
            size,
            hits: 0,
        };
        this.db.prepare(`
      INSERT INTO cache_entries (key, data, content_type, etag, created_at, expires_at, tags, size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        data = excluded.data,
        content_type = excluded.content_type,
        etag = excluded.etag,
        created_at = excluded.created_at,
        expires_at = excluded.expires_at,
        tags = excluded.tags,
        size = excluded.size,
        hits = 0
    `).run([key, data, contentType, etag, now, expiresAt, tags, size]);
        this.emit('cache:set', { key, size, expiresAt });
        return entry;
    }
    delete(key) {
        const result = this.db.prepare('DELETE FROM cache_entries WHERE key = ?').run([key]);
        if (result.changes > 0) {
            this.emit('cache:delete', { key });
            return true;
        }
        return false;
    }
    invalidateByTag(tag) {
        const result = this.db.prepare("DELETE FROM cache_entries WHERE tags LIKE ?").run([`%"${tag}"%`]);
        if (result.changes > 0) {
            this.emit('cache:invalidate', { tag, count: result.changes });
        }
        return result.changes;
    }
    invalidateByPattern(pattern) {
        const result = this.db.prepare('DELETE FROM cache_entries WHERE key LIKE ?').run([`%${pattern}%`]);
        return result.changes;
    }
    clear() {
        this.db.prepare('DELETE FROM cache_entries').run();
        this.emit('cache:clear');
    }
    // ========================================================================
    // ETag/Conditional Request Handling
    // ========================================================================
    checkETag(request, entry) {
        const ifNoneMatch = request.headers['if-none-match'];
        if (!ifNoneMatch) {
            return 'none';
        }
        // Handle wildcard
        if (ifNoneMatch === '*') {
            return 'match';
        }
        // Handle multiple ETags
        const etags = ifNoneMatch.split(',').map(e => e.trim());
        if (etags.includes(entry.etag) || etags.includes('*')) {
            return 'match';
        }
        return 'stale';
    }
    // ========================================================================
    // Statistics
    // ========================================================================
    getStats() {
        const stats = this.db.prepare('SELECT * FROM cache_stats WHERE id = 1').get();
        const entries = this.db.prepare('SELECT COUNT(*) as count, SUM(size) as size FROM cache_entries').get();
        const hits = stats?.hits || 0;
        const misses = stats?.misses || 0;
        const total = hits + misses;
        const hitRate = total > 0 ? hits / total : 0;
        return {
            totalEntries: entries?.count || 0,
            totalSizeBytes: entries?.size || 0,
            hits,
            misses,
            hitRate,
            evictions: stats?.evictions || 0,
            expired: stats?.expired || 0,
        };
    }
    resetStats() {
        this.db.prepare('UPDATE cache_stats SET hits = 0, misses = 0, evictions = 0, expired = 0 WHERE id = 1').run();
    }
    // ========================================================================
    // Private Methods
    // ========================================================================
    maybeEvict(requiredSpace) {
        const stats = this.db.prepare('SELECT COUNT(*) as count, SUM(size) as size FROM cache_entries').get();
        const currentEntries = stats?.count || 0;
        const currentSize = stats?.size || 0;
        // Check if we need to evict
        if (currentEntries < this.config.maxSize && currentSize + requiredSpace < this.config.maxSizeBytes) {
            return;
        }
        // Evict oldest entries by created_at until we have space
        const toEvict = this.db.prepare(`
      SELECT key FROM cache_entries 
      ORDER BY hits ASC, created_at ASC 
      LIMIT ?
    `).all(Math.ceil(this.config.maxSize * 0.1)); // Evict 10% at a time
        for (const row of toEvict) {
            this.db.prepare('DELETE FROM cache_entries WHERE key = ?').run(row.key);
        }
        this.db.prepare('UPDATE cache_stats SET evictions = evictions + ? WHERE id = 1').run(toEvict.length);
        this.emit('cache:evict', { count: toEvict.length });
    }
    cleanup() {
        const now = Date.now();
        const result = this.db.prepare('DELETE FROM cache_entries WHERE expires_at <= ?').run(now);
        if (result.changes > 0) {
            this.db.prepare('UPDATE cache_stats SET expired = expired + ? WHERE id = 1').run(result.changes);
            this.emit('cache:expired', { count: result.changes });
        }
    }
    incrementHits() {
        this.db.prepare('UPDATE cache_stats SET hits = hits + 1 WHERE id = 1').run();
    }
    incrementMisses() {
        this.db.prepare('UPDATE cache_stats SET misses = misses + 1 WHERE id = 1').run();
    }
    hydrateEntry(row) {
        return {
            key: row.key,
            data: row.data,
            contentType: row.content_type,
            etag: row.etag,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            tags: JSON.parse(row.tags),
            size: row.size,
            hits: row.hits,
        };
    }
    close() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.db.close();
    }
}
export async function cachePlugin(fastify, options = {}) {
    const cache = new CacheService(options.dbPath || './data/cache.db', options.config);
    fastify.decorate('cache', cache);
    // Decorate reply with cache helpers
    fastify.decorateReply('cache', function (ttl, cacheOptions) {
        this.cacheOptions = {
            ...(options.defaultOptions || {}),
            ...cacheOptions,
            ttl,
        };
        return this;
    });
    fastify.decorateReply('noCache', function () {
        this.cacheOptions = { noStore: true };
        this.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        this.header('Pragma', 'no-cache');
        this.header('Expires', '0');
        return this;
    });
    fastify.decorateReply('etag', function (value) {
        if (value) {
            this.header('ETag', value);
        }
        return this;
    });
    // Add hook to check cache before handling request
    fastify.addHook('onRequest', async (request, reply) => {
        // Skip cache for non-GET/HEAD requests
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            return;
        }
        // Skip cache for authenticated endpoints that vary by user
        const cacheControl = request.headers['cache-control'];
        if (cacheControl?.includes('no-cache') || cacheControl?.includes('no-store')) {
            return;
        }
        const key = generateCacheKey(request);
        const entry = cache.get(key);
        if (entry) {
            // Check ETag
            const etagCheck = cache.checkETag(request, entry);
            if (etagCheck === 'match') {
                reply.status(304).send();
                return;
            }
            // Serve from cache
            reply
                .header('Content-Type', entry.contentType)
                .header('ETag', entry.etag)
                .header('X-Cache', 'HIT')
                .header('Cache-Control', `public, max-age=${Math.floor((entry.expiresAt - Date.now()) / 1000)}`);
            if (request.method === 'HEAD') {
                reply.send();
            }
            else {
                reply.send(entry.data);
            }
            return reply; // Stop processing
        }
        // Mark for potential caching
        request.cacheKey = key;
    });
    // Add hook to cache successful responses
    fastify.addHook('onSend', async (request, reply, payload) => {
        const cacheOptions = reply.cacheOptions;
        // Skip if no caching requested or response not cacheable
        if (!cacheOptions || cacheOptions.noStore) {
            return payload;
        }
        // Only cache successful responses
        if (reply.statusCode < 200 || reply.statusCode >= 300) {
            return payload;
        }
        // Only cache GET/HEAD responses
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            return payload;
        }
        const key = request.cacheKey || generateCacheKey(request, cacheOptions.vary);
        const contentType = reply.getHeader('content-type') || 'application/json';
        // Convert payload to string if needed
        let data;
        if (typeof payload === 'string') {
            data = payload;
        }
        else if (Buffer.isBuffer(payload)) {
            data = payload.toString('utf8');
        }
        else {
            data = JSON.stringify(payload);
        }
        const entry = cache.set(key, data, contentType, cacheOptions);
        // Add cache headers
        reply
            .header('ETag', entry.etag)
            .header('X-Cache', 'MISS')
            .header('Cache-Control', `public, max-age=${cacheOptions.ttl || 300}`);
        return payload;
    });
    // Cleanup on close
    fastify.addHook('onClose', async () => {
        cache.close();
    });
}
export default cachePlugin;
//# sourceMappingURL=cache.js.map