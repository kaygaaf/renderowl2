import { ApiKeyService, SCOPE_TEMPLATES, ALL_SCOPES, SCOPE_DESCRIPTIONS } from '../lib/apikeys/index.js';
import { z } from 'zod';
// ============================================================================
// Validation Schemas
// ============================================================================
const CreateApiKeySchema = z.object({
    name: z.string().min(1).max(255),
    scopes: z.array(z.string()).min(1),
    template: z.enum(['read-only', 'video-renderer', 'automation-manager', 'webhook-manager', 'full-access']).optional(),
    expires_in_days: z.number().int().min(1).max(365).optional(),
    allowed_ips: z.array(z.string()).optional(),
    allowed_origins: z.array(z.string().url()).optional(),
});
const UpdateApiKeySchema = z.object({
    name: z.string().min(1).max(255).optional(),
    scopes: z.array(z.string()).min(1).optional(),
    allowed_ips: z.array(z.string()).optional(),
    allowed_origins: z.array(z.string().url()).optional(),
});
const RevokeApiKeySchema = z.object({
    reason: z.string().optional(),
});
// ============================================================================
// Helper Functions
// ============================================================================
const handleZodError = (error, reply, instance) => {
    const errors = error.errors.map((e) => ({
        field: e.path.join('.'),
        code: e.code,
        message: e.message,
    }));
    return reply.status(400).send({
        type: 'https://api.renderowl.com/errors/validation-failed',
        title: 'Validation Failed',
        status: 400,
        detail: 'The request body contains invalid data',
        instance,
        errors,
    });
};
// ============================================================================
// Route Factory
// ============================================================================
export default async function apiKeyRoutes(fastify, _opts) {
    const apiKeyService = new ApiKeyService(process.env.APIKEY_DB_PATH || './data/apikeys.db');
    // Decorate fastify with service
    fastify.decorate('apiKeyService', apiKeyService);
    // =======================================================================
    // List API Keys
    // =======================================================================
    fastify.get('/', async (request, reply) => {
        const userId = request.user?.id;
        const apiKeys = apiKeyService.getUserApiKeys(userId);
        return reply.send({
            data: apiKeys.map((key) => ({
                id: key.id,
                name: key.name,
                key_preview: key.keyPreview,
                scopes: key.scopes,
                status: key.status,
                expires_at: key.expiresAt,
                last_used_at: key.lastUsedAt,
                use_count: key.useCount,
                created_at: key.createdAt,
            })),
        });
    });
    fastify.post('/', async (request, reply) => {
        const userId = request.user?.id;
        const validation = CreateApiKeySchema.safeParse(request.body);
        if (!validation.success) {
            return handleZodError(validation.error, reply, '/user/api-keys');
        }
        const data = validation.data;
        // Use template scopes if provided, otherwise use provided scopes
        const scopes = data.template
            ? SCOPE_TEMPLATES[data.template]
            : data.scopes;
        if (!scopes) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-request',
                title: 'Invalid Request',
                status: 400,
                detail: 'Either scopes or template must be provided',
                instance: '/user/api-keys',
            });
        }
        try {
            const result = apiKeyService.createApiKey({
                userId,
                name: data.name,
                scopes: scopes,
                expiresInDays: data.expires_in_days,
                allowedIps: data.allowed_ips,
                allowedOrigins: data.allowed_origins,
            });
            request.log.info({ apiKeyId: result.apiKey.id, userId }, 'API key created');
            return reply.status(201).send({
                api_key: {
                    id: result.apiKey.id,
                    name: result.apiKey.name,
                    key_preview: result.apiKey.keyPreview,
                    scopes: result.apiKey.scopes,
                    status: result.apiKey.status,
                    expires_at: result.apiKey.expiresAt,
                    created_at: result.apiKey.createdAt,
                },
                key: result.key, // Full key - only shown once
                warning: 'This is the only time the full API key will be shown. Store it securely.',
            });
        }
        catch (error) {
            request.log.error(error, 'Failed to create API key');
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-request',
                title: 'Invalid Request',
                status: 400,
                detail: error.message,
                instance: '/user/api-keys',
            });
        }
    });
    fastify.get('/:key_id', async (request, reply) => {
        const userId = request.user?.id;
        const { key_id } = request.params;
        const apiKey = apiKeyService.getApiKey(key_id);
        if (!apiKey || apiKey.userId !== userId) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'API Key Not Found',
                status: 404,
                detail: `API key with ID "${key_id}" does not exist`,
                instance: `/user/api-keys/${key_id}`,
            });
        }
        const stats = apiKeyService.getUsageStats(key_id, 30);
        return reply.send({
            id: apiKey.id,
            name: apiKey.name,
            key_preview: apiKey.keyPreview,
            scopes: apiKey.scopes,
            status: apiKey.status,
            expires_at: apiKey.expiresAt,
            last_used_at: apiKey.lastUsedAt,
            use_count: apiKey.useCount,
            allowed_ips: apiKey.allowedIps,
            allowed_origins: apiKey.allowedOrigins,
            created_at: apiKey.createdAt,
            revoked_at: apiKey.revokedAt,
            revoked_reason: apiKey.revokedReason,
            stats,
        });
    });
    fastify.patch('/:key_id', async (request, reply) => {
        const userId = request.user?.id;
        const { key_id } = request.params;
        // Verify ownership
        const existing = apiKeyService.getApiKey(key_id);
        if (!existing || existing.userId !== userId) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'API Key Not Found',
                status: 404,
                detail: `API key with ID "${key_id}" does not exist`,
                instance: `/user/api-keys/${key_id}`,
            });
        }
        // Can only update active keys
        if (existing.status !== 'active') {
            return reply.status(409).send({
                type: 'https://api.renderowl.com/errors/api-key-inactive',
                title: 'API Key Inactive',
                status: 409,
                detail: `Cannot update ${existing.status} API key`,
                instance: `/user/api-keys/${key_id}`,
            });
        }
        const validation = UpdateApiKeySchema.safeParse(request.body);
        if (!validation.success) {
            return handleZodError(validation.error, reply, `/user/api-keys/${key_id}`);
        }
        const data = validation.data;
        const updated = apiKeyService.updateApiKey(key_id, {
            name: data.name,
            scopes: data.scopes,
            allowedIps: data.allowed_ips,
            allowedOrigins: data.allowed_origins,
        });
        request.log.info({ apiKeyId: key_id, userId }, 'API key updated');
        return reply.send({
            id: updated.id,
            name: updated.name,
            key_preview: updated.keyPreview,
            scopes: updated.scopes,
            status: updated.status,
            expires_at: updated.expiresAt,
            allowed_ips: updated.allowedIps,
            allowed_origins: updated.allowedOrigins,
            updated_at: new Date().toISOString(),
        });
    });
    fastify.delete('/:key_id', async (request, reply) => {
        const userId = request.user?.id;
        const { key_id } = request.params;
        // Verify ownership
        const existing = apiKeyService.getApiKey(key_id);
        if (!existing || existing.userId !== userId) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'API Key Not Found',
                status: 404,
                detail: `API key with ID "${key_id}" does not exist`,
                instance: `/user/api-keys/${key_id}`,
            });
        }
        const validation = RevokeApiKeySchema.safeParse(request.body || {});
        const reason = validation.success ? validation.data.reason : undefined;
        const success = apiKeyService.revokeApiKey(key_id, reason);
        if (success) {
            request.log.info({ apiKeyId: key_id, userId, reason }, 'API key revoked');
            return reply.status(204).send();
        }
        return reply.status(409).send({
            type: 'https://api.renderowl.com/errors/api-key-already-revoked',
            title: 'API Key Already Revoked',
            status: 409,
            detail: 'This API key has already been revoked',
            instance: `/user/api-keys/${key_id}`,
        });
    });
    fastify.get('/:key_id/stats', async (request, reply) => {
        const userId = request.user?.id;
        const { key_id } = request.params;
        const days = Math.min(request.query.days ?? 30, 90);
        // Verify ownership
        const apiKey = apiKeyService.getApiKey(key_id);
        if (!apiKey || apiKey.userId !== userId) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'API Key Not Found',
                status: 404,
                detail: `API key with ID "${key_id}" does not exist`,
                instance: `/user/api-keys/${key_id}/stats`,
            });
        }
        const stats = apiKeyService.getUsageStats(key_id, days);
        return reply.send({
            api_key_id: key_id,
            period_days: days,
            ...stats,
        });
    });
    // =======================================================================
    // List Available Scopes
    // =======================================================================
    fastify.get('/scopes', async (_request, reply) => {
        const scopes = ALL_SCOPES.map((scope) => ({
            scope,
            description: SCOPE_DESCRIPTIONS[scope],
        }));
        const templates = Object.entries(SCOPE_TEMPLATES).map(([name, templateScopes]) => ({
            name,
            scopes: templateScopes,
            description: getTemplateDescription(name),
        }));
        return reply.send({
            scopes,
            templates,
        });
    });
    // =======================================================================
    // Cleanup on close
    // =======================================================================
    fastify.addHook('onClose', async () => {
        apiKeyService.close();
    });
}
function getTemplateDescription(name) {
    const descriptions = {
        'read-only': 'Read access to all resources - for dashboards and reporting',
        'video-renderer': 'Create renders and manage videos - for rendering pipelines',
        'automation-manager': 'Manage and trigger automations - for workflow tools',
        'webhook-manager': 'Configure webhooks - for integration platforms',
        'full-access': 'Full access to all API endpoints - for complete control',
    };
    return descriptions[name] || '';
}
//# sourceMappingURL=apikeys.js.map