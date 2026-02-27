import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
export interface SecurityConfig {
    corsOrigins: string[] | ((origin: string) => boolean);
    corsMethods: string[];
    corsHeaders: string[];
    corsCredentials: boolean;
    corsMaxAge: number;
    cspEnabled: boolean;
    cspDirectives: Record<string, string[]>;
    cspReportOnly: boolean;
    hstsEnabled: boolean;
    hstsMaxAge: number;
    hstsIncludeSubdomains: boolean;
    hstsPreload: boolean;
    frameOptions: 'DENY' | 'SAMEORIGIN' | false;
    contentTypeOptions: boolean;
    xssProtection: boolean;
    referrerPolicy: string | false;
    maxBodySize: number;
    maxUrlLength: number;
    maxHeaderSize: number;
    maxParameterCount: number;
    rateLimitEnabled: boolean;
    sanitizeEnabled: boolean;
    allowedTags: string[];
    allowedAttributes: Record<string, string[]>;
}
export declare const DEFAULT_SECURITY_CONFIG: SecurityConfig;
export declare class InputValidator {
    private config;
    constructor(config?: Partial<SecurityConfig>);
    validateBodySize(size: number): {
        valid: boolean;
        error?: string;
    };
    validateUrlLength(url: string): {
        valid: boolean;
        error?: string;
    };
    validateHeaderSize(headers: Record<string, string>): {
        valid: boolean;
        error?: string;
    };
    sanitizeString(input: string): string;
    sanitizeObject(obj: any): any;
    validateId(id: string, prefix: string): {
        valid: boolean;
        error?: string;
    };
    validateEmail(email: string): {
        valid: boolean;
        error?: string;
    };
    validateUrl(url: string, allowedSchemes?: string[]): {
        valid: boolean;
        error?: string;
    };
    private isInternalIp;
}
export declare function buildCSPHeader(directives: Record<string, string[]>): string;
export declare function applySecurityHeaders(reply: FastifyReply, config: SecurityConfig): void;
export declare function handleCORS(request: FastifyRequest, reply: FastifyReply, config: SecurityConfig): boolean;
export declare function generateRequestId(): string;
export declare function sanitizeSqlInput(input: string): string;
export interface SecurityPluginOptions {
    config?: Partial<SecurityConfig>;
    skipRoutes?: string[];
}
export declare function securityPlugin(fastify: FastifyInstance, options?: SecurityPluginOptions): Promise<void>;
declare module 'fastify' {
    interface FastifyInstance {
        securityConfig: SecurityConfig;
        validator: InputValidator;
    }
}
export default securityPlugin;
//# sourceMappingURL=security.d.ts.map