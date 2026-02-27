import Database, { Database as DatabaseType, Statement } from 'better-sqlite3';
import { EventEmitter } from 'events';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Types
// ============================================================================

export interface QueryMetrics {
  sql: string;
  duration: number;
  rowsRead: number;
  rowsWritten: number;
  timestamp: number;
}

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  maxWaitingClients: number;
}

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
  fileMustExist?: boolean;
  timeout?: number;
  verbose?: (message?: string) => void;
  nativeBinding?: string;
}

export interface PoolStats {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  maxConnections: number;
}

// ============================================================================
// Connection Pool
// ============================================================================

interface PooledConnection {
  db: DatabaseType;
  id: string;
  createdAt: number;
  lastUsedAt: number;
  inUse: boolean;
  queryCount: number;
}

export class ConnectionPool extends EventEmitter {
  private connections: PooledConnection[] = [];
  private waitingClients: Array<{
    resolve: (connection: PooledConnection) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private config: ConnectionPoolConfig;
  private dbConfig: DatabaseConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(dbConfig: DatabaseConfig, poolConfig: Partial<ConnectionPoolConfig> = {}) {
    super();
    this.dbConfig = dbConfig;
    this.config = {
      minConnections: 2,
      maxConnections: 10,
      acquireTimeoutMs: 5000,
      idleTimeoutMs: 300000, // 5 minutes
      maxWaitingClients: 50,
      ...poolConfig,
    };

    // Initialize minimum connections
    this.initializePool();

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private initializePool(): void {
    for (let i = 0; i < this.config.minConnections; i++) {
      this.createConnection();
    }
  }

  private createConnection(): PooledConnection {
    const db = new Database(this.dbConfig.path, {
      readonly: this.dbConfig.readonly,
      fileMustExist: this.dbConfig.fileMustExist,
      timeout: this.dbConfig.timeout,
      verbose: this.dbConfig.verbose,
      nativeBinding: this.dbConfig.nativeBinding,
    });

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = memory');
    db.pragma('mmap_size = 30000000000');
    db.pragma('page_size = 4096');

    const connection: PooledConnection = {
      db,
      id: `conn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      inUse: false,
      queryCount: 0,
    };

    this.connections.push(connection);
    this.emit('connection:created', { id: connection.id });

    return connection;
  }

  async acquire(): Promise<PooledConnection> {
    // Try to find an idle connection
    const idleConnection = this.connections.find(c => !c.inUse);
    
    if (idleConnection) {
      idleConnection.inUse = true;
      idleConnection.lastUsedAt = Date.now();
      idleConnection.queryCount++;
      return idleConnection;
    }

    // Create new connection if under max
    if (this.connections.length < this.config.maxConnections) {
      const connection = this.createConnection();
      connection.inUse = true;
      connection.queryCount++;
      return connection;
    }

    // Wait for a connection
    if (this.waitingClients.length >= this.config.maxWaitingClients) {
      throw new Error('Connection pool exhausted - too many waiting clients');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingClients.findIndex(c => c.timeout === timeout);
        if (index > -1) {
          this.waitingClients.splice(index, 1);
        }
        reject(new Error(`Connection acquire timeout after ${this.config.acquireTimeoutMs}ms`));
      }, this.config.acquireTimeoutMs);

      this.waitingClients.push({ resolve, reject, timeout });
    });
  }

  release(connection: PooledConnection): void {
    connection.inUse = false;
    connection.lastUsedAt = Date.now();

    // Check if there are waiting clients
    if (this.waitingClients.length > 0) {
      const waiting = this.waitingClients.shift()!;
      clearTimeout(waiting.timeout);
      
      connection.inUse = true;
      connection.queryCount++;
      waiting.resolve(connection);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const idleTimeout = this.config.idleTimeoutMs;

    // Find connections that can be closed
    const toClose = this.connections.filter(c => 
      !c.inUse && 
      c.queryCount > 0 && && // Don't close unused connections
      (now - c.lastUsedAt) > idleTimeout &&
      this.connections.length > this.config.minConnections
    );

    for (const connection of toClose) {
      connection.db.close();
      const index = this.connections.indexOf(connection);
      if (index > -1) {
        this.connections.splice(index, 1);
      }
      this.emit('connection:closed', { id: connection.id });
    }
  }

  getStats(): PoolStats {
    return {
      totalConnections: this.connections.length,
      idleConnections: this.connections.filter(c => !c.inUse).length,
      waitingClients: this.waitingClients.length,
      maxConnections: this.config.maxConnections,
    };
  }

  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    for (const connection of this.connections) {
      connection.db.close();
    }
    this.connections = [];

    // Reject all waiting clients
    for (const waiting of this.waitingClients) {
      clearTimeout(waiting.timeout);
      waiting.reject(new Error('Connection pool is closing'));
    }
    this.waitingClients = [];
  }
}

// ============================================================================
// Query Builder & Optimizer
// ============================================================================

export interface QueryBuilderOptions {
  table: string;
  select?: string[];
  where?: Record<string, any>;
  whereRaw?: Array<{ sql: string; params: any[] }>;
  orderBy?: Array<{ column: string; direction: 'ASC' | 'DESC' }>;
  limit?: number;
  offset?: number;
  joins?: Array<{
    type: 'INNER' | 'LEFT' | 'RIGHT';
    table: string;
    on: string;
    alias?: string;
  }>;
}

export class QueryBuilder {
  private options: QueryBuilderOptions;

  constructor(options: QueryBuilderOptions) {
    this.options = options;
  }

  build(): { sql: string; params: any[] } {
    const parts: string[] = [];
    const params: any[] = [];

    // SELECT
    const columns = this.options.select?.join(', ') || '*';
    parts.push(`SELECT ${columns} FROM ${this.options.table}`);

    // JOINS
    if (this.options.joins) {
      for (const join of this.options.joins) {
        const alias = join.alias ? ` AS ${join.alias}` : '';
        parts.push(`${join.type} JOIN ${join.table}${alias} ON ${join.on}`);
      }
    }

    // WHERE
    const whereConditions: string[] = [];

    if (this.options.where) {
      for (const [key, value] of Object.entries(this.options.where)) {
        if (value === null) {
          whereConditions.push(`${key} IS NULL`);
        } else if (Array.isArray(value)) {
          whereConditions.push(`${key} IN (${value.map(() => '?').join(', ')})`);
          params.push(...value);
        } else {
          whereConditions.push(`${key} = ?`);
          params.push(value);
        }
      }
    }

    if (this.options.whereRaw) {
      for (const raw of this.options.whereRaw) {
        whereConditions.push(raw.sql);
        params.push(...raw.params);
      }
    }

    if (whereConditions.length > 0) {
      parts.push(`WHERE ${whereConditions.join(' AND ')}`);
    }

    // ORDER BY
    if (this.options.orderBy && this.options.orderBy.length > 0) {
      const orderClauses = this.options.orderBy.map(
        o => `${o.column} ${o.direction}`
      );
      parts.push(`ORDER BY ${orderClauses.join(', ')}`);
    }

    // LIMIT
    if (this.options.limit !== undefined) {
      parts.push(`LIMIT ?`);
      params.push(this.options.limit);
    }

    // OFFSET
    if (this.options.offset !== undefined) {
      parts.push(`OFFSET ?`);
      params.push(this.options.offset);
    }

    return { sql: parts.join(' '), params };
  }
}

// ============================================================================
// Optimized Database Client
// ============================================================================

export class OptimizedDatabase extends EventEmitter {
  private pool: ConnectionPool;
  private statementCache: Map<string, Statement> = new Map();
  private metrics: QueryMetrics[] = [];
  private maxMetricsSize = 1000;

  constructor(dbConfig: DatabaseConfig, poolConfig?: Partial<ConnectionPoolConfig>) {
    super();
    this.pool = new ConnectionPool(dbConfig, poolConfig);
  }

  // ========================================================================
  // Query Methods
  // ========================================================================

  async query(sql: string, params: any[] = []): Promise<any[]> {
    const start = Date.now();
    const connection = await this.pool.acquire();

    try {
      const stmt = this.getStatement(connection.db, sql);
      const result = stmt.all(...params);

      this.recordMetric({
        sql,
        duration: Date.now() - start,
        rowsRead: result?.length || 0,
        rowsWritten: 0,
        timestamp: Date.now(),
      });

      return result;
    } finally {
      this.pool.release(connection);
    }
  }

  async queryOne(sql: string, params: any[] = []): Promise<any | null> {
    const results = await this.query(sql, params);
    return results[0] || null;
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
    const start = Date.now();
    const connection = await this.pool.acquire();

    try {
      const stmt = this.getStatement(connection.db, sql);
      const result = stmt.run(...params);

      this.recordMetric({
        sql,
        duration: Date.now() - start,
        rowsRead: 0,
        rowsWritten: result.changes,
        timestamp: Date.now(),
      });

      return {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid,
      };
    } finally {
      this.pool.release(connection);
    }
  }

  async transaction<T>(fn: (db: DatabaseType) => T): Promise<T> {
    const connection = await this.pool.acquire();

    try {
      const db = connection.db;
      db.prepare('BEGIN').run();

      try {
        const result = fn(db);
        db.prepare('COMMIT').run();
        return result;
      } catch (error) {
        db.prepare('ROLLBACK').run();
        throw error;
      }
    } finally {
      this.pool.release(connection);
    }
  }

  // ========================================================================
  // Query Builder Methods
  // ========================================================================

  async findMany(options: QueryBuilderOptions): Promise<any[]> {
    const builder = new QueryBuilder(options);
    const { sql, params } = builder.build();
    return this.query(sql, params);
  }

  async findOne(options: QueryBuilderOptions): Promise<any | null> {
    const results = await this.findMany({ ...options, limit: 1 });
    return results[0] || null;
  }

  // ========================================================================
  // Migration System
  // ========================================================================

  async migrate(migrationsDir: string): Promise<{ applied: string[]; skipped: string[] }> {
    const fs = await import('fs');
    const path = await import('path');

    // Ensure migrations table exists
    await this.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Get applied migrations
    const applied = await this.query('SELECT name FROM schema_migrations');
    const appliedNames = new Set(applied.map(r => r.name));

    // Read migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const result = { applied: [] as string[], skipped: [] as string[] };

    for (const file of files) {
      if (appliedNames.has(file)) {
        result.skipped.push(file);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      await this.transaction(db => {
        db.exec(sql);
        db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
      });

      result.applied.push(file);
      this.emit('migration:applied', { file });
    }

    return result;
  }

  // ========================================================================
  // Index Management
  // ========================================================================

  async analyzeTable(table: string): Promise<void> {
    await this.run(`ANALYZE ${table}`);
  }

  async getIndexes(table: string): Promise<Array<{
    name: string;
    unique: boolean;
    columns: string[];
  }>> {
    const indexes = await this.query(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=?",
      [table]
    );

    const result = [];
    for (const idx of indexes) {
      const info = await this.query(`PRAGMA index_info(${idx.name})`);
      result.push({
        name: idx.name,
        unique: false, // Would need to parse from schema
        columns: info.map((i: any) => i.name),
      });
    }

    return result;
  }

  async createIndex(
    name: string,
    table: string,
    columns: string[],
    unique = false
  ): Promise<void> {
    const uniqueStr = unique ? 'UNIQUE' : '';
    const columnsStr = columns.join(', ');
    await this.run(`CREATE ${uniqueStr} INDEX IF NOT EXISTS ${name} ON ${table} (${columnsStr})`);
  }

  async dropIndex(name: string): Promise<void> {
    await this.run(`DROP INDEX IF EXISTS ${name}`);
  }

  // ========================================================================
  // Performance Monitoring
  // ========================================================================

  private getStatement(db: DatabaseType, sql: string): Statement {
    // Simple LRU cache for prepared statements
    if (!this.statementCache.has(sql)) {
      this.statementCache.set(sql, db.prepare(sql));
      
      // Limit cache size
      if (this.statementCache.size > 100) {
        const firstKey = this.statementCache.keys().next().value;
        this.statementCache.delete(firstKey);
      }
    }
    return this.statementCache.get(sql)!;
  }

  private recordMetric(metric: QueryMetrics): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize / 2);
    }

    // Emit slow query warning
    if (metric.duration > 1000) {
      this.emit('slow:query', metric);
    }
  }

  getMetrics(timeWindowMs = 3600000): {
    totalQueries: number;
    avgDuration: number;
    slowQueries: number;
    queriesByType: Record<string, number>;
  } {
    const cutoff = Date.now() - timeWindowMs;
    const recent = this.metrics.filter(m => m.timestamp > cutoff);

    const totalDuration = recent.reduce((sum, m) => sum + m.duration, 0);
    const slowQueries = recent.filter(m => m.duration > 1000).length;

    const queriesByType: Record<string, number> = {};
    for (const m of recent) {
      const type = m.sql.trim().split(' ')[0].toUpperCase();
      queriesByType[type] = (queriesByType[type] || 0) + 1;
    }

    return {
      totalQueries: recent.length,
      avgDuration: recent.length > 0 ? totalDuration / recent.length : 0,
      slowQueries,
      queriesByType,
    };
  }

  getSlowQueries(thresholdMs = 1000, limit = 10): QueryMetrics[] {
    return this.metrics
      .filter(m => m.duration >= thresholdMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // ========================================================================
  // Stats & Management
  // ========================================================================

  getPoolStats(): PoolStats {
    return this.pool.getStats();
  }

  async vacuum(): Promise<void> {
    await this.run('VACUUM');
  }

  async optimize(): Promise<void> {
    await this.run('PRAGMA optimize');
  }

  close(): void {
    this.statementCache.clear();
    this.pool.close();
  }
}

export default OptimizedDatabase;
