import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { WEBHOOK_SCHEMA_SQL, generateSignedPayload, } from './schema.js';
export class WebhookService extends EventEmitter {
    db;
    config;
    isRunning = false;
    deliveryInterval = null;
    cleanupInterval = null;
    constructor(dbPath, config = {}) {
        super();
        this.db = new Database(dbPath);
        this.db.exec(WEBHOOK_SCHEMA_SQL);
        this.config = {
            maxRetries: config.maxRetries ?? 5,
            retryDelayMs: config.retryDelayMs ?? 5000,
            maxRetryDelayMs: config.maxRetryDelayMs ?? 86400000, // 24 hours
            timeoutMs: config.timeoutMs ?? 30000,
            signatureToleranceSeconds: config.signatureToleranceSeconds ?? 300,
        };
    }
    // ========================================================================
    // Webhook Endpoint Management
    // ========================================================================
    createWebhook(params) {
        const id = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const secret = params.secret || this.generateSecret();
        const now = new Date().toISOString();
        const webhook = {
            id,
            userId: params.userId,
            url: params.url,
            secret,
            events: params.events,
            status: 'active',
            description: params.description || null,
            headers: params.headers || null,
            retryCount: 0,
            maxRetries: params.maxRetries ?? this.config.maxRetries,
            createdAt: now,
            updatedAt: now,
            lastTriggeredAt: null,
            lastSuccessAt: null,
            lastFailureAt: null,
            failureCount: 0,
            successCount: 0,
        };
        const stmt = this.db.prepare(`
      INSERT INTO webhook_endpoints (
        id, user_id, url, secret, events, status, description, headers,
        max_retries, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(webhook.id, webhook.userId, webhook.url, webhook.secret, JSON.stringify(webhook.events), webhook.status, webhook.description, webhook.headers ? JSON.stringify(webhook.headers) : null, webhook.maxRetries, webhook.createdAt, webhook.updatedAt);
        this.emit('webhook:created', { webhookId: id, userId: params.userId });
        return webhook;
    }
    getWebhook(id, includeSecret = false) {
        const row = this.db.prepare('SELECT * FROM webhook_endpoints WHERE id = ?').get(id);
        if (!row)
            return null;
        return this.hydrateWebhook(row, includeSecret);
    }
    getWebhooksByUser(userId, includeSecret = false) {
        const rows = this.db.prepare('SELECT * FROM webhook_endpoints WHERE user_id = ? ORDER BY created_at DESC').all(userId);
        return rows.map(row => this.hydrateWebhook(row, includeSecret));
    }
    getWebhooksForEvent(event) {
        // Use LIKE for simple JSON array matching (SQLite doesn't have JSON_CONTAINS)
        const rows = this.db.prepare("SELECT * FROM webhook_endpoints WHERE status = 'active' AND events LIKE ?").all(`%${event}%`);
        // Filter to ensure exact event match (not substring)
        return rows
            .map(row => this.hydrateWebhook(row, true))
            .filter(wh => wh.events.includes(event));
    }
    updateWebhook(id, updates) {
        const webhook = this.getWebhook(id, true);
        if (!webhook)
            return null;
        const now = new Date().toISOString();
        if (updates.url !== undefined)
            webhook.url = updates.url;
        if (updates.events !== undefined)
            webhook.events = updates.events;
        if (updates.status !== undefined)
            webhook.status = updates.status;
        if (updates.description !== undefined)
            webhook.description = updates.description;
        if (updates.headers !== undefined)
            webhook.headers = updates.headers;
        if (updates.maxRetries !== undefined)
            webhook.maxRetries = updates.maxRetries;
        webhook.updatedAt = now;
        this.db.prepare(`
      UPDATE webhook_endpoints SET
        url = ?, events = ?, status = ?, description = ?, headers = ?,
        max_retries = ?, updated_at = ?
      WHERE id = ?
    `).run(webhook.url, JSON.stringify(webhook.events), webhook.status, webhook.description, webhook.headers ? JSON.stringify(webhook.headers) : null, webhook.maxRetries, webhook.updatedAt, id);
        this.emit('webhook:updated', { webhookId: id });
        return webhook;
    }
    deleteWebhook(id) {
        const result = this.db.prepare('DELETE FROM webhook_endpoints WHERE id = ?').run(id);
        if (result.changes > 0) {
            this.emit('webhook:deleted', { webhookId: id });
            return true;
        }
        return false;
    }
    regenerateSecret(id) {
        const webhook = this.getWebhook(id, true);
        if (!webhook)
            return null;
        const newSecret = this.generateSecret();
        const now = new Date().toISOString();
        this.db.prepare('UPDATE webhook_endpoints SET secret = ?, updated_at = ? WHERE id = ?')
            .run(newSecret, now, id);
        this.emit('webhook:secret_regenerated', { webhookId: id });
        return newSecret;
    }
    // ========================================================================
    // Event Triggering
    // ========================================================================
    triggerEvent(event, data, userId) {
        const webhooks = userId
            ? this.getWebhooksByUser(userId, true).filter(wh => wh.events.includes(event) && wh.status === 'active')
            : this.getWebhooksForEvent(event);
        const deliveryIds = [];
        for (const webhook of webhooks) {
            const deliveryId = this.queueDelivery(webhook, event, data);
            deliveryIds.push(deliveryId);
        }
        this.emit('event:triggered', { event, userId, webhookCount: webhooks.length });
        return deliveryIds;
    }
    queueDelivery(webhook, event, data) {
        const deliveryId = `whd_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const now = new Date().toISOString();
        const payload = {
            event,
            timestamp: now,
            webhookId: webhook.id,
            data,
        };
        // Insert into delivery log
        this.db.prepare(`
      INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(deliveryId, webhook.id, event, JSON.stringify(payload), 'pending', now);
        // Add to event queue for processing
        this.db.prepare(`
      INSERT INTO webhook_event_queue (id, webhook_id, event, payload, scheduled_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(deliveryId, webhook.id, event, JSON.stringify(payload), now);
        // Update webhook stats
        this.db.prepare(`
      UPDATE webhook_endpoints 
      SET last_triggered_at = ?, retry_count = retry_count + 1, updated_at = ?
      WHERE id = ?
    `).run(now, now, webhook.id);
        return deliveryId;
    }
    // ========================================================================
    // Delivery Processing
    // ========================================================================
    async start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        // Process deliveries every 1 second
        this.deliveryInterval = setInterval(() => this.processDeliveries(), 1000);
        // Cleanup old deliveries every hour
        this.cleanupInterval = setInterval(() => this.cleanup(), 3600000);
        this.emit('service:started');
    }
    stop() {
        this.isRunning = false;
        if (this.deliveryInterval) {
            clearInterval(this.deliveryInterval);
            this.deliveryInterval = null;
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.emit('service:stopped');
    }
    async processDeliveries() {
        if (!this.isRunning)
            return;
        // Get pending deliveries that are ready to be sent
        const pending = this.db.prepare(`
      SELECT q.*, e.url, e.secret, e.headers, e.max_retries
      FROM webhook_event_queue q
      JOIN webhook_endpoints e ON q.webhook_id = e.id
      WHERE q.scheduled_at <= datetime('now')
        AND e.status = 'active'
      ORDER BY q.priority DESC, q.created_at ASC
      LIMIT 10
    `).all();
        for (const row of pending) {
            try {
                // Remove from queue
                this.db.prepare('DELETE FROM webhook_event_queue WHERE id = ?').run(row.id);
                // Process delivery
                await this.executeDelivery(row.id, {
                    url: row.url,
                    secret: row.secret,
                    headers: row.headers ? JSON.parse(row.headers) : {},
                    payload: JSON.parse(row.payload),
                    maxRetries: row.max_retries,
                });
            }
            catch (error) {
                // Log error but continue processing other deliveries
                console.error(`[WebhookService] Failed to process delivery ${row.id}:`, error.message);
                // Try to mark as failed if we haven't already
                try {
                    const payload = JSON.parse(row.payload);
                    this.handleDeliveryFailure(row.id, payload, row.max_retries || 5, `Processing error: ${error.message}`, null, null, 0);
                }
                catch (innerError) {
                    // If we can't even mark it as failed, just log it
                    console.error(`[WebhookService] Could not mark delivery as failed:`, innerError);
                }
            }
        }
    }
    async executeDelivery(deliveryId, params) {
        const startTime = Date.now();
        try {
            // Generate signature with timestamp
            const timestamp = Math.floor(Date.now() / 1000);
            const payloadJson = JSON.stringify(params.payload);
            const signature = generateSignedPayload(payloadJson, params.secret, timestamp);
            const response = await fetch(params.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'X-Webhook-ID': params.payload.webhookId,
                    'X-Event-Type': params.payload.event,
                    'User-Agent': 'RenderOwl-Webhook/1.0',
                    ...params.headers,
                },
                body: payloadJson,
                signal: AbortSignal.timeout(this.config.timeoutMs),
            });
            const durationMs = Date.now() - startTime;
            const responseBody = await response.text();
            if (response.ok) {
                // Success
                this.markDelivered(deliveryId, response.status, responseBody, durationMs);
            }
            else {
                // Failed with HTTP error
                this.handleDeliveryFailure(deliveryId, params.payload, params.maxRetries, `HTTP ${response.status}: ${response.statusText}`, response.status, responseBody, durationMs);
            }
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            this.handleDeliveryFailure(deliveryId, params.payload, params.maxRetries, error.message || 'Network error', null, null, durationMs);
        }
    }
    markDelivered(deliveryId, statusCode, responseBody, durationMs) {
        const now = new Date().toISOString();
        this.db.prepare(`
      UPDATE webhook_deliveries SET
        status = 'delivered',
        attempt_count = attempt_count + 1,
        response_status = ?,
        response_body = ?,
        duration_ms = ?,
        completed_at = ?
      WHERE id = ?
    `).run(statusCode, responseBody, durationMs, now, deliveryId);
        // Update webhook success stats
        this.db.prepare(`
      UPDATE webhook_endpoints SET
        success_count = success_count + 1,
        last_success_at = ?,
        updated_at = ?
      WHERE id = (SELECT webhook_id FROM webhook_deliveries WHERE id = ?)
    `).run(now, now, deliveryId);
        this.emit('delivery:success', { deliveryId, statusCode, durationMs });
    }
    handleDeliveryFailure(deliveryId, payload, maxRetries, error, statusCode, responseBody, durationMs) {
        const delivery = this.getDelivery(deliveryId);
        if (!delivery)
            return;
        const attempts = delivery.attemptCount + 1;
        const shouldRetry = attempts < maxRetries;
        if (shouldRetry) {
            // Calculate exponential backoff
            const delayMs = Math.min(this.config.retryDelayMs * Math.pow(2, attempts - 1), this.config.maxRetryDelayMs);
            const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
            this.db.prepare(`
        UPDATE webhook_deliveries SET
          status = 'retrying',
          attempt_count = ?,
          error = ?,
          response_status = ?,
          response_body = ?,
          duration_ms = ?,
          next_retry_at = ?
        WHERE id = ?
      `).run(attempts, error, statusCode, responseBody, durationMs, nextRetryAt, deliveryId);
            // Re-queue for retry
            this.db.prepare(`
        INSERT INTO webhook_event_queue (id, webhook_id, event, payload, scheduled_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(`${deliveryId}_retry_${attempts}`, delivery.webhookId, delivery.event, JSON.stringify(payload), nextRetryAt);
            this.emit('delivery:retrying', { deliveryId, attempt: attempts, maxRetries, nextRetryAt });
        }
        else {
            // Max retries reached - mark as failed
            const now = new Date().toISOString();
            this.db.prepare(`
        UPDATE webhook_deliveries SET
          status = 'failed',
          attempt_count = ?,
          error = ?,
          response_status = ?,
          response_body = ?,
          duration_ms = ?,
          completed_at = ?
        WHERE id = ?
      `).run(attempts, error, statusCode, responseBody, durationMs, now, deliveryId);
            // Update webhook failure stats
            this.db.prepare(`
        UPDATE webhook_endpoints SET
          failure_count = failure_count + 1,
          last_failure_at = ?,
          updated_at = ?
        WHERE id = (SELECT webhook_id FROM webhook_deliveries WHERE id = ?)
      `).run(now, now, deliveryId);
            this.emit('delivery:failed', { deliveryId, attempts, error });
        }
    }
    // ========================================================================
    // Delivery Queries
    // ========================================================================
    getDelivery(id) {
        const row = this.db.prepare('SELECT * FROM webhook_deliveries WHERE id = ?').get(id);
        if (!row)
            return null;
        return this.hydrateDelivery(row);
    }
    getDeliveries(webhookId, limit = 100) {
        const rows = this.db.prepare('SELECT * FROM webhook_deliveries WHERE webhook_id = ? ORDER BY created_at DESC LIMIT ?').all(webhookId, limit);
        return rows.map(row => this.hydrateDelivery(row));
    }
    getDeliveryStats(webhookId) {
        const result = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'retrying' THEN 1 ELSE 0 END) as retrying
      FROM webhook_deliveries
      WHERE webhook_id = ?
    `).get(webhookId);
        return {
            total: result.total || 0,
            delivered: result.delivered || 0,
            failed: result.failed || 0,
            pending: result.pending || 0,
            retrying: result.retrying || 0,
        };
    }
    // ========================================================================
    // Cleanup
    // ========================================================================
    cleanup() {
        // Delete deliveries older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const result = this.db.prepare("DELETE FROM webhook_deliveries WHERE created_at < ? AND status IN ('delivered', 'failed')").run(thirtyDaysAgo);
        if (result.changes > 0) {
            this.emit('cleanup:deleted', { count: result.changes });
        }
    }
    // ========================================================================
    // Helpers
    // ========================================================================
    generateSecret() {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }
    hydrateWebhook(row, includeSecret) {
        return {
            id: row.id,
            userId: row.user_id,
            url: row.url,
            secret: includeSecret ? row.secret : '***hidden***',
            events: JSON.parse(row.events),
            status: row.status,
            description: row.description,
            headers: row.headers ? JSON.parse(row.headers) : null,
            retryCount: row.retry_count,
            maxRetries: row.max_retries,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastTriggeredAt: row.last_triggered_at,
            lastSuccessAt: row.last_success_at,
            lastFailureAt: row.last_failure_at,
            failureCount: row.failure_count,
            successCount: row.success_count,
        };
    }
    hydrateDelivery(row) {
        return {
            id: row.id,
            webhookId: row.webhook_id,
            event: row.event,
            payload: JSON.parse(row.payload),
            status: row.status,
            attemptCount: row.attempt_count,
            nextRetryAt: row.next_retry_at,
            responseStatus: row.response_status,
            responseBody: row.response_body,
            error: row.error,
            durationMs: row.duration_ms,
            createdAt: row.created_at,
            completedAt: row.completed_at,
        };
    }
    close() {
        this.stop();
        this.db.close();
    }
}
export default WebhookService;
//# sourceMappingURL=service.js.map