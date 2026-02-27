import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ============================================================================
// API Versioning Middleware
// ============================================================================
// Adds API version headers and handles deprecation notices

export const API_VERSION = '1.0.0';
export const API_VERSION_MAJOR = 1;
export const API_SPEC_VERSION = '2024-02-27';

// Endpoints that will be deprecated in future versions
const DEPRECATION_NOTICES: Record<string, { sunset: string; alternative: string }> = {
  // Example: '/v1/old-endpoint': { sunset: '2024-06-01', alternative: '/v1/new-endpoint' }
};

// Cache configuration by route
const CACHE_CONFIG: Record<string, { ttl: number; tags: string[] }> = {
  '/v1/projects': { ttl: 60, tags: ['projects'] },
  '/v1/templates': { ttl: 300, tags: ['templates'] },
  '/health': { ttl: 10, tags: ['health'] },
  '/ready': { ttl: 5, tags: ['health'] },
};

export async function apiVersioningPlugin(fastify: FastifyInstance) {
  // Add version headers to all responses
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    // Add API version headers
    reply.header('X-API-Version', API_VERSION);
    reply.header('X-API-Spec-Version', API_SPEC_VERSION);
    
    // Add deprecation warning if applicable
    const deprecation = DEPRECATION_NOTICES[request.url];
    if (deprecation) {
      reply.header('Deprecation', 'true');
      reply.header('Sunset', deprecation.sunset);
      reply.header('Link', `<${deprecation.alternative}>; rel="alternate"`);
    }
    
    // Add cache headers based on route
    const cacheConfig = CACHE_CONFIG[request.url];
    if (cacheConfig && request.method === 'GET') {
      reply.header('Cache-Control', `public, max-age=${cacheConfig.ttl}`);
      reply.header('X-Cache-Tags', cacheConfig.tags.join(','));
    } else if (request.method === 'GET') {
      // Default cache for GET requests
      reply.header('Cache-Control', 'private, no-cache');
    }
    
    // Add security headers that aren't covered by helmet
    reply.header('X-API-Request-ID', request.id);
    
    return payload;
  });
}

// ============================================================================
// Response Compression Helper
// ============================================================================

export function shouldCompressResponse(request: FastifyRequest): boolean {
  // Don't compress small responses
  const contentLength = request.headers['content-length'];
  if (contentLength && parseInt(contentLength as string) < 1024) {
    return false;
  }
  
  // Don't compress already compressed content types
  const contentType = request.headers['content-type'] || '';
  if (contentType.includes('gzip') || contentType.includes('br') || contentType.includes('zip')) {
    return false;
  }
  
  return true;
}

// ============================================================================
// ETag Generation
// ============================================================================

export function generateETag(data: any): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(data));
  return `W/"${hash.digest('hex').slice(0, 16)}"`;
}

export function matchETag(requestETag: string, currentETag: string): boolean {
  if (!requestETag) return false;
  
  // Handle weak comparison
  const reqTag = requestETag.replace(/^W\//, '');
  const currTag = currentETag.replace(/^W\//, '');
  
  return reqTag === currTag;
}

// ============================================================================
// Pagination Helper
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function parsePaginationParams(query: any): PaginationParams {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams,
  baseUrl: string
): {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  links: {
    self: string;
    first: string;
    last: string;
    next?: string;
    prev?: string;
  };
} {
  const { page, limit } = pagination;
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  const links: any = {
    self: `${baseUrl}?page=${page}&limit=${limit}`,
    first: `${baseUrl}?page=1&limit=${limit}`,
    last: `${baseUrl}?page=${totalPages}&limit=${limit}`,
  };
  
  if (hasNext) {
    links.next = `${baseUrl}?page=${page + 1}&limit=${limit}`;
  }
  
  if (hasPrev) {
    links.prev = `${baseUrl}?page=${page - 1}&limit=${limit}`;
  }
  
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    },
    links,
  };
}
