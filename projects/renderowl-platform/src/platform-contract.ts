import {z} from 'zod';

// ============================================================================
// Renderowl Platform API Schemas
// ============================================================================
// Strongly-typed schemas for the platform orchestration layer.
// These define the contract between client SDKs and the platform API.
//
// Dependencies:
//   - zod ^3.23.8
//
// Usage:
//   import {ProjectSchema, RenderJobSchema} from './platform-contract';
//   const project = ProjectSchema.parse(apiResponse);
// ============================================================================

// ----------------------------------------------------------------------------
// Base Types
// ----------------------------------------------------------------------------

export const UUIDSchema = z.string().uuid();

export const TimestampSchema = z.string().datetime();

export const PaginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int(),
    hasMore: z.boolean()
  })
});

// ----------------------------------------------------------------------------
// Project Schemas
// ----------------------------------------------------------------------------

export const ProjectSettingsSchema = z.object({
  defaultWidth: z.number().int().min(100).max(4096).optional().default(1080),
  defaultHeight: z.number().int().min(100).max(4096).optional().default(1920),
  defaultFps: z.number().int().min(1).max(120).optional().default(30),
  defaultFormat: z.enum(['mp4', 'webm', 'mov']).optional().default('mp4'),
  maxConcurrentRenders: z.number().int().min(1).max(50).optional().default(5),
  retentionDays: z.number().int().min(1).max(365).optional().default(30)
});

export const ProjectSchema = z.object({
  id: UUIDSchema,
  organizationId: UUIDSchema,
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(1).max(50),
  description: z.string().max(500).optional(),
  settings: ProjectSettingsSchema,
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(), // Returned only on create
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  settings: ProjectSettingsSchema.optional(),
  webhookUrl: z.string().url().optional()
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: ProjectSettingsSchema.partial().optional(),
  webhookUrl: z.string().url().optional().nullable()
});

// ----------------------------------------------------------------------------
// Asset Schemas
// ----------------------------------------------------------------------------

export const AssetTypeSchema = z.enum([
  'video',
  'audio',
  'font',
  'template',
  'brand-kit',
  'caption-style',
  'image',
  'subtitle'
]);

export const AssetStatusSchema = z.enum([
  'pending',      // Upload URL generated, awaiting file
  'uploading',    // File transfer in progress
  'processing',   // Transcoding/analyzing
  'ready',        // Available for use
  'error'         // Processing failed
]);

export const StorageInfoSchema = z.object({
  provider: z.enum(['s3', 'gcs', 'azure', 'r2']),
  bucket: z.string(),
  key: z.string(),
  size: z.number().int().min(0).optional(), // bytes
  checksum: z.object({
    sha256: z.string().optional(),
    md5: z.string().optional()
  }).optional(),
  urls: z.object({
    public: z.string().url().optional(),
    signed: z.string().url().optional(),
    thumbnail: z.string().url().optional()
  })
});

export const VideoMetadataSchema = z.object({
  duration: z.number().min(0), // seconds
  width: z.number().int(),
  height: z.number().int(),
  fps: z.number(),
  codec: z.string(),
  bitrate: z.number().int(),
  hasAudio: z.boolean()
});

export const FontMetadataSchema = z.object({
  family: z.string(),
  style: z.enum(['normal', 'italic', 'oblique']),
  weight: z.number().int().min(100).max(900),
  format: z.enum(['ttf', 'otf', 'woff', 'woff2']),
  variants: z.array(z.object({
    weight: z.number().int(),
    style: z.string()
  }))
});

export const TemplateMetadataSchema = z.object({
  engine: z.enum(['remotion', 'after-effects', 'ffmpeg']),
  composition: z.string(),
  schema: z.record(z.unknown()), // JSON Schema for inputs
  previewUrl: z.string().url().optional()
});

