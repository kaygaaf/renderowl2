import http from 'node:http';
import {URL} from 'node:url';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {existsSync, mkdirSync} from 'node:fs';
import {bundle} from '@remotion/bundler';
import {getCompositions, renderMedia} from '@remotion/renderer';
import {
  RenderRequestSchema,
  RenderResponseSchema,
  HealthResponseSchema,
  SettingsSchema,
  WebhookConfigSchema,
  type RenderRequest,
  type RenderResponse,
  type HealthResponse,
  type VideoInput,
  type WebhookConfig
} from '../api-contract.js';
import type {CaptionSegment} from '../types.js';
import {sendWebhook, wouldSendWebhook} from './webhooks.js';

// ============================================================================
// Renderowl Remotion API Server
// ============================================================================
// HTTP API server for rendering captioned videos programmatically.
// Provides endpoints for job submission, status checking, and health monitoring.
//
// Start server:
//   npm run server
//
// Or programmatically:
//   import {startServer} from './server';
//   const server = await startServer({port: 3000});
// ============================================================================

const PACKAGE_VERSION = '1.0.0';
const MAX_CONCURRENT_RENDERS = parseInt(process.env.MAX_CONCURRENT_RENDERS || '2', 10);
const PORT = parseInt(process.env.PORT || '3000', 10);

// Helper to extract video source from VideoInput
const getVideoSrc = (video: VideoInput | undefined): string | undefined => {
  if (!video) return undefined;
  if (video.type === 'file') return video.path;
  if (video.type === 'url') return video.url;
  return undefined;
};

// Job tracking
interface Job {
  id: string;
  request: RenderRequest;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: {
    framesRendered: number;
    totalFrames: number;
    percent: number;
  };
  result?: {
    outputPath: string;
    durationMs: number;
    renderedFrames: number;
    renderTimeMs: number;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  webhook?: WebhookConfig;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const jobs = new Map<string, Job>();
const jobQueue: string[] = [];
let activeRenders = 0;

// Bundled Remotion entry (cached)
let cachedServeUrl: string | null = null;

const bundleRemotion = async (): Promise<string> => {
  if (cachedServeUrl) return cachedServeUrl;
  
  const entry = path.join(process.cwd(), 'src', 'index.ts');
  cachedServeUrl = await bundle({
    entryPoint: entry,
    webpackOverride: (config) => config
  });
  return cachedServeUrl;
};

const sendJson = <T>(res: http.ServerResponse, statusCode: number, data: T) => {
  res.writeHead(statusCode, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(data));
};

const parseBody = async (req: http.IncomingMessage): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
};

const calculateDuration = (captions: CaptionSegment[], overrideMs?: number): number => {
  if (overrideMs) return overrideMs;
  if (captions.length === 0) return 10000; // 10s default
  return Math.max(...captions.map(c => c.endMs));
};

const processJob = async (job: Job): Promise<void> => {
  const startTime = Date.now();
  job.status = 'processing';
  job.startedAt = new Date();
  activeRenders++;

  // Send 'started' webhook
  sendWebhook(job.webhook, 'started', job.id, {
    outputPath: job.request.output.path,
    format: job.request.output.format,
    codec: job.request.output.codec
  });

  let lastProgressPercent = 0;

  try {
    const serveUrl = await bundleRemotion();
    const {request} = job;
    const settings = SettingsSchema.parse(request.settings ?? {});
    
    const fps = settings.fps;
    const width = settings.width;
    const height = settings.height;
    const durationMs = calculateDuration(request.captions, settings.durationMs);
    const durationInFrames = Math.round((durationMs / 1000) * fps);

    // Ensure output directory exists
    const outDir = path.dirname(request.output.path);
    if (outDir && outDir !== '.' && !existsSync(outDir)) {
      mkdirSync(outDir, {recursive: true});
    }

    // Get composition
    const comps = await getCompositions(serveUrl, {
      inputProps: {
        videoSrc: getVideoSrc(request.video),
        captions: request.captions,
        captionStyle: request.style
      }
    });

    const comp = comps.find(c => c.id === 'CaptionedVideo');
    if (!comp) throw new Error('Composition "CaptionedVideo" not found');

    // Track progress
    let lastFramesRendered = 0;

    // Render
    await renderMedia({
      composition: {
        ...comp,
        fps,
        width,
        height,
        durationInFrames
      },
      serveUrl,
      codec: (request.output.codec as any) || 'h264',
      outputLocation: request.output.path,
      inputProps: {
        videoSrc: getVideoSrc(request.video),
        captions: request.captions,
        captionStyle: request.style
      },
      onProgress: ({renderedFrames, encodedFrames, progress: progressRatio}) => {
        const totalFrames = durationInFrames;
        const percent = Math.round((progressRatio * 100) * 100) / 100;
        job.progress = {
          framesRendered: renderedFrames,
          totalFrames,
          percent
        };
        lastFramesRendered = renderedFrames;

        // Send 'progress' webhook every 10% or on first/last frame
        const shouldSendProgress = 
          percent === 0 || 
          percent >= 100 || 
          Math.floor(percent / 10) > Math.floor(lastProgressPercent / 10);
        
        if (shouldSendProgress) {
          sendWebhook(job.webhook, 'progress', job.id, {
            framesRendered: renderedFrames,
            totalFrames,
            percent,
            outputPath: request.output.path
          });
          lastProgressPercent = percent;
        }
      },
      logLevel: 'warn'
    });

    job.status = 'completed';
    job.completedAt = new Date();
    const renderTimeMs = Date.now() - startTime;
    job.result = {
      outputPath: request.output.path,
      durationMs,
      renderedFrames: lastFramesRendered,
      renderTimeMs
    };

    // Send 'completed' webhook
    sendWebhook(job.webhook, 'completed', job.id, {
      outputPath: request.output.path,
      durationMs,
      renderedFrames: lastFramesRendered,
      renderTimeMs
    });

  } catch (err) {
    job.status = 'failed';
    job.completedAt = new Date();
    const errorInfo = {
      code: 'RENDER_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
      details: {stack: err instanceof Error ? err.stack : undefined}
    };
    job.error = errorInfo;

    // Send 'failed' webhook
    sendWebhook(job.webhook, 'failed', job.id, {
      error: errorInfo,
      outputPath: job.request.output.path
    });
  } finally {
    activeRenders--;
    processQueue();
  }
};

const processQueue = (): void => {
  while (activeRenders < MAX_CONCURRENT_RENDERS && jobQueue.length > 0) {
    const jobId = jobQueue.shift();
    if (!jobId) continue;
    
    const job = jobs.get(jobId);
    if (job && job.status === 'queued') {
      processJob(job).catch(console.error);
    }
  }
};

const createJobResponse = (job: Job): RenderResponse => {
  if (job.status === 'completed' && job.result) {
    return RenderResponseSchema.parse({
      status: 'success',
      jobId: job.id,
      outputPath: job.result.outputPath,
      durationMs: job.result.durationMs,
      renderedFrames: job.result.renderedFrames,
      renderTimeMs: job.result.renderTimeMs
    });
  }
  
  if (job.status === 'failed' && job.error) {
    return RenderResponseSchema.parse({
      status: 'error',
      jobId: job.id,
      error: job.error
    });
  }
  
  if (job.status === 'processing') {
    return RenderResponseSchema.parse({
      status: 'processing',
      jobId: job.id,
      progress: job.progress || {framesRendered: 0, totalFrames: 0, percent: 0}
    });
  }
  
  return RenderResponseSchema.parse({
    status: 'queued',
    jobId: job.id,
    queuePosition: jobQueue.indexOf(job.id) + 1
  });
};

// ============================================================================
// Route Handlers
// ============================================================================

const handleHealth = async (_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
  const health: HealthResponse = HealthResponseSchema.parse({
    status: 'healthy',
    version: PACKAGE_VERSION,
    capabilities: {
      maxConcurrentRenders: MAX_CONCURRENT_RENDERS,
      supportedCodecs: ['h264', 'h265', 'vp8', 'vp9', 'prores'],
      supportedFormats: ['mp4', 'webm'],
      webhooks: {
        supportedEvents: ['queued', 'started', 'progress', 'completed', 'failed'],
        retryPolicy: 'exponential backoff (5 retries)'
      }
    },
    queue: {
      pending: jobQueue.length,
      active: activeRenders,
      completed: Array.from(jobs.values()).filter(j => j.status === 'completed').length
    }
  });
  sendJson(res, 200, health);
};

const handleSubmit = async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
  try {
    const body = await parseBody(req);
    const request = RenderRequestSchema.parse(body);
    const webhook = request.webhook;

    const jobId = request.jobId || randomUUID();
    const job: Job = {
      id: jobId,
      request,
      status: 'queued',
      webhook,
      queuedAt: new Date()
    };

    jobs.set(jobId, job);
    jobQueue.push(jobId);

    // Send 'queued' webhook
    sendWebhook(job.webhook, 'queued', jobId, {
      queuePosition: jobQueue.indexOf(jobId) + 1,
      outputPath: request.output.path
    });

    // Start processing if capacity available
    processQueue();

    const response = createJobResponse(job);
    sendJson(res, 202, response);

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    sendJson(res, 400, {
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message
      }
    });
  }
};

