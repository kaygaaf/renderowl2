// ============================================================================
// Webhook System - Database Schema and Types
// ============================================================================
// ============================================================================
// Database Schema SQL
// ============================================================================
export const WEBHOOK_SCHEMA_SQL = `
-- Webhook endpoints table
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array of events
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disabled')),
  description TEXT,
  headers TEXT, -- JSON object of custom headers
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_triggered_at TEXT,
  last_success_at TEXT,
  last_failure_at TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhook_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhook_endpoints(status);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhook_endpoints(events);

-- Webhook delivery log table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON payload sent
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  response_status INTEGER,
  response_body TEXT,
  error TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_next_retry ON webhook_deliveries(next_retry_at) 
  WHERE status = 'retrying';
CREATE INDEX IF NOT EXISTS idx_deliveries_created ON webhook_deliveries(created_at);

-- Webhook event queue for pending deliveries
CREATE TABLE IF NOT EXISTS webhook_event_queue (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  scheduled_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_queue_scheduled ON webhook_event_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_event_queue_webhook ON webhook_event_queue(webhook_id);
`;
// ============================================================================
// Signature Verification
// ============================================================================
import crypto from 'crypto';
/**
 * Generate webhook signature using HMAC-SHA256
 * @param payload - The webhook payload body
 * @param secret - The webhook secret
 * @returns The signature string (hex)
 */
export function generateWebhookSignature(payload, secret) {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
/**
 * Verify webhook signature
 * @param payload - The webhook payload body
 * @param signature - The signature from the X-Webhook-Signature header
 * @param secret - The webhook secret
 * @returns boolean indicating if signature is valid
 */
export function verifyWebhookSignature(payload, signature, secret) {
    const expected = generateWebhookSignature(payload, secret);
    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    }
    catch {
        return false;
    }
}
/**
 * Generate signature header value with timestamp for replay protection
 * @param payload - The webhook payload body
 * @param secret - The webhook secret
 * @param timestamp - Unix timestamp (seconds)
 * @returns The signed payload string for X-Webhook-Signature header
 */
export function generateSignedPayload(payload, secret, timestamp) {
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    return `t=${timestamp},v1=${signature}`;
}
/**
 * Verify signed payload with timestamp
 * @param payload - The webhook payload body
 * @param header - The X-Webhook-Signature header value
 * @param secret - The webhook secret
 * @param toleranceSeconds - How old the signature can be (default: 5 minutes)
 * @returns boolean indicating if signature is valid and not expired
 */
export function verifySignedPayload(payload, header, secret, toleranceSeconds = 300) {
    const parts = header.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));
    if (!timestampPart || !signaturePart)
        return false;
    const timestamp = parseInt(timestampPart.substring(2), 10);
    const signature = signaturePart.substring(3);
    // Check timestamp is within tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
        return false; // Signature too old
    }
    const signedPayload = `${timestamp}.${payload}`;
    const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=schema.js.map