// ============================================================================
// Renderowl Platform API Contract Extensions
// ============================================================================
// Projects, Assets, Templates, and Automations API surface
// Additions to the core api-contract.ts for platform-level features
//
// Usage:
//   import {ProjectSchema, CreateProjectRequestSchema} from './platform-contract';
// ============================================================================

import {z} from 'zod';

// ============================================================================
// Project Types
// ============================================================================

export const ProjectStatusSchema = z.enum(['active', 'suspended', 'archived']);

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  keyPrefix: z.string().regex(/^rk_live_[a-zA-Z0-9]{8}$/), // rk_live_xxxxxxxx
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().optional(),
  scopes: z.array(z.enum(['renders:read', 'renders:write', 'assets:read', 'assets:write', 'webhooks', 'admin'])),
  rateLimitRpm: z.number().int().min(10).max(10000).default(100)
});

export const ProjectSettingsSchema = z.object({
  defaultRenderSettings: z.object({
    width: z.number().int().min(100).max(4096).default(1080),
    height: z.number().int().min(100).max(4096).default(1920),
    fps: z.number().int().min(1).max(120).default(30),
    maxDurationSeconds: z.number().int().min(1).max(600).default(300)
  }).optional(),
  webhookDefaults: z.object({
    url: z.string().url().optional(),
    secret: z.string().min(16).max(256).optional(),
    events: z.array(z.enum(['queued', 'started', 'progress', 'completed', 'failed'])).default(['completed', 'failed'])
  }).optional(),
  storageQuotaGb: z.number().int().min(1).max(1000).default(10),
  renderQuotaMinutes: z.number().int().min(1).max(100000).default(1000)
});

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9-]{3,50}$/), // URL-friendly identifier
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: ProjectStatusSchema,
  settings: ProjectSettingsSchema,
  apiKeys: z.array(ApiKeySchema).max(10),
  usage: z.object({
    storageUsedBytes: z.number().int(),
    rendersCompleted: z.number().int(),
    renderMinutesUsed: z.number().int(),
    lastRenderAt: z.string().datetime().optional()
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// ============================================================================
// Asset Types
// ============================================================================

export const AssetTypeSchema = z.enum(['video', 'audio', 'image', 'font', 'template']);

export const AssetStatusSchema = z.enum(['uploading', 'processing', 'ready', 'failed']);

export const AssetSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  type: AssetTypeSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  status: AssetStatusSchema,
  sizeBytes: z.number().int().min(0),
  mimeType: z.string(),
  metadata: z.object({
    width: z.number().int().optional(),
    height: z.number().int().optional(),
    durationSeconds: z.number().optional(),
    codec: z.string().optional(),
    fps: z.number().optional()
  }).optional(),
  urls: z.object({
    original: z.string().url(),
    thumbnail: z.string().url().optional(),
    preview: z.string().url().optional()
  }),
  tags: z.array(z.string().max(50)).max(20).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// ============================================================================
// Template Types
// ============================================================================

export const TemplateSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  // Embedded CaptionStyle from api-contract
  style: z.record(z.unknown()), // CaptionStyle as JSON
  defaultVideo: z.object({
    type: z.enum(['none', 'asset']),
    assetId: z.string().uuid().optional()
  }).optional(),
  defaultSettings: z.record(z.unknown()).optional(), // Settings as JSON
  variables: z.array(z.object({
    key: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    type: z.enum(['string', 'number', 'color', 'boolean', 'select']),
    label: z.string(),
    default: z.unknown().optional(),
    options: z.array(z.string()).optional() // For select type
  })).optional(),
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// ============================================================================
// Automation Types
// ============================================================================

export const AutomationTriggerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('webhook'),
    endpoint: z.string().regex(/^[a-z0-9-]{3,50}$/),
    secret: z.string().min(16).optional()
  }),
  z.object({
    type: z.literal('schedule'),
    cron: z.string().regex(/^([0-9*,/-]+\s){4}[0-9*,/-]+$/) // Simple cron validation
  }),
  z.object({
    type: z.literal('asset_upload'),
    assetTypes: z.array(AssetTypeSchema).optional()
  })
]);

export const AutomationActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('render'),
    templateId: z.string().uuid(),
    variableMapping: z.record(z.string()) // Maps trigger data to template variables
  }),
  z.object({
    type: z.literal('webhook'),
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT']).default('POST'),
    headers: z.record(z.string()).optional()
  })
]);

export const AutomationSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(true),
  trigger: AutomationTriggerSchema,
  actions: z.array(AutomationActionSchema).min(1).max(5),
  runs: z.object({
    total: z.number().int(),
    successful: z.number().int(),
    failed: z.number().int(),
    lastRunAt: z.string().datetime().optional(),
    lastRunStatus: z.enum(['success', 'failed']).optional()
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// ============================================================================
// Request/Response Schemas
// ============================================================================

// --- Projects ---

export const CreateProjectRequestSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,50}$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  settings: ProjectSettingsSchema.optional()
});

