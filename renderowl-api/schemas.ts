import { z } from 'zod';

// ============================================================================
// Primitive Types
// ============================================================================

export const ProjectIdSchema = z.string().regex(/^proj_[a-zA-Z0-9]{10,}$/);
export const AssetIdSchema = z.string().regex(/^asset_[a-zA-Z0-9]{10,}$/);
export const RenderIdSchema = z.string().regex(/^rnd_[a-zA-Z0-9]{10,}$/);
export const AutomationIdSchema = z.string().regex(/^auto_[a-zA-Z0-9]{10,}$/);
export const UserIdSchema = z.string().regex(/^user_[a-zA-Z0-9]{10,}$/);

export const ISO8601Schema = z.string().datetime();

// ============================================================================
// Credit & User Types
// ============================================================================

export const PlanTierSchema = z.enum(['trial', 'starter', 'creator', 'pro']);

export const UserSchema = z.object({
  id: UserIdSchema,
  email: z.string().email(),
  name: z.string().nullable(),
  credits_balance: z.number().int().nonnegative(),
  plan_tier: PlanTierSchema,
  trial_expires_at: ISO8601Schema.nullable(),
  subscription_status: z.enum(['active', 'cancelled', 'past_due', 'none']).default('none'),
  subscription_expires_at: ISO8601Schema.nullable(),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  created_at: ISO8601Schema,
  updated_at: ISO8601Schema,
});

export const UserMeResponseSchema = z.object({
  id: UserIdSchema,
  email: z.string().email(),
  name: z.string().nullable(),
  credits_balance: z.number().int().nonnegative(),
  plan_tier: PlanTierSchema,
  trial_expires_at: ISO8601Schema.nullable(),
  subscription_status: z.enum(['active', 'cancelled', 'past_due', 'none']),
  subscription_expires_at: ISO8601Schema.nullable(),
  days_until_trial_expires: z.number().int().nullable(),
});

// Credit cost calculation schemas
export const VideoTypeSchema = z.enum(['short', 'medium', 'long', 'custom']);

export const CalculateCostRequestSchema = z.object({
  video_type: VideoTypeSchema,
  scene_count: z.number().int().positive().optional(),
  duration_seconds: z.number().int().positive().optional(),
  include_images: z.boolean().default(true),
  include_voiceover: z.boolean().default(true),
  include_sfx: z.boolean().default(false),
});

export const CalculateCostResponseSchema = z.object({
  credits: z.number().int().nonnegative(),
  cost_eur: z.number().positive(),
  breakdown: z.object({
    base_cost: z.number().int().nonnegative(),
    image_cost: z.number().int().nonnegative(),
    voiceover_cost: z.number().int().nonnegative(),
    sfx_cost: z.number().int().nonnegative(),
  }),
});

// Stripe integration schemas
export const BuyCreditsRequestSchema = z.object({
  tier: PlanTierSchema,
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

export const BuyCreditsResponseSchema = z.object({
  checkout_url: z.string().url(),
  session_id: z.string(),
});

export const CreditTransactionSchema = z.object({
  id: z.string().regex(/^ctx_[a-zA-Z0-9]{10,}$/),
  user_id: UserIdSchema,
  type: z.enum(['purchase', 'usage', 'refund', 'bonus']),
  amount: z.number().int(),
  balance_after: z.number().int(),
  description: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: ISO8601Schema,
});

// ============================================================================
// Caption Types (from renderowl-remotion)
// ============================================================================

export const WordTimestampSchema = z.object({
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  word: z.string().min(1),
});

export const CaptionSegmentSchema = z.object({
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  text: z.string().min(1),
  words: z.array(WordTimestampSchema).optional(),
});

export const CaptionStyleSchema = z.object({
  maxCharsPerLine: z.number().int().positive().optional(),
  maxLines: z.number().int().positive().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  lineHeight: z.number().positive().optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  highlightColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  strokeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  strokeWidth: z.number().nonnegative().optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundOpacity: z.number().min(0).max(1).optional(),
  paddingX: z.number().nonnegative().optional(),
  paddingY: z.number().nonnegative().optional(),
  borderRadius: z.number().nonnegative().optional(),
  bottomOffset: z.number().nonnegative().optional(),
});

// ============================================================================
// Project Schemas
// ============================================================================

export const ProjectSettingsSchema = z.object({
  default_width: z.number().int().positive().default(1080),
  default_height: z.number().int().positive().default(1920),
  default_fps: z.number().int().positive().default(30),
  default_duration_sec: z.number().positive().default(60),
});

export const ProjectSchema = z.object({
  id: ProjectIdSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable(),
  status: z.enum(['active', 'archived']),
  settings: ProjectSettingsSchema,
  created_at: ISO8601Schema,
  updated_at: ISO8601Schema,
  created_by: z.string(), // User ID
  asset_count: z.number().int().nonnegative(),
  render_count: z.number().int().nonnegative(),
});

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  settings: ProjectSettingsSchema.partial().optional(),
});

export const UpdateProjectRequestSchema = CreateProjectRequestSchema.partial();

export const ProjectListResponseSchema = z.object({
  data: z.array(ProjectSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    per_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
  }),
});