export const BrandKitMetadataSchema = z.object({
  colors: z.object({
    primary: z.string().regex(/^#[A-Fa-f0-9]{6}$/),
    secondary: z.string().regex(/^#[A-Fa-f0-9]{6}$/).optional(),
    accent: z.string().regex(/^#[A-Fa-f0-9]{6}$/).optional(),
    background: z.string().regex(/^#[A-Fa-f0-9]{6}$/).optional(),
    text: z.string().regex(/^#[A-Fa-f0-9]{6}$/).optional()
  }),
  fonts: z.object({
    heading: z.string().optional(),
    body: z.string().optional()
  }),
  logoAssetId: UUIDSchema.optional()
});

export const AssetMetadataSchema = z.union([
  VideoMetadataSchema,
  FontMetadataSchema,
  TemplateMetadataSchema,
  BrandKitMetadataSchema,
  z.record(z.unknown()) // Fallback for unknown types
]);

export const AssetSchema = z.object({
  id: UUIDSchema,
  projectId: UUIDSchema,
  type: AssetTypeSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: AssetStatusSchema,
  metadata: AssetMetadataSchema.optional(),
  storage: StorageInfoSchema.optional(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: UUIDSchema.optional()
});

export const CreateAssetSchema = z.object({
  name: z.string().min(1).max(200),
  type: AssetTypeSchema,
  description: z.string().max(1000).optional(),
  size: z.number().int().min(0).optional(), // For presigned URL sizing
  contentType: z.string().optional(),
  tags: z.array(z.string().max(50)).max(20).optional()
});

export const UpdateAssetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const AssetUploadResponseSchema = z.object({
  asset: AssetSchema,
  uploadUrl: z.string().url(),
  expiresAt: TimestampSchema,
  method: z.enum(['PUT', 'POST']).default('PUT'),
  headers: z.record(z.string()).optional()
});

// ----------------------------------------------------------------------------
// Render Job Schemas
// ----------------------------------------------------------------------------

export const RenderEngineSchema = z.enum(['remotion', 'ffmpeg', 'gpu-accelerated']);

export const JobStatusSchema = z.enum([
  'pending',      // Awaiting validation
  'queued',       // In queue awaiting worker
  'processing',   // Actively rendering
  'completed',    // Success
  'failed',       // Render error
  'cancelled',    // User cancelled
  'retrying'      // Automatic retry in progress
]);

export const AssetReferenceSchema = z.object({
  type: z.literal('asset'),
  assetId: UUIDSchema
});

export const InlineInputSchema = z.object({
  type: z.literal('inline'),
  data: z.unknown()
});

export const InputSourceSchema = z.union([AssetReferenceSchema, InlineInputSchema]);

// This extends the remotion types but uses asset references
export const RenderInputSchema = z.object({
  // Video source (can be asset ref or none)
  video: z.union([
    z.object({ type: z.literal('none'), backgroundColor: z.string().optional() }),
    AssetReferenceSchema,
    InlineInputSchema
  ]).optional(),

  // Caption source
  captions: InputSourceSchema.optional(),

  // Style preset (reference or inline)
  style: InputSourceSchema.optional(),

  // Brand kit reference
  brandKit: AssetReferenceSchema.optional(),

  // Template reference (for template-based renders)
  template: AssetReferenceSchema.optional(),

  // Template variables (when using template)
  variables: z.record(z.unknown()).optional(),

  // Override settings
  settings: z.object({
    width: z.number().int().min(100).max(4096).optional(),
    height: z.number().int().min(100).max(4096).optional(),
    fps: z.number().int().min(1).max(120).optional(),
    durationMs: z.number().int().min(100).optional()
  }).optional(),

  // Output configuration
  output: z.object({
    format: z.enum(['mp4', 'webm', 'mov']).optional().default('mp4'),
    codec: z.enum(['h264', 'h265', 'vp8', 'vp9', 'prores', 'av1']).optional().default('h264'),
    quality: z.enum(['low', 'medium', 'high', 'ultra']).optional().default('high'),
    filename: z.string().optional()
  }).optional()
});

export const JobProgressSchema = z.object({
  percent: z.number().min(0).max(100),
  framesRendered: z.number().int().optional(),
  totalFrames: z.number().int().optional(),
  currentStage: z.string().optional(), // e.g., "encoding", "muxing"
  estimatedCompletionAt: TimestampSchema.optional()
});

export const RenderOutputSchema = z.object({
  url: z.string().url(),
  size: z.number().int().min(0), // bytes
  duration: z.number().min(0), // seconds
  width: z.number().int(),
  height: z.number().int(),
  fps: z.number(),
  codec: z.string(),
  expiresAt: TimestampSchema.optional() // Signed URL expiry
});

export const CostInfoSchema = z.object({
  computeSeconds: z.number().min(0),
  estimatedCost: z.number().min(0).optional(), // in credits/cents
  actualCost: z.number().min(0).optional()
});

export const WebhookConfigSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  secret: z.string().optional(), // For HMAC signature
  events: z.array(z.enum([
    'queued', 'started', 'progress', 'completed', 'failed', 'cancelled'
  ])).optional().default(['completed', 'failed'])
});

export const RenderJobSchema = z.object({
  id: UUIDSchema,
  projectId: UUIDSchema,
  status: JobStatusSchema,
  engine: RenderEngineSchema,
  input: RenderInputSchema,
  output: RenderOutputSchema.optional(),
  progress: JobProgressSchema.optional(),
  webhook: WebhookConfigSchema.optional(),
  cost: CostInfoSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    retryable: z.boolean().optional()
  }).optional(),
  createdAt: TimestampSchema,
  startedAt: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
  createdBy: UUIDSchema.optional()
});

export const SubmitRenderSchema = z.object({
  engine: RenderEngineSchema.optional().default('remotion'),
  input: RenderInputSchema,
  webhook: WebhookConfigSchema.optional(),
  priority: z.number().int().min(1).max(10).optional().default(5),
  callbackUrl: z.string().url().optional() // Simple callback alternative
});

// ----------------------------------------------------------------------------
// Automation Schemas
// ----------------------------------------------------------------------------

export const TriggerTypeSchema = z.enum([
  'webhook',
  'schedule',
  'asset-upload',
  'render-complete'
]);

export const WebhookTriggerSchema = z.object({
  type: z.literal('webhook'),
  secret: z.string().optional(), // For validating incoming webhooks
  filter: z.record(z.unknown()).optional() // Filter on payload fields
});

export const ScheduleTriggerSchema = z.object({
  type: z.literal('schedule'),
  cron: z.string().regex(/^([\d*,/-]+\s){4}[\d*,/-]+$/), // 5-part cron
  timezone: z.string().optional().default('UTC'),
  enabled: z.boolean().default(true)
});

export const AssetUploadTriggerSchema = z.object({
  type: z.literal('asset-upload'),
  assetTypes: z.array(AssetTypeSchema).optional(), // Filter by type
  pathPattern: z.string().optional() // Regex on asset name/path
});

export const RenderCompleteTriggerSchema = z.object({
  type: z.literal('render-complete'),
  renderIds: z.array(UUIDSchema).optional(), // Specific renders to watch
  statusFilter: z.array(z.enum(['completed', 'failed'])).optional()
});

export const TriggerConfigSchema = z.union([
  WebhookTriggerSchema,
  ScheduleTriggerSchema,
  AssetUploadTriggerSchema,
  RenderCompleteTriggerSchema
]);

export const DataMappingSchema = z.object({
  target: z.string(), // Template variable name
  source: z.enum(['trigger.payload', 'trigger.asset', 'static', 'env']),
  path: z.string().optional(), // JSON path for extraction
  value: z.unknown().optional(), // For static values
  transform: z.enum(['uppercase', 'lowercase', 'trim', 'formatDate']).optional()
});

export const AutomationSchema = z.object({
  id: UUIDSchema,
  projectId: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(true),
  trigger: TriggerConfigSchema,
  template: AssetReferenceSchema,
  mappings: z.array(DataMappingSchema),
  output: z.object({
    folder: z.string().optional(), // Asset folder path
    namingPattern: z.string().optional(), // e.g., "{date}-{trigger.name}.mp4"
    tags: z.array(z.string()).optional()
  }).optional(),
  webhook: WebhookConfigSchema.optional(),
  lastRunAt: TimestampSchema.optional(),
  runCount: z.number().int().min(0).default(0),
  failureCount: z.number().int().min(0).default(0),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const CreateAutomationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional().default(true),
  trigger: TriggerConfigSchema,
  templateId: UUIDSchema,
  mappings: z.array(DataMappingSchema),
  output: z.object({
    folder: z.string().optional(),
    namingPattern: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).optional(),
  webhook: WebhookConfigSchema.optional()
});

export const UpdateAutomationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  trigger: TriggerConfigSchema.optional(),
  mappings: z.array(DataMappingSchema).optional(),
  output: z.object({
    folder: z.string().optional(),
    namingPattern: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).optional(),
  webhook: WebhookConfigSchema.optional()
});

export const AutomationRunSchema = z.object({
  id: UUIDSchema,
  automationId: UUIDSchema,
  projectId: UUIDSchema,
  status: z.enum(['running', 'completed', 'failed']),
  triggerData: z.record(z.unknown()),
  renderJobId: UUIDSchema.optional(),
  outputAssetId: UUIDSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string()
  }).optional(),
  startedAt: TimestampSchema,
  completedAt: TimestampSchema.optional()
});

