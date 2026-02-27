import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EventEmitter } from 'events';

// ============================================================================
// Query Plan Analyzer
// ============================================================================
// Analyzes SQL queries for performance issues and suggests optimizations
// Works with better-sqlite3 to capture EXPLAIN QUERY PLAN output

interface QueryPlanConfig {
  enabled: boolean;
  slowQueryThresholdMs: number;
  logPlans: boolean;
  suggestIndexes: boolean;
  maxPlansToCache: number;
}

interface QueryPlan {
  sql: string;
  normalizedSql: string;
  plan: QueryPlanStep[];
  timestamp: number;
  executionTime: number;
  issues: QueryIssue[];
  suggestions: string[];
}

interface QueryPlanStep {
  id: number;
  parent: number;
  detail: string;
  isIndex: boolean;
  isScan: boolean;
  tableName?: string;
}

interface QueryIssue {
  type: 'FULL_SCAN' | 'TEMP_B_TREE' | 'SLOW_INDEX' | 'CARTESIAN' | 'NO_INDEX';
  severity: 'warning' | 'critical';
  message: string;
  table?: string;
}

export class QueryPlanAnalyzer extends EventEmitter {
  private config: Required<QueryPlanConfig>;
  private planCache = new Map<string, QueryPlan>();
  private db: any;

  constructor(db: any, config: Partial<QueryPlanConfig> = {}) {
    super();
    this.db = db;
    this.config = {
      enabled: true,
      slowQueryThresholdMs: 100,
      logPlans: true,
      suggestIndexes: true,
      maxPlansToCache: 1000,
      ...config,
    };
  }

  // ========================================================================
  // Plan Analysis
  // ========================================================================

  analyze(sql: string, params?: any[]): QueryPlan {
    if (!this.config.enabled) {
      return this.createEmptyPlan(sql);
    }

    const normalizedSql = this.normalizeSql(sql);
    const cached = this.planCache.get(normalizedSql);
    
    // Return cached plan if recent (within 1 hour)
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached;
    }

    const startTime = Date.now();
    
    try {
      // Get query plan
      const planRows = this.db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...(params || []));
      const executionTime = Date.now() - startTime;

      const plan = this.parsePlan(planRows);
      const issues = this.analyzeIssues(plan);
      const suggestions = this.generateSuggestions(plan, issues);

      const result: QueryPlan = {
        sql,
        normalizedSql,
        plan,
        timestamp: Date.now(),
        executionTime,
        issues,
        suggestions,
      };

      // Cache the plan
      this.cachePlan(normalizedSql, result);

      // Emit events for critical issues
      issues.filter(i => i.severity === 'critical').forEach(issue => {
        this.emit('critical-issue', { sql, issue });
      });

      // Log slow queries
      if (executionTime > this.config.slowQueryThresholdMs && this.config.logPlans) {
        this.emit('slow-query', { sql, executionTime, plan });
      }