// ============================================================================
// Asset Schemas
// ============================================================================

export const AssetTypeSchema = z.enum([
  'video',
  'audio',
  'image',
  'subtitle',
  'font',
  'other',
]);

export const AssetStatusSchema = z.enum([
  'pending',
  'processing',
  'ready',
  'error',
]);

export const AssetMetadataSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  codec: z.string().optional(),
});

export const AssetSchema = z.object({
  id: AssetIdSchema,
  project_id: ProjectIdSchema,
  name: z.string(),
  type: AssetTypeSchema,
  status: AssetStatusSchema,
  content_type: z.string(),
  size_bytes: z.number().int().nonnegative().nullable(),
  url: z.string().url().nullable(),
  metadata: AssetMetadataSchema.nullable(),
  created_at: ISO8601Schema,
  updated_at: ISO8601Schema,
});

export const CreateAssetUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1),
  size_bytes: z.number().int().positive().max(10 * 1024 * 1024 * 1024), // 10GB max
});

export const CreateAssetUploadResponseSchema = z.object({
  asset: AssetSchema,
  upload_url: z.string().url(),
  expires_at: ISO8601Schema,
});

export const AssetListResponseSchema = z.object({
  data: z.array(AssetSchema),
});

// ============================================================================
// Render Schemas
// ============================================================================

export const RenderStatusSchema = z.enum([
  'pending',
  'queued',
  'rendering',
  'completed',
  'failed',
  'cancelled',
]);

export const OutputFormatSchema = z.enum(['mp4', 'webm', 'mov', 'gif']);
export const VideoCodecSchema = z.enum(['h264', 'h265', 'vp8', 'vp9', 'prores']);
export const PrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const OutputSettingsSchema = z.object({
  format: OutputFormatSchema,
  codec: VideoCodecSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive(),
});

export const RenderProgressSchema = z.object({
  percent: z.number().min(0).max(100),
  current_frame: z.number().int().nonnegative(),
  total_frames: z.number().int().positive(),
  estimated_remaining_sec: z.number().int().nonnegative().nullable(),
});

export const RenderOutputSchema = z.object({
  url: z.string().url().nullable(),
  size_bytes: z.number().int().nonnegative().nullable(),
  duration_ms: z.number().int().nonnegative().nullable(),
});

export const RenderErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().nullable(),
});

export const RenderSchema = z.object({
  id: RenderIdSchema,
  project_id: ProjectIdSchema,
  composition_id: z.string(),
  status: RenderStatusSchema,
  input_props: z.record(z.unknown()),
  output_settings: OutputSettingsSchema,
  priority: PrioritySchema,
  progress: RenderProgressSchema,
  output: RenderOutputSchema.nullable(),
  error: RenderErrorSchema.nullable(),
  created_at: ISO8601Schema,
  started_at: ISO8601Schema.nullable(),
  completed_at: ISO8601Schema.nullable(),
});

// Input props validation for CaptionedVideo composition
export const CaptionedVideoInputPropsSchema = z.object({
  videoSrc: z.union([z.string().url(), z.string().startsWith('asset://')]).optional(),
  captions: z.union([
    z.string().url(),
    z.string().startsWith('asset://'),
    z.array(CaptionSegmentSchema),
  ]),
  captionStyle: CaptionStyleSchema.optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const CreateRenderRequestSchema = z.object({
  composition_id: z.string().min(1),
  input_props: z.record(z.unknown()),
  output_settings: OutputSettingsSchema,
  priority: PrioritySchema.default('normal'),
});

export const RenderListResponseSchema = z.object({
  data: z.array(RenderSchema),
});

export const RenderOutputUrlResponseSchema = z.object({
  download_url: z.string().url(),
  expires_at: ISO8601Schema,
  size_bytes: z.number().int().nonnegative(),
  duration_ms: z.number().int().nonnegative(),
});

// ============================================================================
// Automation Schemas
// ============================================================================

export const WebhookTriggerConfigSchema = z.object({
  secret_header: z.string().min(1).optional(),
  allowed_ips: z.array(z.string().ip()).optional(),
});

export const ScheduleTriggerConfigSchema = z.object({
  cron: z.string().regex(/^([\*\d\/\-,]+\s){4}[\*\d\/\-,]+$/), // 5-part cron
  timezone: z.string().default('UTC'),
});

export const AssetUploadTriggerConfigSchema = z.object({
  asset_types: z.array(AssetTypeSchema).optional(),
});

export const AutomationTriggerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('webhook'),
    config: WebhookTriggerConfigSchema,
  }),
  z.object({
    type: z.literal('schedule'),
    config: ScheduleTriggerConfigSchema,
  }),
  z.object({
    type: z.literal('asset_upload'),
    config: AssetUploadTriggerConfigSchema,
  }),
]);

export const RenderActionConfigSchema = z.object({
  composition_id: z.string(),
  input_props_template: z.record(z.unknown()),
  output_settings_override: OutputSettingsSchema.partial().optional(),
});

export const NotificationActionConfigSchema = z.object({
  channel: z.enum(['email', 'webhook', 'slack']),
  target: z.string(),
  template: z.string().optional(),
});

