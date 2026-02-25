import {describe, expect, it, beforeEach, vi} from 'vitest';
import {RenderowlClient, RenderowlError, type ClientOptions} from './index.js';
import type {RenderRequest, CaptionSegment} from '../api-contract.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('RenderowlClient', () => {
  let client: RenderowlClient;

  beforeEach(() => {
    client = new RenderowlClient('http://localhost:3000');
    vi.resetAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Constructor
  // ──────────────────────────────────────────────────────────────────────────
  it('accepts string URL', () => {
    const c = new RenderowlClient('http://api.example.com');
    expect(c).toBeInstanceOf(RenderowlClient);
  });

  it('accepts options object', () => {
    const opts: ClientOptions = {
      baseUrl: 'http://api.example.com',
      timeoutMs: 5000,
      defaultHeaders: {'X-API-Key': 'secret'}
    };
    const c = new RenderowlClient(opts);
    expect(c).toBeInstanceOf(RenderowlClient);
  });

  it('strips trailing slash from URL', () => {
    const c = new RenderowlClient('http://api.example.com/');
    // @ts-expect-error accessing private for test
    expect(c.baseUrl).toBe('http://api.example.com');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // health()
  // ──────────────────────────────────────────────────────────────────────────
  it('returns health status', async () => {
    const mockHealth = {
      status: 'healthy',
      version: '1.0.0',
      capabilities: {
        maxConcurrentRenders: 2,
        supportedCodecs: ['h264'],
        supportedFormats: ['mp4']
      },
      queue: {pending: 0, active: 0, completed: 0}
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHealth
    });

    const result = await client.health();
    expect(result).toEqual(mockHealth);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/health',
      expect.objectContaining({
        headers: expect.objectContaining({'Content-Type': 'application/json'})
      })
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // render()
  // ──────────────────────────────────────────────────────────────────────────
  it('submits render job successfully', async () => {
    const request: RenderRequest = {
      captions: [{startMs: 0, endMs: 1000, text: 'Hello'}],
      output: {path: '/tmp/out.mp4'}
    };

    const mockResponse = {
      status: 'queued',
      jobId: '123e4567-e89b-12d3-a456-426614174000'
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await client.render(request);
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/render',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(request)
      })
    );
  });

  it('throws RenderowlError on HTTP error', async () => {
    const request: RenderRequest = {
      captions: [{startMs: 0, endMs: 1000, text: 'Hello'}],
      output: {path: '/tmp/out.mp4'}
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad Request'
    });

    await expect(client.render(request)).rejects.toThrow(RenderowlError);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getStatus()
  // ──────────────────────────────────────────────────────────────────────────
  it('gets job status', async () => {
    const jobId = '123e4567-e89b-12d3-a456-426614174000';
    const mockStatus = {
      status: 'processing',
      jobId,
      progress: {framesRendered: 50, totalFrames: 100, percent: 50}
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatus
    });

    const result = await client.getStatus(jobId);
    expect(result).toEqual(mockStatus);
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3000/render/${jobId}`,
      expect.any(Object)
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Builder API
  // ──────────────────────────────────────────────────────────────────────────
  describe('builder', () => {
    const sampleCaptions: CaptionSegment[] = [
      {startMs: 0, endMs: 1000, text: 'Hello world'}
    ];

    it('builds valid request', () => {
      const builder = client.builder();
      const request = builder
        .captions(sampleCaptions)
        .output('/tmp/out.mp4', 'mp4', 'h264')
        .build();

      expect(request.captions).toEqual(sampleCaptions);
      expect(request.output).toEqual({path: '/tmp/out.mp4', format: 'mp4', codec: 'h264'});
    });

    it('throws if captions not set', () => {
      const builder = client.builder();
      expect(() => builder.output('/tmp/out.mp4').build()).toThrow('captions are required');
    });

    it('throws if output not set', () => {
      const builder = client.builder();
      expect(() => builder.captions(sampleCaptions).build()).toThrow('output is required');
    });

    it('supports fluent chaining', () => {
      const builder = client.builder();
      const request = builder
        .captions(sampleCaptions)
        .output('/tmp/out.mp4')
        .video({type: 'none', backgroundColor: '#000000'})
        .style({fontSize: 48, highlightColor: '#FFD54A'})
        .settings({fps: 60, width: 1080, height: 1920})
        .webhook({url: 'http://example.com/webhook'})
        .jobId('custom-job-id')
        .build();

      expect(request.video).toEqual({type: 'none', backgroundColor: '#000000'});
      expect(request.style).toEqual({fontSize: 48, highlightColor: '#FFD54A'});
      expect(request.settings).toEqual({fps: 60, width: 1080, height: 1920});
      expect(request.webhook).toEqual({url: 'http://example.com/webhook'});
      expect(request.jobId).toBe('custom-job-id');
    });

    it('executes via builder', async () => {
      const mockResponse = {status: 'queued', jobId: 'test-id'};
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.builder()
        .captions(sampleCaptions)
        .output('/tmp/out.mp4')
        .execute();

      expect(result).toEqual(mockResponse);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // waitForCompletion()
  // ──────────────────────────────────────────────────────────────────────────
  describe('waitForCompletion', () => {
    it('returns immediately if job already succeeded', async () => {
      const jobId = 'test-id';
      const mockSuccess = {
        status: 'success',
        jobId,
        outputPath: '/tmp/out.mp4',
        durationMs: 10000,
        renderedFrames: 300,
        renderTimeMs: 5000
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccess
      });

      const result = await client.waitForCompletion(jobId);
      expect(result.status).toBe('success');
    });

    it('polls until completion', async () => {
      const jobId = 'test-id';
      const progressResponse = {
        status: 'processing',
        jobId,
        progress: {framesRendered: 50, totalFrames: 100, percent: 50}
      };
      const successResponse = {
        status: 'success',
        jobId,
        outputPath: '/tmp/out.mp4',
        durationMs: 10000,
        renderedFrames: 300,
        renderTimeMs: 5000
      };

      (fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ok: true, json: async () => progressResponse})
        .mockResolvedValueOnce({ok: true, json: async () => successResponse});

      const onProgress = vi.fn();
      const result = await client.waitForCompletion(jobId, {
        intervalMs: 10,
        onProgress
      });

      expect(result.status).toBe('success');
      expect(onProgress).toHaveBeenCalledWith({framesRendered: 50, totalFrames: 100, percent: 50});
    });

    it('throws on job failure', async () => {
      const jobId = 'test-id';
      const errorResponse = {
        status: 'error',
        jobId,
        error: {code: 'RENDER_ERROR', message: 'Something went wrong'}
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse
      });

      await expect(client.waitForCompletion(jobId, {intervalMs: 10}))
        .rejects.toThrow(/failed/);
    });

    it('throws on timeout', async () => {
      const jobId = 'test-id';
      const queuedResponse = {status: 'queued', jobId, queuePosition: 1};

      (fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Promise.resolve({ok: true, json: async () => queuedResponse})
      );

      await expect(
        client.waitForCompletion(jobId, {intervalMs: 10, timeoutMs: 50})
      ).rejects.toThrow(/Timeout/);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // quickRender()
  // ──────────────────────────────────────────────────────────────────────────
  it('quickRender submits and waits', async () => {
    const captions: CaptionSegment[] = [{startMs: 0, endMs: 1000, text: 'Hello'}];
    
    const mockQueued = {status: 'queued', jobId: 'quick-id'};
    const mockSuccess = {
      status: 'success',
      jobId: 'quick-id',
      outputPath: '/tmp/out.mp4',
      durationMs: 1000,
      renderedFrames: 30,
      renderTimeMs: 1000
    };

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ok: true, json: async () => mockQueued})
      .mockResolvedValueOnce({ok: true, json: async () => mockSuccess});

    const result = await client.quickRender(captions, '/tmp/out.mp4', {
      style: {fontSize: 64}
    });

    expect(result.status).toBe('success');
  });
});

describe('RenderowlError', () => {
  it('has correct name', () => {
    const err = new RenderowlError('Test error');
    expect(err.name).toBe('RenderowlError');
    expect(err.message).toBe('Test error');
  });

  it('stores response if provided', () => {
    const response = {status: 'error', jobId: 'test', error: {code: 'TEST', message: 'Test'}};
    const err = new RenderowlError('Test error', response as any);
    expect(err.response).toEqual(response);
  });

  it('stores cause if provided', () => {
    const cause = new Error('Underlying');
    const err = new RenderowlError('Test error', undefined, cause);
    expect(err.cause).toBe(cause);
  });
});
