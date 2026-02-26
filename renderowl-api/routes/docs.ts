import { FastifyInstance } from 'fastify';

// ============================================================================
// API Documentation System
// ============================================================================
// Auto-generates OpenAPI 3.0 documentation from route definitions

// ============================================================================
// OpenAPI Schema
// ============================================================================

const OPENAPI_VERSION = '3.0.3';
const API_VERSION = '1.0.0';
const API_TITLE = 'RenderOwl API';
const API_DESCRIPTION = `
# RenderOwl API

RenderOwl is a powerful video generation and automation platform. This API allows you to:

- **Create and manage video projects** - Organize your video assets and templates
- **Render videos programmatically** - Generate videos from templates with dynamic data
- **Manage automations** - Set up scheduled and triggered video generation workflows
- **Handle webhooks** - Receive real-time notifications about video and render events
- **Manage credits** - Track and purchase rendering credits

## Authentication

The API supports two authentication methods:

### 1. Bearer Token (JWT)
For user-authenticated requests from the web application:
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

### 2. API Key
For server-to-server integrations and automation:
\`\`\`
X-API-Key: ro_live_<your_api_key>
\`\`\`

API keys can be created in your account settings and have granular scope permissions.

## Rate Limiting

API requests are rate-limited based on your plan tier:

| Tier | Requests per Minute (API Key) | Requests per Minute (Authenticated) |
|------|------------------------------|-------------------------------------|
| Free | 100 | 30 |
| Starter | 1,000 | 100 |
| Creator | 5,000 | 500 |
| Pro | 20,000 | 2,000 |
| Enterprise | 100,000 | 10,000 |

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\` - Maximum requests per window
- \`X-RateLimit-Remaining\` - Remaining requests in current window
- \`X-RateLimit-Reset\` - Unix timestamp when the window resets
- \`Retry-After\` - Seconds to wait before retrying (429 responses only)

## Error Handling

The API uses standard HTTP status codes and returns structured error responses:

\`\`\`json
{
  "type": "https://api.renderowl.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 400,
  "detail": "The request body contains invalid data",
  "instance": "/v1/projects/proj_123/renders",
  "errors": [
    {
      "field": "template_id",
      "code": "invalid_type",
      "message": "Required"
    }
  ]
}
\`\`\`

Common status codes:
- \`200\` - Success
- \`201\` - Created
- \`400\` - Bad Request (validation error)
- \`401\` - Unauthorized (authentication required)
- \`403\` - Forbidden (insufficient permissions)
- \`404\` - Not Found
- \`409\` - Conflict (e.g., duplicate idempotency key)
- \`429\` - Rate Limit Exceeded
- \`500\` - Internal Server Error

## Webhooks

Register webhook endpoints to receive real-time event notifications:

- \`video.created\` - New video created
- \`video.completed\` - Video rendering completed
- \`video.failed\` - Video rendering failed
- \`credits.low\` - Credit balance below threshold
- \`render.started\` - Render job started
- \`render.completed\` - Render job completed
- \`render.failed\` - Render job failed

Webhook payloads are signed with HMAC-SHA256. Verify signatures using the webhook secret.

## Batch Operations

Execute multiple API calls in a single request:

\`\`\`
POST /v1/batch
{
  "operations": [
    { "id": "1", "method": "GET", "path": "/projects/proj_123" },
    { "id": "2", "method": "GET", "path": "/projects/proj_123/assets" }
  ]
}
\`\`\`

See the \`/batch\` endpoint for details.

## SDKs and Tools

- **JavaScript/TypeScript SDK**: \`npm install @renderowl/sdk\`
- **Python SDK**: \`pip install renderowl\`
- **CLI Tool**: \`npm install -g @renderowl/cli\`

For more information, visit [docs.renderowl.com](https://docs.renderowl.com).
`;

// ============================================================================
// OpenAPI Document Generator
// ============================================================================

