import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const deflate = promisify(zlib.deflate);
const brotliCompress = promisify(zlib.brotliCompress);

// ============================================================================
// Compression Optimizer
// ============================================================================
// Optimized compression with content-type filtering and size thresholds

interface CompressionConfig {
  threshold: number;
  filter: (contentType: string) => boolean;
  level: number;
  brotli: boolean;
  gzip: boolean;
  deflate: boolean;
  excludedRoutes: string[];
}

export class CompressionOptimizer {
  private config: Required<CompressionConfig>;
  private stats = {
    compressed: 0,
    skipped: 0,
    bytesSaved: 0,
    bytesOriginal: 0,
  };

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = {
      threshold: 1024, // 1KB - don't compress small responses
      filter: this.defaultFilter,
      level: 6, // Balanced compression level
      brotli: true,
      gzip: true,
      deflate: false, // Skip deflate, prefer brotli or gzip
      excludedRoutes: ['/health', '/live', '/ready', '/internal/'],
      ...config,
    };
  }

  private defaultFilter(contentType: string): boolean {
    const compressibleTypes = [
      'application/json',
      'application/javascript',
      'text/html',
      'text/css',
      'text/plain',
      'text/xml',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml',
    ];

    return compressibleTypes.some(type => contentType.includes(type));
  }

  // ========================================================================
  // Compression Logic
  // ========================================================================

  async compress(
    request: FastifyRequest,
    reply: FastifyReply,
    payload: string
  ): Promise<Buffer | string> {
    // Skip excluded routes
    if (this.isExcluded(request.url)) {
      this.stats.skipped++;
      return payload;
    }

    // Check content type
    const contentType = reply.getHeader('content-type') as string || '';
    if (!this.config.filter(contentType)) {
      this.stats.skipped++;
      return payload;
    }

    // Check size threshold
    const size = Buffer.byteLength(payload, 'utf-8');
    if (size < this.config.threshold) {
      this.stats.skipped++;
      return payload;
    }

    // Check accept-encoding header
    const acceptEncoding = request.headers['accept-encoding'] as string || '';
    
    // Prefer brotli
    if (this.config.brotli && acceptEncoding.includes('br')) {
      const compressed = await this.compressBrotli(payload);
      reply.header('Content-Encoding', 'br');
      this.recordStats(size, compressed.length);
      return compressed;
    }

    // Fallback to gzip
    if (this.config.gzip && acceptEncoding.includes('gzip')) {
      const compressed = await this.compressGzip(payload);
      reply.header('Content-Encoding', 'gzip');
      this.recordStats(size, compressed.length);
      return compressed;
    }

    // Fallback to deflate
    if (this.config.deflate && acceptEncoding.includes('deflate')) {
      const compressed = await this.compressDeflate(payload);
      reply.header('Content-Encoding', 'deflate');
      this.recordStats(size, compressed.length);
      return compressed;
    }

    // No compression possible
    this.stats.skipped++;
    return payload;
  }

  private async compressBrotli(payload: string): Promise<Buffer> {
    return brotliCompress(Buffer.from(payload, 'utf-8'), {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: this.config.level,
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      },
    });
  }

  private async compressGzip(payload: string): Promise<Buffer> {
    return gzip(Buffer.from(payload, 'utf-8'), {
      level: this.config.level,
    });
  }

  private async compressDeflate(payload: string): Promise<Buffer> {
    return deflate(Buffer.from(payload, 'utf-8'), {
      level: this.config.level,
    });
  }

  // ========================================================================
  // Statistics
  // ========================================================================

  private recordStats(original: number, compressed: number): void {
    this.stats.compressed++;
    this.stats.bytesOriginal += original;
    this.stats.bytesSaved += original - compressed;
  }

  getStats(): {
    compressed: number;
    skipped: number;
    bytesSaved: number;
    bytesOriginal: number;
    compressionRatio: number;
  } {
    return {
      ...this.stats,
      compressionRatio: this.stats.bytesOriginal > 0
        ? this.stats.bytesSaved / this.stats.bytesOriginal
        : 0,
    };
  }

  private isExcluded(url: string): boolean {
    return this.config.excludedRoutes.some(route => url.includes(route));
  }
}

// ============================================================================
// Fastify Plugin
// ============================================================================

export async function compressionPlugin(
  fastify: FastifyInstance,
  options: Partial<CompressionConfig> = {}
) {
  const optimizer = new CompressionOptimizer(options);

  // Decorate fastify
  fastify.decorate('compressionOptimizer', optimizer);

  // Add onSend hook for compression
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    // Only compress string payloads
    if (typeof payload !== 'string') {
      return payload;
    }

    // Skip if already encoded
    if (reply.getHeader('content-encoding')) {
      return payload;
    }

    try {
      const compressed = await optimizer.compress(request, reply, payload);
      return compressed;
    } catch (error) {
      fastify.log.warn('Compression failed, sending uncompressed', { error });
      return payload;
    }
  });
}

export default compressionPlugin;
