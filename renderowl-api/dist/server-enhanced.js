import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import path from 'path';
import { fileURLToPath } from 'url';
// Import new enhanced modules
import { errorHandlerPlugin, ErrorTypes } from './lib/errors.js';
import cachePlugin from './lib/cache.js';
import monitoringPlugin, { StructuredLogger } from './lib/monitoring.js';
import securityPlugin from './lib/security.js';
import { EnhancedJobQueue } from './lib/enhanced-queue.js';
import { AutomationRunner } from './lib/automation-runner.js';
import { rateLimitPlugin } from './lib/ratelimit/index.js';
import { performancePlugin } from './lib/performance.js';
import { apiVersioningPlugin } from './lib/api-versioning.js';
// Import routes
import projectsRoutes from './routes/projects.js';
import assetsRoutes from './routes/assets.js';
import rendersRoutes from './routes/renders.js';
import automationRoutes from './routes/automations.js';
import userRoutes from './routes/user.js';
import creditsRoutes from './routes/credits.js';
import stripeRoutes from './routes/stripe.js';
import webhookRoutes from './routes/webhooks.js';
import apiKeyRoutes from './routes/apikeys.js';
import batchRoutes from './routes/batch.js';
import batchJobRoutes from './routes/batch-jobs.js';
import analyticsRoutes from './routes/analytics.js';
import docsRoutes from './routes/docs.js';
import integrationRoutes from './routes/integrations.js';
import youtubeRoutes from './routes/youtube.js';
import rssRoutes from './routes/rss.js';
import templateRoutes from './routes/templates.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ============================================================================
// Initialize Logger
// ============================================================================
const logger = new StructuredLogger('renderowl-api', process.env.LOG_LEVEL || 'info');
// ============================================================================
// Initialize Queue and Runner
// ============================================================================
const dbPath = process.env.QUEUE_DB_PATH || path.join(__dirname, '../data/queue.db');
const jobQueue = new EnhancedJobQueue(dbPath, {
    maxAttempts: 3,
    backoffStrategy: 'exponential',
    baseDelayMs: 1000,
    maxDelayMs: 300000,
    jobTimeoutMs: 300000,
    stalledCheckIntervalMs: 30000,
    batchSize: 10,
    concurrency: 5,
});
const automationRunner = new AutomationRunner(jobQueue);
// Start queue workers
await jobQueue.start(500); // Poll every 500ms for better responsiveness
// ============================================================================
// Queue Event Logging & Metrics
// ============================================================================
jobQueue.on('job:created', ({ jobId, queue, type, priority }) => {
    logger.info('Job created', { jobId, queue, type, priority });
});
jobQueue.on('job:deduplicated', ({ jobId, idempotencyKey }) => {
    logger.info('Job deduplicated', { jobId, idempotencyKey });
});
jobQueue.on('job:started', ({ jobId, type, attempt }) => {
    logger.info('Job started', { jobId, type, attempt });
});
jobQueue.on('job:completed', ({ jobId, type, duration, totalTime }) => {
    logger.info('Job completed', { jobId, type, duration, totalTime });
});
jobQueue.on('job:retrying', ({ jobId, type, attempt, maxAttempts, delayMs }) => {
    logger.warn('Job retrying', { jobId, type, attempt, maxAttempts, delayMs });
});
jobQueue.on('job:stalled', ({ jobId, type, workerId }) => {
    logger.warn('Job stalled', { jobId, type, workerId });
});
jobQueue.on('job:dead_letter', ({ jobId, type, error, attempts }) => {
    logger.error('Job moved to DLQ', { jobId, type, error, attempts });
});
jobQueue.on('job:error', ({ jobId, error }) => {
    logger.error('Job processing error', { jobId, error });
});
jobQueue.on('worker:started', ({ workerId, concurrency }) => {
    logger.info('Queue worker started', { workerId, concurrency });
});
// ============================================================================
// Fastify Setup with Enhanced Configuration
// ============================================================================
const fastify = Fastify({
    logger: false, // Use our structured logger instead
    requestIdLogLabel: 'requestId',
    // Connection and timeout hardening
    connectionTimeout: 30000,
    keepAliveTimeout: 65000,
    requestTimeout: 120000,
    bodyLimit: 10 * 1024 * 1024,
    maxRequestsPerSocket: 1000,
    // Request ID generation
    requestIdHeader: 'x-request-id',
    genReqId: () => `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
});
// Decorate with our custom logger
fastify.decorate('customLogger', logger);
// ============================================================================
// Register Enhanced Plugins
// ============================================================================
// 1. Error Handler (MUST be first)
await fastify.register(errorHandlerPlugin);
// 2. Security Plugin
await fastify.register(securityPlugin, {
    config: {
        corsOrigins: process.env.CORS_ORIGIN?.split(',') || [
            'https://app.renderowl.com',
            'https://renderowl.com',
            'http://localhost:3000',
            'http://localhost:5173',
        ],
        maxBodySize: 10 * 1024 * 1024,
    },
});
// 3. Monitoring Plugin
await fastify.register(monitoringPlugin, {
    serviceName: 'renderowl-api',
    logLevel: process.env.LOG_LEVEL || 'info',
    enableTracing: true,
    enableMetrics: true,
    enableHealthChecks: true,
});
// 4. Cache Plugin
await fastify.register(cachePlugin, {
    dbPath: path.join(__dirname, '../data/cache.db'),
    config: {
        defaultTtlSeconds: 300,
        maxSize: 10000,
        maxSizeBytes: 100 * 1024 * 1024,
    },
});
// 5. Rate Limiting Plugin
await fastify.register(rateLimitPlugin, {
    dbPath: path.join(__dirname, '../data/ratelimit.db'),
    keyGenerator: (request) => {
        const userId = request.user?.id;
        if (userId)
            return `user:${userId}`;
        const apiKey = request.headers['x-api-key'];
        if (apiKey)
            return `apikey:${apiKey.slice(0, 8)}`;
        return `ip:${request.ip || request.socket.remoteAddress || 'unknown'}`;
    },
    tierResolver: (request) => request.user?.tier || 'free',
});
// 6. Performance Monitoring Plugin
await fastify.register(performancePlugin, {
    maxMetrics: 50000,
    retentionMs: 24 * 60 * 60 * 1000, // 24 hours
});
// 7. Helmet for additional security headers
await fastify.register(helmet, {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
});
// 8. CORS
await fastify.register(cors, {
    origin: (origin, cb) => {
        const allowed = process.env.CORS_ORIGIN?.split(',') || [
            'https://app.renderowl.com',
            'https://renderowl.com',
            'http://localhost:3000',
            'http://localhost:5173',
        ];
        if (!origin || allowed.includes(origin) || allowed.includes('*')) {
            cb(null, true);
        }
        else {
            cb(new Error('Not allowed'), false);
        }
    },
    credentials: true,
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Idempotency-Key',
        'X-Request-ID',
        'X-Trace-ID',
        'X-Parent-Span-ID',
        'X-Trace-Sampled',
        'If-None-Match',
    ],
    exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Request-ID',
        'X-Trace-ID',
        'X-Span-ID',
        'X-Cache',
        'ETag',
    ],
});
// 9. JWT
await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    decode: { complete: true },
});
// 10. API Versioning Plugin
await fastify.register(apiVersioningPlugin);
// ============================================================================
// Decorate Fastify Instance
// ============================================================================
fastify.decorate('jobQueue', jobQueue);
fastify.decorate('automationRunner', automationRunner);
// ============================================================================
// Health Checks
// ============================================================================
fastify.health.register('queue', async () => {
    const stalled = jobQueue.getStalledJobsCount();
    if (stalled > 10) {
        return { status: 'degraded', message: `${stalled} stalled jobs detected` };
    }
    return { status: 'healthy' };
});
fastify.health.register('database', async () => {
    // Check if we can query the queue database
    try {
        jobQueue.getAllStats();
        return { status: 'healthy' };
    }
    catch (error) {
        return {
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Database check failed'
        };
    }
});
// ============================================================================
// Enhanced Hooks
// ============================================================================
// Request timing and logging
fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now();
});
fastify.addHook('onResponse', async (request, reply) => {
    const responseTime = reply.elapsedTime;
    const startTime = request.startTime;
    const duration = startTime ? Date.now() - startTime : responseTime;
    // Log request completion
    logger.info('Request completed', {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: Math.round(duration),
        requestId: request.id,
        userId: request.user?.id,
    });
    // Metrics
    fastify.metrics?.histogram('http.request.duration', duration, {
        method: request.method,
        route: request.routerPath || request.url,
        status: reply.statusCode.toString(),
    });
    // Alert on slow requests
    if (duration > 1000) {
        logger.warn('Slow request detected', {
            method: request.method,
            url: request.url,
            duration,
            requestId: request.id,
        });
    }
});
// Timeout monitoring
fastify.addHook('onTimeout', async (request) => {
    logger.error('Request timeout exceeded', {
        requestId: request.id,
        url: request.url,
        method: request.method,
    });
});
// ============================================================================
// Public Routes
// ============================================================================
// Documentation routes (public)
await fastify.register(docsRoutes, { prefix: '/docs' });
// Live check endpoint (for load balancers)
fastify.get('/live', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});
// Ready check endpoint (includes dependency checks)
fastify.get('/ready', async (request, reply) => {
    const checks = await fastify.health.runAllChecks();
    const overall = fastify.health.getOverallStatus();
    const statusCode = overall === 'healthy' ? 200 : overall === 'degraded' ? 200 : 503;
    reply.status(statusCode);
    return {
        status: overall,
        checks: checks.map(c => ({
            name: c.name,
            status: c.status,
            responseTime: c.responseTime,
        })),
    };
});
// ============================================================================
// Queue Stats Endpoint
// ============================================================================
fastify.get('/queue/stats', async (request, reply) => {
    const stats = jobQueue.getAllStats();
    const dlq = jobQueue.getDeadLetterJobs(undefined, 10);
    return {
        timestamp: new Date().toISOString(),
        queues: stats,
        deadLetter: dlq,
        stalledJobs: jobQueue.getStalledJobsCount(),
    };
});
// ============================================================================
// API v1 Routes with Enhanced Auth
// ============================================================================
await fastify.register(async function (api) {
    // Auth hook - validates Bearer token OR API key
    api.addHook('onRequest', async (request, reply) => {
        const auth = request.headers.authorization;
        const apiKey = request.headers['x-api-key'];
        // Check for API key first (handled by security plugin)
        if (apiKey && typeof apiKey === 'string') {
            return; // Let security plugin handle it
        }
        // Check for Bearer token
        if (!auth || !auth.startsWith('Bearer ')) {
            reply.status(401).send({
                type: ErrorTypes.UNAUTHORIZED,
                title: 'Unauthorized',
                status: 401,
                detail: 'Bearer token or API key required',
                instance: request.url,
            });
            return;
        }
        // In production, validate token and set user context
        // For now, using development user
        request.user = {
            id: 'user_dev123',
            email: 'dev@renderowl.com',
            tier: 'pro',
        };
    });
    // Register route modules with caching hints
    await api.register(projectsRoutes, { prefix: '/projects' });
    await api.register(assetsRoutes, { prefix: '/projects/:project_id/assets' });
    await api.register(rendersRoutes, { prefix: '/projects/:project_id/renders' });
    await api.register(automationRoutes, { prefix: '/projects/:project_id/automations' });
    await api.register(userRoutes, { prefix: '/user' });
    await api.register(creditsRoutes, { prefix: '/credits' });
    await api.register(stripeRoutes, { prefix: '/stripe' });
    await api.register(webhookRoutes, { prefix: '/webhooks' });
    await api.register(apiKeyRoutes, { prefix: '/user/api-keys' });
    await api.register(batchRoutes, { prefix: '/batch' });
    await api.register(batchJobRoutes, { prefix: '/batch-jobs' });
    await api.register(analyticsRoutes, { prefix: '/analytics' });
    await api.register(integrationRoutes, { prefix: '/integrations' });
    await api.register(youtubeRoutes, { prefix: '/youtube' });
    await api.register(rssRoutes, { prefix: '/rss' });
    await api.register(templateRoutes, { prefix: '/templates' });
}, { prefix: '/v1' });
// ============================================================================
// Stripe Webhook Route (raw body needed for signature verification)
// ============================================================================
await fastify.post('/v1/stripe/webhook', {
    config: { bodyLimit: 10 * 1024 * 1024 },
    preParsing: async (request, reply, payload) => {
        const chunks = [];
        for await (const chunk of payload) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const rawBody = Buffer.concat(chunks);
        request.rawBody = rawBody;
        return rawBody;
    }
}, async (request, reply) => {
    const { default: stripeWebhookHandler } = await import('./routes/stripe-webhook.js');
    return stripeWebhookHandler(request, reply);
});
// ============================================================================
// Graceful Shutdown
// ============================================================================
async function gracefulShutdown(signal) {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    const forceExitTimeout = setTimeout(() => {
        logger.error('Graceful shutdown timed out after 15s. Forcing exit.');
        process.exit(1);
    }, 15000);
    try {
        // Stop accepting new connections
        await fastify.close();
        logger.info('Fastify server closed');
        // Stop queue workers
        await jobQueue.stop();
        jobQueue.close();
        logger.info('Queue workers stopped');
        clearTimeout(forceExitTimeout);
        logger.info('Graceful shutdown complete.');
        process.exit(0);
    }
    catch (err) {
        logger.error('Error during shutdown', { error: err });
        clearTimeout(forceExitTimeout);
        process.exit(1);
    }
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught errors
process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
});
// ============================================================================
// Start Server
// ============================================================================
const port = parseInt(process.env.PORT || '8000');
const host = process.env.HOST || '0.0.0.0';
try {
    await fastify.listen({ port, host });
    logger.info(`Server running at http://${host}:${port}`, {
        port,
        host,
        environment: process.env.NODE_ENV || 'development',
    });
}
catch (err) {
    logger.error('Failed to start server', { error: err });
    process.exit(1);
}
//# sourceMappingURL=server-enhanced.js.map