import { ProjectIdSchema, CreateProjectRequestSchema, UpdateProjectRequestSchema, ProjectSchema, ProjectListResponseSchema, } from '../schemas.js';
// In-memory store (replace with actual database)
const projectsStore = new Map();
// ============================================================================
// Helper Functions
// ============================================================================
const generateProjectId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'proj_';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
const now = () => new Date().toISOString();
const handleZodError = (error, reply) => {
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
        instance: '/projects',
        errors,
    });
};
const listProjects = async (request, reply) => {
    const page = request.query.page ?? 1;
    const perPage = Math.min(request.query.per_page ?? 20, 100);
    const status = request.query.status ?? 'active';
    const sort = request.query.sort ?? 'created_at';
    const order = request.query.order ?? 'desc';
    // Filter and sort projects
    let projects = Array.from(projectsStore.values()).filter((p) => status === 'deleted' || p.status === status);
    projects.sort((a, b) => {
        const aVal = a[sort];
        const bVal = b[sort];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return order === 'asc' ? comparison : -comparison;
    });
    // Paginate
    const total = projects.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const paginatedProjects = projects.slice(start, start + perPage);
    const response = {
        data: paginatedProjects,
        pagination: {
            page,
            per_page: perPage,
            total,
            total_pages: totalPages,
        },
    };
    // Validate response
    const validated = ProjectListResponseSchema.safeParse(response);
    if (!validated.success) {
        request.log.error(validated.error, 'Response validation failed');
        return reply.status(500).send({
            type: 'https://api.renderowl.com/errors/internal-error',
            title: 'Internal Server Error',
            status: 500,
            detail: 'Failed to generate valid response',
            instance: '/projects',
        });
    }
    return reply.send(validated.data);
};
const createProject = async (request, reply) => {
    // Validate request body
    const validation = CreateProjectRequestSchema.safeParse(request.body);
    if (!validation.success) {
        return handleZodError(validation.error, reply);
    }
    const data = validation.data;
    const timestamp = now();
    const projectId = generateProjectId();
    const project = {
        id: projectId,
        name: data.name,
        description: data.description ?? null,
        status: 'active',
        settings: {
            default_width: data.settings?.default_width ?? 1080,
            default_height: data.settings?.default_height ?? 1920,
            default_fps: data.settings?.default_fps ?? 30,
            default_duration_sec: data.settings?.default_duration_sec ?? 60,
        },
        created_at: timestamp,
        updated_at: timestamp,
        created_by: request.user?.id ?? 'unknown',
        asset_count: 0,
        render_count: 0,
    };
    // Validate complete project schema
    const projectValidation = ProjectSchema.safeParse(project);
    if (!projectValidation.success) {
        request.log.error(projectValidation.error, 'Project schema validation failed');
        return reply.status(500).send({
            type: 'https://api.renderowl.com/errors/internal-error',
            title: 'Internal Server Error',
            status: 500,
            detail: 'Failed to create valid project',
            instance: '/projects',
        });
    }
    projectsStore.set(projectId, project);
    request.log.info({ projectId }, 'Project created');
    return reply.status(201).send(project);
};
const getProject = async (request, reply) => {
    const { id } = request.params;
    // Validate ID format
    const idValidation = ProjectIdSchema.safeParse(id);
    if (!idValidation.success) {
        return reply.status(400).send({
            type: 'https://api.renderowl.com/errors/invalid-id',
            title: 'Invalid Project ID',
            status: 400,
            detail: `The project ID "${id}" is not valid`,
            instance: `/projects/${id}`,
        });
    }
    const project = projectsStore.get(id);
    if (!project) {
        return reply.status(404).send({
            type: 'https://api.renderowl.com/errors/not-found',
            title: 'Project Not Found',
            status: 404,
            detail: `Project with ID "${id}" does not exist`,
            instance: `/projects/${id}`,
        });
    }
    return reply.send(project);
};
const updateProject = async (request, reply) => {
    const { id } = request.params;
    // Validate ID format
    const idValidation = ProjectIdSchema.safeParse(id);
    if (!idValidation.success) {
        return reply.status(400).send({
            type: 'https://api.renderowl.com/errors/invalid-id',
            title: 'Invalid Project ID',
            status: 400,
            detail: `The project ID "${id}" is not valid`,
            instance: `/projects/${id}`,
        });
    }
    // Validate request body
    const validation = UpdateProjectRequestSchema.safeParse(request.body);
    if (!validation.success) {
        return handleZodError(validation.error, reply);
    }
    const existingProject = projectsStore.get(id);
    if (!existingProject) {
        return reply.status(404).send({
            type: 'https://api.renderowl.com/errors/not-found',
            title: 'Project Not Found',
            status: 404,
            detail: `Project with ID "${id}" does not exist`,
            instance: `/projects/${id}`,
        });
    }
    const data = validation.data;
    const updatedProject = {
        ...existingProject,
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.settings !== undefined && {
            settings: {
                ...existingProject.settings,
                ...data.settings,
            },
        }),
        updated_at: now(),
    };
    // Validate updated project
    const projectValidation = ProjectSchema.safeParse(updatedProject);
    if (!projectValidation.success) {
        request.log.error(projectValidation.error, 'Updated project validation failed');
        return reply.status(500).send({
            type: 'https://api.renderowl.com/errors/internal-error',
            title: 'Internal Server Error',
            status: 500,
            detail: 'Failed to update project with valid data',
            instance: `/projects/${id}`,
        });
    }
    projectsStore.set(id, updatedProject);
    request.log.info({ projectId: id }, 'Project updated');
    return reply.send(updatedProject);
};
const deleteProject = async (request, reply) => {
    const { id } = request.params;
    // Validate ID format
    const idValidation = ProjectIdSchema.safeParse(id);
    if (!idValidation.success) {
        return reply.status(400).send({
            type: 'https://api.renderowl.com/errors/invalid-id',
            title: 'Invalid Project ID',
            status: 400,
            detail: `The project ID "${id}" is not valid`,
            instance: `/projects/${id}`,
        });
    }
    const project = projectsStore.get(id);
    if (!project) {
        return reply.status(404).send({
            type: 'https://api.renderowl.com/errors/not-found',
            title: 'Project Not Found',
            status: 404,
            detail: `Project with ID "${id}" does not exist`,
            instance: `/projects/${id}`,
        });
    }
    // Soft delete - mark as deleted
    project.status = 'deleted';
    project.updated_at = now();
    projectsStore.set(id, project);
    request.log.info({ projectId: id }, 'Project deleted');
    return reply.status(204).send();
};
// ============================================================================
// Plugin Definition
// ============================================================================
export default async function projectsRoutes(fastify, _opts) {
    // GET /projects - List projects
    fastify.get('/', listProjects);
    // POST /projects - Create project
    fastify.post('/', createProject);
    // GET /projects/:id - Get project
    fastify.get('/:id', getProject);
    // PATCH /projects/:id - Update project
    fastify.patch('/:id', updateProject);
    // DELETE /projects/:id - Delete project
    fastify.delete('/:id', deleteProject);
}
//# sourceMappingURL=projects.js.map