// ----------------------------------------------------------------------------
// Webhook Event Schemas
// ----------------------------------------------------------------------------

export const WebhookEventSchema = z.object({
  id: z.string().regex(/^evt_[a-zA-Z0-9]+$/),
  type: z.string().regex(/^[a-z]+\.[a-z]+$/),
  apiVersion: z.string().default('2024-02-25'),
  created: z.number().int().min(0), // Unix timestamp
  data: z.record(z.unknown())
});

export const RenderEventDataSchema = z.object({
  renderId: UUIDSchema,
  projectId: UUIDSchema,
  organizationId: UUIDSchema,
  status: JobStatusSchema,
  progress: JobProgressSchema.optional(),
  output: RenderOutputSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string()
  }).optional()
});

export const AssetEventDataSchema = z.object({
  assetId: UUIDSchema,
  projectId: UUIDSchema,
  organizationId: UUIDSchema,
  type: AssetTypeSchema,
  name: z.string(),
  status: AssetStatusSchema,
  metadata: AssetMetadataSchema.optional()
});

// ----------------------------------------------------------------------------
// Error Schemas
// ----------------------------------------------------------------------------

export const APIErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      'invalid_request',
      'authentication_error',
      'not_found',
      'rate_limit_exceeded',
      'insufficient_quota',
      'render_engine_error',
      'validation_error',
      'internal_error'
    ]),
    message: z.string(),
    param: z.string().nullable().optional(),
    type: z.string()
  })
});

