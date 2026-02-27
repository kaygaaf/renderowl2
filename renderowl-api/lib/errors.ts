import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RateLimitResult } from '../lib/ratelimit/index.js';

// ============================================================================
// Enhanced Error Response System (RFC 7807 Problem Details)
// ============================================================================

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  [key: string]: unknown;
}

export interface ValidationProblemDetail extends ProblemDetail {
  errors: Array<{
    field: string;
    code: string;
    message: string;
  }>;
}

export interface RateLimitProblemDetail extends ProblemDetail {
  retry_after: number;
  limit: number;
  remaining: number;
  reset_at: number;
}

export interface InsufficientScopeProblemDetail extends ProblemDetail {
  required_scopes: string[];
  your_scopes: string[];
}

// Error type registry for consistent error codes
export const ErrorTypes = {
  // 400 Bad Request
  VALIDATION_FAILED: 'https://api.renderowl.com/errors/validation-failed',
  INVALID_REQUEST: 'https://api.renderowl.com/errors/invalid-request',
  INVALID_ID: 'https://api.renderowl.com/errors/invalid-id',
  MALFORMED_JSON: 'https://api.renderowl.com/errors/malformed-json',
  MISSING_FIELD: 'https://api.renderowl.com/errors/missing-field',
  INVALID_FIELD: 'https://api.renderowl.com/errors/invalid-field',
  
  // 401 Unauthorized
  UNAUTHORIZED: 'https://api.renderowl.com/errors/unauthorized',
  INVALID_TOKEN: 'https://api.renderowl.com/errors/invalid-token',
  EXPIRED_TOKEN: 'https://api.renderowl.com/errors/expired-token',
  INVALID_API_KEY: 'https://api.renderowl.com/errors/invalid-api-key',
  
  // 403 Forbidden
  FORBIDDEN: 'https://api.renderowl.com/errors/forbidden',
  INSUFFICIENT_SCOPE: 'https://api.renderowl.com/errors/insufficient-scope',
  IP_RESTRICTED: 'https://api.renderowl.com/errors/ip-restricted',
  ORIGIN_RESTRICTED: 'https://api.renderowl.com/errors/origin-restricted',
  
  // 404 Not Found
  NOT_FOUND: 'https://api.renderowl.com/errors/not-found',
  USER_NOT_FOUND: 'https://api.renderowl.com/errors/user-not-found',
  PROJECT_NOT_FOUND: 'https://api.renderowl.com/errors/project-not-found',
  RENDER_NOT_FOUND: 'https://api.renderowl.com/errors/render-not-found',
  ASSET_NOT_FOUND: 'https://api.renderowl.com/errors/asset-not-found',
  AUTOMATION_NOT_FOUND: 'https://api.renderowl.com/errors/automation-not-found',
  
  // 409 Conflict
  CONFLICT: 'https://api.renderowl.com/errors/conflict',
  DUPLICATE_RESOURCE: 'https://api.renderowl.com/errors/duplicate-resource',
  RENDER_NOT_CANCELLABLE: 'https://api.renderowl.com/errors/render-not-cancellable',
  RENDER_NOT_COMPLETE: 'https://api.renderowl.com/errors/render-not-complete',
  
  // 413 Payload Too Large
  PAYLOAD_TOO_LARGE: 'https://api.renderowl.com/errors/payload-too-large',
  
  // 415 Unsupported Media Type
  UNSUPPORTED_MEDIA_TYPE: 'https://api.renderowl.com/errors/unsupported-media-type',
  
  // 422 Unprocessable Entity
  UNPROCESSABLE_ENTITY: 'https://api.renderowl.com/errors/unprocessable-entity',
  INSUFFICIENT_CREDITS: 'https://api.renderowl.com/errors/insufficient-credits',
  
  // 429 Too Many Requests
  RATE_LIMIT_EXCEEDED: 'https://api.renderowl.com/errors/rate-limit-exceeded',
  
  // 500 Internal Server Error
  INTERNAL_ERROR: 'https://api.renderowl.com/errors/internal-error',
  DATABASE_ERROR: 'https://api.renderowl.com/errors/database-error',
  QUEUE_ERROR: 'https://api.renderowl.com/errors/queue-error',
  
  // 503 Service Unavailable
  SERVICE_UNAVAILABLE: 'https://api.renderowl.com/errors/service-unavailable',
  MAINTENANCE_MODE: 'https://api.renderowl.com/errors/maintenance-mode',
  
  // 504 Gateway Timeout
  GATEWAY_TIMEOUT: 'https://api.renderowl.com/errors/gateway-timeout',
} as const;

// Error factory functions
export class ApiError extends Error {
  public type: string;
  public status: number;
  public instance: string;
  public extensions: Record<string, unknown>;

  constructor(
    type: string,
    title: string,
    status: number,
    detail: string,
    instance: string,
    extensions: Record<string, unknown> = {}
  ) {
    super(detail);
    this.name = 'ApiError';
    this.type = type;
    this.status = status;
    this.instance = instance;
    this.extensions = extensions;
  }

  toJSON(): ProblemDetail {
    return {
      type: this.type,
      title: this.getTitle(),
      status: this.status,
      detail: this.message,
      instance: this.instance,
      ...this.extensions,
    };
  }

