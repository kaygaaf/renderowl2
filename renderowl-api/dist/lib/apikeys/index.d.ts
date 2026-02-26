import { FastifyInstance, FastifyRequest } from 'fastify';
import { EventEmitter } from 'events';
export type ApiKeyScope = 'videos:read' | 'videos:write' | 'videos:delete' | 'renders:read' | 'renders:write' | 'renders:delete' | 'projects:read' | 'projects:write' | 'projects:delete' | 'assets:read' | 'assets:write' | 'assets:delete' | 'automations:read' | 'automations:write' | 'automations:trigger' | 'webhooks:read' | 'webhooks:write' | 'credits:read' | 'user:read' | 'batch:execute' | 'admin:*';
export type ApiKeyStatus = 'active' | 'revoked' | 'expired';
export interface ApiKey {
    id: string;
    userId: string;
    name: string;
    keyHash: string;
    keyPreview: string;
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
    key: string;
}
export declare const ALL_SCOPES: ApiKeyScope[];
export declare const SCOPE_DESCRIPTIONS: Record<ApiKeyScope, string>;
export declare const SCOPE_TEMPLATES: {
    'read-only': string[];
    'video-renderer': string[];
    'automation-manager': string[];
    'webhook-manager': string[];
    'full-access': ApiKeyScope[];
};
export declare class ApiKeyService extends EventEmitter {
    private db;
    constructor(dbPath: string);
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
    }): ApiKeyCreateResult;
    /**
     * Validate an API key and return associated user info
     */
    validateApiKey(key: string): {
        valid: boolean;
        apiKey?: ApiKey;
        error?: string;
    };
    /**
     * Check if API key has required scope
     */
    hasScope(apiKey: ApiKey, scope: ApiKeyScope): boolean;
    /**
     * Check if API key has any of the required scopes
     */
    hasAnyScope(apiKey: ApiKey, scopes: ApiKeyScope[]): boolean;
    /**
     * Record API key usage
     */
    recordUsage(apiKeyId: string, endpoint: string, method: string, ipAddress: string | undefined, userAgent: string | undefined, success: boolean, errorMessage?: string): void;
    /**
     * Get API key by ID (without hash)
     */
    getApiKey(id: string): ApiKey | null;
    /**
     * Get all API keys for a user
     */
    getUserApiKeys(userId: string): ApiKey[];
    /**
     * Revoke an API key
     */
    revokeApiKey(id: string, reason?: string): boolean;
    /**
     * Update API key
     */
    updateApiKey(id: string, updates: Partial<Pick<ApiKey, 'name' | 'scopes' | 'allowedIps' | 'allowedOrigins' | 'metadata'>>): ApiKey | null;
    /**
     * Get API key usage stats
     */
    getUsageStats(apiKeyId: string, days?: number): {
        totalCalls: number;
        successfulCalls: number;
        failedCalls: number;
        callsByDay: Record<string, number>;
        topEndpoints: Array<{
            endpoint: string;
            count: number;
        }>;
    };
    private generateKey;
    private hashKey;
    private expireApiKey;
    private hydrateApiKey;
    close(): void;
}
export interface ApiKeyAuthOptions {
    dbPath: string;
    headerName?: string;
    queryParamName?: string;
    allowAuthenticatedFallback?: boolean;
}
export declare function apiKeyAuthPlugin(fastify: FastifyInstance, options: ApiKeyAuthOptions): Promise<void>;
export declare function requireScopes(...requiredScopes: ApiKeyScope[]): (request: FastifyRequest, reply: any) => Promise<void>;
export default ApiKeyService;
//# sourceMappingURL=index.d.ts.map