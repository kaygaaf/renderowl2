import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import {sendWebhook, wouldSendWebhook, type WebhookEvent} from './webhooks';
import type {WebhookConfig} from '../api-contract';

describe('Webhooks', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('wouldSendWebhook', () => {
    it('returns false when no webhook config', () => {
      expect(wouldSendWebhook(undefined, 'completed')).toBe(false);
    });

    it('returns true for default events when no events specified', () => {
      const config: WebhookConfig = {url: 'https://example.com/webhook'};
      expect(wouldSendWebhook(config, 'completed')).toBe(true);
      expect(wouldSendWebhook(config, 'failed')).toBe(true);
    });

    it('returns false for non-default events when no events specified', () => {
      const config: WebhookConfig = {url: 'https://example.com/webhook'};
      expect(wouldSendWebhook(config, 'queued')).toBe(false);
      expect(wouldSendWebhook(config, 'started')).toBe(false);
      expect(wouldSendWebhook(config, 'progress')).toBe(false);
    });

    it('returns true only for configured events', () => {
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: ['started', 'completed']
      };
      expect(wouldSendWebhook(config, 'started')).toBe(true);
      expect(wouldSendWebhook(config, 'completed')).toBe(true);
      expect(wouldSendWebhook(config, 'failed')).toBe(false);
      expect(wouldSendWebhook(config, 'queued')).toBe(false);
    });
  });

  describe('sendWebhook', () => {
    it('does nothing when no webhook config', async () => {
      sendWebhook(undefined, 'completed', 'job-123', {});
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does nothing for non-configured events', async () => {
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: ['completed']
      };
      sendWebhook(config, 'started', 'job-123', {});
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends webhook with correct payload structure', async () => {
      fetchMock.mockResolvedValueOnce({ok: true, status: 200});

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: ['completed']
      };
      const data = {outputPath: '/tmp/out.mp4'};

      sendWebhook(config, 'completed', 'job-123', data);

      // Wait for async operation
      await vi.runAllTimersAsync();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Renderowl-Event': 'completed',
            'X-Renderowl-Job-ID': 'job-123',
            'X-Renderowl-Signature': expect.stringMatching(/^sha256=/)
          }),
          body: expect.stringContaining('"event":"completed"')
        })
      );

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toMatchObject({
        event: 'completed',
        jobId: 'job-123',
        timestamp: expect.any(String),
        data: {outputPath: '/tmp/out.mp4'}
      });
    });

    it('includes custom headers', async () => {
      fetchMock.mockResolvedValueOnce({ok: true, status: 200});

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom': 'value'
        },
        events: ['completed']
      };

      sendWebhook(config, 'completed', 'job-123', {});
      await vi.runAllTimersAsync();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123',
            'X-Custom': 'value'
          })
        })
      );
    });

    it('retries on 5xx errors', async () => {
      fetchMock
        .mockResolvedValueOnce({ok: false, status: 500, statusText: 'Server Error'})
        .mockResolvedValueOnce({ok: true, status: 200});

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: ['completed']
      };

      sendWebhook(config, 'completed', 'job-123', {});
      
      // First attempt
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Wait for retry delay (1s)
      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries on network errors', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ok: true, status: 200});

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: ['completed']
      };

      sendWebhook(config, 'completed', 'job-123', {});

      // First attempt fails
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Retry after delay
      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries on timeout', async () => {
      // Mock AbortController to simulate timeout
      const originalFetch = global.fetch;
      fetchMock.mockImplementation(async (_, options: RequestInit) => {
        // Simulate abort being called
        if (options.signal) {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          throw error;
        }
        return {ok: true, status: 200};
      });

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: ['completed']
      };

      sendWebhook(config, 'completed', 'job-123', {});

      // Wait for abort error and retry
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Retry after 1s delay
      fetchMock.mockResolvedValueOnce({ok: true, status: 200});
      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not retry on 4xx errors (except 408, 409, 429)', async () => {
      fetchMock.mockResolvedValueOnce({ok: false, status: 400, statusText: 'Bad Request'});

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: ['completed']
      };

      sendWebhook(config, 'completed', 'job-123', {});
      await vi.runAllTimersAsync();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('retries on 429 rate limit', async () => {
      fetchMock
        .mockResolvedValueOnce({ok: false, status: 429, statusText: 'Too Many Requests'})
        .mockResolvedValueOnce({ok: true, status: 200});

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: ['completed']
      };

      sendWebhook(config, 'completed', 'job-123', {});
      await vi.advanceTimersByTimeAsync(1000);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('gives up after max retries', async () => {
      fetchMock.mockResolvedValue({ok: false, status: 500, statusText: 'Server Error'});

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: ['completed']
      };

      sendWebhook(config, 'completed', 'job-123', {});
      await vi.runAllTimersAsync();

      // Initial + 4 retries = 5 total attempts (MAX_RETRIES = 5)
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });

    it('uses exponential backoff delays', async () => {
      fetchMock.mockResolvedValue({ok: false, status: 500});

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: ['completed']
      };

      sendWebhook(config, 'completed', 'job-123', {});

      // Initial attempt (attempt 0)
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Retry 1 (attempt 1): after 1s
      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Retry 2 (attempt 2): after 2s
      await vi.advanceTimersByTimeAsync(2000);
      expect(fetchMock).toHaveBeenCalledTimes(3);

      // Retry 3 (attempt 3): after 4s
      await vi.advanceTimersByTimeAsync(4000);
      expect(fetchMock).toHaveBeenCalledTimes(4);

      // Retry 4 (attempt 4): after 8s - last retry (MAX_RETRIES = 5)
      await vi.advanceTimersByTimeAsync(8000);
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });

    it('handles all event types', async () => {
      fetchMock.mockResolvedValue({ok: true, status: 200});

      const events: WebhookEvent[] = ['queued', 'started', 'progress', 'completed', 'failed'];

      for (const event of events) {
        fetchMock.mockClear();

        const config: WebhookConfig = {
          url: 'https://example.com/webhook',
          events: [event]
        };

        sendWebhook(config, event, 'job-123', {test: true});
        await vi.runAllTimersAsync();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.event).toBe(event);
      }
    });
  });
});
