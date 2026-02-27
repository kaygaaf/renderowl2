import { FastifyInstance, FastifyReply } from 'fastify';
import { RateLimitResult } from '../lib/ratelimit/index.js';
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
export declare const ErrorTypes: {
    readonly VALIDATION_FAILED: "https://api.renderowl.com/errors/validation-failed";
    readonly INVALID_REQUEST: "https://api.renderowl.com/errors/invalid-request";
    readonly INVALID_ID: "https://api.renderowl.com/errors/invalid-id";
    readonly MALFORMED_JSON: "https://api.renderowl.com/errors/malformed-json";
    readonly MISSING_FIELD: "https://api.renderowl.com/errors/missing-field";
    readonly INVALID_FIELD: "https://api.renderowl.com/errors/invalid-field";
    readonly UNAUTHORIZED: "https://api.renderowl.com/errors/unauthorized";
    readonly INVALID_TOKEN: "https://api.renderowl.com/errors/invalid-token";
    readonly EXPIRED_TOKEN: "https://api.renderowl.com/errors/expired-token";
    readonly INVALID_API_KEY: "https://api.renderowl.com/errors/invalid-api-key";
    readonly FORBIDDEN: "https://api.renderowl.com/errors/forbidden";
    readonly INSUFFICIENT_SCOPE: "https://api.renderowl.com/errors/insufficient-scope";
    readonly IP_RESTRICTED: "https://api.renderowl.com/errors/ip-restricted";
    readonly ORIGIN_RESTRICTED: "https://api.renderowl.com/errors/origin-restricted";
    readonly NOT_FOUND: "https://api.renderowl.com/errors/not-found";
    readonly USER_NOT_FOUND: "https://api.renderowl.com/errors/user-not-found";
    readonly PROJECT_NOT_FOUND: "https://api.renderowl.com/errors/project-not-found";
    readonly RENDER_NOT_FOUND: "https://api.renderowl.com/errors/render-not-found";
    readonly ASSET_NOT_FOUND: "https://api.renderowl.com/errors/asset-not-found";
    readonly AUTOMATION_NOT_FOUND: "https://api.renderowl.com/errors/automation-not-found";
    readonly CONFLICT: "https://api.renderowl.com/errors/conflict";
    readonly DUPLICATE_RESOURCE: "https://api.renderowl.com/errors/duplicate-resource";
    readonly RENDER_NOT_CANCELLABLE: "https://api.renderowl.com/errors/render-not-cancellable";
    readonly RENDER_NOT_COMPLETE: "https://api.renderowl.com/errors/render-not-complete";
    readonly PAYLOAD_TOO_LARGE: "https://api.renderowl.com/errors/payload-too-large";
    readonly UNSUPPORTED_MEDIA_TYPE: "https://api.renderowl.com/errors/unsupported-media-type";
    readonly UNPROCESSABLE_ENTITY: "https://api.renderowl.com/errors/unprocessable-entity";
    readonly INSUFFICIENT_CREDITS: "https://api.renderowl.com/errors/insufficient-credits";
    readonly RATE_LIMIT_EXCEEDED: "https://api.renderowl.com/errors/rate-limit-exceeded";
    readonly INTERNAL_ERROR: "https://api.renderowl.com/errors/internal-error";
    readonly DATABASE_ERROR: "https://api.renderowl.com/errors/database-error";
    readonly QUEUE_ERROR: "https://api.renderowl.com/errors/queue-error";
    readonly SERVICE_UNAVAILABLE: "https://api.renderowl.com/errors/service-unavailable";
    readonly MAINTENANCE_MODE: "https://api.renderowl.com/errors/maintenance-mode";
    readonly GATEWAY_TIMEOUT: "https://api.renderowl.com/errors/gateway-timeout";
};
export declare class ApiError extends Error {
    type: string;
    status: number;
    instance: string;
    extensions: Record<string, unknown>;
    constructor(type: string, title: string, status: number, detail: string, instance: string, extensions?: Record<string, unknown>);
    toJSON(): ProblemDetail;
    private getTitle;
}
export declare class ValidationError extends ApiError {
    errors: Array<{
        field: string;
        code: string;
        message: string;
    }>;
    constructor(instance: string, errors: Array<{
        field: string;
        code: string;
        message: string;
    }>, detail?: string);
}
export declare class NotFoundError extends ApiError {
    constructor(resourceType: string, resourceId: string, instance: string);
}
export declare class RateLimitError extends ApiError {
    constructor(result: RateLimitResult, instance: string);
}
export declare function errorHandlerPlugin(fastify: FastifyInstance): Promise<void>;
export declare function sendError(reply: FastifyReply, status: number, type: string, detail: string, instance: string, extensions?: Record<string, unknown>): FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
export declare function sendValidationError(reply: FastifyReply, errors: Array<{
    field: string;
    code: string;
    message: string;
}>, instance: string): FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
export declare function sendNotFound(reply: FastifyReply, resourceType: string, resourceId: string, instance: string): FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
export declare function sendRateLimitError(reply: FastifyReply, result: RateLimitResult, instance: string): FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
export default errorHandlerPlugin;
//# sourceMappingURL=errors.d.ts.map