// ============================================================================
// RenderOwl Automation & API Infrastructure
// ============================================================================

// Webhook System
export { WebhookService } from './lib/webhooks/service.js';
export {
  WebhookEvent,
  WebhookEndpoint,
  WebhookDelivery,
  WebhookPayload,
  VideoCreatedPayload,
  VideoCompletedPayload,
  VideoFailedPayload,
  CreditsLowPayload,
  generateWebhookSignature,
  verifyWebhookSignature,
  generateSignedPayload,
  verifySignedPayload,
} from './lib/webhooks/schema.js';

// Rate Limiting
export {
  RateLimiter,
  rateLimitPlugin,
  DEFAULT_TIERS,
  RateLimitConfig,
  RateLimitTier,
  RateLimitResult,
} from './lib/ratelimit/index.js';

// API Keys
export {
  ApiKeyService,
  apiKeyAuthPlugin,
  requireScopes,
  ALL_SCOPES,
  SCOPE_TEMPLATES,
  SCOPE_DESCRIPTIONS,
  ApiKeyScope,
  ApiKey,
} from './lib/apikeys/index.js';

// YouTube Integration
export { YouTubeService, YouTubeConnection, YouTubeUpload } from './lib/integrations/youtube.js';

// RSS Feed Ingestion
export { RssService, RssFeed, RssItem, ParsedRssItem } from './lib/integrations/rss.js';

// Template System
export {
  TemplateService,
  Template,
  TemplateListing,
  TemplateReview,
  TemplateStatus,
  TemplateVisibility,
} from './lib/templates/index.js';