export function generateOpenAPIDocument(): Record<string, unknown> {
  return {
    openapi: OPENAPI_VERSION,
    info: {
      title: API_TITLE,
      description: API_DESCRIPTION,
      version: API_VERSION,
      contact: {
        name: 'RenderOwl Support',
        email: 'support@renderowl.com',
        url: 'https://renderowl.com/support',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'https://api.renderowl.com/v1',
        description: 'Production server',
      },
      {
        url: 'https://api.staging.renderowl.com/v1',
        description: 'Staging server',
      },
      {
        url: 'http://localhost:8000/v1',
        description: 'Local development',
      },
    ],
    security: [
      { bearerAuth: [] },
      { apiKeyAuth: [] },
    ],
    paths: generatePaths(),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for user authentication',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for server-to-server authentication',
        },
      },
      schemas: generateSchemas(),
      responses: generateResponses(),
      parameters: generateParameters(),
      headers: generateHeaders(),
    },
    tags: generateTags(),
    externalDocs: {
      description: 'Full Documentation',
      url: 'https://docs.renderowl.com',
    },
  };
}

// ============================================================================
// Path Definitions
// ============================================================================

function generatePaths(): Record<string, unknown> {
  return {
    // Health
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Check API health and system status',
        operationId: 'healthCheck',
        security: [],
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },

    // Projects
    '/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List projects',
        description: 'Get a list of all projects for the authenticated user',
        operationId: 'listProjects',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/PerPageParam' },
        ],
        responses: {
          '200': {
            description: 'List of projects',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectListResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '429': { $ref: '#/components/responses/RateLimitError' },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create project',
        description: 'Create a new video project',
        operationId: 'createProject',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProjectRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Project created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Project' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '429': { $ref: '#/components/responses/RateLimitError' },
        },
      },
    },

    '/projects/{project_id}': {
      get: {
        tags: ['Projects'],
        summary: 'Get project',
        description: 'Get details for a specific project',
        operationId: 'getProject',
        parameters: [{ $ref: '#/components/parameters/ProjectIdParam' }],
        responses: {
          '200': {
            description: 'Project details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Project' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
      patch: {
        tags: ['Projects'],
        summary: 'Update project',
        description: 'Update project details',
        operationId: 'updateProject',
        parameters: [{ $ref: '#/components/parameters/ProjectIdParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProjectRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Project updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Project' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete project',
        description: 'Delete a project and all associated data',
        operationId: 'deleteProject',
        parameters: [{ $ref: '#/components/parameters/ProjectIdParam' }],
        responses: {
          '204': { description: 'Project deleted' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },

    // Renders
    '/projects/{project_id}/renders': {
      get: {
        tags: ['Renders'],
        summary: 'List renders',
        description: 'Get all render jobs for a project',
        operationId: 'listRenders',
        parameters: [
          { $ref: '#/components/parameters/ProjectIdParam' },
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/PerPageParam' },
          { $ref: '#/components/parameters/StatusParam' },
        ],
        responses: {
          '200': {
            description: 'List of renders',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RenderListResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Renders'],
        summary: 'Create render',
        description: 'Submit a new video render job',
        operationId: 'createRender',
        parameters: [
          { $ref: '#/components/parameters/ProjectIdParam' },
          { $ref: '#/components/parameters/IdempotencyKeyParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateRenderRequest' },
            },
          },
        },
        responses: {
          '202': {
            description: 'Render job accepted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RenderJob' },
              },
            },
          },
          '402': { $ref: '#/components/responses/InsufficientCreditsError' },
          '409': { $ref: '#/components/responses/IdempotencyConflictError' },
        },
      },
    },

    // Automations
    '/projects/{project_id}/automations': {
      get: {
        tags: ['Automations'],
        summary: 'List automations',
        description: 'Get all automations for a project',
        operationId: 'listAutomations',
        parameters: [
          { $ref: '#/components/parameters/ProjectIdParam' },
          { $ref: '#/components/parameters/EnabledParam' },
        ],
        responses: {
          '200': {
            description: 'List of automations',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AutomationListResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Automations'],
        summary: 'Create automation',
        description: 'Create a new automation for scheduled or triggered video generation',
        operationId: 'createAutomation',
        parameters: [{ $ref: '#/components/parameters/ProjectIdParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateAutomationRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Automation created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Automation' },
              },
            },
          },
        },
      },
    },

    '/projects/{project_id}/automations/{automation_id}': {
      get: {
        tags: ['Automations'],
        summary: 'Get automation',
        description: 'Get automation details',
        operationId: 'getAutomation',
        parameters: [
          { $ref: '#/components/parameters/ProjectIdParam' },
          { $ref: '#/components/parameters/AutomationIdParam' },
        ],
        responses: {
          '200': {
            description: 'Automation details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Automation' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Automations'],
        summary: 'Update automation',
        description: 'Update automation configuration',
        operationId: 'updateAutomation',
        parameters: [
          { $ref: '#/components/parameters/ProjectIdParam' },
          { $ref: '#/components/parameters/AutomationIdParam' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateAutomationRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Automation updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Automation' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Automations'],
        summary: 'Delete automation',
        description: 'Delete an automation',
        operationId: 'deleteAutomation',
        parameters: [
          { $ref: '#/components/parameters/ProjectIdParam' },
          { $ref: '#/components/parameters/AutomationIdParam' },
        ],
        responses: {
          '204': { description: 'Automation deleted' },
        },
      },
    },

    '/projects/{project_id}/automations/{automation_id}/trigger': {
      post: {
        tags: ['Automations'],
        summary: 'Trigger automation',
        description: 'Manually trigger an automation',
        operationId: 'triggerAutomation',
        parameters: [
          { $ref: '#/components/parameters/ProjectIdParam' },
          { $ref: '#/components/parameters/AutomationIdParam' },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TriggerAutomationRequest' },
            },
          },
        },
        responses: {
          '202': {
            description: 'Automation triggered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AutomationExecution' },
              },
            },
          },
        },
      },
    },

    // Webhooks
    '/webhooks': {
      get: {
        tags: ['Webhooks'],
        summary: 'List webhooks',
        description: 'Get all configured webhook endpoints',
        operationId: 'listWebhooks',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/PerPageParam' },
          { $ref: '#/components/parameters/StatusParam' },
        ],
        responses: {
          '200': {
            description: 'List of webhooks',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WebhookListResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Create webhook',
        description: 'Register a new webhook endpoint',
        operationId: 'createWebhook',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateWebhookRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Webhook' },
              },
            },
          },
        },
      },
    },

    '/webhooks/{webhook_id}': {
      get: {
        tags: ['Webhooks'],
        summary: 'Get webhook',
        description: 'Get webhook details',
        operationId: 'getWebhook',
        parameters: [{ $ref: '#/components/parameters/WebhookIdParam' }],
        responses: {
          '200': {
            description: 'Webhook details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Webhook' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Webhooks'],
        summary: 'Update webhook',
        description: 'Update webhook configuration',
        operationId: 'updateWebhook',
        parameters: [{ $ref: '#/components/parameters/WebhookIdParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateWebhookRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Webhook updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Webhook' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Webhooks'],
        summary: 'Delete webhook',
        description: 'Delete a webhook endpoint',
        operationId: 'deleteWebhook',
        parameters: [{ $ref: '#/components/parameters/WebhookIdParam' }],
        responses: {
          '204': { description: 'Webhook deleted' },
        },
      },
    },

    '/webhooks/{webhook_id}/deliveries': {
      get: {
        tags: ['Webhooks'],
        summary: 'List deliveries',
        description: 'Get delivery history for a webhook',
        operationId: 'listWebhookDeliveries',
        parameters: [
          { $ref: '#/components/parameters/WebhookIdParam' },
          { $ref: '#/components/parameters/LimitParam' },
        ],
        responses: {
          '200': {
            description: 'List of deliveries',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WebhookDeliveryListResponse' },
              },
            },
          },
        },
      },
    },

    '/webhooks/{webhook_id}/test': {
      post: {
        tags: ['Webhooks'],
        summary: 'Test webhook',
        description: 'Send a test event to a webhook endpoint',
        operationId: 'testWebhook',
        parameters: [{ $ref: '#/components/parameters/WebhookIdParam' }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TestWebhookRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Test event sent',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TestWebhookResponse' },
              },
            },
          },
        },
      },
    },

    '/webhooks/events': {
      get: {
        tags: ['Webhooks'],
        summary: 'List webhook events',
        description: 'Get all available webhook event types',
        operationId: 'listWebhookEvents',
        responses: {
          '200': {
            description: 'List of webhook events',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WebhookEventListResponse' },
              },
            },
          },
        },
      },
    },

    // Credits
    '/credits/balance': {
      get: {
        tags: ['Credits'],
        summary: 'Get credit balance',
        description: 'Get current credit balance and subscription status',
        operationId: 'getCreditBalance',
        responses: {
          '200': {
            description: 'Credit balance',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreditBalance' },
              },
            },
          },
        },
      },
    },

    '/credits/calculate-cost': {
      post: {
        tags: ['Credits'],
        summary: 'Calculate render cost',
        description: 'Calculate credit cost for a video render before submitting',
        operationId: 'calculateCost',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CalculateCostRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cost calculation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CalculateCostResponse' },
              },
            },
          },
        },
      },
    },

    // Batch
    '/batch': {
      post: {
        tags: ['Batch'],
        summary: 'Execute batch operations',
        description: 'Execute multiple API calls in a single request',
        operationId: 'batchOperations',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BatchRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Batch results',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchResponse' },
              },
            },
          },
        },
      },
    },

    '/batch/examples': {
      get: {
        tags: ['Batch'],
        summary: 'Get batch examples',
        description: 'Get example batch requests',
        operationId: 'getBatchExamples',
        responses: {
          '200': {
            description: 'Batch examples',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchExamplesResponse' },
              },
            },
          },
        },
      },
    },

    // API Keys
    '/user/api-keys': {
      get: {
        tags: ['API Keys'],
        summary: 'List API keys',
        description: 'Get all API keys for the authenticated user',
        operationId: 'listApiKeys',
        responses: {
          '200': {
            description: 'List of API keys',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiKeyListResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['API Keys'],
        summary: 'Create API key',
        description: 'Create a new API key with specific scopes',
        operationId: 'createApiKey',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateApiKeyRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'API key created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiKeyCreateResponse' },
              },
            },
          },
        },
      },
    },

    '/user/api-keys/{key_id}': {
      get: {
        tags: ['API Keys'],
        summary: 'Get API key',
        description: 'Get API key details',
        operationId: 'getApiKey',
        parameters: [{ $ref: '#/components/parameters/ApiKeyIdParam' }],
        responses: {
          '200': {
            description: 'API key details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiKey' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['API Keys'],
        summary: 'Revoke API key',
        description: 'Revoke an API key',
        operationId: 'revokeApiKey',
        parameters: [{ $ref: '#/components/parameters/ApiKeyIdParam' }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RevokeApiKeyRequest' },
            },
          },
        },
        responses: {
          '204': { description: 'API key revoked' },
        },
      },
    },
  };
}

