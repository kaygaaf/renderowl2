import { ProjectIdSchema, AutomationIdSchema, CreateAutomationRequestSchema, UpdateAutomationRequestSchema, } from '../schemas.js';
const automationsStore = new Map();
// ============================================================================
// Helper Functions
// ============================================================================
const generateAutomationId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'auto_';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
const now = () => new Date().toISOString();
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
export default async function automationRoutes(fastify, _opts) {
    // Get queue and runner from fastify instance (set in server.ts)
    const runner = fastify.automationRunner;
    fastify.get('/', async (request, reply) => {
        const { project_id } = request.params;
        const page = request.query.page ?? 1;
        const perPage = Math.min(request.query.per_page ?? 20, 100);
        const enabledFilter = request.query.enabled;
        // Validate project ID
        const idValidation = ProjectIdSchema.safeParse(project_id);
        if (!idValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/automations`,
            });
        }
        let automations = Array.from(automationsStore.values()).filter((a) => a.project_id === project_id);
        if (enabledFilter !== undefined) {
            automations = automations.filter((a) => a.enabled === enabledFilter);
        }
        const total = automations.length;
        const totalPages = Math.ceil(total / perPage);
        const start = (page - 1) * perPage;
        const paginatedAutomations = automations.slice(start, start + perPage);
        const response = {
            data: paginatedAutomations,
            pagination: {
                page,
                per_page: perPage,
                total,
                total_pages: totalPages,
            },
        };
        return reply.send(response);
    });
    fastify.post('/', async (request, reply) => {
        const { project_id } = request.params;
        // Validate project ID
        const idValidation = ProjectIdSchema.safeParse(project_id);
        if (!idValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/automations`,
            });
        }
        // Validate request body
        const validation = CreateAutomationRequestSchema.safeParse(request.body);
        if (!validation.success) {
            return handleZodError(validation.error, reply, `/projects/${project_id}/automations`);
        }
        const data = validation.data;
        const timestamp = now();
        const automationId = generateAutomationId();
        const automation = {
            id: automationId,
            project_id,
            name: data.name,
            enabled: data.enabled ?? true,
            trigger: data.trigger,
            actions: data.actions,
            created_at: timestamp,
            updated_at: timestamp,
            last_triggered_at: null,
            trigger_count: 0,
        };
        automationsStore.set(automationId, automation);
        request.log.info({ automationId, projectId: project_id }, 'Automation created');
        return reply.status(201).send(automation);
    });
    fastify.get('/:id', async (request, reply) => {
        const { project_id, id } = request.params;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const automationIdValidation = AutomationIdSchema.safeParse(id);
        if (!projectIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/automations/${id}`,
            });
        }
        if (!automationIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Automation ID',
                status: 400,
                detail: `The automation ID "${id}" is not valid`,
                instance: `/projects/${project_id}/automations/${id}`,
            });
        }
        const automation = automationsStore.get(id);
        if (!automation || automation.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Automation Not Found',
                status: 404,
                detail: `Automation with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/automations/${id}`,
            });
        }
        return reply.send(automation);
    });
    fastify.patch('/:id', async (request, reply) => {
        const { project_id, id } = request.params;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const automationIdValidation = AutomationIdSchema.safeParse(id);
        if (!projectIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/automations/${id}`,
            });
        }
        if (!automationIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Automation ID',
                status: 400,
                detail: `The automation ID "${id}" is not valid`,
                instance: `/projects/${project_id}/automations/${id}`,
            });
        }
        // Validate request body
        const validation = UpdateAutomationRequestSchema.safeParse(request.body);
        if (!validation.success) {
            return handleZodError(validation.error, reply, `/projects/${project_id}/automations/${id}`);
        }
        const existingAutomation = automationsStore.get(id);
        if (!existingAutomation || existingAutomation.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Automation Not Found',
                status: 404,
                detail: `Automation with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/automations/${id}`,
            });
        }
        const data = validation.data;
        const updatedAutomation = {
            ...existingAutomation,
            ...(data.name !== undefined && { name: data.name }),
            ...(data.trigger !== undefined && { trigger: data.trigger }),
            ...(data.actions !== undefined && { actions: data.actions }),
            ...(data.enabled !== undefined && { enabled: data.enabled }),
            updated_at: now(),
        };
        automationsStore.set(id, updatedAutomation);
        request.log.info({ automationId: id }, 'Automation updated');
        return reply.send(updatedAutomation);
    });
    fastify.delete('/:id', async (request, reply) => {
        const { project_id, id } = request.params;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const automationIdValidation = AutomationIdSchema.safeParse(id);
        if (!projectIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/automations/${id}`,
            });
        }
        if (!automationIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Automation ID',
                status: 400,
                detail: `The automation ID "${id}" is not valid`,
                instance: `/projects/${project_id}/automations/${id}`,
            });
        }
        const automation = automationsStore.get(id);
        if (!automation || automation.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Automation Not Found',
                status: 404,
                detail: `Automation with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/automations/${id}`,
            });
        }
        automationsStore.delete(id);
        request.log.info({ automationId: id }, 'Automation deleted');
        return reply.status(204).send();
    });
    fastify.post('/:id/trigger', async (request, reply) => {
        const { project_id, id } = request.params;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const automationIdValidation = AutomationIdSchema.safeParse(id);
        if (!projectIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/automations/${id}/trigger`,
            });
        }
        if (!automationIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Automation ID',
                status: 400,
                detail: `The automation ID "${id}" is not valid`,
                instance: `/projects/${project_id}/automations/${id}/trigger`,
            });
        }
        const automation = automationsStore.get(id);
        if (!automation || automation.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Automation Not Found',
                status: 404,
                detail: `Automation with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/automations/${id}/trigger`,
            });
        }
        if (!automation.enabled) {
            return reply.status(409).send({
                type: 'https://api.renderowl.com/errors/automation-disabled',
                title: 'Automation Disabled',
                status: 409,
                detail: `Automation "${automation.name}" is currently disabled`,
                instance: `/projects/${project_id}/automations/${id}/trigger`,
            });
        }
        // Check for idempotency key in headers
        const idempotencyKey = request.headers['idempotency-key'];
        try {
            const { executionId, jobId } = await runner.triggerAutomation(automation, request.body, { idempotencyKey });
            // Update automation stats
            automation.last_triggered_at = now();
            automation.trigger_count++;
            automationsStore.set(id, automation);
            request.log.info({
                automationId: id,
                executionId,
                jobId,
                idempotencyKey
            }, 'Automation triggered');
            return reply.status(202).send({
                execution_id: executionId,
                job_id: jobId,
                status: 'queued',
            });
        }
        catch (error) {
            // Handle duplicate idempotency key
            if (error.message?.includes('idempotency')) {
                return reply.status(409).send({
                    type: 'https://api.renderowl.com/errors/idempotency-conflict',
                    title: 'Idempotency Key Conflict',
                    status: 409,
                    detail: 'A request with this idempotency key is already being processed',
                    instance: `/projects/${project_id}/automations/${id}/trigger`,
                });
            }
            throw error;
        }
    });
    fastify.get('/:id/executions/:execution_id', async (request, reply) => {
        const { project_id, id, execution_id } = request.params;
        // Validate automation exists
        const automation = automationsStore.get(id);
        if (!automation || automation.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Automation Not Found',
                status: 404,
                detail: `Automation with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/automations/${id}/executions/${execution_id}`,
            });
        }
        const execution = runner.getExecution(execution_id);
        if (!execution) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Execution Not Found',
                status: 404,
                detail: `Execution with ID "${execution_id}" does not exist`,
                instance: `/projects/${project_id}/automations/${id}/executions/${execution_id}`,
            });
        }
        return reply.send(execution);
    });
    fastify.get('/:id/executions', async (request, reply) => {
        const { project_id, id } = request.params;
        const limit = Math.min(request.query.limit ?? 20, 100);
        // Validate automation exists
        const automation = automationsStore.get(id);
        if (!automation || automation.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Automation Not Found',
                status: 404,
                detail: `Automation with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/automations/${id}/executions`,
            });
        }
        const executions = runner.getExecutionsByAutomation(id).slice(0, limit);
        return reply.send({ data: executions });
    });
}
//# sourceMappingURL=automations.js.map