import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import path from 'path';
import { fileURLToPath } from 'url';

import projectsRoutes from './routes/projects.js';
import assetsRoutes from './routes/assets.js';
import rendersRoutes from './routes/renders.js';
import automationRoutes from './routes/automations.js';
import userRoutes from './routes/user.js';
import creditsRoutes from './routes/credits.js';
import stripeRoutes from './routes/stripe.js';
import { JobQueue } from './lib/queue.js';
import { AutomationRunner } from './lib/automation-runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Initialize Queue and Runner
// ============================================================================

const dbPath = process.env.QUEUE_DB_PATH || path.join(__dirname, '../data/queue.db');
const jobQueue = new JobQueue(dbPath, {
  maxAttempts: 3,
  backoffStrategy: 'exponential',
  baseDelayMs: 1000,
  maxDelayMs: 300000, // 5 minutes
});

const automationRunner = new AutomationRunner(jobQueue);

// Start queue workers
await jobQueue.start(1000); // Poll every 1 second

// ============================================================================
// Queue Event Logging
// ============================================================================

jobQueue.on('job:created', ({ jobId, queue: queueName, type }) => {
  console.log(`[Queue] Job created: ${jobId} (type: ${type}, queue: ${queueName})`);
});

jobQueue.on('job:deduplicated', ({ jobId, queue: _queue, type, idempotencyKey }) => {
  console.log(`[Queue] Job deduplicated: ${jobId} (type: ${type}, key: ${idempotencyKey})`);
});

jobQueue.on('job:started', ({ jobId, type, attempt }) => {
  console.log(`[Queue] Job started: ${jobId} (type: ${type}, attempt: ${attempt})`);
});

jobQueue.on('job:completed', ({ jobId, type, duration }) => {
  console.log(`[Queue] Job completed: ${jobId} (type: ${type}, duration: ${duration}ms)`);
});

jobQueue.on('job:retrying', ({ jobId, type, attempt, maxAttempts, delayMs, reason }) => {
  console.log(`[Queue] Job retrying: ${jobId} (type: ${type}, attempt: ${attempt}/${maxAttempts}, delay: ${delayMs}ms${reason ? `, reason: ${reason}` : ''})`);
});

jobQueue.on('job:stalled', ({ jobId, type, workerId, timeoutAt }) => {
  console.warn(`[Queue] Job stalled: ${jobId} (type: ${type}, worker: ${workerId}, timeout: ${timeoutAt})`);
});

jobQueue.on('job:dead_letter', ({ jobId, type, error, attempts }) => {
  console.error(`[Queue] Job moved to DLQ: ${jobId} (type: ${type}, attempts: ${attempts}, error: ${error})`);
});

jobQueue.on('worker:started', ({ workerId }) => {
  console.log(`[Queue] Worker started: ${workerId}`);
});

// ============================================================================
// Fastify Setup
// ============================================================================

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  // Connection and timeout hardening
  connectionTimeout: 30000,        // 30s to establish connection
  keepAliveTimeout: 65000,         // Slightly > typical load balancer (60s)
  requestTimeout: 120000,          // 2min max for any request
  bodyLimit: 10 * 1024 * 1024,     // 10MB max body size
  maxRequestsPerSocket: 1000,      // Prevent connection leaks
});

// Register timeout monitoring hook
fastify.addHook('onTimeout', async (request) => {
  fastify.log.warn({ reqId: request.id, url: request.url }, 'Request timeout exceeded');
});

// Register response-time tracking for slow request detection
fastify.addHook('onResponse', async (request, reply) => {
  const responseTime = reply.elapsedTime;
  if (responseTime > 30000) {
    fastify.log.warn({ 
      reqId: request.id, 
      url: request.url, 
      method: request.method,
      responseTime: `${responseTime.toFixed(0)}ms`
    }, 'Slow request detected (>30s)');
  }
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
});

// Decorate fastify with queue and runner for access in routes
fastify.decorate('jobQueue', jobQueue);
fastify.decorate('automationRunner', automationRunner);

