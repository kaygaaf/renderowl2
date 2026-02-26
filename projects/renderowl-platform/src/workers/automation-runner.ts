/**
 * Automation Runner Worker
 * 
 * Phase 2: Credit Deduction + Automation Features
 * 
 * This worker processes automation jobs from the queue.
 * It handles:
 * - Scheduled (cron) automations
 * - Webhook-triggered automations
 * - Asset upload triggers
 * - Data mapping and template variable injection
 * - Automatic credit deduction for automation runs
 */

import {Job} from 'bullmq';
import {Pool} from 'pg';
import {v4 as uuidv4} from 'uuid';
import {
  Automation,
  AutomationRun,
  DataMapping,
  RenderInput,
  AssetReference,
} from '../platform-contract';
import {AutomationJobData} from '../queue/manager';
import {CreditService, calculateCreditCost} from '../services/credit';
import {QueueManager} from '../queue/manager';

// ============================================================================
// Types
// ============================================================================

export interface AutomationContext {
  automation: Automation;
  triggerData: Record<string, unknown>;
  runId: string;
  userId: string;
  organizationId: string;
}

export interface MappedVariables {
  [key: string]: unknown;
}

// ============================================================================
// Automation Runner
// ============================================================================

export interface AutomationRunnerConfig {
  pool: Pool;
  creditService: CreditService;
  queueManager: QueueManager;
}

export class AutomationRunner {
  constructor(private readonly config: AutomationRunnerConfig) {}

  /**
   * Process an automation job from the queue.
   * 
   * This is the main entry point for the automation worker.
   */
  async processJob(job: Job<AutomationJobData>): Promise<void> {
    const {automationId, projectId, organizationId, userId, triggerData, runId} = job.data;

    console.log(`[AutomationRunner] Processing automation ${automationId}, run ${runId}`);

    // Step 1: Fetch automation configuration
    const automation = await this.getAutomation(automationId);
    
    if (!automation || !automation.enabled) {
      console.log(`[AutomationRunner] Automation ${automationId} not found or disabled`);
      await this.recordRunFailure(runId, 'automation_not_found_or_disabled');
      return;
    }

    // Step 2: Create run record
    await this.createRunRecord(runId, automationId, projectId, triggerData);

    // Step 3: Apply data mappings
    let mappedVariables: MappedVariables;
    try {
      mappedVariables = this.applyDataMappings(automation.mappings, triggerData);
    } catch (error) {
      console.error(`[AutomationRunner] Data mapping failed:`, error);
      await this.recordRunFailure(runId, 'data_mapping_failed', (error as Error).message);
      return;
    }

    // Step 4: Validate template schema
    const templateValidation = await this.validateTemplate(automation.template, mappedVariables);
    if (!templateValidation.valid) {
      console.error(`[AutomationRunner] Template validation failed:`, templateValidation.errors);
      await this.recordRunFailure(runId, 'template_validation_failed', templateValidation.errors?.join(', '));
      return;
    }

    // Step 5: Calculate credit cost
    const sceneCount = this.estimateSceneCount(mappedVariables);
    const creditCost = calculateCreditCost({
      sceneCount,
      quality: 'high', // Automations default to high quality
    });

    // Step 6: Build render input
    const renderInput: RenderInput = {
      template: automation.template,
      variables: mappedVariables,
      output: {
        format: 'mp4',
        quality: 'high',
      },
    };

    // Step 7: Submit render job with credit deduction
    try {
      const renderJob = await this.config.queueManager.submitRenderJob({
        projectId,
        organizationId,
        userId,
        submitData: {
          engine: 'remotion',
          input: renderInput,
          priority: 5, // Automations run at normal priority
        },
        creditsRequired: creditCost,
      });

      // Step 8: Update run record with render job reference
      await this.updateRunWithRenderJob(runId, renderJob.jobId, creditCost);

      console.log(`[AutomationRunner] Automation ${automationId} queued render job ${renderJob.jobId}`);

    } catch (error) {
      if ((error as Error).message.includes('insufficient') || (error as Error).message.includes('Insufficient')) {
        console.error(`[AutomationRunner] Insufficient credits for automation ${automationId}`);
        await this.recordRunFailure(runId, 'insufficient_credits');
        
        // Disable automation after repeated failures
        await this.checkAndDisableAutomation(automationId);
      } else {
        console.error(`[AutomationRunner] Failed to queue render job:`, error);
        await this.recordRunFailure(runId, 'render_submission_failed', (error as Error).message);
      }
    }
  }

