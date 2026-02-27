import { FastifyInstance, FastifyRequest } from 'fastify';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { EventEmitter } from 'events';
import crypto from 'crypto';

// ============================================================================
// API Key Management System
// ============================================================================

export type ApiKeyScope = 
  // Video operations
  | 'videos:read'
  | 'videos:write'
  | 'videos:delete'
  // Render operations
  | 'renders:read'
  | 'renders:write'
  | 'renders:delete'
  // Project operations
  | 'projects:read'
  | 'projects:write'
  | 'projects:delete'
  // Asset operations
  | 'assets:read'
  | 'assets:write'
  | 'assets:delete'
  // Automation operations
  | 'automations:read'
  | 'automations:write'
  | 'automations:trigger'
  // Webhook operations
  | 'webhooks:read'
  | 'webhooks:write'
  // Credit operations (read-only for API keys)
  | 'credits:read'
  // User profile (read-only)
  | 'user:read'
  // Batch operations
  | 'batch:execute'
  // Admin operations
  | 'admin:*';

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPreview: string; // First 8 chars + ***
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  useCount: number;
  allowedIps: string[] | null;
  allowedOrigins: string[] | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface ApiKeyCreateResult {
  apiKey: ApiKey;
  key: string; // The full key - only returned once!
}

// Database schema
const APIKEY_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_preview TEXT NOT NULL,
  scopes TEXT NOT NULL, -- JSON array
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at TEXT,
  last_used_at TEXT,
  use_count INTEGER NOT NULL DEFAULT 0,
  allowed_ips TEXT, -- JSON array
  allowed_origins TEXT, -- JSON array
  metadata TEXT, -- JSON object
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

