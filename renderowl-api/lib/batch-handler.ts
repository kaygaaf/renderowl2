import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EventEmitter } from 'events';

// ============================================================================
// Batch Request Handler
// ============================================================================
// Allows clients to batch multiple requests into a single HTTP call
// Reduces network overhead and improves throughput

interface BatchRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: any;
}

interface BatchResponse {
  id: string;
  status: number;
  headers: Record<string, string>;
  body: any;
  error?: string;
  duration: number;
}

interface BatchConfig {
  maxRequests: number;
  maxBatchSizeBytes: number;
  timeoutMs: number;
  allowParallel: boolean;
  maxParallel: number;
}

export class BatchRequestHandler extends EventEmitter {
  private config: Required<BatchConfig>;
  private fastify: FastifyInstance | null = null;

  constructor(config: Partial<BatchConfig> = {}) {
    super();
    this.config = {
      maxRequests: 20,
      maxBatchSizeBytes: 10 * 1024 * 1024, // 10MB
      timeoutMs: 30000,
      allowParallel: true,
      maxParallel: 5,
      ...config,
    };
  }

  setFastify(fastify: FastifyInstance): void {
    this.fastify = fastify;
  }

  // ========================================================================
  // Batch Processing
  // ========================================================================

  async processBatch(
    requests: BatchRequest[],
    baseRequest: FastifyRequest
  ): Promise<BatchResponse[]> {
    // Validate batch size
    if (requests.length > this.config.maxRequests) {
      throw new Error(`Batch too large: ${requests.length} requests, max is ${this.config.maxRequests}`);
    }

    // Validate batch size in bytes
    const batchSize = JSON.stringify(requests).length;
    if (batchSize > this.config.maxBatchSizeBytes) {
      throw new Error(`Batch size exceeds limit: ${batchSize} bytes`);
    }

    this.emit('batch:start', { count: requests.length });

    let responses: BatchResponse[];

    if (this.config.allowParallel) {
      responses = await this.processParallel(requests, baseRequest);
    } else {
      responses = await this.processSequential(requests, baseRequest);
    }

    this.emit('batch:complete', { 
      count: requests.length,
      success: responses.filter(r => r.status < 400).length,
      errors: responses.filter(r => r.status >= 400).length,
    });

    return responses;
  }

  private async processSequential(
    requests: BatchRequest[],
    baseRequest: FastifyRequest
  ): Promise<BatchResponse[]> {
    const responses: BatchResponse[] = [];

    for (const request of requests) {
      const response = await this.processSingle(request, baseRequest);
      responses.push(response);
    }

    return responses;
  }

  private async processParallel(
    requests: BatchRequest[],
    baseRequest: FastifyRequest
  ): Promise<BatchResponse[]> {
    // Process in chunks to limit concurrency
    const chunks = this.chunkArray(requests, this.config.maxParallel);
    const responses: BatchResponse[] = [];

    for (const chunk of chunks) {
      const chunkResponses = await Promise.all(
        chunk.map(request => this.processSingle(request, baseRequest))
      );
      responses.push(...chunkResponses);
    }

    return responses;
  }

  private async processSingle(
    request: BatchRequest,
    baseRequest: FastifyRequest
  ): Promise<BatchResponse> {
    const startTime = Date.now();

    try {
      if (!this.fastify) {
        throw new Error('Fastify instance not set');
      }

      // Build request URL
      const url = request.path.startsWith('/') 
        ? `/v1${request.path}` 
        : `/v1/${request.path}`;

      // Create injected request
      const injectedRequest = {
        method: request.method,
        url,
        headers: {
          ...baseRequest.headers,
          ...request.headers,
          'x-batch-request': 'true',
          'x-batch-id': request.id,
        },
        body: request.body,
        // Copy auth context
        user: baseRequest.user,
      };

      // Execute request using fastify.inject
      const response = await this.fastify.inject({
        method: request.method,
        url,
        headers: injectedRequest.headers,
        payload: request.body,
      });

      const duration = Date.now() - startTime;

      let body: any;
      try {
        body = JSON.parse(response.payload);
      } catch {
        body = response.payload;
      }

      return {
        id: request.id,
        status: response.statusCode,
        headers: response.headers as Record<string, string>,
        body,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        id: request.id,
        status: 500,
        headers: {},
        body: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };
    }
  }

  // ========================================================================
  // Utilities
  // ========================================================================

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}

// ============================================================================
// Fastify Plugin
// ============================================================================

export async function batchRequestPlugin(
  fastify: FastifyInstance,
  options: Partial<BatchConfig> = {}
) {
  const handler = new BatchRequestHandler(options);
  handler.setFastify(fastify);

  // Decorate fastify
  fastify.decorate('batchHandler', handler);

  // Register batch endpoint
  fastify.post('/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    const { requests } = request.body as { requests: BatchRequest[] };

    if (!Array.isArray(requests)) {
      return reply.status(400).send({
        error: 'Invalid batch request',
        message: 'requests must be an array',
      });
    }

    try {
      const responses = await handler.processBatch(requests, request);
      
      // Determine overall status
      const hasErrors = responses.some(r => r.status >= 400);
      const statusCode = hasErrors ? 207 : 200; // 207 Multi-Status
      
      reply.status(statusCode);
      
      return {
        results: responses,
        meta: {
          total: responses.length,
          successful: responses.filter(r => r.status < 400).length,
          failed: responses.filter(r => r.status >= 400).length,
          totalDuration: responses.reduce((sum, r) => sum + r.duration, 0),
        },
      };
    } catch (error) {
      reply.status(400);
      return {
        error: 'Batch processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}

export default batchRequestPlugin;
