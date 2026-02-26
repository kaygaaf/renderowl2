import { FastifyInstance, FastifyPluginOptions, FastifyReply } from 'fastify';
import { ZodError, z } from 'zod';

// ============================================================================
// Zapier/Make.com Compatibility Layer
// ============================================================================
// Provides simplified endpoints optimized for no-code platforms

// ============================================================================
// Validation Schemas
// ============================================================================

const TriggerRenderSchema = z.object({
  project_id: z.string(),
  template_id: z.string(),
  variables: z.record(z.unknown()).optional(),
  webhook_url: z.string().url().optional(),
  notify_email: z.string().email().optional(),
});

const ScheduleRenderSchema = z.object({
  project_id: z.string(),
  template_id: z.string(),
  variables: z.record(z.unknown()).optional(),
  schedule_at: z.string().datetime(), // ISO 8601
  timezone: z.string().default('UTC'),
});

const DataMappingSchema = z.object({
  source_data: z.record(z.unknown()),
  mapping_rules: z.array(z.object({
    source_field: z.string(),
    target_field: z.string(),
    transform: z.enum(['uppercase', 'lowercase', 'trim', 'none']).optional(),
  })),
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

// ============================================================================
// Route Factory
// ============================================================================

export default async function integrationRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // =======================================================================
  // Zapier/Make: Trigger Video Render
  // =======================================================================
  // Simplified endpoint for triggering renders from no-code platforms

  interface TriggerRenderBody {
    project_id: string;
    template_id: string;
    variables?: Record<string, unknown>;
    webhook_url?: string;
    notify_email?: string;
  }

  fastify.post<{ Body: TriggerRenderBody }>('/trigger-render', async (request, reply) => {
    const validation = TriggerRenderSchema.safeParse(request.body);
    if (!validation.success) {
      return handleZodError(validation.error, reply, '/integrations/trigger-render');
    }

    const data = validation.data;
    const userId = (request.user as any)?.id;

    // Calculate cost first
    const costResponse = await fastify.inject({
      method: 'POST',
      url: '/v1/credits/calculate-cost',
      headers: { authorization: request.headers.authorization || '' },
      payload: JSON.stringify({ video_type: 'custom' }),
    });

    const cost = JSON.parse(costResponse.payload);

    // Submit render job
    const renderResponse = await fastify.inject({
      method: 'POST',
      url: `/v1/projects/${data.project_id}/renders`,
      headers: { 
        authorization: request.headers.authorization || '',
        'idempotency-key': `zapier_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      },
      payload: JSON.stringify({
        template_id: data.template_id,
        variables: data.variables || {},
        webhook_url: data.webhook_url,
      }),
    });

    if (renderResponse.statusCode >= 400) {
      return reply.status(renderResponse.statusCode).send(JSON.parse(renderResponse.payload));
    }

    const render = JSON.parse(renderResponse.payload);

    request.log.info({ 
      renderId: render.id, 
      userId, 
      source: 'zapier/make',
      projectId: data.project_id,
    }, 'Render triggered via integration');

    return reply.status(202).send({
      success: true,
      render_id: render.id,
      project_id: data.project_id,
      status: render.status,
      estimated_credits: cost.credits,
      estimated_cost_eur: cost.cost_eur,
      webhook_url: data.webhook_url,
      check_status_url: `${process.env.API_BASE_URL}/v1/projects/${data.project_id}/renders/${render.id}`,
      message: 'Render job queued successfully',
    });
  });

  // =======================================================================
  // Zapier/Make: Schedule Render
  // =======================================================================

  interface ScheduleRenderBody {
    project_id: string;
    template_id: string;
    variables?: Record<string, unknown>;
    schedule_at: string;
    timezone?: string;
  }

  fastify.post<{ Body: ScheduleRenderBody }>('/schedule-render', async (request, reply) => {
    const validation = ScheduleRenderSchema.safeParse(request.body);
    if (!validation.success) {
      return handleZodError(validation.error, reply, '/integrations/schedule-render');
    }

    const data = validation.data;
    const userId = (request.user as any)?.id;

    // Create automation with cron trigger
    const automationResponse = await fastify.inject({
      method: 'POST',
      url: `/v1/projects/${data.project_id}/automations`,
      headers: { authorization: request.headers.authorization || '' },
      payload: JSON.stringify({
        name: `Scheduled Render - ${new Date().toISOString()}`,
        trigger: {
          type: 'cron',
          config: {
            run_at: data.schedule_at,
            timezone: data.timezone,
            one_time: true,
          },
        },
        actions: [
          {
            type: 'render_video',
            config: {
              template_id: data.template_id,
              variables: data.variables || {},
            },
          },
        ],
        enabled: true,
      }),
    });

    if (automationResponse.statusCode >= 400) {
      return reply.status(automationResponse.statusCode).send(JSON.parse(automationResponse.payload));
    }

    const automation = JSON.parse(automationResponse.payload);

    request.log.info({ 
      automationId: automation.id, 
      userId,
      source: 'zapier/make',
      scheduleAt: data.schedule_at,
    }, 'Render scheduled via integration');

    return reply.status(201).send({
      success: true,
      automation_id: automation.id,
      project_id: data.project_id,
      schedule_at: data.schedule_at,
      timezone: data.timezone,
      status: 'scheduled',
      cancel_url: `${process.env.API_BASE_URL}/v1/projects/${data.project_id}/automations/${automation.id}`,
      message: `Render scheduled for ${data.schedule_at}`,
    });
  });

  // =======================================================================
  // Zapier/Make: Data Mapping Helper
  // =======================================================================
  // Transforms data from one format to another based on mapping rules

  interface DataMappingBody {
    source_data: Record<string, unknown>;
    mapping_rules: Array<{
      source_field: string;
      target_field: string;
      transform?: 'uppercase' | 'lowercase' | 'trim' | 'none';
    }>;
  }

  fastify.post<{ Body: DataMappingBody }>('/map-data', async (request, reply) => {
    const validation = DataMappingSchema.safeParse(request.body);
    if (!validation.success) {
      return handleZodError(validation.error, reply, '/integrations/map-data');
    }

    const { source_data, mapping_rules } = validation.data;
    const result: Record<string, unknown> = {};
    const applied: Array<{ source: string; target: string; value: unknown }> = [];
    const skipped: Array<{ source: string; reason: string }> = [];

    for (const rule of mapping_rules) {
      const sourceValue = source_data[rule.source_field];

      if (sourceValue === undefined) {
        skipped.push({ source: rule.source_field, reason: 'Field not found in source' });
        continue;
      }

      let value = sourceValue;

      // Apply transformation
      if (rule.transform && typeof value === 'string') {
        switch (rule.transform) {
          case 'uppercase':
            value = value.toUpperCase();
            break;
          case 'lowercase':
            value = value.toLowerCase();
            break;
          case 'trim':
            value = value.trim();
            break;
        }
      }

      result[rule.target_field] = value;
      applied.push({ source: rule.source_field, target: rule.target_field, value });
    }

    return reply.send({
      success: true,
      mapped_data: result,
      mapping_summary: {
        applied: applied.length,
        skipped: skipped.length,
        total_rules: mapping_rules.length,
      },
      applied_mappings: applied,
      skipped_mappings: skipped,
    });
  });

  // =======================================================================
  // Zapier/Make: Get Templates List
  // =======================================================================
  // Returns simplified list of templates for dropdown selection

  fastify.get('/templates', async (request, reply) => {
    // Get projects first
    const projectsResponse = await fastify.inject({
      method: 'GET',
      url: '/v1/projects',
      headers: { authorization: request.headers.authorization || '' },
    });

    const projects = JSON.parse(projectsResponse.payload);
    const templates: Array<{
      id: string;
      name: string;
      project_id: string;
      project_name: string;
      description: string;
    }> = [];

    // Collect templates from all projects
    for (const project of projects.data || []) {
      // For now, return projects as templates
      // In a real implementation, you'd have a templates endpoint
      templates.push({
        id: `template_${project.id}`,
        name: `${project.name} Template`,
        project_id: project.id,
        project_name: project.name,
        description: `Default template for ${project.name}`,
      });
    }

    return reply.send({
      templates,
      count: templates.length,
    });
  });

  // =======================================================================
  // Zapier/Make: Authentication Test
  // =======================================================================
  // Simple endpoint for testing authentication in Zapier/Make

  fastify.get('/auth-test', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const email = (request.user as any)?.email;

    return reply.send({
      success: true,
      authenticated: true,
      user: {
        id: userId,
        email: email,
      },
      message: 'Authentication successful',
    });
  });

  // =======================================================================
  // Zapier/Make: Webhook Subscription Helper
  // =======================================================================
  // Creates a webhook configured for Zapier/Make

  interface SubscribeWebhookBody {
    target_url: string;
    events: string[];
    project_id?: string;
  }

  fastify.post<{ Body: SubscribeWebhookBody }>('/subscribe', async (request, reply) => {
    const { target_url, events, project_id } = request.body;

    // Validate events
    const validEvents = [
      'video.created', 'video.completed', 'video.failed',
      'render.started', 'render.completed', 'render.failed',
      'credits.low', 'credits.purchased',
    ];

    const invalidEvents = events.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return reply.status(400).send({
        type: 'https://api.renderowl.com/errors/invalid-events',
        title: 'Invalid Events',
        status: 400,
        detail: `Invalid events: ${invalidEvents.join(', ')}`,
        valid_events: validEvents,
      });
    }

    // Create webhook
    const webhookResponse = await fastify.inject({
      method: 'POST',
      url: '/v1/webhooks',
      headers: { authorization: request.headers.authorization || '' },
      payload: JSON.stringify({
        url: target_url,
        events,
        description: `Zapier/Make webhook${project_id ? ` for project ${project_id}` : ''}`,
        max_retries: 3,
      }),
    });

    if (webhookResponse.statusCode >= 400) {
      return reply.status(webhookResponse.statusCode).send(JSON.parse(webhookResponse.payload));
    }

    const webhook = JSON.parse(webhookResponse.payload);

    return reply.status(201).send({
      success: true,
      webhook_id: webhook.id,
      target_url,
      events,
      status: 'active',
      unsubscribe_url: `${process.env.API_BASE_URL}/v1/webhooks/${webhook.id}`,
    });
  });

  fastify.delete<{ Body: { webhook_id: string } }>('/unsubscribe', async (request, reply) => {
    const { webhook_id } = request.body;

    const deleteResponse = await fastify.inject({
      method: 'DELETE',
      url: `/v1/webhooks/${webhook_id}`,
      headers: { authorization: request.headers.authorization || '' },
    });

    if (deleteResponse.statusCode === 204) {
      return reply.send({
        success: true,
        message: 'Webhook unsubscribed successfully',
      });
    }

    return reply.status(deleteResponse.statusCode).send(JSON.parse(deleteResponse.payload));
  });

  // =======================================================================
  // Zapier/Make: Poll for New Renders
  // =======================================================================
  // Returns recent renders for polling triggers

  interface PollRendersQuery {
    project_id?: string;
    since?: string;
    limit?: number;
  }

  fastify.get<{ Querystring: PollRendersQuery }>('/poll-renders', async (request, reply) => {
    const { project_id, since, limit = 50 } = request.query;

    if (!project_id) {
      return reply.status(400).send({
        type: 'https://api.renderowl.com/errors/missing-parameter',
        title: 'Missing Parameter',
        status: 400,
        detail: 'project_id is required',
      });
    }

    // Get renders
    const rendersResponse = await fastify.inject({
      method: 'GET',
      url: `/v1/projects/${project_id}/renders?limit=${limit}`,
      headers: { authorization: request.headers.authorization || '' },
    });

    if (rendersResponse.statusCode >= 400) {
      return reply.status(rendersResponse.statusCode).send(JSON.parse(rendersResponse.payload));
    }

    const renders = JSON.parse(rendersResponse.payload);

    // Filter by since timestamp if provided
    let filteredRenders = renders.data || [];
    if (since) {
      const sinceDate = new Date(since);
      filteredRenders = filteredRenders.filter((r: any) => 
        new Date(r.created_at) > sinceDate
      );
    }

    return reply.send({
      renders: filteredRenders,
      count: filteredRenders.length,
      polled_at: new Date().toISOString(),
    });
  });
}