// Health check endpoint
fastify.get('/health', async () => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    memory: {
      used_mb: Math.round(memory.heapUsed / 1024 / 1024),
      total_mb: Math.round(memory.heapTotal / 1024 / 1024),
    },
    queue: {
      workerId: jobQueue['workerId'],
      isRunning: jobQueue['isRunning'],
      stalledJobs: jobQueue.getStalledJobsCount(),
    },
  };
});

// Live check endpoint (for load balancers)
fastify.get('/live', async () => {
  return { status: 'ok' };
});

// Queue stats endpoint
fastify.get('/queue/stats', async () => {
  const queues = ['renders', 'notifications', 'automation'];
  const stats: Record<string, any> = {};
  
  for (const queue of queues) {
    stats[queue] = jobQueue.getQueueStats(queue);
  }
  
  return {
    timestamp: new Date().toISOString(),
    queues: stats,
    deadLetter: jobQueue.getDeadLetterJobs(undefined, 10),
  };
});

// API v1 routes
await fastify.register(
  async function (api) {
    // Auth hook (simplified - validates Bearer token exists)
    api.addHook('onRequest', async (request, reply) => {
      const auth = request.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        reply.status(401).send({
          type: 'https://api.renderowl.com/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Bearer token required',
          instance: request.url,
        });
        return;
      }

      // In production, validate token and set user context
      request.user = {
        id: 'user_dev123',
        email: 'dev@renderowl.com',
      };
    });

    // Register route modules
    await api.register(projectsRoutes, { prefix: '/projects' });
    await api.register(assetsRoutes, { prefix: '/projects/:project_id/assets' });
    await api.register(rendersRoutes, { prefix: '/projects/:project_id/renders' });
    await api.register(automationRoutes, { prefix: '/projects/:project_id/automations' });
    await api.register(userRoutes, { prefix: '/user' });
    await api.register(creditsRoutes, { prefix: '/credits' });
    // Stripe buy-credits (authenticated)
    await api.register(stripeRoutes, { prefix: '/stripe' });
  },
  { prefix: '/v1' }
);

// Stripe webhook route (no auth - called by Stripe)
// This needs raw body for signature verification
await fastify.post('/v1/stripe/webhook', {
  config: {
    // Disable body parsing to get raw body for Stripe signature verification
    bodyLimit: 10 * 1024 * 1024,
  },
  preParsing: async (request, reply, payload) => {
    // Capture raw body for Stripe signature verification
    const chunks: Buffer[] = [];
    for await (const chunk of payload) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const rawBody = Buffer.concat(chunks);
    // @ts-ignore - attach raw body to request
    request.rawBody = rawBody;
    return rawBody;
  }
}, async (request, reply) => {
  // Import and call the webhook handler directly
  const { default: stripeWebhookHandler } = await import('./routes/stripe-webhook.js');
  reply; // reference to suppress unused warning
  return stripeWebhookHandler(request, reply);
});

// Global error handler
fastify.setErrorHandler((error: any, request, reply) => {
  fastify.log.error(error);

  if (error.validation) {
    return reply.status(400).send({
      type: 'https://api.renderowl.com/errors/validation-failed',
      title: 'Validation Failed',
      status: 400,
      detail: error.message,
      instance: request.url,
    });
  }

  return reply.status(500).send({
    type: 'https://api.renderowl.com/errors/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: error.message || 'An unexpected error occurred',
    instance: request.url,
  });
});

// Graceful shutdown with hard timeout
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Force exit after 15 seconds if graceful shutdown hangs
  const forceExitTimeout = setTimeout(() => {
    console.error('Graceful shutdown timed out after 15s. Forcing exit.');
    process.exit(1);
  }, 15000);
  
  try {
    // Stop accepting new connections
    await fastify.close();
    
    // Stop queue workers
    await jobQueue.stop();
    jobQueue.close();
    
    clearTimeout(forceExitTimeout);
    console.log('Graceful shutdown complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const port = parseInt(process.env.PORT || '8000');
const host = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port, host });
  fastify.log.info(`Server running at http://${host}:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
