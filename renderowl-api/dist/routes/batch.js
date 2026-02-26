import { z } from 'zod';
// ============================================================================
// Batch Operations System
// ============================================================================
// Allows clients to make multiple API calls in a single request
// ============================================================================
// Validation Schemas
// ============================================================================
const BatchOperationSchema = z.object({
    // Unique identifier for this operation in the batch (client-provided)
    id: z.string().min(1).max(64),
    // HTTP method
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    // API path (relative to /v1)
    path: z.string().regex(/^\/[a-zA-Z0-9_\-\/]+$/),
    // Request body (for POST/PUT/PATCH)
    body: z.record(z.unknown()).optional(),
    // Query parameters
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    // Headers to include
    headers: z.record(z.string()).optional(),
});
const BatchRequestSchema = z.object({
    // Operations to execute (max 50 per batch)
    operations: z.array(BatchOperationSchema).min(1).max(50),
    // Whether to stop on first error (default: false)
    stop_on_error: z.boolean().default(false),
});
// ============================================================================
// Route Handler
// ============================================================================
async function batchOperationsHandler(request, reply, fastify) {
    const startTime = Date.now();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    // Parse and validate request body
    let body;
    try {
        body = request.body;
    }
    catch {
        reply.status(400);
        return {
            batch_id: batchId,
            completed: false,
            completed_count: 0,
            failed_count: 0,
            total_count: 0,
            duration_ms: 0,
            results: [],
            errors: [{ id: 'body_parse', error: 'Invalid JSON body' }],
        };
    }
    // Validate request
    const validation = BatchRequestSchema.safeParse(body);
    if (!validation.success) {
        return handleBatchValidationError(validation.error, reply);
    }
    const { operations, stop_on_error = false } = validation.data;
    // Check for duplicate IDs
    const ids = operations.map((op) => op.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
        reply.status(400);
        return {
            batch_id: batchId,
            completed: false,
            completed_count: 0,
            failed_count: 0,
            total_count: operations.length,
            duration_ms: 0,
            results: [],
            errors: [{
                    id: 'batch_validation',
                    error: `Duplicate operation IDs: ${[...new Set(duplicates)].join(', ')}`,
                }],
        };
    }
    const results = [];
    let failedCount = 0;
    // Execute operations sequentially
    for (const operation of operations) {
        const opStartTime = Date.now();
        try {
            const result = await executeOperation(operation, fastify, request);
            results.push({
                ...result,
                duration_ms: Date.now() - opStartTime,
            });
            if (result.status >= 400) {
                failedCount++;
                if (stop_on_error)
                    break;
            }
        }
        catch (error) {
            failedCount++;
            results.push({
                id: operation.id,
                status: 500,
                body: {
                    type: 'https://api.renderowl.com/errors/batch-operation-failed',
                    title: 'Batch Operation Failed',
                    status: 500,
                    detail: error.message || 'Internal server error',
                    operation_id: operation.id,
                },
                error: true,
                duration_ms: Date.now() - opStartTime,
            });
            if (stop_on_error)
                break;
        }
    }
    const duration = Date.now() - startTime;
    return {
        batch_id: batchId,
        completed: true,
        completed_count: results.length - failedCount,
        failed_count: failedCount,
        total_count: operations.length,
        duration_ms: duration,
        results,
    };
}
// ============================================================================
// Operation Execution
// ============================================================================
async function executeOperation(operation, fastify, originalRequest) {
    // Build URL with query parameters
    let url = operation.path;
    if (operation.query && Object.keys(operation.query).length > 0) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(operation.query)) {
            params.append(key, String(value));
        }
        url += `?${params.toString()}`;
    }
    // Build headers
    const headers = {
        'content-type': 'application/json',
        ...(operation.headers || {}),
    };
    // Copy authorization from original request if not provided
    if (!headers.authorization && originalRequest.headers.authorization) {
        headers.authorization = originalRequest.headers.authorization;
    }
    // Make the internal request using fastify.inject()
    try {
        const response = await fastify.inject({
            method: operation.method,
            url: `/v1${url}`,
            headers,
            payload: operation.body ? JSON.stringify(operation.body) : undefined,
        });
        // Handle response - fastify.inject returns a Response-like object
        const responseObj = response;
        let body;
        try {
            body = JSON.parse(responseObj.payload);
        }
        catch {
            body = responseObj.payload;
        }
        return {
            id: operation.id,
            status: responseObj.statusCode,
            headers: responseObj.headers,
            body,
            error: responseObj.statusCode >= 400,
        };
    }
    catch (error) {
        return {
            id: operation.id,
            status: 500,
            body: {
                type: 'https://api.renderowl.com/errors/internal-error',
                title: 'Internal Server Error',
                status: 500,
                detail: error.message || 'Failed to execute operation',
                operation_id: operation.id,
            },
            error: true,
        };
    }
}
// ============================================================================
// Validation Error Handler
// ============================================================================
function handleBatchValidationError(error, reply) {
    const errors = error.errors.map((e) => ({
        field: e.path.join('.'),
        code: e.code,
        message: e.message,
    }));
    reply.status(400);
    return {
        batch_id: `batch_${Date.now()}_error`,
        completed: false,
        completed_count: 0,
        failed_count: 0,
        total_count: 0,
        duration_ms: 0,
        results: [],
        errors: errors.map((e) => ({
            id: e.field,
            error: e.message,
        })),
    };
}
// ============================================================================
// Route Registration
// ============================================================================
export default async function batchRoutes(fastify, _opts) {
    // POST /batch - Execute batch operations
    fastify.post('/', async (request, reply) => {
        const result = await batchOperationsHandler(request, reply, fastify);
        return reply.send(result);
    });
    // GET /batch/examples - Get example batch requests
    fastify.get('/examples', async (_request, reply) => {
        return reply.send({
            examples: [
                {
                    name: 'Create multiple renders',
                    description: 'Create several render jobs in one request',
                    request: {
                        operations: [
                            {
                                id: 'render-1',
                                method: 'POST',
                                path: '/projects/proj_123/renders',
                                body: {
                                    template_id: 'tmpl_abc',
                                    variables: { title: 'Video 1' },
                                },
                            },
                            {
                                id: 'render-2',
                                method: 'POST',
                                path: '/projects/proj_123/renders',
                                body: {
                                    template_id: 'tmpl_abc',
                                    variables: { title: 'Video 2' },
                                },
                            },
                        ],
                    },
                },
                {
                    name: 'Get project info and assets',
                    description: 'Fetch project details and assets in parallel',
                    request: {
                        operations: [
                            {
                                id: 'project-info',
                                method: 'GET',
                                path: '/projects/proj_123',
                            },
                            {
                                id: 'project-assets',
                                method: 'GET',
                                path: '/projects/proj_123/assets',
                                query: { limit: 10 },
                            },
                        ],
                    },
                },
                {
                    name: 'Update and trigger automation',
                    description: 'Update automation settings and trigger it',
                    request: {
                        stop_on_error: true,
                        operations: [
                            {
                                id: 'update-automation',
                                method: 'PATCH',
                                path: '/projects/proj_123/automations/auto_456',
                                body: {
                                    enabled: true,
                                },
                            },
                            {
                                id: 'trigger-automation',
                                method: 'POST',
                                path: '/projects/proj_123/automations/auto_456/trigger',
                                body: {
                                    data: { source: 'batch_api' },
                                },
                            },
                        ],
                    },
                },
            ],
        });
    });
    // GET /batch/limits - Get batch operation limits
    fastify.get('/limits', async (_request, reply) => {
        return reply.send({
            max_operations_per_batch: 50,
            supported_methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            rate_limit: {
                description: 'Batch operations count toward your rate limit as multiple requests',
                each_operation_counts: true,
            },
        });
    });
}
//# sourceMappingURL=batch.js.map