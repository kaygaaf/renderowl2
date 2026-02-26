import { EventEmitter } from 'events';
import { WebhookEndpoint, WebhookDelivery, WebhookEvent } from './schema.js';
interface WebhookServiceConfig {
    maxRetries?: number;
    retryDelayMs?: number;
    maxRetryDelayMs?: number;
    timeoutMs?: number;
    signatureToleranceSeconds?: number;
}
export declare class WebhookService extends EventEmitter {
    private db;
    private config;
    private isRunning;
    private deliveryInterval;
    private cleanupInterval;
    constructor(dbPath: string, config?: WebhookServiceConfig);
    createWebhook(params: {
        userId: string;
        url: string;
        events: WebhookEvent[];
        secret?: string;
        description?: string;
        headers?: Record<string, string>;
        maxRetries?: number;
    }): WebhookEndpoint;
    getWebhook(id: string, includeSecret?: boolean): WebhookEndpoint | null;
    getWebhooksByUser(userId: string, includeSecret?: boolean): WebhookEndpoint[];
    getWebhooksForEvent(event: WebhookEvent): WebhookEndpoint[];
    updateWebhook(id: string, updates: Partial<Pick<WebhookEndpoint, 'url' | 'events' | 'status' | 'description' | 'headers' | 'maxRetries'>>): WebhookEndpoint | null;
    deleteWebhook(id: string): boolean;
    regenerateSecret(id: string): string | null;
    triggerEvent(event: WebhookEvent, data: Record<string, unknown>, userId?: string): string[];
    queueDelivery(webhook: WebhookEndpoint, event: WebhookEvent, data: Record<string, unknown>): string;
    start(): Promise<void>;
    stop(): void;
    private processDeliveries;
    private executeDelivery;
    private markDelivered;
    private handleDeliveryFailure;
    getDelivery(id: string): WebhookDelivery | null;
    getDeliveries(webhookId: string, limit?: number): WebhookDelivery[];
    getDeliveryStats(webhookId: string): {
        total: number;
        delivered: number;
        failed: number;
        pending: number;
        retrying: number;
    };
    private cleanup;
    private generateSecret;
    private hydrateWebhook;
    private hydrateDelivery;
    close(): void;
}
export default WebhookService;
//# sourceMappingURL=service.d.ts.map