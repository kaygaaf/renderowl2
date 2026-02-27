import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

// ============================================================================
// Security Configuration
// ============================================================================

export interface SecurityConfig {
  // CORS
  corsOrigins: string[] | ((origin: string) => boolean);
  corsMethods: string[];
  corsHeaders: string[];
  corsCredentials: boolean;
  corsMaxAge: number;

  // Content Security Policy
  cspEnabled: boolean;
  cspDirectives: Record<string, string[]>;
  cspReportOnly: boolean;

  // Security Headers
  hstsEnabled: boolean;
  hstsMaxAge: number;
  hstsIncludeSubdomains: boolean;
  hstsPreload: boolean;

  frameOptions: 'DENY' | 'SAMEORIGIN' | false;
  contentTypeOptions: boolean;
  xssProtection: boolean;
  referrerPolicy: string | false;

  // Request Limits
  maxBodySize: number;
  maxUrlLength: number;
  maxHeaderSize: number;
  maxParameterCount: number;

  // Rate Limiting
  rateLimitEnabled: boolean;

  // Input Sanitization
  sanitizeEnabled: boolean;
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  corsOrigins: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:5173']
    : ['https://app.renderowl.com', 'https://renderowl.com'],
  corsMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  corsHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Idempotency-Key',
    'X-Request-ID',
    'X-Trace-ID',
  ],
  corsCredentials: true,
  corsMaxAge: 86400,

  cspEnabled: true,
  cspDirectives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", 'https://api.renderowl.com'],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },
  cspReportOnly: process.env.NODE_ENV === 'development',

  hstsEnabled: process.env.NODE_ENV === 'production',
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubdomains: true,
  hstsPreload: true,

  frameOptions: 'DENY',
  contentTypeOptions: true,
  xssProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin',

  maxBodySize: 10 * 1024 * 1024, // 10MB
  maxUrlLength: 2048,
  maxHeaderSize: 8192,
  maxParameterCount: 100,

  rateLimitEnabled: true,

  sanitizeEnabled: true,
  allowedTags: [],
  allowedAttributes: {},
};

// ============================================================================
// Input Validation & Sanitization
// ============================================================================

export class InputValidator {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  validateBodySize(size: number): { valid: boolean; error?: string } {
    if (size > this.config.maxBodySize) {
      return {
        valid: false,
        error: `Request body size (${size} bytes) exceeds maximum allowed (${this.config.maxBodySize} bytes)`,
      };
    }
    return { valid: true };
  }

  validateUrlLength(url: string): { valid: boolean; error?: string } {
    if (url.length > this.config.maxUrlLength) {
      return {
        valid: false,
        error: `URL length (${url.length}) exceeds maximum allowed (${this.config.maxUrlLength})`,
      };
    }
    return { valid: true };
  }

  validateHeaderSize(headers: Record<string, string>): { valid: boolean; error?: string } {
    let totalSize = 0;
    for (const [key, value] of Object.entries(headers)) {
      totalSize += key.length + value.length;
    }

    if (totalSize > this.config.maxHeaderSize) {
      return {
        valid: false,
        error: `Header size (${totalSize} bytes) exceeds maximum allowed (${this.config.maxHeaderSize} bytes)`,
      };
    }
    return { valid: true };
  }

