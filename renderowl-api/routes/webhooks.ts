import { FastifyInstance, FastifyPluginOptions, FastifyReply } from 'fastify';
import { WebhookService } from '../lib/webhooks/service.js';
import { WebhookEvent } from '../lib/webhooks/schema.js';
import { ZodError, z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const WebhookEventSchema = z.enum([
  'video.created',
  'video.completed',
  'video.failed',
  'credits.low',
  'credits.purchased',
  'automation.triggered',
  'automation.failed',
  'render.started',
  'render.completed',
  'render.failed',
]);

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(WebhookEventSchema).min(1),
  description: z.string().max(500).optional(),
  headers: z.record(z.string()).optional(),
  max_retries: z.number().int().min(1).max(10).default(5),
});

const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(WebhookEventSchema).min(1).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  description: z.string().max(500).optional(),
  headers: z.record(z.string()).optional(),
  max_retries: z.number().int().min(1).max(10).optional(),
});

const TestWebhookSchema = z.object({
  event: WebhookEventSchema,
  payload: z.record(z.unknown()).optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

const handleZodError = (error: ZodError, reply: FastifyReply, instance: string) => {
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

const now = (): string => new Date().toISOString();

// ============================================================================
// Route Factory
// ============================================================================

export default async function webhookRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  const webhookService = new WebhookService(
    process.env.WEBHOOK_DB_PATH || './data/webhooks.db'
  );

  // Start the webhook delivery service
  await webhookService.start();

  // Decorate fastify with webhook service for access in other routes
  fastify.decorate('webhookService', webhookService);

  // =======================================================================
  // List Webhooks
  // =======================================================================

  interface ListWebhooksQuery {
    page?: number;
    per_page?: number;
    status?: 'active' | 'inactive' | 'disabled';
  }

  fastify.get<{ Querystring: ListWebhooksQuery }>('/', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const page = request.query.page ?? 1;
    const perPage = Math.min(request.query.per_page ?? 20, 100);
    const statusFilter = request.query.status;

    let webhooks = webhookService.getWebhooksByUser(userId, false);

    if (statusFilter) {
      webhooks = webhooks.filter((wh) => wh.status === statusFilter);
    }

    const total = webhooks.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const paginatedWebhooks = webhooks.slice(start, start + perPage);

    return reply.send({
      data: paginatedWebhooks.map((wh) => ({
        id: wh.id,
        url: wh.url,
        events: wh.events,
        status: wh.status,
        description: wh.description,
        created_at: wh.createdAt,
        updated_at: wh.updatedAt,
        last_triggered_at: wh.lastTriggeredAt,
        last_success_at: wh.lastSuccessAt,
        last_failure_at: wh.lastFailureAt,
        success_count: wh.successCount,
        failure_count: wh.failureCount,
      })),
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
    });
  });

  // =======================================================================
  // Create Webhook
  // =======================================================================

  interface CreateWebhookBody {
    url: string;
    events: WebhookEvent[];
    description?: string;
    headers?: Record<string, string>;
    max_retries?: number;
  }

  fastify.post<{ Body: CreateWebhookBody }>('/', async (request, reply) => {
    const userId = (request.user as any)?.id;

    const validation = CreateWebhookSchema.safeParse(request.body);
    if (!validation.success) {
      return handleZodError(validation.error, reply, '/webhooks');
    }

    const data = validation.data;

    const webhook = webhookService.createWebhook({
      userId,
      url: data.url,
      events: data.events,
      description: data.description,
      headers: data.headers,
      maxRetries: data.max_retries,
    });

    request.log.info({ webhookId: webhook.id, userId }, 'Webhook created');

    return reply.status(201).send({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      status: webhook.status,
      description: webhook.description,
      secret: webhook.secret, // Only shown on creation
      headers: webhook.headers,
      max_retries: webhook.maxRetries,
      created_at: webhook.createdAt,
    });
  });

  // =======================================================================
  // Get Webhook
  // =======================================================================

  interface GetWebhookParams {
    id: string;
  }

  fastify.get<{ Params: GetWebhookParams }>('/:id', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    const webhook = webhookService.getWebhook(id, false);
    if (!webhook || webhook.userId !== userId) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'Webhook Not Found',
        status: 404,
        detail: `Webhook with ID "${id}" does not exist`,
        instance: `/webhooks/${id}`,
      });
    }

    const stats = webhookService.getDeliveryStats(id);

    return reply.send({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      status: webhook.status,
      description: webhook.description,
      headers: webhook.headers,
      max_retries: webhook.maxRetries,
      created_at: webhook.createdAt,
      updated_at: webhook.updatedAt,
      last_triggered_at: webhook.lastTriggeredAt,
      last_success_at: webhook.lastSuccessAt,
      last_failure_at: webhook.lastFailureAt,
      stats,
    });
  });

  // =======================================================================
  // Update Webhook
  // =======================================================================

  interface UpdateWebhookParams {
    id: string;
  }

  interface UpdateWebhookBody {
    url?: string;
    events?: WebhookEvent[];
    status?: 'active' | 'inactive';
    description?: string;
    headers?: Record<string, string>;
    max_retries?: number;
  }

  fastify.patch<{ Params: UpdateWebhookParams; Body: UpdateWebhookBody }>(
    '/:id',
    async (request, reply) => {
      const userId = (request.user as any)?.id;
      const { id } = request.params;

      // Verify ownership
      const existing = webhookService.getWebhook(id, false);
      if (!existing || existing.userId !== userId) {
        return reply.status(404).send({
          type: 'https://api.renderowl.com/errors/not-found',
          title: 'Webhook Not Found',
          status: 404,
          detail: `Webhook with ID "${id}" does not exist`,
          instance: `/webhooks/${id}`,
        });
      }

      const validation = UpdateWebhookSchema.safeParse(request.body);
      if (!validation.success) {
        return handleZodError(validation.error, reply, `/webhooks/${id}`);
      }

      const data = validation.data;
      const webhook = webhookService.updateWebhook(id, {
        url: data.url,
        events: data.events,
        status: data.status,
        description: data.description,
        headers: data.headers,
        maxRetries: data.max_retries,
      });

      request.log.info({ webhookId: id, userId }, 'Webhook updated');

      return reply.send({
        id: webhook!.id,
        url: webhook!.url,
        events: webhook!.events,
        status: webhook!.status,
        description: webhook!.description,
        headers: webhook!.headers,
        max_retries: webhook!.maxRetries,
        updated_at: webhook!.updatedAt,
      });
    }
  );

  // =======================================================================
  // Delete Webhook
  // =======================================================================

  interface DeleteWebhookParams {
    id: string;
  }

  fastify.delete<{ Params: DeleteWebhookParams }>('/:id', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    // Verify ownership
    const existing = webhookService.getWebhook(id, false);
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'Webhook Not Found',
        status: 404,
        detail: `Webhook with ID "${id}" does not exist`,
        instance: `/webhooks/${id}`,
      });
    }

    webhookService.deleteWebhook(id);

    request.log.info({ webhookId: id, userId }, 'Webhook deleted');

    return reply.status(204).send();
  });

  // =======================================================================
  // Regenerate Webhook Secret
  // =======================================================================

  interface RegenerateSecretParams {
    id: string;
  }

  fastify.post<{ Params: RegenerateSecretParams }>('/:id/regenerate-secret', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    // Verify ownership
    const existing = webhookService.getWebhook(id, false);
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'Webhook Not Found',
        status: 404,
        detail: `Webhook with ID "${id}" does not exist`,
        instance: `/webhooks/${id}/regenerate-secret`,
      });
    }

    const newSecret = webhookService.regenerateSecret(id);

    request.log.info({ webhookId: id, userId }, 'Webhook secret regenerated');

    return reply.send({
      id,
      secret: newSecret,
      updated_at: now(),
    });
  });

  // =======================================================================
  // List Webhook Deliveries
  // =======================================================================

  interface ListDeliveriesParams {
    id: string;
  }

  interface ListDeliveriesQuery {
    limit?: number;
    status?: 'pending' | 'delivered' | 'failed' | 'retrying';
  }

  fastify.get<{ Params: ListDeliveriesParams; Querystring: ListDeliveriesQuery }>(
    '/:id/deliveries',
    async (request, reply) => {
      const userId = (request.user as any)?.id;
      const { id } = request.params;
      const limit = Math.min(request.query.limit ?? 50, 100);
      const statusFilter = request.query.status;

      // Verify ownership
      const webhook = webhookService.getWebhook(id, false);
      if (!webhook || webhook.userId !== userId) {
        return reply.status(404).send({
          type: 'https://api.renderowl.com/errors/not-found',
          title: 'Webhook Not Found',
          status: 404,
          detail: `Webhook with ID "${id}" does not exist`,
          instance: `/webhooks/${id}/deliveries`,
        });
      }

      let deliveries = webhookService.getDeliveries(id, limit);

      if (statusFilter) {
        deliveries = deliveries.filter((d) => d.status === statusFilter);
      }

      return reply.send({
        data: deliveries.map((d) => ({
          id: d.id,
          event: d.event,
          status: d.status,
          attempt_count: d.attemptCount,
          response_status: d.responseStatus,
          error: d.error,
          duration_ms: d.durationMs,
          created_at: d.createdAt,
          completed_at: d.completedAt,
        })),
        webhook_id: id,
      });
    }
  );

  // =======================================================================
  // Test Webhook (Send test event)
  // =======================================================================

  interface TestWebhookParams {
    id: string;
  }

  interface TestWebhookBody {
    event: WebhookEvent;
    payload?: Record<string, unknown>;
  }

  fastify.post<{ Params: TestWebhookParams; Body: TestWebhookBody }>(
    '/:id/test',
    async (request, reply) => {
      const userId = (request.user as any)?.id;
      const { id } = request.params;

      // Verify ownership
      const webhook = webhookService.getWebhook(id, true);
      if (!webhook || webhook.userId !== userId) {
        return reply.status(404).send({
          type: 'https://api.renderowl.com/errors/not-found',
          title: 'Webhook Not Found',
          status: 404,
          detail: `Webhook with ID "${id}" does not exist`,
          instance: `/webhooks/${id}/test`,
        });
      }

      const validation = TestWebhookSchema.safeParse(request.body);
      if (!validation.success) {
        return handleZodError(validation.error, reply, `/webhooks/${id}/test`);
      }

      const { event, payload } = validation.data;

      // Create test payload
      const testPayload = payload || {
        test: true,
        message: 'This is a test webhook event',
        timestamp: now(),
      };

      const deliveryIds = webhookService.triggerEvent(event, testPayload, userId);

      request.log.info({ webhookId: id, userId, event }, 'Webhook test triggered');

      return reply.send({
        message: 'Test event triggered',
        delivery_ids: deliveryIds,
        event,
        triggered_at: now(),
      });
    }
  );

  // =======================================================================
  // Webhook Events Catalog
  // =======================================================================

  fastify.get('/events', async (_request, reply) => {
    const events = [
      {
        event: 'video.created',
        description: 'Triggered when a new video is created',
        payload_schema: {
          videoId: 'string',
          projectId: 'string',
          title: 'string',
          status: 'string',
          createdAt: 'string',
        },
      },
      {
        event: 'video.completed',
        description: 'Triggered when video rendering completes successfully',
        payload_schema: {
          videoId: 'string',
          projectId: 'string',
          title: 'string',
          status: 'completed',
          duration: 'number',
          resolution: 'string',
          fileSize: 'number',
          url: 'string',
          completedAt: 'string',
        },
      },
      {
        event: 'video.failed',
        description: 'Triggered when video rendering fails',
        payload_schema: {
          videoId: 'string',
          projectId: 'string',
          title: 'string',
          status: 'failed',
          error: 'string',
          failedAt: 'string',
        },
      },
      {
        event: 'credits.low',
        description: 'Triggered when user credit balance falls below threshold',
        payload_schema: {
          userId: 'string',
          currentBalance: 'number',
          threshold: 'number',
          message: 'string',
        },
      },
      {
        event: 'credits.purchased',
        description: 'Triggered when user purchases credits',
        payload_schema: {
          userId: 'string',
          amount: 'number',
          balanceAfter: 'number',
          purchaseId: 'string',
        },
      },
      {
        event: 'automation.triggered',
        description: 'Triggered when an automation runs',
        payload_schema: {
          automationId: 'string',
          projectId: 'string',
          name: 'string',
          triggeredAt: 'string',
        },
      },
      {
        event: 'automation.failed',
        description: 'Triggered when an automation fails',
        payload_schema: {
          automationId: 'string',
          projectId: 'string',
          name: 'string',
          error: 'string',
          failedAt: 'string',
        },
      },
      {
        event: 'render.started',
        description: 'Triggered when a render job starts',
        payload_schema: {
          renderId: 'string',
          projectId: 'string',
          status: 'started',
          timestamp: 'string',
        },
      },
      {
        event: 'render.completed',
        description: 'Triggered when a render job completes',
        payload_schema: {
          renderId: 'string',
          projectId: 'string',
          status: 'completed',
          outputUrl: 'string',
          timestamp: 'string',
        },
      },
      {
        event: 'render.failed',
        description: 'Triggered when a render job fails',
        payload_schema: {
          renderId: 'string',
          projectId: 'string',
          status: 'failed',
          error: 'string',
          timestamp: 'string',
        },
      },
    ];

    return reply.send({ events });
  });

  // =======================================================================
  // Graceful shutdown
  // =======================================================================

  fastify.addHook('onClose', async () => {
    webhookService.close();
  });
}