  /**
   * Apply data mappings from trigger data to template variables.
   * 
   * Supports:
   * - JSONPath-like extraction: trigger.payload.user.name
   * - Static values
   * - Transformations: uppercase, lowercase, trim, formatDate
   */
  private applyDataMappings(
    mappings: DataMapping[],
    triggerData: Record<string, unknown>
  ): MappedVariables {
    const result: MappedVariables = {};

    for (const mapping of mappings) {
      let value: unknown;

      switch (mapping.source) {
        case 'trigger.payload':
          value = this.extractValue(triggerData, mapping.path || '');
          break;
        
        case 'trigger.asset':
          // Asset metadata extraction
          value = this.extractValue(triggerData, `asset.${mapping.path || ''}`);
          break;
        
        case 'static':
          value = mapping.value;
          break;
        
        case 'env':
          // Environment variable (useful for secrets)
          value = process.env[mapping.path || ''];
          break;
        
        default:
          value = undefined;
      }

      // Apply transformation if specified
      if (mapping.transform && typeof value === 'string') {
        value = this.applyTransform(value, mapping.transform);
      }

      result[mapping.target] = value;
    }

    return result;
  }

  /**
   * Extract a value from an object using dot notation path.
   * 
   * Example: extractValue({user: {name: 'John'}}, 'user.name') -> 'John'
   */
  private extractValue(obj: Record<string, unknown>, path: string): unknown {
    if (!path) return obj;

    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Apply string transformations.
   */
  private applyTransform(
    value: string,
    transform: 'uppercase' | 'lowercase' | 'trim' | 'formatDate'
  ): string {
    switch (transform) {
      case 'uppercase':
        return value.toUpperCase();
      case 'lowercase':
        return value.toLowerCase();
      case 'trim':
        return value.trim();
      case 'formatDate':
        // Format ISO date to readable string
        try {
          const date = new Date(value);
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Estimate scene count from template variables.
   * 
   * This is a heuristic - templates can define their own scene logic.
   * We look for common patterns in the variables.
   */
  private estimateSceneCount(variables: MappedVariables): number {
    // Check for explicit scene count
    if (typeof variables.sceneCount === 'number') {
      return variables.sceneCount;
    }

    // Check for scenes array
    if (Array.isArray(variables.scenes)) {
      return variables.scenes.length;
    }

    // Check for common content arrays that map to scenes
    const arrayKeys = ['slides', 'sections', 'items', 'content'];
    for (const key of arrayKeys) {
      const value = variables[key];
      if (Array.isArray(value)) {
        return value.length;
      }
    }

    // Default: assume 5 scenes
    return 5;
  }

  // ============================================================================
  // Database Operations
  // ============================================================================

  private async getAutomation(automationId: string): Promise<Automation | null> {
    const result = await this.config.pool.query(
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
      [automationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Automation;
  }

  private async createRunRecord(
    runId: string,
    automationId: string,
    projectId: string,
    triggerData: Record<string, unknown>
  ): Promise<void> {
    await this.config.pool.query(
      `
      INSERT INTO automation_runs (id, automation_id, project_id, status, trigger_data, started_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [runId, automationId, projectId, 'running', JSON.stringify(triggerData)]
    );
  }

  private async updateRunWithRenderJob(
    runId: string,
    renderJobId: string,
    creditsDeducted: number
  ): Promise<void> {
    await this.config.pool.query(
      `
      UPDATE automation_runs
      SET render_job_id = $1, credits_deducted = $2
      WHERE id = $3
      `,
      [renderJobId, creditsDeducted, runId]
    );
  }

  private async recordRunFailure(
    runId: string,
    errorCode: string,
    errorMessage?: string
  ): Promise<void> {
    await this.config.pool.query(
      `
      UPDATE automation_runs
      SET 
        status = 'failed',
        completed_at = NOW(),
        error = $1
      WHERE id = $2
      `,
      [JSON.stringify({code: errorCode, message: errorMessage}), runId]
    );
  }

  private async checkAndDisableAutomation(automationId: string): Promise<void> {
    // Get failure count
    const result = await this.config.pool.query(
      `
      SELECT failure_count FROM automations WHERE id = $1
      `,
      [automationId]
    );

    const failureCount = result.rows[0]?.failure_count || 0;

    // Disable after 3 failures
    if (failureCount >= 3) {
      await this.config.pool.query(
        `
        UPDATE automations
        SET enabled = false, updated_at = NOW()
        WHERE id = $1
        `,
        [automationId]
      );

      console.log(`[AutomationRunner] Disabled automation ${automationId} after ${failureCount} failures`);
    }
  }

  private async validateTemplate(
    template: AssetReference,
    variables: MappedVariables
  ): Promise<{valid: boolean; errors?: string[]}> {
    // TODO: Fetch template schema from database and validate variables against it
    // For now, assume valid
    return {valid: true};
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAutomationRunner(config: AutomationRunnerConfig): AutomationRunner {
  return new AutomationRunner(config);
}