export const AutomationActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('render'),
    config: RenderActionConfigSchema,
  }),
  z.object({
    type: z.literal('notify'),
    config: NotificationActionConfigSchema,
  }),
]);

export const AutomationSchema = z.object({
  id: AutomationIdSchema,
  project_id: ProjectIdSchema,
  name: z.string().min(1).max(255),
  enabled: z.boolean(),
  trigger: AutomationTriggerSchema,
  actions: z.array(AutomationActionSchema).min(1),
  created_at: ISO8601Schema,
  updated_at: ISO8601Schema,
  last_triggered_at: ISO8601Schema.nullable(),
  trigger_count: z.number().int().nonnegative(),
});

export const CreateAutomationRequestSchema = z.object({
  name: z.string().min(1).max(255),
  trigger: AutomationTriggerSchema,
  actions: z.array(AutomationActionSchema).min(1),
  enabled: z.boolean().default(true),
});

export const UpdateAutomationRequestSchema = CreateAutomationRequestSchema.partial();

export const TriggerAutomationRequestSchema = z.record(z.unknown());

export const TriggerAutomationResponseSchema = z.object({
  execution_id: z.string(),
});

export const AutomationListResponseSchema = z.object({
  data: z.array(AutomationSchema),
});

// ============================================================================
// Error Schemas (RFC 7807)
// ============================================================================

export const ValidationErrorSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
});

export const ProblemDetailsSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number().int().positive(),
  detail: z.string(),
  instance: z.string(),
  errors: z.array(ValidationErrorSchema).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type AssetId = z.infer<typeof AssetIdSchema>;
export type RenderId = z.infer<typeof RenderIdSchema>;
export type AutomationId = z.infer<typeof AutomationIdSchema>;

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;
export type CaptionSegment = z.infer<typeof CaptionSegmentSchema>;
export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;

export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;

export type AssetType = z.infer<typeof AssetTypeSchema>;
export type AssetStatus = z.infer<typeof AssetStatusSchema>;
export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type CreateAssetUploadRequest = z.infer<typeof CreateAssetUploadRequestSchema>;
export type CreateAssetUploadResponse = z.infer<typeof CreateAssetUploadResponseSchema>;
export type AssetListResponse = z.infer<typeof AssetListResponseSchema>;

export type RenderStatus = z.infer<typeof RenderStatusSchema>;
export type OutputFormat = z.infer<typeof OutputFormatSchema>;
export type VideoCodec = z.infer<typeof VideoCodecSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type OutputSettings = z.infer<typeof OutputSettingsSchema>;
export type RenderProgress = z.infer<typeof RenderProgressSchema>;
export type RenderOutput = z.infer<typeof RenderOutputSchema>;
export type RenderError = z.infer<typeof RenderErrorSchema>;
export type Render = z.infer<typeof RenderSchema>;
export type CaptionedVideoInputProps = z.infer<typeof CaptionedVideoInputPropsSchema>;
export type CreateRenderRequest = z.infer<typeof CreateRenderRequestSchema>;
export type RenderListResponse = z.infer<typeof RenderListResponseSchema>;
export type RenderOutputUrlResponse = z.infer<typeof RenderOutputUrlResponseSchema>;

export type WebhookTriggerConfig = z.infer<typeof WebhookTriggerConfigSchema>;
export type ScheduleTriggerConfig = z.infer<typeof ScheduleTriggerConfigSchema>;
export type AssetUploadTriggerConfig = z.infer<typeof AssetUploadTriggerConfigSchema>;
export type AutomationTrigger = z.infer<typeof AutomationTriggerSchema>;
export type RenderActionConfig = z.infer<typeof RenderActionConfigSchema>;
export type NotificationActionConfig = z.infer<typeof NotificationActionConfigSchema>;
export type AutomationAction = z.infer<typeof AutomationActionSchema>;
export type Automation = z.infer<typeof AutomationSchema>;
export type CreateAutomationRequest = z.infer<typeof CreateAutomationRequestSchema>;
export type UpdateAutomationRequest = z.infer<typeof UpdateAutomationRequestSchema>;
export type TriggerAutomationRequest = z.infer<typeof TriggerAutomationRequestSchema>;
export type TriggerAutomationResponse = z.infer<typeof TriggerAutomationResponseSchema>;
export type AutomationListResponse = z.infer<typeof AutomationListResponseSchema>;

export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

// ============================================================================
// Credit & User Type Exports
// ============================================================================

export type UserId = z.infer<typeof UserIdSchema>;
export type PlanTier = z.infer<typeof PlanTierSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserMeResponse = z.infer<typeof UserMeResponseSchema>;
export type VideoType = z.infer<typeof VideoTypeSchema>;
export type CalculateCostRequest = z.infer<typeof CalculateCostRequestSchema>;
export type CalculateCostResponse = z.infer<typeof CalculateCostResponseSchema>;
export type BuyCreditsRequest = z.infer<typeof BuyCreditsRequestSchema>;
export type BuyCreditsResponse = z.infer<typeof BuyCreditsResponseSchema>;
export type CreditTransaction = z.infer<typeof CreditTransactionSchema>;