const handleStatus = async (_req: http.IncomingMessage, res: http.ServerResponse, jobId: string): Promise<void> => {
  const job = jobs.get(jobId);
  
  if (!job) {
    sendJson(res, 404, {
      status: 'error',
      error: {
        code: 'NOT_FOUND',
        message: `Job ${jobId} not found`
      }
    });
    return;
  }
  
  const response = createJobResponse(job);
  const statusCode = job.status === 'failed' ? 500 : 200;
  sendJson(res, statusCode, response);
};

// ============================================================================
// Server Setup
// ============================================================================

export const createServer = (): http.Server => {
  return http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    
    try {
      if (url.pathname === '/health' && req.method === 'GET') {
        await handleHealth(req, res);
      } else if (url.pathname === '/render' && req.method === 'POST') {
        await handleSubmit(req, res);
      } else if (url.pathname.startsWith('/render/') && req.method === 'GET') {
        const jobId = url.pathname.split('/')[2];
        await handleStatus(req, res, jobId);
      } else {
        sendJson(res, 404, {error: 'Not found'});
      }
    } catch (err) {
      console.error('Server error:', err);
      sendJson(res, 500, {
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  });
};

export const startServer = async (options?: {port?: number}): Promise<http.Server> => {
  const server = createServer();
  const port = options?.port || PORT;
  
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`🎬 Renderowl Remotion API server running on port ${port}`);
      console.log(`   Health:  http://localhost:${port}/health`);
      console.log(`   Render:  POST http://localhost:${port}/render`);
      resolve(server);
    });
  });
};

// Start if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(console.error);
}
