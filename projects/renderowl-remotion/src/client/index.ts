import type {
  RenderRequest,
  RenderResponse,
  HealthResponse,
  CaptionSegment,
  CaptionStyle,
  VideoInput,
  WebhookConfig,
  Settings,
  SuccessResponse
} from '../api-contract.js';

// ============================================================================
// Renderowl Remotion Client SDK
// ============================================================================
// TypeScript client for interacting with the Renderowl Remotion API server.
// Provides type-safe methods for job submission, status polling, and health checks.
//
// Usage:
//   import {RenderowlClient} from './client';
//   const client = new RenderowlClient('http://localhost:3000');
//   const job = await client.render({captions: [...], output: {...}});
//   const result = await client.waitForCompletion(job.jobId);
// ============================================================================

export type ClientOptions = {
  /** Base URL of the Renderowl API server */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Default headers to include with every request */
  defaultHeaders?: Record<string, string>;
};

export type PollOptions = {
  /** Polling interval in milliseconds (default: 1000) */
  intervalMs?: number;
  /** Maximum time to wait in milliseconds (default: 300000 = 5min) */
  timeoutMs?: number;
  /** Callback for progress updates */
  onProgress?: (progress: {framesRendered: number; totalFrames: number; percent: number}) => void;
};

export type RenderBuilder = {
  /** Set caption segments (required) */
  captions(captions: CaptionSegment[]): RenderBuilder;
  /** Set output configuration (required) */
  output(path: string, format?: 'mp4' | 'webm', codec?: 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores'): RenderBuilder;
  /** Set video input (optional, defaults to black background) */
  video(video: VideoInput): RenderBuilder;
  /** Set caption styling (optional) */
  style(style: CaptionStyle): RenderBuilder;
  /** Set render settings (optional) */
  settings(settings: Settings): RenderBuilder;
  /** Set webhook configuration (optional) */
  webhook(config: WebhookConfig): RenderBuilder;
  /** Set custom job ID (optional) */
  jobId(id: string): RenderBuilder;
  /** Execute the render request */
  execute(): Promise<RenderResponse>;
  /** Execute and wait for completion */
  executeAndWait(opts?: PollOptions): Promise<SuccessResponse>;
  /** Build the request object */
  build(): RenderRequest;
};

class RenderBuilderImpl implements RenderBuilder {
  private request: Partial<RenderRequest> = {};

  constructor(private client: RenderowlClient) {}

  captions(captions: CaptionSegment[]): RenderBuilder {
    this.request.captions = captions;
    return this;
  }

  output(path: string, format: 'mp4' | 'webm' = 'mp4', codec: 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores' = 'h264'): RenderBuilder {
    this.request.output = {path, format, codec};
    return this;
  }

  video(video: VideoInput): RenderBuilder {
    this.request.video = video;
    return this;
  }

  style(style: CaptionStyle): RenderBuilder {
    this.request.style = style;
    return this;
  }

  settings(settings: Settings): RenderBuilder {
    this.request.settings = settings;
    return this;
  }

  webhook(config: WebhookConfig): RenderBuilder {
    this.request.webhook = config;
    return this;
  }

  jobId(id: string): RenderBuilder {
    this.request.jobId = id;
    return this;
  }

  build(): RenderRequest {
    if (!this.request.captions || this.request.captions.length === 0) {
      throw new Error('captions are required');
    }
    if (!this.request.output) {
      throw new Error('output is required');
    }
    return this.request as RenderRequest;
  }

  async execute(): Promise<RenderResponse> {
    return this.client.render(this.build());
  }

  async executeAndWait(opts?: PollOptions): Promise<SuccessResponse> {
    const response = await this.execute();
    if (response.status !== 'queued' && response.status !== 'processing') {
      if (response.status === 'success') return response;
      throw new RenderowlError(`Render failed: ${response.status}`, response);
    }
    return this.client.waitForCompletion(response.jobId, opts);
  }
}

export class RenderowlError extends Error {
  constructor(
    message: string,
    public readonly response?: RenderResponse,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RenderowlError';
  }
}

export class RenderowlClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: ClientOptions | string) {
    if (typeof options === 'string') {
      this.baseUrl = options.replace(/\/$/, '');
      this.timeoutMs = 30000;
      this.defaultHeaders = {};
    } else {
      this.baseUrl = options.baseUrl.replace(/\/$/, '');
      this.timeoutMs = options.timeoutMs ?? 30000;
      this.defaultHeaders = options.defaultHeaders ?? {};
    }
  }

  /** Create a new render builder for fluent API */
  builder(): RenderBuilder {
    return new RenderBuilderImpl(this);
  }

  /** Submit a render job */
  async render(request: RenderRequest): Promise<RenderResponse> {
    return this.fetchJson<RenderResponse>('/render', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /** Get job status */
  async getStatus(jobId: string): Promise<RenderResponse> {
    return this.fetchJson<RenderResponse>(`/render/${jobId}`);
  }

  /** Check server health */
  async health(): Promise<HealthResponse> {
    return this.fetchJson<HealthResponse>('/health');
  }

  /** Poll until job completes or fails */
  async waitForCompletion(
    jobId: string,
    options: PollOptions = {}
  ): Promise<SuccessResponse> {
    const {intervalMs = 1000, timeoutMs = 300000, onProgress} = options;
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeoutMs) {
        throw new RenderowlError(`Timeout waiting for job ${jobId} after ${timeoutMs}ms`);
      }

      const status = await this.getStatus(jobId);

      if (status.status === 'success') {
        return status;
      }

      if (status.status === 'error') {
        throw new RenderowlError(`Job ${jobId} failed`, status);
      }

      if (status.status === 'processing' && status.progress && onProgress) {
        onProgress(status.progress);
      }

      await sleep(intervalMs);
    }
  }

  /** Quick render with minimal config - captions only on black background */
  async quickRender(
    captions: CaptionSegment[],
    outputPath: string,
    options?: {
      style?: CaptionStyle;
      settings?: Settings;
      webhook?: WebhookConfig;
    }
  ): Promise<SuccessResponse> {
    const builder = this.builder()
      .captions(captions)
      .output(outputPath);

    if (options?.style) builder.style(options.style);
    if (options?.settings) builder.settings(options.settings);
    if (options?.webhook) builder.webhook(options.webhook);

    return builder.executeAndWait();
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
          ...(init?.headers ?? {})
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        throw new RenderowlError(`HTTP ${response.status}: ${text}`);
      }

      return response.json() as Promise<T>;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof RenderowlError) throw err;
      throw new RenderowlError(`Request failed: ${err instanceof Error ? err.message : String(err)}`, undefined, err);
    }
  }
}

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

// ============================================================================
// Re-exports for convenience
// ============================================================================
export type {
  RenderRequest,
  RenderResponse,
  HealthResponse,
  CaptionSegment,
  CaptionStyle,
  VideoInput,
  WebhookConfig,
  Settings,
  SuccessResponse
} from '../api-contract.js';