// ----------------------------------------------------------------------------
// Type Exports
// ----------------------------------------------------------------------------

export type UUID = z.infer<typeof UUIDSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;

export type AssetType = z.infer<typeof AssetTypeSchema>;
export type AssetStatus = z.infer<typeof AssetStatusSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type CreateAsset = z.infer<typeof CreateAssetSchema>;
export type UpdateAsset = z.infer<typeof UpdateAssetSchema>;
export type AssetUploadResponse = z.infer<typeof AssetUploadResponseSchema>;
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;
export type FontMetadata = z.infer<typeof FontMetadataSchema>;
export type TemplateMetadata = z.infer<typeof TemplateMetadataSchema>;
export type BrandKitMetadata = z.infer<typeof BrandKitMetadataSchema>;

export type RenderEngine = z.infer<typeof RenderEngineSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type JobProgress = z.infer<typeof JobProgressSchema>;
export type RenderOutput = z.infer<typeof RenderOutputSchema>;
export type CostInfo = z.infer<typeof CostInfoSchema>;
export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;
export type RenderInput = z.infer<typeof RenderInputSchema>;
export type RenderJob = z.infer<typeof RenderJobSchema>;
export type SubmitRender = z.infer<typeof SubmitRenderSchema>;

export type TriggerType = z.infer<typeof TriggerTypeSchema>;
export type TriggerConfig = z.infer<typeof TriggerConfigSchema>;
export type DataMapping = z.infer<typeof DataMappingSchema>;
export type Automation = z.infer<typeof AutomationSchema>;
export type CreateAutomation = z.infer<typeof CreateAutomationSchema>;
export type UpdateAutomation = z.infer<typeof UpdateAutomationSchema>;
export type AutomationRun = z.infer<typeof AutomationRunSchema>;

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type RenderEventData = z.infer<typeof RenderEventDataSchema>;
export type AssetEventData = z.infer<typeof AssetEventDataSchema>;
export type APIError = z.infer<typeof APIErrorSchema>;
