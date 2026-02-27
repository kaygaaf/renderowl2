import Database, { Database as DatabaseType } from 'better-sqlite3';
import { EventEmitter } from 'events';

// ============================================================================
// Database Query Optimizer
// ============================================================================
// Provides optimized query execution with caching, batching, and connection pooling

interface QueryCache {
  key: string;
  result: any;
  timestamp: number;
  ttl: number;
}

interface QueryMetrics {
  query: string;
  count: number;
  totalTime: number;
  avgTime: number;
  maxTime: number;
  lastExecuted: number;
}

interface OptimizerConfig {
  cacheEnabled: boolean;
  cacheSize: number;
  defaultCacheTtl: number;
  slowQueryThreshold: number;
  maxConnections: number;
  connectionIdleTimeout: number;
}

export class DatabaseOptimizer extends EventEmitter {
  private cache = new Map<string, QueryCache>();
  private queryMetrics = new Map<string, QueryMetrics>();
  private config: OptimizerConfig;
  private mainDb: DatabaseType;
  private connectionPool: DatabaseType[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(dbPath: string, config: Partial<OptimizerConfig> = {}) {
    super();
    
    this.config = {
      cacheEnabled: true,
      cacheSize: 1000,
      defaultCacheTtl: 60000, // 1 minute
      slowQueryThreshold: 100, // 100ms
      maxConnections: 5,
      connectionIdleTimeout: 300000, // 5 minutes
      ...config,
    };

    // Initialize main database connection with optimizations
    this.mainDb = new Database(dbPath);
    this.applyOptimizations(this.mainDb);
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  // ========================================================================
  // SQLite Optimizations
  // ========================================================================

  private applyOptimizations(db: DatabaseType): void {
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    
    // Set synchronous mode for balanced performance/durability
    db.pragma('synchronous = NORMAL');
    
    // Increase cache size (in pages, negative = KB)
    db.pragma('cache_size = -64000'); // 64MB
    
    // Enable memory-mapped I/O for faster reads
    db.pragma('mmap_size = 30000000000'); // 30GB
    
    // Store temp tables in memory
    db.pragma('temp_store = memory');
    
    // Optimize for query performance
    db.pragma('query_only = false');
    
    // Enable foreign keys
    db.pragma('foreign_keys = on');
    
    // Set busy timeout to avoid "database is locked" errors
    db.pragma('busy_timeout = 5000');
  }

  // ========================================================================
  // Query Execution with Optimization
  // ========================================================================

  query(sql: string, params?: any[]): any {
    const cacheKey = this.getCacheKey(sql, params);
    
    // Check cache for SELECT queries
    if (this.config.cacheEnabled && sql.trim().toLowerCase().startsWith('select')) {
      const cached = this.getFromCache(cacheKey);
      if (cached !== undefined) {
        this.emit('cache:hit', { key: cacheKey });
        return cached;
      }
    }
    
    const startTime = Date.now();
    let result: any;
    
    try {
      const stmt = this.mainDb.prepare(sql);
      result = params ? stmt.all(...params) : stmt.all();
    } catch (error) {
      this.emit('query:error', { sql, error, duration: Date.now() - startTime });
      throw error;
    }
    
    const duration = Date.now() - startTime;
    
    // Track metrics
    this.trackQueryMetrics(sql, duration);
    
    // Cache result if it's a SELECT query
    if (this.config.cacheEnabled && sql.trim().toLowerCase().startsWith('select')) {
      this.setCache(cacheKey, result);
    }
    
    // Emit slow query warning
    if (duration > this.config.slowQueryThreshold) {
      this.emit('query:slow', { sql, duration, threshold: this.config.slowQueryThreshold });
    }
    
    return result;
  }

  querySingle(sql: string, params?: any[]): any {
    const results = this.query(sql, params);
    return results && results.length > 0 ? results[0] : null;
  }

  run(sql: string, params?: any[]): Database.RunResult {
    const startTime = Date.now();
    
    try {
      const stmt = this.mainDb.prepare(sql);
      const result = params ? stmt.run(...params) : stmt.run();
      
      // Invalidate cache for write operations
      if (this.config.cacheEnabled) {
        this.invalidateCacheForTable(sql);
      }
      
      const duration = Date.now() - startTime;
      this.trackQueryMetrics(sql, duration);
      
      return result;
    } catch (error) {
      this.emit('query:error', { sql, error, duration: Date.now() - startTime });
      throw error;
    }
  }

  transaction<T>(fn: (db: DatabaseType) => T): T {
    const tx = this.mainDb.transaction((f: (db: DatabaseType) => T) => f(this.mainDb));
    return tx(fn);
  }

  // ========================================================================
  // Batch Operations
  // ========================================================================

  batchInsert(table: string, columns: string[], rows: any[][]): number {
    if (rows.length === 0) return 0;
    
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    const insert = this.mainDb.prepare(sql);
    
    const insertMany = this.mainDb.transaction((rows: any[][]) => {
      for (const row of rows) {
        insert.run(...row);
      }
    });
    
    insertMany(rows);
    
    // Invalidate cache
    this.invalidateCacheForTable(table);
    
    return rows.length;
  }

  batchUpdate(table: string, setColumn: string, whereColumn: string, updates: { id: any; value: any }[]): number {
    if (updates.length === 0) return 0;
    
    const sql = `UPDATE ${table} SET ${setColumn} = ? WHERE ${whereColumn} = ?`;
    const update = this.mainDb.prepare(sql);
    
    const updateMany = this.mainDb.transaction((updates: { id: any; value: any }[]) => {
      for (const { id, value } of updates) {
        update.run(value, id);
      }
    });
    
    updateMany(updates);
    
    // Invalidate cache
    this.invalidateCacheForTable(table);
    
    return updates.length;
  }

  // ========================================================================
  // Caching
  // ========================================================================

  private getCacheKey(sql: string, params?: any[]): string {
    return `${sql}:${JSON.stringify(params || [])}`;
  }

  private getFromCache(key: string): any | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.result;
  }

  private setCache(key: string, result: any, ttl?: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.config.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      key,
      result,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultCacheTtl,
    });
  }

  private invalidateCacheForTable(sql: string): void {
    // Extract table name from SQL (simplified)
    const match = sql.match(/(?:INSERT|UPDATE|DELETE|INTO|FROM)\s+(\w+)/i);
    if (match && match[1]) {
      const table = match[1].toLowerCase();
      
      // Remove all cached entries that might involve this table
      for (const [key] of this.cache) {
        if (key.toLowerCase().includes(table)) {
          this.cache.delete(key);
        }
      }
      
      this.emit('cache:invalidate', { table });
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.emit('cache:clear');
  }

  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.cacheSize,
      hitRate: 0, // Would need to track hits/misses separately
    };
  }

  // ========================================================================
  // Query Metrics
  // ========================================================================

  private trackQueryMetrics(sql: string, duration: number): void {
    // Normalize SQL for metrics (remove specific values)
    const normalizedSql = sql.replace(/\$\d+|\?/g, '?').trim();
    
    const existing = this.queryMetrics.get(normalizedSql);
    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.avgTime = existing.totalTime / existing.count;
      existing.maxTime = Math.max(existing.maxTime, duration);
      existing.lastExecuted = Date.now();
    } else {
      this.queryMetrics.set(normalizedSql, {
        query: normalizedSql,
        count: 1,
        totalTime: duration,
        avgTime: duration,
        maxTime: duration,
        lastExecuted: Date.now(),
      });
    }
  }

  getQueryMetrics(): QueryMetrics[] {
    return Array.from(this.queryMetrics.values())
      .sort((a, b) => b.totalTime - a.totalTime);
  }

  getSlowQueries(threshold: number = this.config.slowQueryThreshold): QueryMetrics[] {
    return this.getQueryMetrics().filter(m => m.avgTime > threshold);
  }

  resetMetrics(): void {
    this.queryMetrics.clear();
  }

  // ========================================================================
  // Connection Pool Management
  // ========================================================================

  getConnection(): DatabaseType {
    // For SQLite, we use the main connection
    // In a multi-threaded scenario, this would return from a pool
    return this.mainDb;
  }

  releaseConnection(db: DatabaseType): void {
    // No-op for SQLite single connection
  }

  // ========================================================================
  // Maintenance
  // ========================================================================

  vacuum(): void {
    this.mainDb.exec('VACUUM');
    this.emit('maintenance:vacuum');
  }

  analyze(): void {
    this.mainDb.exec('ANALYZE');
    this.emit('maintenance:analyze');
  }

  optimize(): void {
    this.vacuum();
    this.analyze();
    this.clearCache();
    this.emit('maintenance:optimize');
  }

  getStats(): {
    cacheSize: number;
    cacheMaxSize: number;
    queryCount: number;
    avgQueryTime: number;
    slowQueries: number;
  } {
    const metrics = this.getQueryMetrics();
    const totalTime = metrics.reduce((sum, m) => sum + m.totalTime, 0);
    const totalCount = metrics.reduce((sum, m) => sum + m.count, 0);
    
    return {
      cacheSize: this.cache.size,
      cacheMaxSize: this.config.cacheSize,
      queryCount: totalCount,
      avgQueryTime: totalCount > 0 ? totalTime / totalCount : 0,
      slowQueries: metrics.filter(m => m.avgTime > this.config.slowQueryThreshold).length,
    };
  }

  // ========================================================================
  // Cleanup
  // ========================================================================

  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.cache) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.emit('cache:cleanup', { expiredCount });
    }
  }

  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cache.clear();
    this.queryMetrics.clear();
    
    // Close all connections in pool
    for (const conn of this.connectionPool) {
      conn.close();
    }
    
    this.mainDb.close();
    this.emit('close');
  }
}

export default DatabaseOptimizer;