// ============================================================================
// Schema Definitions
// ============================================================================

function generateSchemas(): Record<string, unknown> {
  return {
    // Error schemas
    Error: {
      type: 'object',
      required: ['type', 'title', 'status', 'detail', 'instance'],
      properties: {
        type: { type: 'string', format: 'uri' },
        title: { type: 'string' },
        status: { type: 'integer' },
        detail: { type: 'string' },
        instance: { type: 'string' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },

    // Health
    HealthResponse: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded'] },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        uptime: { type: 'string' },
        memory: {
          type: 'object',
          properties: {
            used_mb: { type: 'integer' },
            total_mb: { type: 'integer' },
          },
        },
        queue: {
          type: 'object',
          properties: {
            workerId: { type: 'string' },
            isRunning: { type: 'boolean' },
            stalledJobs: { type: 'integer' },
          },
        },
      },
    },

    // Projects
    Project: {
      type: 'object',
      required: ['id', 'name', 'status', 'created_at', 'updated_at'],
      properties: {
        id: { type: 'string', pattern: '^proj_[a-zA-Z0-9]{10,}$' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', nullable: true, maxLength: 2000 },
        status: { type: 'string', enum: ['active', 'archived'] },
        settings: { $ref: '#/components/schemas/ProjectSettings' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        created_by: { type: 'string' },
        asset_count: { type: 'integer', minimum: 0 },
        render_count: { type: 'integer', minimum: 0 },
      },
    },
    ProjectSettings: {
      type: 'object',
      properties: {
        default_width: { type: 'integer', default: 1080 },
        default_height: { type: 'integer', default: 1920 },
        default_fps: { type: 'integer', default: 30 },
        default_duration_sec: { type: 'number', default: 60 },
      },
    },
    CreateProjectRequest: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', maxLength: 2000 },
        settings: { $ref: '#/components/schemas/ProjectSettings' },
      },
    },
    UpdateProjectRequest: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', maxLength: 2000 },
        settings: { $ref: '#/components/schemas/ProjectSettings' },
      },
    },
    ProjectListResponse: {
      type: 'object',
      required: ['data', 'pagination'],
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
        pagination: { $ref: '#/components/schemas/Pagination' },
      },
    },

    // Renders
    RenderJob: {
      type: 'object',
      required: ['id', 'project_id', 'status', 'created_at'],
      properties: {
        id: { type: 'string', pattern: '^rnd_[a-zA-Z0-9]{10,}$' },
        project_id: { type: 'string' },
        template_id: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] },
        progress: { type: 'number', minimum: 0, maximum: 100 },
        output_url: { type: 'string', nullable: true },
        error: { type: 'string', nullable: true },
        credits_deducted: { type: 'integer', minimum: 0 },
        created_at: { type: 'string', format: 'date-time' },
        started_at: { type: 'string', format: 'date-time', nullable: true },
        completed_at: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    CreateRenderRequest: {
      type: 'object',
      required: ['template_id'],
      properties: {
        template_id: { type: 'string' },
        variables: { type: 'object' },
        settings: {
          type: 'object',
          properties: {
            quality: { type: 'string', enum: ['draft', 'standard', 'high', 'ultra'] },
            format: { type: 'string', enum: ['mp4', 'webm', 'mov'] },
          },
        },
        webhook_url: { type: 'string', format: 'uri' },
      },
    },
    RenderListResponse: {
      type: 'object',
      required: ['data', 'pagination'],
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/RenderJob' } },
        pagination: { $ref: '#/components/schemas/Pagination' },
      },
    },

    // Automations
    Automation: {
      type: 'object',
      required: ['id', 'project_id', 'name', 'enabled', 'trigger', 'actions', 'created_at'],
      properties: {
        id: { type: 'string', pattern: '^auto_[a-zA-Z0-9]{10,}$' },
        project_id: { type: 'string' },
        name: { type: 'string' },
        enabled: { type: 'boolean' },
        trigger: { type: 'object' },
        actions: { type: 'array', items: { type: 'object' } },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        last_triggered_at: { type: 'string', format: 'date-time', nullable: true },
        trigger_count: { type: 'integer', minimum: 0 },
      },
    },
    CreateAutomationRequest: {
      type: 'object',
      required: ['name', 'trigger', 'actions'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
        trigger: {
          type: 'object',
          required: ['type'],
          properties: {
            type: { type: 'string', enum: ['cron', 'webhook', 'manual', 'event'] },
            config: { type: 'object' },
          },
        },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type'],
            properties: {
              type: { type: 'string' },
              config: { type: 'object' },
            },
          },
        },
        enabled: { type: 'boolean', default: true },
      },
    },
    UpdateAutomationRequest: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
        trigger: { type: 'object' },
        actions: { type: 'array', items: { type: 'object' } },
        enabled: { type: 'boolean' },
      },
    },
    TriggerAutomationRequest: {
      type: 'object',
      properties: {
        data: { type: 'object' },
      },
    },
    AutomationExecution: {
      type: 'object',
      properties: {
        execution_id: { type: 'string' },
        job_id: { type: 'string' },
        status: { type: 'string', enum: ['queued', 'running', 'completed', 'failed'] },
      },
    },
    AutomationListResponse: {
      type: 'object',
      required: ['data', 'pagination'],
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/Automation' } },
        pagination: { $ref: '#/components/schemas/Pagination' },
      },
    },

    // Webhooks
    Webhook: {
      type: 'object',
      required: ['id', 'url', 'events', 'status', 'created_at'],
      properties: {
        id: { type: 'string' },
        url: { type: 'string', format: 'uri' },
        events: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['active', 'inactive', 'disabled'] },
        description: { type: 'string', nullable: true },
        headers: { type: 'object', nullable: true },
        max_retries: { type: 'integer' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        last_triggered_at: { type: 'string', format: 'date-time', nullable: true },
        last_success_at: { type: 'string', format: 'date-time', nullable: true },
        last_failure_at: { type: 'string', format: 'date-time', nullable: true },
        success_count: { type: 'integer' },
        failure_count: { type: 'integer' },
      },
    },
    CreateWebhookRequest: {
      type: 'object',
      required: ['url', 'events'],
      properties: {
        url: { type: 'string', format: 'uri' },
        events: { type: 'array', items: { type: 'string' }, minItems: 1 },
        description: { type: 'string', maxLength: 500 },
        headers: { type: 'object', additionalProperties: { type: 'string' } },
        max_retries: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
      },
    },
    UpdateWebhookRequest: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
        events: { type: 'array', items: { type: 'string' }, minItems: 1 },
        status: { type: 'string', enum: ['active', 'inactive'] },
        description: { type: 'string', maxLength: 500 },
        headers: { type: 'object', additionalProperties: { type: 'string' } },
        max_retries: { type: 'integer', minimum: 1, maximum: 10 },
      },
    },
    TestWebhookRequest: {
      type: 'object',
      required: ['event'],
      properties: {
        event: { type: 'string' },
        payload: { type: 'object' },
      },
    },
    TestWebhookResponse: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        delivery_ids: { type: 'array', items: { type: 'string' } },
        event: { type: 'string' },
        triggered_at: { type: 'string', format: 'date-time' },
      },
    },
    WebhookDelivery: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        event: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'delivered', 'failed', 'retrying'] },
        attempt_count: { type: 'integer' },
        response_status: { type: 'integer', nullable: true },
        error: { type: 'string', nullable: true },
        duration_ms: { type: 'integer', nullable: true },
        created_at: { type: 'string', format: 'date-time' },
        completed_at: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    WebhookListResponse: {
      type: 'object',
      required: ['data', 'pagination'],
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/Webhook' } },
        pagination: { $ref: '#/components/schemas/Pagination' },
      },
    },
    WebhookDeliveryListResponse: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/WebhookDelivery' } },
        webhook_id: { type: 'string' },
      },
    },
    WebhookEventListResponse: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              event: { type: 'string' },
              description: { type: 'string' },
              payload_schema: { type: 'object' },
            },
          },
        },
      },
    },

    // Credits
    CreditBalance: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        credits_balance: { type: 'integer', minimum: 0 },
        plan_tier: { type: 'string', enum: ['trial', 'starter', 'creator', 'pro'] },
        trial_expires_at: { type: 'string', format: 'date-time', nullable: true },
        subscription_status: { type: 'string', enum: ['active', 'cancelled', 'past_due', 'none'] },
        subscription_expires_at: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    CalculateCostRequest: {
      type: 'object',
      required: ['video_type'],
      properties: {
        video_type: { type: 'string', enum: ['short', 'medium', 'long', 'custom'] },
        scene_count: { type: 'integer', minimum: 1 },
        duration_seconds: { type: 'integer', minimum: 1 },
        include_images: { type: 'boolean', default: true },
        include_voiceover: { type: 'boolean', default: true },
        include_sfx: { type: 'boolean', default: false },
      },
    },
    CalculateCostResponse: {
      type: 'object',
      required: ['credits', 'cost_eur', 'breakdown'],
      properties: {
        credits: { type: 'integer', minimum: 0 },
        cost_eur: { type: 'number', minimum: 0 },
        breakdown: {
          type: 'object',
          properties: {
            base_cost: { type: 'integer' },
            image_cost: { type: 'integer' },
            voiceover_cost: { type: 'integer' },
            sfx_cost: { type: 'integer' },
          },
        },
      },
    },

    // Batch
    BatchRequest: {
      type: 'object',
      required: ['operations'],
      properties: {
        operations: {
          type: 'array',
          items: { $ref: '#/components/schemas/BatchOperation' },
          minItems: 1,
          maxItems: 50,
        },
        stop_on_error: { type: 'boolean', default: false },
        timeout_seconds: { type: 'integer', minimum: 1, maximum: 60, default: 30 },
      },
    },
    BatchOperation: {
      type: 'object',
      required: ['id', 'method', 'path'],
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 64 },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        path: { type: 'string' },
        body: { type: 'object' },
        query: { type: 'object' },
        headers: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    BatchResponse: {
      type: 'object',
      required: ['batch_id', 'completed', 'completed_count', 'failed_count', 'total_count', 'duration_ms', 'results'],
      properties: {
        batch_id: { type: 'string' },
        completed: { type: 'boolean' },
        completed_count: { type: 'integer' },
        failed_count: { type: 'integer' },
        total_count: { type: 'integer' },
        duration_ms: { type: 'integer' },
        results: {
          type: 'array',
          items: { $ref: '#/components/schemas/BatchOperationResult' },
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    BatchOperationResult: {
      type: 'object',
      required: ['id', 'status', 'body', 'duration_ms'],
      properties: {
        id: { type: 'string' },
        status: { type: 'integer' },
        headers: { type: 'object' },
        body: {},
        error: { type: 'boolean' },
        duration_ms: { type: 'integer' },
      },
    },
    BatchExamplesResponse: {
      type: 'object',
      properties: {
        examples: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              request: { $ref: '#/components/schemas/BatchRequest' },
            },
          },
        },
      },
    },

    // API Keys
    ApiKey: {
      type: 'object',
      required: ['id', 'name', 'scopes', 'status', 'created_at'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        key_preview: { type: 'string' },
        scopes: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['active', 'revoked', 'expired'] },
        expires_at: { type: 'string', format: 'date-time', nullable: true },
        last_used_at: { type: 'string', format: 'date-time', nullable: true },
        use_count: { type: 'integer' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
    CreateApiKeyRequest: {
      type: 'object',
      required: ['name', 'scopes'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
        scopes: { type: 'array', items: { type: 'string' }, minItems: 1 },
        expires_in_days: { type: 'integer', minimum: 1, maximum: 365 },
        allowed_ips: { type: 'array', items: { type: 'string' } },
        allowed_origins: { type: 'array', items: { type: 'string' } },
      },
    },
    ApiKeyCreateResponse: {
      type: 'object',
      properties: {
        api_key: { $ref: '#/components/schemas/ApiKey' },
        key: { type: 'string', description: 'The full API key - only shown once!' },
      },
    },
    RevokeApiKeyRequest: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
      },
    },
    ApiKeyListResponse: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/ApiKey' } },
      },
    },

    // Common
    Pagination: {
      type: 'object',
      required: ['page', 'per_page', 'total', 'total_pages'],
      properties: {
        page: { type: 'integer', minimum: 1 },
        per_page: { type: 'integer', minimum: 1 },
        total: { type: 'integer', minimum: 0 },
        total_pages: { type: 'integer', minimum: 0 },
      },
    },
  };
}