      return result;
    } catch (error) {
      this.emit('error', { sql, error });
      return this.createEmptyPlan(sql);
    }
  }

  private parsePlan(rows: any[]): QueryPlanStep[] {
    return rows.map((row: any) => {
      const detail = row.detail || '';
      
      return {
        id: row.id,
        parent: row.parent,
        detail,
        isIndex: detail.includes('USING INDEX'),
        isScan: detail.includes('SCAN') || detail.includes('FULL SCAN'),
        tableName: this.extractTableName(detail),
      };
    });
  }

  private extractTableName(detail: string): string | undefined {
    // Extract table name from SCAN/INDEX details
    const scanMatch = detail.match(/SCAN (\w+)/);
    if (scanMatch) return scanMatch[1];
    
    const indexMatch = detail.match(/INDEX (\w+) ON (\w+)/);
    if (indexMatch) return indexMatch[2];
    
    return undefined;
  }

  private analyzeIssues(plan: QueryPlanStep[]): QueryIssue[] {
    const issues: QueryIssue[] = [];

    for (const step of plan) {
      // Check for full table scans
      if (step.detail.includes('SCAN TABLE') && !step.detail.includes('INDEX')) {
        issues.push({
          type: 'FULL_SCAN',
          severity: 'warning',
          message: `Full table scan detected on ${step.tableName}`,
          table: step.tableName,
        });
      }

      // Check for temporary B-trees
      if (step.detail.includes('USE TEMP B-TREE')) {
        issues.push({
          type: 'TEMP_B_TREE',
          severity: 'warning',
          message: 'Temporary B-tree used for sorting/grouping',
        });
      }

      // Check for automatic index creation (suggests missing index)
      if (step.detail.includes('AUTOMATIC COVERING INDEX')) {
        issues.push({
          type: 'NO_INDEX',
          severity: 'critical',
          message: `Missing index on ${step.tableName}, using automatic index`,
          table: step.tableName,
        });
      }

      // Check for Cartesian joins
      if (step.detail.includes('CARTESIAN')) {
        issues.push({
          type: 'CARTESIAN',
          severity: 'critical',
          message: 'Cartesian join detected - potential performance issue',
        });
      }
    }

    return issues;
  }

  private generateSuggestions(plan: QueryPlanStep[], issues: QueryIssue[]): string[] {
    const suggestions: string[] = [];

    for (const issue of issues) {
      switch (issue.type) {
        case 'FULL_SCAN':
          if (this.config.suggestIndexes && issue.table) {
            suggestions.push(`Consider adding an index on ${issue.table} for columns used in WHERE/ORDER BY`);
          }
          break;
        case 'TEMP_B_TREE':
          suggestions.push('Consider adding a covering index to avoid temporary B-tree creation');
          break;
        case 'NO_INDEX':
          suggestions.push(`Add a permanent index on ${issue.table} instead of relying on automatic indexes`);
          break;
        case 'CARTESIAN':
          suggestions.push('Add JOIN conditions to avoid Cartesian products');
          break;
      }
    }

    return suggestions;
  }

  // ========================================================================
  // Cache Management
  // ========================================================================

  private cachePlan(key: string, plan: QueryPlan): void {
    // Evict oldest if cache is full
    if (this.planCache.size >= this.config.maxPlansToCache) {
      const firstKey = this.planCache.keys().next().value;
      this.planCache.delete(firstKey);
    }

    this.planCache.set(key, plan);
  }

  private normalizeSql(sql: string): string {
    // Remove extra whitespace and normalize case
    return sql
      .replace(/\s+/g, ' ')
      .replace(/\s*([,()])\s*/g, '$1')
      .trim()
      .toLowerCase();
  }

  private createEmptyPlan(sql: string): QueryPlan {
    return {
      sql,
      normalizedSql: this.normalizeSql(sql),
      plan: [],
      timestamp: Date.now(),
      executionTime: 0,
      issues: [],
      suggestions: [],
    };
  }

  // ========================================================================
  // Statistics
  // ========================================================================

  getStats(): {
    cachedPlans: number;
    fullScansDetected: number;
    missingIndexesDetected: number;
    slowQueriesDetected: number;
  } {
    const plans = Array.from(this.planCache.values());
    
    return {
      cachedPlans: plans.length,
      fullScansDetected: plans.filter(p => 
        p.issues.some(i => i.type === 'FULL_SCAN')
      ).length,
      missingIndexesDetected: plans.filter(p =>
        p.issues.some(i => i.type === 'NO_INDEX')
      ).length,
      slowQueriesDetected: plans.filter(p =>
        p.executionTime > this.config.slowQueryThresholdMs
      ).length,
    };
  }

  getCachedPlans(): QueryPlan[] {
    return Array.from(this.planCache.values());
  }

  clearCache(): void {
    this.planCache.clear();
  }
}

// ============================================================================
// Fastify Plugin
// ============================================================================

export async function queryAnalyzerPlugin(
  fastify: FastifyInstance,
  options: { db: any; config?: Partial<QueryPlanConfig> }
) {
  const analyzer = new QueryPlanAnalyzer(options.db, options.config);

  // Decorate fastify
  fastify.decorate('queryAnalyzer', analyzer);

  // Add internal endpoint for query analysis
  fastify.get('/internal/query-analysis', async () => {
    return {
      stats: analyzer.getStats(),
      plans: analyzer.getCachedPlans().map(p => ({
        normalizedSql: p.normalizedSql,
        issues: p.issues,
        suggestions: p.suggestions,
        executionTime: p.executionTime,
      })),
    };
  });
}

export default queryAnalyzerPlugin;