export const UpdateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: ProjectSettingsSchema.partial().optional(),
  status: ProjectStatusSchema.optional()
});

export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(['renders:read', 'renders:write', 'assets:read', 'assets:write', 'webhooks', 'admin'])),
  rateLimitRpm: z.number().int().min(10).max(10000).optional()
});

export const CreateApiKeyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  key: z.string().regex(/^rk_live_[a-zA-Z0-9]{32}$/), // Full key shown ONLY on creation
  keyPrefix: z.string(),
  scopes: z.array(z.string()),
  createdAt: z.string().datetime()
});

// --- Assets ---

export const CreateAssetRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: AssetTypeSchema,
  sizeBytes: z.number().int().min(0),
  mimeType: z.string(),
  tags: z.array(z.string().max(50)).max(20).optional()
});

export const CreateAssetResponseSchema = z.object({
  asset: AssetSchema,
  uploadUrl: z.string().url().describe('Presigned URL for direct upload'),
  uploadExpiresAt: z.string().datetime()
});

export const ListAssetsQuerySchema = z.object({
  type: AssetTypeSchema.optional(),
  status: AssetStatusSchema.optional(),
  search: z.string().max(100).optional(),
  tags: z.string().optional(), // Comma-separated
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional()
});

// --- Templates ---

export const CreateTemplateRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  style: z.record(z.unknown()),
  defaultVideo: z.object({
    type: z.enum(['none', 'asset']),
    assetId: z.string().uuid().optional()
  }).optional(),
  defaultSettings: z.record(z.unknown()).optional(),
  variables: z.array(z.object({
    key: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    type: z.enum(['string', 'number', 'color', 'boolean', 'select']),
    label: z.string(),
    default: z.unknown().optional(),
    options: z.array(z.string()).optional()
  })).optional()
});

export const UpdateTemplateRequestSchema = CreateTemplateRequestSchema.partial();

// --- Automations ---

export const CreateAutomationRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  trigger: AutomationTriggerSchema,
  actions: z.array(AutomationActionSchema).min(1).max(5)
});

export const UpdateAutomationRequestSchema = CreateAutomationRequestSchema.partial();

export const TriggerAutomationRequestSchema = z.object({
  variables: z.record(z.unknown()).optional()
});

export const AutomationRunSchema = z.object({
  id: z.string().uuid(),
  automationId: z.string().uuid(),
  projectId: z.string().uuid(),
  status: z.enum(['running', 'completed', 'failed']),
  triggeredAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  input: z.record(z.unknown()),
  output: z.record(z.unknown()).optional(),
  error: z.object({
    message: z.string(),
    code: z.string(),
    step: z.number().int()
  }).optional()
});

// ============================================================================
// List Response Wrappers
// ============================================================================

export const ListResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      hasMore: z.boolean(),
      nextCursor: z.string().optional(),
      total: z.number().int().optional()
    })
  });

// ============================================================================
// Error Response Extensions
// ============================================================================

export const PlatformErrorCodeSchema = z.enum([
  'PROJECT_NOT_FOUND',
  'PROJECT_SLUG_EXISTS',
  'PROJECT_QUOTA_EXCEEDED',
  'ASSET_NOT_FOUND',
  'ASSET_QUOTA_EXCEEDED',
  'TEMPLATE_NOT_FOUND',
  'AUTOMATION_NOT_FOUND',
  'INVALID_TEMPLATE_VARIABLES',
  'API_KEY_REVOKED',
  'RATE_LIMIT_EXCEEDED',
  'UNAUTHORIZED_SCOPE'
]);

// ============================================================================
// Type Exports
// ============================================================================

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
export type AssetStatus = z.infer<typeof AssetStatusSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type Template = z.infer<typeof TemplateSchema>;
export type AutomationTrigger = z.infer<typeof AutomationTriggerSchema>;
export type AutomationAction = z.infer<typeof AutomationActionSchema>;
export type Automation = z.infer<typeof AutomationSchema>;
export type AutomationRun = z.infer<typeof AutomationRunSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;
export type CreateApiKeyResponse = z.infer<typeof CreateApiKeyResponseSchema>;
export type CreateAssetRequest = z.infer<typeof CreateAssetRequestSchema>;
export type CreateAssetResponse = z.infer<typeof CreateAssetResponseSchema>;
export type ListAssetsQuery = z.infer<typeof ListAssetsQuerySchema>;
export type CreateTemplateRequest = z.infer<typeof CreateTemplateRequestSchema>;
export type UpdateTemplateRequest = z.infer<typeof UpdateTemplateRequestSchema>;
export type CreateAutomationRequest = z.infer<typeof CreateAutomationRequestSchema>;
export type UpdateAutomationRequest = z.infer<typeof UpdateAutomationRequestSchema>;
export type TriggerAutomationRequest = z.infer<typeof TriggerAutomationRequestSchema>;
export type PlatformErrorCode = z.infer<typeof PlatformErrorCodeSchema>;