// ============================================================================
// Response Definitions
// ============================================================================

function generateResponses(): Record<string, unknown> {
  return {
    UnauthorizedError: {
      description: 'Unauthorized - Bearer token or API key required',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
    NotFoundError: {
      description: 'Resource not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
    ValidationError: {
      description: 'Validation failed',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
    RateLimitError: {
      description: 'Rate limit exceeded',
      headers: {
        'Retry-After': {
          description: 'Seconds to wait before retrying',
          schema: { type: 'integer' },
        },
      },
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
    InsufficientCreditsError: {
      description: 'Insufficient credits for this operation',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
    IdempotencyConflictError: {
      description: 'Idempotency key conflict - request already being processed',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  };
}

// ============================================================================
// Parameter Definitions
// ============================================================================

function generateParameters(): Record<string, unknown> {
  return {
    ProjectIdParam: {
      name: 'project_id',
      in: 'path',
      required: true,
      description: 'Project ID',
      schema: { type: 'string', pattern: '^proj_[a-zA-Z0-9]{10,}$' },
    },
    AutomationIdParam: {
      name: 'automation_id',
      in: 'path',
      required: true,
      description: 'Automation ID',
      schema: { type: 'string', pattern: '^auto_[a-zA-Z0-9]{10,}$' },
    },
    WebhookIdParam: {
      name: 'webhook_id',
      in: 'path',
      required: true,
      description: 'Webhook ID',
      schema: { type: 'string' },
    },
    ApiKeyIdParam: {
      name: 'key_id',
      in: 'path',
      required: true,
      description: 'API Key ID',
      schema: { type: 'string' },
    },
    PageParam: {
      name: 'page',
      in: 'query',
      description: 'Page number (1-based)',
      schema: { type: 'integer', default: 1, minimum: 1 },
    },
    PerPageParam: {
      name: 'per_page',
      in: 'query',
      description: 'Items per page (max 100)',
      schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
    },
    LimitParam: {
      name: 'limit',
      in: 'query',
      description: 'Maximum items to return (max 100)',
      schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 },
    },
    StatusParam: {
      name: 'status',
      in: 'query',
      description: 'Filter by status',
      schema: { type: 'string' },
    },
    EnabledParam: {
      name: 'enabled',
      in: 'query',
      description: 'Filter by enabled status',
      schema: { type: 'boolean' },
    },
    IdempotencyKeyParam: {
      name: 'Idempotency-Key',
      in: 'header',
      description: 'Unique key to prevent duplicate requests',
      schema: { type: 'string' },
    },
  };
}

// ============================================================================
// Header Definitions
// ============================================================================

function generateHeaders(): Record<string, unknown> {
  return {
    RateLimitLimit: {
      description: 'Maximum requests allowed per window',
      schema: { type: 'integer' },
    },
    RateLimitRemaining: {
      description: 'Remaining requests in current window',
      schema: { type: 'integer' },
    },
    RateLimitReset: {
      description: 'Unix timestamp when the rate limit window resets',
      schema: { type: 'integer' },
    },
    IdempotencyKey: {
      description: 'Idempotency key for the request',
      schema: { type: 'string' },
    },
  };
}

// ============================================================================
// Tags
// ============================================================================

function generateTags(): Array<{ name: string; description: string }> {
  return [
    { name: 'System', description: 'Health and system status endpoints' },
    { name: 'Projects', description: 'Video project management' },
    { name: 'Assets', description: 'Asset upload and management' },
    { name: 'Renders', description: 'Video rendering jobs' },
    { name: 'Automations', description: 'Scheduled and triggered automations' },
    { name: 'Webhooks', description: 'Webhook configuration and delivery' },
    { name: 'Credits', description: 'Credit balance and cost calculation' },
    { name: 'Batch', description: 'Batch operations for bulk API calls' },
    { name: 'API Keys', description: 'API key management' },
    { name: 'User', description: 'User profile and settings' },
  ];
}

// ============================================================================
// Route Registration
// ============================================================================

export default async function docsRoutes(fastify: FastifyInstance, _opts: any) {
  const openApiDoc = generateOpenAPIDocument();

  // GET /docs/openapi.json - Raw OpenAPI specification
  fastify.get('/openapi.json', async (_request, reply) => {
    return reply.send(openApiDoc);
  });

  // GET /docs - Swagger UI HTML (simple embedded version)
  fastify.get('/', async (_request, reply) => {
    const html = generateSwaggerUI(openApiDoc);
    reply.header('Content-Type', 'text/html');
    return reply.send(html);
  });

  // GET /docs/postman - Postman collection export
  fastify.get('/postman', async (_request, reply) => {
    const collection = generatePostmanCollection(openApiDoc);
    return reply.send(collection);
  });
}

// ============================================================================
// Swagger UI Generator
// ============================================================================

function generateSwaggerUI(openApiDoc: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${API_TITLE} - Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        spec: ${JSON.stringify(openApiDoc)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.presets.standalone
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "BaseLayout",
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        validatorUrl: null,
      });
    };
  </script>
</body>
</html>
  `.trim();
}

// ============================================================================
// Postman Collection Generator
// ============================================================================

function generatePostmanCollection(openApiDoc: Record<string, unknown>): Record<string, unknown> {
  const info = openApiDoc.info as any;
  const servers = openApiDoc.servers as any[];
  const baseUrl = servers?.[0]?.url || 'https://api.renderowl.com/v1';

  const collection: Record<string, unknown> = {
    info: {
      name: info.title,
      description: info.description,
      version: info.version,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [],
    variable: [
      {
        key: 'baseUrl',
        value: baseUrl,
        type: 'string',
      },
    ],
  };

  // Group endpoints by tag
  const paths = openApiDoc.paths as Record<string, any>;
  const groups: Record<string, any[]> = {};

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (method === 'parameters') continue;

      const tag = (operation as any).tags?.[0] || 'Other';
      if (!groups[tag]) groups[tag] = [];

      const item = {
        name: (operation as any).summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [
            {
              key: 'Authorization',
              value: 'Bearer {{token}}',
              type: 'text',
            },
            {
              key: 'Content-Type',
              value: 'application/json',
              type: 'text',
            },
          ],
          url: {
            raw: `{{baseUrl}}${path}`,
            host: ['{{baseUrl}}'],
            path: path.slice(1).split('/'),
          },
          description: (operation as any).description,
        },
        response: [],
      };

      groups[tag].push(item);
    }
  }

  // Add groups to collection
  for (const [tag, items] of Object.entries(groups)) {
    (collection.item as any[]).push({
      name: tag,
      item: items,
    });
  }

  return collection;
}
