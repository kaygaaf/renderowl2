import Database, { Database as DatabaseType } from 'better-sqlite3';
import { EventEmitter } from 'events';
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
export declare class DatabaseOptimizer extends EventEmitter {
    private cache;
    private queryMetrics;
    private config;
    private mainDb;
    private connectionPool;
    private cleanupInterval;
    constructor(dbPath: string, config?: Partial<OptimizerConfig>);
    private applyOptimizations;
    query(sql: string, params?: any[]): any;
    querySingle(sql: string, params?: any[]): any;
    run(sql: string, params?: any[]): Database.RunResult;
    transaction<T>(fn: (db: DatabaseType) => T): T;
    batchInsert(table: string, columns: string[], rows: any[][]): number;
    batchUpdate(table: string, setColumn: string, whereColumn: string, updates: {
        id: any;
        value: any;
    }[]): number;
    private getCacheKey;
    private getFromCache;
    private setCache;
    private invalidateCacheForTable;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
    };
    private trackQueryMetrics;
    getQueryMetrics(): QueryMetrics[];
    getSlowQueries(threshold?: number): QueryMetrics[];
    resetMetrics(): void;
    getConnection(): DatabaseType;
    releaseConnection(db: DatabaseType): void;
    vacuum(): void;
    analyze(): void;
    optimize(): void;
    getStats(): {
        cacheSize: number;
        cacheMaxSize: number;
        queryCount: number;
        avgQueryTime: number;
        slowQueries: number;
    };
    private cleanup;
    close(): void;
}
export default DatabaseOptimizer;
//# sourceMappingURL=db-optimizer.d.ts.map