  sanitizeString(input: string): string {
    if (!this.config.sanitizeEnabled) return input;

    // Remove null bytes
    let sanitized = input.replace(/\x00/g, '');

    // Remove control characters except common whitespace
    sanitized = sanitized.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize keys too
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  validateId(id: string, prefix: string): { valid: boolean; error?: string } {
    const pattern = new RegExp(`^${prefix}_[a-zA-Z0-9]{10,}$`);
    
    if (!pattern.test(id)) {
      return {
        valid: false,
        error: `Invalid ID format. Expected ${prefix}_ followed by at least 10 alphanumeric characters`,
      };
    }

    // Check for path traversal
    if (id.includes('..') || id.includes('/') || id.includes('\\')) {
      return {
        valid: false,
        error: 'ID contains invalid characters',
      };
    }

    return { valid: true };
  }

  validateEmail(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    if (email.length > 254) {
      return { valid: false, error: 'Email too long' };
    }

    return { valid: true };
  }

  validateUrl(url: string, allowedSchemes: string[] = ['https']): { valid: boolean; error?: string } {
    try {
      const parsed = new URL(url);
      
      if (!allowedSchemes.includes(parsed.protocol.slice(0, -1))) {
        return {
          valid: false,
          error: `URL scheme must be one of: ${allowedSchemes.join(', ')}`,
        };
      }

      // Check for internal IPs (SSRF protection)
      const hostname = parsed.hostname.toLowerCase();
      if (this.isInternalIp(hostname)) {
        return {
          valid: false,
          error: 'Internal URLs are not allowed',
        };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  private isInternalIp(hostname: string): boolean {
    const internalPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];

    return internalPatterns.some(pattern => pattern.test(hostname));
  }
}

// ============================================================================
// Security Headers
// ============================================================================

export function buildCSPHeader(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

export function applySecurityHeaders(
  reply: FastifyReply,
  config: SecurityConfig
): void {
  // Content Security Policy
  if (config.cspEnabled) {
    const cspHeader = buildCSPHeader(config.cspDirectives);
    const headerName = config.cspReportOnly 
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    reply.header(headerName, cspHeader);
  }

  // Strict Transport Security
  if (config.hstsEnabled && process.env.NODE_ENV === 'production') {
    let hstsValue = `max-age=${config.hstsMaxAge}`;
    if (config.hstsIncludeSubdomains) hstsValue += '; includeSubDomains';
    if (config.hstsPreload) hstsValue += '; preload';
    reply.header('Strict-Transport-Security', hstsValue);
  }

  // X-Frame-Options
  if (config.frameOptions) {
    reply.header('X-Frame-Options', config.frameOptions);
  }

  // X-Content-Type-Options
  if (config.contentTypeOptions) {
    reply.header('X-Content-Type-Options', 'nosniff');
  }

  // X-XSS-Protection
  if (config.xssProtection) {
    reply.header('X-XSS-Protection', '1; mode=block');
  }

  // Referrer-Policy
  if (config.referrerPolicy) {
    reply.header('Referrer-Policy', config.referrerPolicy);
  }

  // Additional security headers
  reply.header('X-Download-Options', 'noopen');
  reply.header('X-Permitted-Cross-Domain-Policies', 'none');
  reply.header('Cross-Origin-Embedder-Policy', 'require-corp');
  reply.header('Cross-Origin-Opener-Policy', 'same-origin');
  reply.header('Cross-Origin-Resource-Policy', 'cross-origin');

  // Remove potentially leaking headers
  reply.removeHeader('X-Powered-By');
  reply.removeHeader('Server');
}

// ============================================================================
// CORS Handler
// ============================================================================

export function handleCORS(
  request: FastifyRequest,
  reply: FastifyReply,
  config: SecurityConfig
): boolean {
  const origin = request.headers.origin;

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    reply.header('Access-Control-Allow-Origin', origin || '*');
    reply.header('Access-Control-Allow-Methods', config.corsMethods.join(', '));
    reply.header('Access-Control-Allow-Headers', config.corsHeaders.join(', '));
    reply.header('Access-Control-Max-Age', config.corsMaxAge.toString());
    
    if (config.corsCredentials) {
      reply.header('Access-Control-Allow-Credentials', 'true');
    }

    reply.status(204).send();
    return true;
  }

  // Check if origin is allowed
  let allowed = false;
  
  if (typeof config.corsOrigins === 'function') {
    allowed = origin ? config.corsOrigins(origin) : false;
  } else if (config.corsOrigins === '*') {
    allowed = true;
  } else if (Array.isArray(config.corsOrigins)) {
    allowed = origin ? config.corsOrigins.includes(origin) : false;
  }

  if (allowed && origin) {
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Vary', 'Origin');
    
    if (config.corsCredentials) {
      reply.header('Access-Control-Allow-Credentials', 'true');
    }
  }

  return false;
}

// ============================================================================
// Request ID Generation
// ============================================================================

export function generateRequestId(): string {
  return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// ============================================================================
// SQL Injection Protection
// ============================================================================

export function sanitizeSqlInput(input: string): string {
  // Remove common SQL injection patterns
  const dangerous = [
    /;\s*drop\s+/gi,
    /;\s*delete\s+/gi,
    /;\s*update\s+/gi,
    /;\s*insert\s+/gi,
    /union\s+select/gi,
    /exec\s*\(/gi,
    /xp_/gi,
    /sp_/gi,
    /\/\*!/g,
    /--/g,
    /;/g,
  ];

  let sanitized = input;
  for (const pattern of dangerous) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized;
}

// ============================================================================
// Fastify Security Plugin
// ============================================================================

export interface SecurityPluginOptions {
  config?: Partial<SecurityConfig>;
  skipRoutes?: string[];
}

export async function securityPlugin(
  fastify: FastifyInstance,
  options: SecurityPluginOptions = {}
) {
  const config = { ...DEFAULT_SECURITY_CONFIG, ...options.config };
  const validator = new InputValidator(config);

  // Store config on instance
  fastify.decorate('securityConfig', config);
  fastify.decorate('validator', validator);

  // Add security headers to all responses
  fastify.addHook('onSend', async (request, reply, payload) => {
    applySecurityHeaders(reply, config);
    return payload;
  });

  // Validate requests
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip if route is excluded
    if (options.skipRoutes?.some(route => request.url.startsWith(route))) {
      return;
    }

    // Generate/request ID
    const requestId = request.headers['x-request-id'] as string || generateRequestId();
    request.id = requestId;
    reply.header('X-Request-ID', requestId);

    // Validate URL length
    const urlValidation = validator.validateUrlLength(request.url);
    if (!urlValidation.valid) {
      reply.status(414).send({
        type: 'https://api.renderowl.com/errors/url-too-long',
        title: 'URL Too Long',
        status: 414,
        detail: urlValidation.error,
        instance: request.url,
      });
      return reply;
    }

    // Validate header size
    const headerValidation = validator.validateHeaderSize(request.headers as Record<string, string>);
    if (!headerValidation.valid) {
      reply.status(431).send({
        type: 'https://api.renderowl.com/errors/headers-too-large',
        title: 'Request Header Fields Too Large',
        status: 431,
        detail: headerValidation.error,
        instance: request.url,
      });
      return reply;
    }

    // Handle CORS
    const corsHandled = handleCORS(request, reply, config);
    if (corsHandled) return reply;
  });

  // Validate body size
  fastify.addHook('preParsing', async (request, reply, payload) => {
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);
    
    if (contentLength > 0) {
      const bodyValidation = validator.validateBodySize(contentLength);
      if (!bodyValidation.valid) {
        reply.status(413).send({
          type: 'https://api.renderowl.com/errors/payload-too-large',
          title: 'Payload Too Large',
          status: 413,
          detail: bodyValidation.error,
          instance: request.url,
        });
        return reply;
      }
    }

    return payload;
  });

  // Sanitize request body
  fastify.addHook('preValidation', async (request) => {
    if (request.body && typeof request.body === 'object') {
      request.body = validator.sanitizeObject(request.body);
    }
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    securityConfig: SecurityConfig;
    validator: InputValidator;
  }
}

export { InputValidator };
export default securityPlugin;
