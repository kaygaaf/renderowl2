export type WebhookEvent = 'video.created' | 'video.completed' | 'video.failed' | 'credits.low' | 'credits.purchased' | 'automation.triggered' | 'automation.failed' | 'render.started' | 'render.completed' | 'render.failed';
export type WebhookStatus = 'active' | 'inactive' | 'disabled';
export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying';
export interface WebhookEndpoint {
    id: string;
    userId: string;
    url: string;
    secret: string;
    events: WebhookEvent[];
    status: WebhookStatus;
    description: string | null;
    headers: Record<string, string> | null;
    retryCount: number;
    maxRetries: number;
    createdAt: string;
    updatedAt: string;
    lastTriggeredAt: string | null;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    failureCount: number;
    successCount: number;
}
export interface WebhookDelivery {
    id: string;
    webhookId: string;
    event: WebhookEvent;
    payload: Record<string, unknown>;
    status: DeliveryStatus;
    attemptCount: number;
    nextRetryAt: string | null;
    responseStatus: number | null;
    responseBody: string | null;
    error: string | null;
    durationMs: number | null;
    createdAt: string;
    completedAt: string | null;
}
export interface WebhookPayload {
    event: WebhookEvent;
    timestamp: string;
    webhookId: string;
    data: Record<string, unknown>;
}
export declare const WEBHOOK_SCHEMA_SQL = "\n-- Webhook endpoints table\nCREATE TABLE IF NOT EXISTS webhook_endpoints (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL,\n  url TEXT NOT NULL,\n  secret TEXT NOT NULL,\n  events TEXT NOT NULL, -- JSON array of events\n  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disabled')),\n  description TEXT,\n  headers TEXT, -- JSON object of custom headers\n  retry_count INTEGER NOT NULL DEFAULT 0,\n  max_retries INTEGER NOT NULL DEFAULT 5,\n  created_at TEXT NOT NULL DEFAULT (datetime('now')),\n  updated_at TEXT NOT NULL DEFAULT (datetime('now')),\n  last_triggered_at TEXT,\n  last_success_at TEXT,\n  last_failure_at TEXT,\n  failure_count INTEGER NOT NULL DEFAULT 0,\n  success_count INTEGER NOT NULL DEFAULT 0\n);\n\nCREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhook_endpoints(user_id);\nCREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhook_endpoints(status);\nCREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhook_endpoints(events);\n\n-- Webhook delivery log table\nCREATE TABLE IF NOT EXISTS webhook_deliveries (\n  id TEXT PRIMARY KEY,\n  webhook_id TEXT NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,\n  event TEXT NOT NULL,\n  payload TEXT NOT NULL, -- JSON payload sent\n  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),\n  attempt_count INTEGER NOT NULL DEFAULT 0,\n  next_retry_at TEXT,\n  response_status INTEGER,\n  response_body TEXT,\n  error TEXT,\n  duration_ms INTEGER,\n  created_at TEXT NOT NULL DEFAULT (datetime('now')),\n  completed_at TEXT\n);\n\nCREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhook_id);\nCREATE INDEX IF NOT EXISTS idx_deliveries_status ON webhook_deliveries(status);\nCREATE INDEX IF NOT EXISTS idx_deliveries_next_retry ON webhook_deliveries(next_retry_at) \n  WHERE status = 'retrying';\nCREATE INDEX IF NOT EXISTS idx_deliveries_created ON webhook_deliveries(created_at);\n\n-- Webhook event queue for pending deliveries\nCREATE TABLE IF NOT EXISTS webhook_event_queue (\n  id TEXT PRIMARY KEY,\n  webhook_id TEXT NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,\n  event TEXT NOT NULL,\n  payload TEXT NOT NULL,\n  priority INTEGER NOT NULL DEFAULT 0,\n  scheduled_at TEXT NOT NULL DEFAULT (datetime('now')),\n  created_at TEXT NOT NULL DEFAULT (datetime('now'))\n);\n\nCREATE INDEX IF NOT EXISTS idx_event_queue_scheduled ON webhook_event_queue(scheduled_at);\nCREATE INDEX IF NOT EXISTS idx_event_queue_webhook ON webhook_event_queue(webhook_id);\n";
export interface VideoCreatedPayload {
    videoId: string;
    projectId: string;
    title: string;
    status: string;
    createdAt: string;
}
export interface VideoCompletedPayload {
    videoId: string;
    projectId: string;
    title: string;
    status: 'completed';
    duration: number;
    resolution: string;
    fileSize: number;
    url: string;
    completedAt: string;
}
export interface VideoFailedPayload {
    videoId: string;
    projectId: string;
    title: string;
    status: 'failed';
    error: string;
    failedAt: string;
}
export interface CreditsLowPayload {
    userId: string;
    currentBalance: number;
    threshold: number;
    message: string;
}
export interface RenderEventPayload {
    renderId: string;
    projectId: string;
    status: string;
    progress?: number;
    timestamp: string;
}
/**
 * Generate webhook signature using HMAC-SHA256
 * @param payload - The webhook payload body
 * @param secret - The webhook secret
 * @returns The signature string (hex)
 */
export declare function generateWebhookSignature(payload: string, secret: string): string;
/**
 * Verify webhook signature
 * @param payload - The webhook payload body
 * @param signature - The signature from the X-Webhook-Signature header
 * @param secret - The webhook secret
 * @returns boolean indicating if signature is valid
 */
export declare function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
/**
 * Generate signature header value with timestamp for replay protection
 * @param payload - The webhook payload body
 * @param secret - The webhook secret
 * @param timestamp - Unix timestamp (seconds)
 * @returns The signed payload string for X-Webhook-Signature header
 */
export declare function generateSignedPayload(payload: string, secret: string, timestamp: number): string;
/**
 * Verify signed payload with timestamp
 * @param payload - The webhook payload body
 * @param header - The X-Webhook-Signature header value
 * @param secret - The webhook secret
 * @param toleranceSeconds - How old the signature can be (default: 5 minutes)
 * @returns boolean indicating if signature is valid and not expired
 */
export declare function verifySignedPayload(payload: string, header: string, secret: string, toleranceSeconds?: number): boolean;
//# sourceMappingURL=schema.d.ts.map