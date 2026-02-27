import crypto from 'crypto';
import { ProjectIdSchema, RenderIdSchema, CreateRenderRequestSchema, RenderStatusSchema, CaptionedVideoInputPropsSchema, RenderOutputUrlResponseSchema, } from '../schemas.js';
const rendersStore = new Map();
// Track renders by project for efficient listing
const projectRendersIndex = new Map();
// ============================================================================
// Helper Functions
// ============================================================================
const generateRenderId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'rnd_';
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
// Detect asset references in input props
const extractAssetReferences = (inputProps) => {
    const refs = [];
    const traverse = (obj) => {
        if (typeof obj === 'string' && obj.startsWith('asset://')) {
            refs.push(obj.replace('asset://', ''));
        }
        else if (Array.isArray(obj)) {
            obj.forEach(traverse);
        }
        else if (obj && typeof obj === 'object') {
            Object.values(obj).forEach(traverse);
        }
    };
    traverse(inputProps);
    return refs;
};
// Calculate total frames from duration/fps
const calculateTotalFrames = (settings) => {
    const durationMs = settings.durationMs || (settings.durationSec ? settings.durationSec * 1000 : 60000);
    return Math.ceil((durationMs / 1000) * settings.fps);
};
// ============================================================================
// Route Factory
// ============================================================================
export default async function renderRoutes(fastify, _opts) {
    // Get queue from fastify instance (set in server.ts)
    const jobQueue = fastify.jobQueue;
    // Register job handlers
    jobQueue.registerHandler('render:remotion', async (job) => {
        const renderId = job.stepState['renderId'];
        const render = rendersStore.get(renderId);
        if (!render)
            throw new Error(`Render not found: ${renderId}`);
        // Update status to rendering
        render.status = 'rendering';
        render.started_at = now();
        rendersStore.set(renderId, render);
        // Simulate progress updates (in real implementation, this would be done by the worker)
        const totalFrames = render.progress.total_frames;
        // Store progress update function in step state for external updates
        jobQueue.updateStepState(job.id, 'renderId', renderId);
        jobQueue.updateStepState(job.id, 'totalFrames', totalFrames);
    });
    // Register handler for render completion
    jobQueue.registerHandler('render:complete', async (job) => {
        const renderId = job.stepState['renderId'];
        const render = rendersStore.get(renderId);
        if (!render)
            return;
        render.status = 'completed';
        render.progress.percent = 100;
        render.progress.current_frame = render.progress.total_frames;
        render.completed_at = now();
        // Mock output (in real impl, this comes from the worker)
        render.output = {
            url: `https://cdn.renderowl.com/renders/${renderId}/output.mp4`,
            size_bytes: Math.floor(Math.random() * 100000000) + 1000000,
            duration_ms: 60000,
        };
        rendersStore.set(renderId, render);
    });
    fastify.get('/', async (request, reply) => {
        const { project_id } = request.params;
        const page = request.query.page ?? 1;
        const perPage = Math.min(request.query.per_page ?? 20, 100);
        const statusFilter = request.query.status;
        const compositionFilter = request.query.composition_id;
        // Validate project ID
        const idValidation = ProjectIdSchema.safeParse(project_id);
        if (!idValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/renders`,
            });
        }
        // Get render IDs for this project
        const renderIds = projectRendersIndex.get(project_id) || new Set();
        let renders = [];
        for (const id of renderIds) {
            const render = rendersStore.get(id);
            if (render)
                renders.push(render);
        }
        // Apply filters
        if (statusFilter) {
            const statusValidation = RenderStatusSchema.safeParse(statusFilter);
            if (statusValidation.success) {
                renders = renders.filter((r) => r.status === statusFilter);
            }
        }
        if (compositionFilter) {
            renders = renders.filter((r) => r.composition_id === compositionFilter);
        }
        // Sort by created_at desc
        renders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const total = renders.length;
        const totalPages = Math.ceil(total / perPage);
        const start = (page - 1) * perPage;
        const paginatedRenders = renders.slice(start, start + perPage);
        // Remove internal fields from response
        const sanitizedRenders = paginatedRenders.map(({ queue_job_id, ...render }) => render);
        const response = {
            data: sanitizedRenders,
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
                instance: `/projects/${project_id}/renders`,
            });
        }
        // Validate request body
        const validation = CreateRenderRequestSchema.safeParse(request.body);
        if (!validation.success) {
            return handleZodError(validation.error, reply, `/projects/${project_id}/renders`);
        }
        const data = validation.data;
        const timestamp = now();
        const renderId = generateRenderId();
        // Validate composition-specific input props
        if (data.composition_id === 'CaptionedVideo') {
            const propsValidation = CaptionedVideoInputPropsSchema.safeParse(data.input_props);
            if (!propsValidation.success) {
                return handleZodError(propsValidation.error, reply, `/projects/${project_id}/renders`);
            }
        }
        // Extract and validate asset references
        extractAssetReferences(data.input_props);
        // In production: validate these assets exist in the project
        // Validate output settings dimensions
        const { width, height, fps } = data.output_settings;
        // Max resolution: 8K (7680x4320)
        if (width > 7680 || height > 4320) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/validation-failed',
                title: 'Validation Failed',
                status: 400,
                detail: 'Output resolution exceeds maximum allowed (7680x4320 / 8K)',
                instance: `/projects/${project_id}/renders`,
            });
        }
        // Min resolution: 64x64
        if (width < 64 || height < 64) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/validation-failed',
                title: 'Validation Failed',
                status: 400,
                detail: 'Output resolution must be at least 64x64',
                instance: `/projects/${project_id}/renders`,
            });
        }
        // Max FPS: 240
        if (fps > 240) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/validation-failed',
                title: 'Validation Failed',
                status: 400,
                detail: 'FPS cannot exceed 240',
                instance: `/projects/${project_id}/renders`,
            });
        }
        // Min FPS: 1
        if (fps < 1) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/validation-failed',
                title: 'Validation Failed',
                status: 400,
                detail: 'FPS must be at least 1',
                instance: `/projects/${project_id}/renders`,
            });
        }
        // Validate duration from input_props
        const durationSec = data.input_props.durationSec || 60;
        if (durationSec <= 0 || durationSec > 3600) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/validation-failed',
                title: 'Validation Failed',
                status: 400,
                detail: 'Duration must be between 1 second and 1 hour (3600 seconds)',
                instance: `/projects/${project_id}/renders`,
            });
        }
        // Calculate total frames
        const totalFrames = calculateTotalFrames({
            fps: data.output_settings.fps,
            durationSec: durationSec,
        });
        const initialProgress = {
            percent: 0,
            current_frame: 0,
            total_frames: totalFrames,
            estimated_remaining_sec: null,
        };
        const render = {
            id: renderId,
            project_id,
            composition_id: data.composition_id,
            status: 'pending',
            input_props: data.input_props,
            output_settings: data.output_settings,
            priority: data.priority || 'normal',
            progress: initialProgress,
            output: null,
            error: null,
            created_at: timestamp,
            started_at: null,
            completed_at: null,
            queue_job_id: null,
        };
        // Queue the render job
        const job = await jobQueue.enqueue('renders', 'render:remotion', {
            renderId,
            projectId: project_id,
            compositionId: data.composition_id,
            inputProps: data.input_props,
            outputSettings: data.output_settings,
        }, {
            priority: data.priority || 'normal',
            idempotencyKey: request.headers['idempotency-key'],
            steps: ['prepare', 'render', 'upload', 'notify'],
        });
        render.queue_job_id = job.id;
        // Store render
        rendersStore.set(renderId, render);
        // Update project index
        if (!projectRendersIndex.has(project_id)) {
            projectRendersIndex.set(project_id, new Set());
        }
        projectRendersIndex.get(project_id).add(renderId);
        request.log.info({ renderId, projectId: project_id, jobId: job.id }, 'Render job created');
        return reply.status(201).send({
            ...render,
            queue_job_id: undefined, // Don't expose internal job ID
        });
    });
    fastify.get('/:id', async (request, reply) => {
        const { project_id, id } = request.params;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const renderIdValidation = RenderIdSchema.safeParse(id);
        if (!projectIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/renders/${id}`,
            });
        }
        if (!renderIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Render ID',
                status: 400,
                detail: `The render ID "${id}" is not valid`,
                instance: `/projects/${project_id}/renders/${id}`,
            });
        }
        const render = rendersStore.get(id);
        if (!render || render.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Render Not Found',
                status: 404,
                detail: `Render with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/renders/${id}`,
            });
        }
        // Sync status with job queue if still processing
        if (render.queue_job_id && ['pending', 'queued', 'rendering'].includes(render.status)) {
            const job = jobQueue.getJob(render.queue_job_id);
            if (job) {
                // Update status based on job state
                if (job.status === 'processing' && render.status === 'pending') {
                    render.status = 'queued';
                }
            }
        }
        // Remove internal fields from response
        const { queue_job_id, ...sanitizedRender } = render;
        return reply.send(sanitizedRender);
    });
    fastify.post('/:id/cancel', async (request, reply) => {
        const { project_id, id } = request.params;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const renderIdValidation = RenderIdSchema.safeParse(id);
        if (!projectIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/renders/${id}/cancel`,
            });
        }
        if (!renderIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Render ID',
                status: 400,
                detail: `The render ID "${id}" is not valid`,
                instance: `/projects/${project_id}/renders/${id}/cancel`,
            });
        }
        const render = rendersStore.get(id);
        if (!render || render.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Render Not Found',
                status: 404,
                detail: `Render with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/renders/${id}/cancel`,
            });
        }
        // Can only cancel pending or queued renders
        if (!['pending', 'queued'].includes(render.status)) {
            return reply.status(409).send({
                type: 'https://api.renderowl.com/errors/render-not-cancellable',
                title: 'Render Not Cancellable',
                status: 409,
                detail: `Cannot cancel render with status "${render.status}". Only pending or queued renders can be cancelled.`,
                instance: `/projects/${project_id}/renders/${id}/cancel`,
            });
        }
        // Cancel the job in queue
        if (render.queue_job_id) {
            jobQueue.cancelJob(render.queue_job_id);
        }
        // Update render status
        render.status = 'cancelled';
        render.completed_at = now();
        rendersStore.set(id, render);
        request.log.info({ renderId: id }, 'Render cancelled');
        const { queue_job_id, ...sanitizedRender } = render;
        return reply.send(sanitizedRender);
    });
    fastify.get('/:id/output', async (request, reply) => {
        const { project_id, id } = request.params;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const renderIdValidation = RenderIdSchema.safeParse(id);
        if (!projectIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/renders/${id}/output`,
            });
        }
        if (!renderIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Render ID',
                status: 400,
                detail: `The render ID "${id}" is not valid`,
                instance: `/projects/${project_id}/renders/${id}/output`,
            });
        }
        const render = rendersStore.get(id);
        if (!render || render.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Render Not Found',
                status: 404,
                detail: `Render with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/renders/${id}/output`,
            });
        }
        // Can only get output for completed renders
        if (render.status !== 'completed') {
            return reply.status(409).send({
                type: 'https://api.renderowl.com/errors/render-not-complete',
                title: 'Render Not Complete',
                status: 409,
                detail: `Cannot get output URL for render with status "${render.status}". Render must be completed.`,
                instance: `/projects/${project_id}/renders/${id}/output`,
            });
        }
        if (!render.output?.url) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/output-not-available',
                title: 'Output Not Available',
                status: 404,
                detail: 'Render output is not available. It may have expired.',
                instance: `/projects/${project_id}/renders/${id}/output`,
            });
        }
        // Generate signed URL (24h expiry)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const response = {
            download_url: render.output.url, // In production: generate signed URL
            expires_at: expiresAt,
            size_bytes: render.output.size_bytes || 0,
            duration_ms: render.output.duration_ms || 0,
        };
        // Validate response against schema
        const validation = RenderOutputUrlResponseSchema.safeParse(response);
        if (!validation.success) {
            request.log.error({ error: validation.error }, 'Output URL response validation failed');
        }
        return reply.send(response);
    });
    fastify.get('/:id/progress', async (request, reply) => {
        const { project_id, id } = request.params;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const renderIdValidation = RenderIdSchema.safeParse(id);
        if (!projectIdValidation.success || !renderIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid ID',
                status: 400,
                detail: 'Invalid project ID or render ID format',
                instance: `/projects/${project_id}/renders/${id}/progress`,
            });
        }
        const render = rendersStore.get(id);
        if (!render || render.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Render Not Found',
                status: 404,
                detail: `Render with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/renders/${id}/progress`,
            });
        }
        // Sync with job queue for latest progress
        if (render.queue_job_id && ['pending', 'queued', 'rendering'].includes(render.status)) {
            const job = jobQueue.getJob(render.queue_job_id);
            if (job && job.stepState['currentFrame']) {
                const currentFrame = job.stepState['currentFrame'];
                const totalFrames = render.progress.total_frames;
                render.progress.current_frame = currentFrame;
                render.progress.percent = Math.round((currentFrame / totalFrames) * 100 * 10) / 10;
            }
        }
        return reply.send({
            render_id: id,
            status: render.status,
            progress: render.progress,
            started_at: render.started_at,
            completed_at: render.completed_at,
        });
    });
    // Validate webhook signature from worker
    const validateWorkerSignature = (payload, signature) => {
        const secret = process.env.RENDER_WEBHOOK_SECRET;
        if (!secret) {
            console.error('[Webhook] RENDER_WEBHOOK_SECRET not configured');
            return false;
        }
        const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    };
    fastify.post('/webhooks/progress', async (request, reply) => {
        // Verify worker signature
        const signature = request.headers['x-worker-signature'];
        if (!signature) {
            return reply.status(401).send({
                type: 'https://api.renderowl.com/errors/unauthorized',
                title: 'Unauthorized',
                status: 401,
                detail: 'Missing X-Worker-Signature header',
                instance: '/v1/renders/webhooks/progress',
            });
        }
        // Validate signature
        const payload = JSON.stringify(request.body);
        if (!validateWorkerSignature(payload, signature)) {
            return reply.status(401).send({
                type: 'https://api.renderowl.com/errors/invalid-signature',
                title: 'Invalid Signature',
                status: 401,
                detail: 'Invalid worker signature',
                instance: '/v1/renders/webhooks/progress',
            });
        }
        const { render_id, current_frame, status, error, output } = request.body;
        // Validate render_id format
        const renderIdValidation = RenderIdSchema.safeParse(render_id);
        if (!renderIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Render ID',
                status: 400,
                detail: `The render ID "${render_id}" is not valid`,
                instance: '/v1/renders/webhooks/progress',
            });
        }
        // Validate current_frame is non-negative
        if (!Number.isInteger(current_frame) || current_frame < 0) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/validation-failed',
                title: 'Validation Failed',
                status: 400,
                detail: 'current_frame must be a non-negative integer',
                instance: '/v1/renders/webhooks/progress',
            });
        }
        const render = rendersStore.get(render_id);
        if (!render) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Render Not Found',
                status: 404,
                detail: `Render with ID "${render_id}" does not exist`,
                instance: '/v1/renders/webhooks/progress',
            });
        }
        // Update total_frames if provided
        if (request.body.total_frames !== undefined) {
            if (!Number.isInteger(request.body.total_frames) || request.body.total_frames <= 0) {
                return reply.status(400).send({
                    type: 'https://api.renderowl.com/errors/validation-failed',
                    title: 'Validation Failed',
                    status: 400,
                    detail: 'total_frames must be a positive integer',
                    instance: '/v1/renders/webhooks/progress',
                });
            }
            render.progress.total_frames = request.body.total_frames;
        }
        // Guard against division by zero
        if (render.progress.total_frames === 0) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/validation-failed',
                title: 'Validation Failed',
                status: 400,
                detail: 'total_frames cannot be zero',
                instance: '/v1/renders/webhooks/progress',
            });
        }
        // Update progress
        render.progress.current_frame = Math.min(current_frame, render.progress.total_frames);
        render.progress.percent = Math.round((render.progress.current_frame / render.progress.total_frames) * 100 * 10) / 10;
        // Update status if provided
        if (status) {
            render.status = status;
            if (status === 'completed') {
                render.completed_at = now();
                if (output) {
                    // Validate output URL
                    if (output.url && !output.url.startsWith('https://')) {
                        return reply.status(400).send({
                            type: 'https://api.renderowl.com/errors/validation-failed',
                            title: 'Validation Failed',
                            status: 400,
                            detail: 'output.url must be a valid HTTPS URL',
                            instance: '/v1/renders/webhooks/progress',
                        });
                    }
                    render.output = output;
                }
            }
            else if (status === 'failed') {
                render.completed_at = now();
                if (error) {
                    render.error = {
                        code: error.code || 'UNKNOWN_ERROR',
                        message: error.message || 'Unknown error',
                        details: error.details || null,
                    };
                }
            }
            else if (status === 'rendering' && !render.started_at) {
                render.started_at = now();
            }
        }
        rendersStore.set(render_id, render);
        request.log.info({ renderId: render_id, frame: current_frame, status }, 'Render progress updated via webhook');
        return reply.send({ success: true });
    });
}
// Export store for asset reference checking
export { rendersStore, projectRendersIndex };
//# sourceMappingURL=renders.js.map