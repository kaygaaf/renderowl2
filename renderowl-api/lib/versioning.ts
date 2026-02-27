import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ============================================================================
// API Versioning System
// ============================================================================

export type ApiVersion = 'v1' | 'v2';

export interface VersionConfig {
  current: ApiVersion;
  supported: ApiVersion[];
  deprecated: ApiVersion[];
  sunsetDates: Record<ApiVersion, Date | null>;
}

export const API_VERSIONS: VersionConfig = {
  current: 'v1',
  supported: ['v1'],
  deprecated: [],
  sunsetDates: {
    v1: null,
    v2: null,
  },
};

// ============================================================================
// Version Resolution
// ============================================================================

export interface VersionResolution {
  version: ApiVersion;
  source: 'path' | 'header' | 'query' | 'default';
  isDeprecated: boolean;
  sunsetDate: Date | null;
}

export function resolveVersion(request: FastifyRequest): VersionResolution {
  // 1. Check path (e.g., /v1/projects or /api/v1/projects)
  const pathMatch = request.url.match(/\/(api\/)?(v\d+)\//);
  if (pathMatch) {
    const version = pathMatch[2] as ApiVersion;
    return createResolution(version, 'path');
  }

  // 2. Check Accept header with version parameter
  const acceptHeader = request.headers.accept;
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/version=(v\d+)/);
    if (versionMatch) {
      const version = versionMatch[1] as ApiVersion;
      return createResolution(version, 'header');
    }
  }

  // 3. Check API-Version header
  const apiVersionHeader = request.headers['api-version'];
  if (apiVersionHeader) {
    return createResolution(apiVersionHeader as ApiVersion, 'header');
  }

  // 4. Check query parameter
  const queryVersion = (request.query as any)?.api_version;
  if (queryVersion) {
    return createResolution(queryVersion as ApiVersion, 'query');
  }

  // 5. Default to current version
  return createResolution(API_VERSIONS.current, 'default');
}

function createResolution(
  version: ApiVersion,
  source: VersionResolution['source']
): VersionResolution {
  const isDeprecated = API_VERSIONS.deprecated.includes(version);
  const sunsetDate = API_VERSIONS.sunsetDates[version];

  return {
    version,
    source,
    isDeprecated,
    sunsetDate,
  };
}

// ============================================================================
// Version Middleware
// ============================================================================

export function validateVersion(
  resolution: VersionResolution
): { valid: boolean; error?: string } {
  // Check if version is supported
  if (!API_VERSIONS.supported.includes(resolution.version)) {
    return {
      valid: false,
      error: `API version ${resolution.version} is not supported. Supported versions: ${API_VERSIONS.supported.join(', ')}`,
    };
  }

  return { valid: true };
}

export function addVersionHeaders(
  reply: FastifyReply,
  resolution: VersionResolution
): void {
  // Add API version headers
  reply.header('API-Version', resolution.version);
  
  // Add deprecation warning if applicable
  if (resolution.isDeprecated) {
    reply.header('Deprecation', 'true');
    
    if (resolution.sunsetDate) {
      reply.header('Sunset', resolution.sunsetDate.toISOString());
    }
  }

  // Add link to latest version documentation
  reply.header('Link', `<https://docs.renderowl.com/api/${API_VERSIONS.current}>; rel="latest-version"`);
}

// ============================================================================
// Version Router
// ============================================================================

export interface RouteVersion {
  version: ApiVersion;
  handler: (fastify: FastifyInstance) => Promise<void>;
}

export async function registerVersionedRoutes(
  fastify: FastifyInstance,
  routes: RouteVersion[]
): Promise<void> {
  for (const { version, handler } of routes) {
    await fastify.register(
      async (instance) => {
        // Add version prefix
        instance.addHook('onRequest', async (request, reply) => {
          const resolution = resolveVersion(request);
          
          if (resolution.version !== version) {
            reply.status(404).send({
              type: 'https://api.renderowl.com/errors/invalid-version',
              title: 'Invalid API Version',
              status: 404,
              detail: `This endpoint is not available in version ${resolution.version}`,
              instance: request.url,
              availableVersions: [version],
            });
            return;
          }

          // Store version in request
          (request as any).apiVersion = resolution;

          // Add version headers to response
          addVersionHeaders(reply, resolution);
        });

        // Register routes
        await handler(instance);
      },
      { prefix: `/${version}` }
    );
  }
}

// ============================================================================
// Version Comparison Helpers
// ============================================================================

export function compareVersions(v1: ApiVersion, v2: ApiVersion): number {
  const n1 = parseInt(v1.slice(1));
  const n2 = parseInt(v2.slice(1));
  return n1 - n2;
}

export function isVersionAtLeast(version: ApiVersion, minVersion: ApiVersion): boolean {
  return compareVersions(version, minVersion) >= 0;
}

export function isVersionBefore(version: ApiVersion, maxVersion: ApiVersion): boolean {
  return compareVersions(version, maxVersion) < 0;
}

// ============================================================================
// Feature Flags by Version
// ============================================================================

export interface FeatureFlags {
  [feature: string]: ApiVersion;
}

export const FEATURE_FLAGS: FeatureFlags = {
  'batch-operations': 'v1',
  'credit-system': 'v1',
  'webhook-signatures': 'v1',
  'rate-limit-headers': 'v1',
  'cache-control': 'v1',
  'conditional-requests': 'v1',
  'async-renders': 'v1',
  'automation-triggers': 'v1',
  'youtube-integration': 'v1',
  'rss-import': 'v1',
  'template-library': 'v1',
};

export function isFeatureAvailable(feature: string, version: ApiVersion): boolean {
  const requiredVersion = FEATURE_FLAGS[feature];
  if (!requiredVersion) return false;
  return isVersionAtLeast(version, requiredVersion);
}

// ============================================================================
// Fastify Plugin
// ============================================================================

declare module 'fastify' {
  interface FastifyRequest {
    apiVersion?: VersionResolution;
  }
}

export async function versioningPlugin(fastify: FastifyInstance) {
  // Add version resolution to all requests
  fastify.addHook('onRequest', async (request, reply) => {
    const resolution = resolveVersion(request);
    
    // Validate version
    const validation = validateVersion(resolution);
    if (!validation.valid) {
      reply.status(400).send({
        type: 'https://api.renderowl.com/errors/invalid-version',
        title: 'Invalid API Version',
        status: 400,
        detail: validation.error,
        instance: request.url,
        supportedVersions: API_VERSIONS.supported,
      });
      return reply;
    }

    request.apiVersion = resolution;
  });

  // Add version headers to all responses
  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.apiVersion) {
      addVersionHeaders(reply, request.apiVersion);
    }
    return payload;
  });

  // Version info endpoint
  fastify.get('/versions', async () => {
    return {
      current: API_VERSIONS.current,
      supported: API_VERSIONS.supported,
      deprecated: API_VERSIONS.deprecated.map(v => ({
        version: v,
        sunsetDate: API_VERSIONS.sunsetDates[v]?.toISOString() || null,
      })),
      features: Object.entries(FEATURE_FLAGS).map(([feature, version]) => ({
        name: feature,
        availableSince: version,
      })),
    };
  });
}

export default versioningPlugin;