-- API key usage log
CREATE TABLE IF NOT EXISTS api_key_usage (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  timestamp INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_timestamp ON api_key_usage(timestamp);
`;

// ============================================================================
// Scope Definitions
// ============================================================================

export const ALL_SCOPES: ApiKeyScope[] = [
  'videos:read', 'videos:write', 'videos:delete',
  'renders:read', 'renders:write', 'renders:delete',
  'projects:read', 'projects:write', 'projects:delete',
  'assets:read', 'assets:write', 'assets:delete',
  'automations:read', 'automations:write', 'automations:trigger',
  'webhooks:read', 'webhooks:write',
  'credits:read',
  'user:read',
  'batch:execute',
];

export const SCOPE_DESCRIPTIONS: Record<ApiKeyScope, string> = {
  'videos:read': 'Read video information and status',
  'videos:write': 'Create and update videos',
  'videos:delete': 'Delete videos',
  'renders:read': 'Read render jobs and outputs',
  'renders:write': 'Create render jobs',
  'renders:delete': 'Cancel and delete render jobs',
  'projects:read': 'Read project information',
  'projects:write': 'Create and update projects',
  'projects:delete': 'Delete projects',
  'assets:read': 'Read asset information',
  'assets:write': 'Upload and manage assets',
  'assets:delete': 'Delete assets',
  'automations:read': 'Read automation configurations',
  'automations:write': 'Create and update automations',
  'automations:trigger': 'Trigger automations manually',
  'webhooks:read': 'Read webhook configurations',
  'webhooks:write': 'Create and manage webhooks',
  'credits:read': 'Read credit balance and transactions',
  'user:read': 'Read user profile information',
  'batch:execute': 'Execute batch operations',
  'admin:*': 'Full administrative access',
};

// Predefined scope sets for common use cases
export const SCOPE_TEMPLATES = {
  'read-only': ['videos:read', 'renders:read', 'projects:read', 'assets:read', 'credits:read', 'user:read'],
  'video-renderer': ['videos:read', 'videos:write', 'renders:read', 'renders:write', 'assets:read', 'credits:read'],
  'automation-manager': ['automations:read', 'automations:write', 'automations:trigger', 'projects:read'],
  'webhook-manager': ['webhooks:read', 'webhooks:write', 'projects:read'],
  'full-access': [...ALL_SCOPES],
};

// ============================================================================
// API Key Service
// ============================================================================

export class ApiKeyService extends EventEmitter {
  private db: DatabaseType;

  constructor(dbPath: string) {
    super();
    this.db = new Database(dbPath);
    this.db.exec(APIKEY_SCHEMA_SQL);
  }

  /**
   * Create a new API key
   */
  createApiKey(params: {
    userId: string;
    name: string;
    scopes: ApiKeyScope[];
    expiresInDays?: number;
    allowedIps?: string[];
    allowedOrigins?: string[];
    metadata?: Record<string, unknown>;
  }): ApiKeyCreateResult {
    // Validate scopes
    const invalidScopes = params.scopes.filter(s => !ALL_SCOPES.includes(s) && s !== 'admin:*');
    if (invalidScopes.length > 0) {
      throw new Error(`Invalid scopes: ${invalidScopes.join(', ')}`);
    }

    const id = `ak_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const key = this.generateKey();
    const keyHash = this.hashKey(key);
    const keyPreview = key.substring(0, 8) + '***';
    const now = new Date().toISOString();

    const expiresAt = params.expiresInDays 
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const apiKey: ApiKey = {
      id,
      userId: params.userId,
      name: params.name,
      keyHash,
      keyPreview,
      scopes: params.scopes,
      status: 'active',
      expiresAt,
      lastUsedAt: null,
      useCount: 0,
      allowedIps: params.allowedIps || null,
      allowedOrigins: params.allowedOrigins || null,
      metadata: params.metadata || null,
      createdAt: now,
      revokedAt: null,
      revokedReason: null,
    };

    this.db.prepare(`
      INSERT INTO api_keys (
        id, user_id, name, key_hash, key_preview, scopes, status,
        expires_at, allowed_ips, allowed_origins, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run([
      apiKey.id,
      apiKey.userId,
      apiKey.name,
      apiKey.keyHash,
      apiKey.keyPreview,
      JSON.stringify(apiKey.scopes),
      apiKey.status,
      apiKey.expiresAt,
      apiKey.allowedIps ? JSON.stringify(apiKey.allowedIps) : null,
      apiKey.allowedOrigins ? JSON.stringify(apiKey.allowedOrigins) : null,
      apiKey.metadata ? JSON.stringify(apiKey.metadata) : null,
      apiKey.createdAt
    ]);

    this.emit('apikey:created', { apiKeyId: id, userId: params.userId });

    return { apiKey, key };
  }

  /**
   * Validate an API key and return associated user info
   */
  validateApiKey(key: string): {
    valid: boolean;
    apiKey?: ApiKey;
    error?: string;
  } {
    const keyHash = this.hashKey(key);
    const row = this.db.prepare('SELECT * FROM api_keys WHERE key_hash = ?').get(keyHash) as any;

    if (!row) {
      return { valid: false, error: 'Invalid API key' };
    }

    const apiKey = this.hydrateApiKey(row);

    // Check status
    if (apiKey.status === 'revoked') {
      return { valid: false, error: 'API key has been revoked' };
    }

    // Check expiration
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      this.expireApiKey(apiKey.id);
      return { valid: false, error: 'API key has expired' };
    }

    return { valid: true, apiKey };
  }

  /**
   * Check if API key has required scope
   */
  hasScope(apiKey: ApiKey, scope: ApiKeyScope): boolean {
    if (apiKey.scopes.includes('admin:*')) return true;
    return apiKey.scopes.includes(scope);
  }

  /**
   * Check if API key has any of the required scopes
   */
  hasAnyScope(apiKey: ApiKey, scopes: ApiKeyScope[]): boolean {
    if (apiKey.scopes.includes('admin:*')) return true;
    return scopes.some(scope => apiKey.scopes.includes(scope));
  }

  /**
   * Record API key usage
   */
  recordUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    ipAddress: string | undefined,
    userAgent: string | undefined,
    success: boolean,
    errorMessage?: string
  ): void {
    const id = `usage_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const timestamp = Math.floor(Date.now() / 1000);

    this.db.prepare(`
      INSERT INTO api_key_usage (id, api_key_id, endpoint, method, ip_address, user_agent, timestamp, success, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run([id, apiKeyId, endpoint, method, ipAddress || null, userAgent || null, timestamp, success, errorMessage || null]);

    // Update last used and count
    this.db.prepare(`
      UPDATE api_keys SET last_used_at = datetime('now'), use_count = use_count + 1 WHERE id = ?
    `).run([apiKeyId]);
  }

  /**
   * Get API key by ID (without hash)
   */
  getApiKey(id: string): ApiKey | null {
    const row = this.db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id) as any;
    return row ? this.hydrateApiKey(row) : null;
  }

  /**
   * Get all API keys for a user
   */
  getUserApiKeys(userId: string): ApiKey[] {
    const rows = this.db.prepare(
      'SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId) as any[];
    return rows.map(row => this.hydrateApiKey(row));
  }

  /**
   * Revoke an API key
   */
  revokeApiKey(id: string, reason?: string): boolean {
    const now = new Date().toISOString();

    const result = this.db.prepare(`
      UPDATE api_keys SET
        status = 'revoked',
        revoked_at = ?,
        revoked_reason = ?
      WHERE id = ? AND status = 'active'
    `).run([now, reason || null, id]);

    if (result.changes > 0) {
      this.emit('apikey:revoked', { apiKeyId: id, reason });
      return true;
    }

    return false;
  }

  /**
   * Update API key
   */
  updateApiKey(
    id: string,
    updates: Partial<Pick<ApiKey, 'name' | 'scopes' | 'allowedIps' | 'allowedOrigins' | 'metadata'>>
  ): ApiKey | null {
    const apiKey = this.getApiKey(id);
    if (!apiKey) return null;

    const sets: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      sets.push('name = ?');
      values.push(updates.name);
    }
    if (updates.scopes !== undefined) {
      sets.push('scopes = ?');
      values.push(JSON.stringify(updates.scopes));
    }
    if (updates.allowedIps !== undefined) {
      sets.push('allowed_ips = ?');
      values.push(updates.allowedIps ? JSON.stringify(updates.allowedIps) : null);
    }
    if (updates.allowedOrigins !== undefined) {
      sets.push('allowed_origins = ?');
      values.push(updates.allowedOrigins ? JSON.stringify(updates.allowedOrigins) : null);
    }
    if (updates.metadata !== undefined) {
      sets.push('metadata = ?');
      values.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
    }

    if (sets.length === 0) return apiKey;

    values.push(id);

    this.db.prepare(`UPDATE api_keys SET ${sets.join(', ')} WHERE id = ?`).run(values);

    return this.getApiKey(id);
  }

  /**
   * Get API key usage stats
   */
  getUsageStats(apiKeyId: string, days = 30): {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    callsByDay: Record<string, number>;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  } {
    const since = Math.floor(Date.now() / 1000) - days * 86400;

    const total = this.db.prepare(
      'SELECT COUNT(*) as count FROM api_key_usage WHERE api_key_id = ? AND timestamp > ?'
    ).get(apiKeyId, since) as { count: number };

    const successful = this.db.prepare(
      'SELECT COUNT(*) as count FROM api_key_usage WHERE api_key_id = ? AND timestamp > ? AND success = 1'
    ).get(apiKeyId, since) as { count: number };

    const failed = this.db.prepare(
      'SELECT COUNT(*) as count FROM api_key_usage WHERE api_key_id = ? AND timestamp > ? AND success = 0'
    ).get(apiKeyId, since) as { count: number };

    // Calls by day
    const dayRows = this.db.prepare(`
      SELECT DATE(datetime(timestamp, 'unixepoch')) as day, COUNT(*) as count
      FROM api_key_usage
      WHERE api_key_id = ? AND timestamp > ?
      GROUP BY day
      ORDER BY day DESC
    `).all(apiKeyId, since) as Array<{ day: string; count: number }>;

    const callsByDay: Record<string, number> = {};
    for (const row of dayRows) {
      callsByDay[row.day] = row.count;
    }

    // Top endpoints
    const endpointRows = this.db.prepare(`
      SELECT endpoint, COUNT(*) as count
      FROM api_key_usage
      WHERE api_key_id = ? AND timestamp > ?
      GROUP BY endpoint
      ORDER BY count DESC
      LIMIT 10
    `).all(apiKeyId, since) as Array<{ endpoint: string; count: number }>;

    return {
      totalCalls: total.count,
      successfulCalls: successful.count,
      failedCalls: failed.count,
      callsByDay,
      topEndpoints: endpointRows,
    };
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private generateKey(): string {
    // Format: ro_live_ + 48 random chars
    const prefix = 'ro_live_';
    const random = crypto.randomBytes(32).toString('base64url');
    return prefix + random;
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private expireApiKey(id: string): void {
    this.db.prepare("UPDATE api_keys SET status = 'expired' WHERE id = ?").run([id]);
  }

  private hydrateApiKey(row: any): ApiKey {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      keyHash: row.key_hash,
      keyPreview: row.key_preview,
      scopes: JSON.parse(row.scopes),
      status: row.status,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      useCount: row.use_count,
      allowedIps: row.allowed_ips ? JSON.parse(row.allowed_ips) : null,
      allowedOrigins: row.allowed_origins ? JSON.parse(row.allowed_origins) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: row.created_at,
      revokedAt: row.revoked_at,
      revokedReason: row.revoked_reason,
    };
  }

  close(): void {
    this.db.close();
  }
}

// ============================================================================
// Fastify Authentication Plugin
// ============================================================================

export interface ApiKeyAuthOptions {
  dbPath: string;
  headerName?: string;
  queryParamName?: string;
  allowAuthenticatedFallback?: boolean;
}

export async function apiKeyAuthPlugin(fastify: FastifyInstance, options: ApiKeyAuthOptions) {
  const service = new ApiKeyService(options.dbPath);
  const headerName = options.headerName || 'x-api-key';

  fastify.decorate('apiKeyService', service);

  // Add authentication hook
  fastify.addHook('onRequest', async (request: FastifyRequest, reply) => {
    // Skip if already authenticated
    if (request.user) return;

    // Check for API key in header
    let key = request.headers[headerName.toLowerCase()] as string | undefined;

    // Check query param if no header
    if (!key && options.queryParamName) {
      key = (request.query as any)?.[options.queryParamName];
    }

    if (!key) return; // No API key provided

    const validation = service.validateApiKey(key);

    if (!validation.valid) {
      reply.status(401).send({
        type: 'https://api.renderowl.com/errors/invalid-api-key',
        title: 'Invalid API Key',
        status: 401,
        detail: validation.error,
        instance: request.url,
      });
      return;
    }

    const apiKey = validation.apiKey!;

    // Check IP restrictions
    if (apiKey.allowedIps) {
      const clientIp = request.ip || request.socket.remoteAddress;
      if (clientIp && !apiKey.allowedIps.includes(clientIp)) {
        reply.status(403).send({
          type: 'https://api.renderowl.com/errors/ip-restricted',
          title: 'IP Not Allowed',
          status: 403,
          detail: 'Your IP address is not authorized to use this API key',
          instance: request.url,
        });
        return;
      }
    }

    // Check origin restrictions
    if (apiKey.allowedOrigins) {
      const origin = request.headers.origin;
      if (origin && !apiKey.allowedOrigins.includes(origin)) {
        reply.status(403).send({
          type: 'https://api.renderowl.com/errors/origin-restricted',
          title: 'Origin Not Allowed',
          status: 403,
          detail: 'Your origin is not authorized to use this API key',
          instance: request.url,
        });
        return;
      }
    }

    // Record usage
    service.recordUsage(
      apiKey.id,
      request.url,
      request.method,
      request.ip,
      request.headers['user-agent'],
      true
    );

    // Set user context with API key info
    request.user = {
      id: apiKey.userId,
      apiKeyId: apiKey.id,
      scopes: apiKey.scopes,
      authType: 'apiKey',
    };
  });

  // Cleanup on close
  fastify.addHook('onClose', async () => {
    service.close();
  });
}

// ============================================================================
// Scope Guard Helper
// ============================================================================

export function requireScopes(...requiredScopes: ApiKeyScope[]) {
  return async (request: FastifyRequest, reply: any) => {
    const user = request.user as any;

    if (!user) {
      reply.status(401).send({
        type: 'https://api.renderowl.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
      });
      return;
    }

    // If authenticated via JWT (not API key), allow all
    if (user.authType !== 'apiKey') return;

    const userScopes = user.scopes || [];
    const hasScope = userScopes.includes('admin:*') || 
      requiredScopes.some(scope => userScopes.includes(scope));

    if (!hasScope) {
      reply.status(403).send({
        type: 'https://api.renderowl.com/errors/insufficient-scope',
        title: 'Insufficient Scope',
        status: 403,
        detail: `This endpoint requires one of the following scopes: ${requiredScopes.join(', ')}`,
        required_scopes: requiredScopes,
        your_scopes: userScopes,
      });
      return;
    }
  };
}

export default ApiKeyService;
