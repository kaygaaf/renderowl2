/**
 * Automation API Routes
 * 
 * Phase 2: Credit Deduction + Automation Features
 * 
 * Endpoints for automation management:
 * - GET /v1/projects/{id}/automations — List automations
 * - POST /v1/projects/{id}/automations — Create automation
 * - GET /v1/automations/{id} — Get automation
 * - PATCH /v1/automations/{id} — Update automation
 * - DELETE /v1/automations/{id} — Delete automation
 * - POST /v1/automations/{id}/trigger — Manual trigger
 * - POST /v1/automations/{id}/toggle — Enable/disable
 * - GET /v1/automations/{id}/runs — Get run history
 * 
 * These endpoints should be mounted by the Product/API team.
 * They depend on the QueueManager for scheduling cron jobs.
 */

import {Router, Request, Response} from 'express';
import {Pool} from 'pg';
import {z} from 'zod';
import {QueueManager} from '../queue/manager';
import {
  CreateAutomationSchema,
  UpdateAutomationSchema,
  TriggerConfigSchema,
} from '../platform-contract';

// ============================================================================
// Route Factory
// ============================================================================

export interface AutomationRoutesConfig {
  pool: Pool;
  queueManager: QueueManager;
}

export function createAutomationRoutes(config: AutomationRoutesConfig): Router {
  const router = Router({mergeParams: true});

  // ============================================================================
  // Project-scoped Endpoints
  // ============================================================================

  /**
   * GET /v1/projects/:projectId/automations
   * 
   * List all automations for a project.
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {projectId} = req.params;
      const userId = req.user?.id;
      const organizationId = req.user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({
          error: {code: 'authentication_error', message: 'Authentication required'},
        });
      }

      // Verify project access
      const projectAccess = await verifyProjectAccess(config.pool, projectId, organizationId);
      if (!projectAccess) {
        return res.status(404).json({
          error: {code: 'not_found', message: 'Project not found'},
        });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await config.pool.query(
        `
        SELECT 
          id, project_id as "projectId", name, description, enabled,
          trigger as "trigger", template as "template", mappings as "mappings",
          output as "output", webhook as "webhook",
          last_run_at as "lastRunAt", run_count as "runCount",
          failure_count as "failureCount", created_at as "createdAt", updated_at as "updatedAt"
        FROM automations
        WHERE project_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [projectId, limit, offset]
      );

      const countResult = await config.pool.query(
        'SELECT COUNT(*) FROM automations WHERE project_id = $1',
        [projectId]
      );

      const total = parseInt(countResult.rows[0].count, 10);

      return res.json({
        data: result.rows,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + result.rows.length < total,
        },
      });
    } catch (error) {
      console.error('[AutomationRoutes] Error listing automations:', error);
      return res.status(500).json({
        error: {code: 'internal_error', message: 'Failed to list automations'},
      });
    }
  });

  /**
   * POST /v1/projects/:projectId/automations
   * 
   * Create a new automation.
   * For scheduled automations, this also registers the cron job.
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const {projectId} = req.params;
      const userId = req.user?.id;
      const organizationId = req.user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({
          error: {code: 'authentication_error', message: 'Authentication required'},
        });
      }

      // Verify project access
      const projectAccess = await verifyProjectAccess(config.pool, projectId, organizationId);
      if (!projectAccess) {
        return res.status(404).json({
          error: {code: 'not_found', message: 'Project not found'},
        });
      }

      // Validate request body
      const bodyResult = CreateAutomationSchema.safeParse({
        ...req.body,
        projectId, // Ensure projectId matches URL
      });

      if (!bodyResult.success) {
        return res.status(400).json({
          error: {
            code: 'validation_error',
            message: 'Invalid request body',
            details: bodyResult.error.errors,
          },
        });
      }

      const automationData = bodyResult.data;
      const automationId = `atm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Insert automation into database
      await config.pool.query(
        `
        INSERT INTO automations (
          id, project_id, name, description, enabled,
          trigger, template, mappings, output, webhook,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        `,
        [
          automationId,
          projectId,
          automationData.name,
          automationData.description,
          automationData.enabled ?? true,
          JSON.stringify(automationData.trigger),
          JSON.stringify({assetId: automationData.templateId}),
          JSON.stringify(automationData.mappings),
          automationData.output ? JSON.stringify(automationData.output) : null,
          automationData.webhook ? JSON.stringify(automationData.webhook) : null,
        ]
      );

      // If scheduled automation, register with queue manager
      if (automationData.trigger.type === 'schedule') {
        try {
          // Fetch the created automation with proper structure
          const autoResult = await config.pool.query(
            'SELECT * FROM automations WHERE id = $1',
            [automationId]
          );
          
          const automation = autoResult.rows[0];
          
          await config.queueManager.scheduleAutomation({
            automation: {
              ...automation,
              trigger: automation.trigger,
              template: automation.template,
            },
            userId,
          });
        } catch (scheduleError) {
          // Don't fail the creation, but log the error
          console.error('[AutomationRoutes] Failed to schedule automation:', scheduleError);
        }
      }

      // Fetch and return the created automation
      const result = await config.pool.query(
        `
        SELECT 
          id, project_id as "projectId", name, description, enabled,
          trigger as "trigger", template as "template", mappings as "mappings",
          output as "output", webhook as "webhook",
          created_at as "createdAt", updated_at as "updatedAt"
        FROM automations
        WHERE id = $1
        `,
        [automationId]
      );

      return res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('[AutomationRoutes] Error creating automation:', error);
      return res.status(500).json({
        error: {code: 'internal_error', message: 'Failed to create automation'},
      });
    }
  });

  // ============================================================================
  // Automation-scoped Endpoints
  // ============================================================================

  /**
   * GET /v1/automations/:id
   * 
   * Get a specific automation.
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const {id} = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          error: {code: 'authentication_error', message: 'Authentication required'},
        });
      }

      const result = await config.pool.query(
        `
        SELECT 
          a.id, a.project_id as "projectId", a.name, a.description, a.enabled,
          a.trigger as "trigger", a.template as "template", a.mappings as "mappings",
          a.output as "output", a.webhook as "webhook",
          a.last_run_at as "lastRunAt", a.run_count as "runCount",
          a.failure_count as "failureCount", a.created_at as "createdAt", a.updated_at as "updatedAt",
          p.id as "project.id", p.name as "project.name"
        FROM automations a
        JOIN projects p ON a.project_id = p.id
        WHERE a.id = $1 AND p.organization_id = $2
        `,
        [id, organizationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {code: 'not_found', message: 'Automation not found'},
        });
      }

      return res.json(result.rows[0]);
    } catch (error) {
      console.error('[AutomationRoutes] Error getting automation:', error);
      return res.status(500).json({
        error: {code: 'internal_error', message: 'Failed to get automation'},
      });
    }
  });

  /**
   * PATCH /v1/automations/:id
   * 
   * Update an automation.
   * If schedule is changed, re-register the cron job.
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const {id} = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          error: {code: 'authentication_error', message: 'Authentication required'},
        });
      }

      // Verify automation access
      const accessResult = await config.pool.query(
        `
        SELECT a.id, a.trigger
        FROM automations a
        JOIN projects p ON a.project_id = p.id
        WHERE a.id = $1 AND p.organization_id = $2
        `,
        [id, organizationId]
      );

      if (accessResult.rows.length === 0) {
        return res.status(404).json({
          error: {code: 'not_found', message: 'Automation not found'},
        });
      }

      const existingAutomation = accessResult.rows[0];
      const bodyResult = UpdateAutomationSchema.safeParse(req.body);

      if (!bodyResult.success) {
        return res.status(400).json({
          error: {
            code: 'validation_error',
            message: 'Invalid request body',
            details: bodyResult.error.errors,
          },
        });
      }

      const updateData = bodyResult.data;

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateData.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(updateData.name);
      }
      if (updateData.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(updateData.description);
      }
      if (updateData.enabled !== undefined) {
        updates.push(`enabled = $${paramIndex++}`);
        values.push(updateData.enabled);
      }
      if (updateData.trigger !== undefined) {
        updates.push(`trigger = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.trigger));
      }
      if (updateData.mappings !== undefined) {
        updates.push(`mappings = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.mappings));
      }
      if (updateData.output !== undefined) {
        updates.push(`output = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.output));
      }
      if (updateData.webhook !== undefined) {
        updates.push(`webhook = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.webhook));
      }

      updates.push(`updated_at = NOW()`);

      values.push(id);

      await config.pool.query(
        `UPDATE automations SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );

      // If trigger was updated and is a schedule, re-register
      if (updateData.trigger?.type === 'schedule') {
        // Remove old schedule
        await config.queueManager.unscheduleAutomation(id);
        
        // Re-register with new schedule
        const autoResult = await config.pool.query('SELECT * FROM automations WHERE id = $1', [id]);
        if (autoResult.rows[0]?.enabled) {
          await config.queueManager.scheduleAutomation({
            automation: autoResult.rows[0],
            userId: req.user!.id,
          });
        }
      }

      // Return updated automation
      const result = await config.pool.query(
        `
        SELECT 
          id, project_id as "projectId", name, description, enabled,
          trigger as "trigger", template as "template", mappings as "mappings",
          output as "output", webhook as "webhook",
          last_run_at as "lastRunAt", run_count as "runCount",
          failure_count as "failureCount", created_at as "createdAt", updated_at as "updatedAt"
        FROM automations
        WHERE id = $1
        `,
        [id]
      );

      return res.json(result.rows[0]);
    } catch (error) {
      console.error('[AutomationRoutes] Error updating automation:', error);
      return res.status(500).json({
        error: {code: 'internal_error', message: 'Failed to update automation'},
      });
    }
  });

  /**
   * DELETE /v1/automations/:id
   * 
   * Delete an automation and unschedule if applicable.
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const {id} = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          error: {code: 'authentication_error', message: 'Authentication required'},
        });
      }

      // Verify automation access
      const accessResult = await config.pool.query(
        `
        SELECT a.id FROM automations a
        JOIN projects p ON a.project_id = p.id
        WHERE a.id = $1 AND p.organization_id = $2
        `,
        [id, organizationId]
      );

      if (accessResult.rows.length === 0) {
        return res.status(404).json({
          error: {code: 'not_found', message: 'Automation not found'},
        });
      }

      // Unschedule if applicable
      await config.queueManager.unscheduleAutomation(id);

      // Delete automation
      await config.pool.query('DELETE FROM automations WHERE id = $1', [id]);

      return res.status(204).send();
    } catch (error) {
      console.error('[AutomationRoutes] Error deleting automation:', error);
      return res.status(500).json({
        error: {code: 'internal_error', message: 'Failed to delete automation'},
      });
    }
  });

  /**
   * POST /v1/automations/:id/trigger
   * 
   * Manually trigger an automation with custom payload.
   */
  router.post('/:id/trigger', async (req: Request, res: Response) => {
    try {
      const {id} = req.params;
      const userId = req.user?.id;
      const organizationId = req.user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({
          error: {code: 'authentication_error', message: 'Authentication required'},
        });
      }

      // Verify automation access
      const accessResult = await config.pool.query(
        `
        SELECT a.*, p.organization_id
        FROM automations a
        JOIN projects p ON a.project_id = p.id
        WHERE a.id = $1 AND p.organization_id = $2
        `,
        [id, organizationId]
      );

      if (accessResult.rows.length === 0) {
        return res.status(404).json({
          error: {code: 'not_found', message: 'Automation not found'},
        });
      }

      const automation = accessResult.rows[0];

      if (!automation.enabled) {
        return res.status(400).json({
          error: {code: 'automation_disabled', message: 'Automation is disabled'},
        });
      }

      // Queue the automation job
      const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await config.queueManager.automationQueue.add(`manual-${runId}`, {
        automationId: id,
        projectId: automation.project_id,
        organizationId,
        userId,
        triggerData: req.body.payload || {},
        runId,
      });

      return res.json({
        success: true,
        runId,
        message: 'Automation triggered successfully',
      });
    } catch (error) {
      console.error('[AutomationRoutes] Error triggering automation:', error);
      return res.status(500).json({
        error: {code: 'internal_error', message: 'Failed to trigger automation'},
      });
    }
  });

  /**
   * POST /v1/automations/:id/toggle
   * 
   * Enable or disable an automation.
   */
  router.post('/:id/toggle', async (req: Request, res: Response) => {
    try {
      const {id} = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          error: {code: 'authentication_error', message: 'Authentication required'},
        });
      }

      const schema = z.object({enabled: z.boolean()});
      const bodyResult = schema.safeParse(req.body);

      if (!bodyResult.success) {
        return res.status(400).json({
          error: {code: 'validation_error', message: 'Invalid request body'},
        });
      }

      const {enabled} = bodyResult.data;

      // Verify automation access
      const accessResult = await config.pool.query(
        `
        SELECT a.id, a.trigger FROM automations a
        JOIN projects p ON a.project_id = p.id
        WHERE a.id = $1 AND p.organization_id = $2
        `,
        [id, organizationId]
      );

      if (accessResult.rows.length === 0) {
        return res.status(404).json({
          error: {code: 'not_found', message: 'Automation not found'},
        });
      }

      const automation = accessResult.rows[0];

      // Update enabled status
      await config.pool.query(
        'UPDATE automations SET enabled = $1, updated_at = NOW() WHERE id = $2',
        [enabled, id]
      );

      // Handle scheduling
      if (automation.trigger?.type === 'schedule') {
        if (enabled) {
          await config.queueManager.scheduleAutomation({automation, userId: req.user!.id});
        } else {
          await config.queueManager.unscheduleAutomation(id);
        }
      }

      return res.json({success: true, enabled});
    } catch (error) {
      console.error('[AutomationRoutes] Error toggling automation:', error);
      return res.status(500).json({
        error: {code: 'internal_error', message: 'Failed to toggle automation'},
      });
    }
  });

  /**
   * GET /v1/automations/:id/runs
   * 
   * Get run history for an automation.
   */
  router.get('/:id/runs', async (req: Request, res: Response) => {
    try {
      const {id} = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          error: {code: 'authentication_error', message: 'Authentication required'},
        });
      }

      // Verify automation access
      const accessResult = await config.pool.query(
        `
        SELECT a.id FROM automations a
        JOIN projects p ON a.project_id = p.id
        WHERE a.id = $1 AND p.organization_id = $2
        `,
        [id, organizationId]
      );

      if (accessResult.rows.length === 0) {
        return res.status(404).json({
          error: {code: 'not_found', message: 'Automation not found'},
        });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await config.pool.query(
        `
        SELECT 
          id, automation_id as "automationId", project_id as "projectId",
          status, trigger_data as "triggerData", render_job_id as "renderJobId",
          output_asset_id as "outputAssetId", credits_deducted as "creditsDeducted",
          error, started_at as "startedAt", completed_at as "completedAt"
        FROM automation_runs
        WHERE automation_id = $1
        ORDER BY started_at DESC
        LIMIT $2 OFFSET $3
        `,
        [id, limit, offset]
      );

      const countResult = await config.pool.query(
        'SELECT COUNT(*) FROM automation_runs WHERE automation_id = $1',
        [id]
      );

      const total = parseInt(countResult.rows[0].count, 10);

      return res.json({
        data: result.rows,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + result.rows.length < total,
        },
      });
    } catch (error) {
      console.error('[AutomationRoutes] Error getting automation runs:', error);
      return res.status(500).json({
        error: {code: 'internal_error', message: 'Failed to get automation runs'},
      });
    }
  });

  return router;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function verifyProjectAccess(
  pool: Pool,
  projectId: string,
  organizationId: string
): Promise<{exists: boolean; userRole?: string}> {
  const result = await pool.query(
    'SELECT id FROM projects WHERE id = $1 AND organization_id = $2',
    [projectId, organizationId]
  );

  return {
    exists: result.rows.length > 0,
  };
}