  private getTitle(): string {
    // Extract title from type URL
    const parts = this.type.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

export class ValidationError extends ApiError {
  public errors: Array<{ field: string; code: string; message: string }>;

  constructor(
    instance: string,
    errors: Array<{ field: string; code: string; message: string }>,
    detail = 'The request contains invalid data'
  ) {
    super(
      ErrorTypes.VALIDATION_FAILED,
      'Validation Failed',
      400,
      detail,
      instance,
      { errors }
    );
    this.errors = errors;
  }
}

export class NotFoundError extends ApiError {
  constructor(resourceType: string, resourceId: string, instance: string) {
    super(
      ErrorTypes.NOT_FOUND,
      `${resourceType} Not Found`,
      404,
      `${resourceType} with ID "${resourceId}" does not exist`,
      instance
    );
  }
}

export class RateLimitError extends ApiError {
  constructor(result: RateLimitResult, instance: string) {
    super(
      ErrorTypes.RATE_LIMIT_EXCEEDED,
      'Rate Limit Exceeded',
      429,
      `Rate limit of ${result.limit} requests per window exceeded. Retry after ${result.retryAfter} seconds.`,
      instance,
      {
        retry_after: result.retryAfter,
        limit: result.limit,
        remaining: result.remaining,
        reset_at: result.resetAt,
      }
    );
  }
}

// ============================================================================
// Fastify Error Handler Plugin
// ============================================================================

export async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: any, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id;
    const instance = request.url;

    // Log all errors with context
    fastify.log.error({
      err: error,
      reqId: requestId,
      url: request.url,
      method: request.method,
      user: (request.user as any)?.id,
    }, 'Request error');

    // Handle our custom API errors
    if (error instanceof ApiError) {
      return reply.status(error.status).send(error.toJSON());
    }

    // Handle validation errors
    if (error.validation) {
      const errors = error.validation.map((e: any) => ({
        field: e.instancePath?.replace(/^\//, '') || 'body',
        code: e.keyword || 'validation',
        message: e.message || 'Invalid value',
      }));

      return reply.status(400).send({
        type: ErrorTypes.VALIDATION_FAILED,
        title: 'Validation Failed',
        status: 400,
        detail: error.message || 'The request contains invalid data',
        instance,
        errors,
      });
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError' || error.issues) {
      const errors = error.issues?.map((e: any) => ({
        field: e.path.join('.'),
        code: e.code,
        message: e.message,
      })) || [{ field: 'body', code: 'validation', message: error.message }];

      return reply.status(400).send({
        type: ErrorTypes.VALIDATION_FAILED,
        title: 'Validation Failed',
        status: 400,
        detail: 'The request contains invalid data',
        instance,
        errors,
      });
    }

    // Handle syntax errors (malformed JSON)
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return reply.status(400).send({
        type: ErrorTypes.MALFORMED_JSON,
        title: 'Malformed JSON',
        status: 400,
        detail: 'The request body contains malformed JSON',
        instance,
      });
    }

    // Handle database errors
    if (error.code?.startsWith('SQLITE_') || error.message?.includes('database')) {
      // Don't expose database details in production
      const isDev = process.env.NODE_ENV === 'development';
      return reply.status(500).send({
        type: ErrorTypes.DATABASE_ERROR,
        title: 'Database Error',
        status: 500,
        detail: isDev ? error.message : 'A database error occurred. Please try again later.',
        instance,
        ...(isDev && { code: error.code }),
      });
    }

    // Handle queue errors
    if (error.message?.includes('queue') || error.message?.includes('job')) {
      return reply.status(500).send({
        type: ErrorTypes.QUEUE_ERROR,
        title: 'Queue Error',
        status: 500,
        detail: 'An error occurred while processing the job queue. Please try again.',
        instance,
      });
    }

    // Default: Internal Server Error
    const isDev = process.env.NODE_ENV === 'development';
    return reply.status(500).send({
      type: ErrorTypes.INTERNAL_ERROR,
      title: 'Internal Server Error',
      status: 500,
      detail: isDev ? error.message : 'An unexpected internal error occurred. Please contact support.',
      instance,
      ...(isDev && { stack: error.stack }),
    });
  });

  // Add not found handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      type: ErrorTypes.NOT_FOUND,
      title: 'Not Found',
      status: 404,
      detail: `The requested endpoint "${request.method} ${request.url}" does not exist`,
      instance: request.url,
    });
  });
}

// ============================================================================
// Helper Functions for Routes
// ============================================================================

export function sendError(
  reply: FastifyReply,
  status: number,
  type: string,
  detail: string,
  instance: string,
  extensions?: Record<string, unknown>
) {
  const title = type
    .split('/')
    .pop()
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Error';

  return reply.status(status).send({
    type,
    title,
    status,
    detail,
    instance,
    ...extensions,
  });
}

export function sendValidationError(
  reply: FastifyReply,
  errors: Array<{ field: string; code: string; message: string }>,
  instance: string
) {
  return reply.status(400).send({
    type: ErrorTypes.VALIDATION_FAILED,
    title: 'Validation Failed',
    status: 400,
    detail: 'The request contains invalid data',
    instance,
    errors,
  });
}

export function sendNotFound(
  reply: FastifyReply,
  resourceType: string,
  resourceId: string,
  instance: string
) {
  return reply.status(404).send({
    type: ErrorTypes.NOT_FOUND,
    title: `${resourceType} Not Found`,
    status: 404,
    detail: `${resourceType} with ID "${resourceId}" does not exist`,
    instance,
  });
}

export function sendRateLimitError(
  reply: FastifyReply,
  result: RateLimitResult,
  instance: string
) {
  return reply
    .status(429)
    .headers({
      'Retry-After': result.retryAfter?.toString() || '60',
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toString(),
    })
    .send({
      type: ErrorTypes.RATE_LIMIT_EXCEEDED,
      title: 'Rate Limit Exceeded',
      status: 429,
      detail: `Rate limit of ${result.limit} requests per window exceeded. Retry after ${result.retryAfter} seconds.`,
      instance,
      retry_after: result.retryAfter,
      limit: result.limit,
      remaining: result.remaining,
      reset_at: result.resetAt,
    });
}

export default errorHandlerPlugin;
