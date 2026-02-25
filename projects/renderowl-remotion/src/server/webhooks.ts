import type {WebhookConfig} from '../api-contract.js';

// ============================================================================
// Webhook Delivery Service
// ============================================================================
// Handles async webhook delivery with retries and exponential backoff.
// Fire-and-forget semantics: failures are logged but don't block rendering.
//
// Features:
// - Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 retries)
// - Timeout: 30 seconds per attempt
// - Event filtering: only sends configured events
// - Structured payload with signature header for verification
// ============================================================================

export type WebhookEvent = 
  | 'queued'
  | 'started' 
  | 'progress'
  | 'completed'
  | 'failed';

interface WebhookPayload {
  event: WebhookEvent;
  jobId: string;
  timestamp: string;
  data: unknown;
}

interface WebhookDeliveryResult {
  success: boolean;
  attempts: number;
  lastError?: string;
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Generate a simple signature for webhook verification.
 * In production, use HMAC with a secret key.
 */
const generateSignature = (payload: string): string => {
  // Simple hash for demo - replace with HMAC in production
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256=${hash.toString(16)}`;
};

/**
 * Deliver a single webhook with retries.
 */
const deliverWithRetry = async (
  url: string,
  payload: WebhookPayload,
  headers?: Record<string, string>
): Promise<WebhookDeliveryResult> => {
  const body = JSON.stringify(payload);
  const signature = generateSignature(body);
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Renderowl-Signature': signature,
          'X-Renderowl-Event': payload.event,
          'X-Renderowl-Job-ID': payload.jobId,
          ...headers
        },
        body,
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        return {success: true, attempts: attempt + 1};
      }
      
      // Retry on 5xx or specific 4xx errors
      const shouldRetry = response.status >= 500 || 
        [408, 409, 429].includes(response.status);
      
      if (!shouldRetry || attempt === MAX_RETRIES - 1) {
        return {
          success: false, 
          attempts: attempt + 1,
          lastError: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
    } catch (err) {
      const lastError = err instanceof Error ? err.message : 'Unknown error';
      
      if (attempt === MAX_RETRIES - 1) {
        return {success: false, attempts: attempt + 1, lastError};
      }
    }
    
    // Wait before retry
    await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
  }
  
  return {success: false, attempts: MAX_RETRIES};
};

/**
 * Send a webhook notification if the event type is configured.
 * Fire-and-forget: returns immediately, logs result asynchronously.
 */
export const sendWebhook = (
  config: WebhookConfig | undefined,
  event: WebhookEvent,
  jobId: string,
  data: unknown
): void => {
  if (!config) return;
  
  // Check if this event type should be sent
  const events = config.events ?? ['completed', 'failed'];
  if (!events.includes(event)) return;
  
  const payload: WebhookPayload = {
    event,
    jobId,
    timestamp: new Date().toISOString(),
    data
  };
  
  // Fire-and-forget
  deliverWithRetry(config.url, payload, config.headers)
    .then(result => {
      if (!result.success) {
        console.warn(
          `[Webhook] Failed to deliver ${event} for job ${jobId} ` +
          `after ${result.attempts} attempts: ${result.lastError}`
        );
      } else if (result.attempts > 1) {
        console.log(
          `[Webhook] Delivered ${event} for job ${jobId} ` +
          `after ${result.attempts} attempts`
        );
      } else {
        console.log(`[Webhook] Delivered ${event} for job ${jobId}`);
      }
    })
    .catch(err => {
      // Shouldn't happen, but log just in case
      console.error(`[Webhook] Unexpected error for job ${jobId}:`, err);
    });
};

/**
 * Check if webhooks are configured and would be sent for a given event.
 */
export const wouldSendWebhook = (
  config: WebhookConfig | undefined,
  event: WebhookEvent
): boolean => {
  if (!config) return false;
  const events = config.events ?? ['completed', 'failed'];
  return events.includes(event);
};
