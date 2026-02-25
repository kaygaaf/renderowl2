import {z} from 'zod';

// ============================================================================
// Renderowl Remotion API Contract
// ============================================================================
// This file defines the complete API contract between the backend and the
// Remotion renderer. All communication should use these schemas for type safety.
//
// Usage:
//   import {RenderRequestSchema, RenderResponseSchema} from './api-contract';
//   const request = RenderRequestSchema.parse(req.body);
// ============================================================================

// ----------------------------------------------------------------------------
// Caption Types
// ----------------------------------------------------------------------------

export const WordTimestampSchema = z.object({
  startMs: z.number().int().min(0).describe('Word start time in milliseconds'),
  endMs: z.number().int().min(0).describe('Word end time in milliseconds'),
  word: z.string().min(1).describe('The word text')
});

export const CaptionSegmentSchema = z.object({
  startMs: z.number().int().min(0).describe('Caption start time in milliseconds'),
  endMs: z.number().int().min(0).describe('Caption end time in milliseconds'),
  text: z.string().min(1).describe('Full caption text'),
  words: z.array(WordTimestampSchema).optional().describe('Optional word-level timestamps for karaoke-style highlighting')
});

export const HighlightModeSchema = z.enum(['color', 'pill', 'underline', 'glow', 'fill']);

export const WordEntryAnimationSchema = z.enum(['none', 'fade', 'pop', 'slideUp', 'scale'])
  .describe('Animation style for words as they appear');

export const CaptionStyleSchema = z.object({
  maxCharsPerLine: z.number().int().min(1).max(100).optional().default(28)
    .describe('Max characters per line before wrapping'),
  maxLines: z.number().int().min(1).max(5).optional().default(2)
    .describe('Maximum number of lines to show per caption'),
  fontFamily: z.string().optional().default('Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif')
    .describe('CSS font family stack'),
  fontSize: z.number().int().min(8).max(200).optional().default(64)
    .describe('Font size in pixels'),
  lineHeight: z.number().min(0.5).max(3).optional().default(1.2)
    .describe('Line height multiplier'),
  textColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().default('#FFFFFF')
    .describe('Normal text color (hex)'),
  highlightColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().default('#FFD54A')
    .describe('Active word highlight color (hex)'),
  strokeColor: z.string().optional().default('rgba(0,0,0,0.85)')
    .describe('Text stroke/shadow color'),
  strokeWidth: z.number().min(0).max(50).optional().default(10)
    .describe('Text stroke width in pixels'),
  backgroundColor: z.string().optional().default('#000000')
    .describe('Caption background color'),
  backgroundOpacity: z.number().min(0).max(1).optional().default(0.35)
    .describe('Caption background opacity (0-1)'),
  paddingX: z.number().int().min(0).max(100).optional().default(34)
    .describe('Horizontal padding in pixels'),
  paddingY: z.number().int().min(0).max(100).optional().default(18)
    .describe('Vertical padding in pixels'),
  borderRadius: z.number().int().min(0).max(100).optional().default(22)
    .describe('Border radius in pixels'),
  bottomOffset: z.number().int().min(0).max(500).optional().default(160)
    .describe('Distance from bottom in pixels'),
  highlightMode: HighlightModeSchema.optional().default('color')
    .describe('Per-word highlight style: color, pill, underline, or glow'),
  highlightTransitionMs: z.number().int().min(0).max(1000).optional().default(120)
    .describe('Animation duration for highlight transitions in ms'),
  highlightPillColor: z.string().optional()
    .describe('Background color for pill highlight mode (defaults to highlightColor with opacity)'),
  highlightScale: z.number().min(1).max(2).optional().default(1.05)
    .describe('Scale effect for active word (1.0 = no scale)'),
  wordEntryAnimation: WordEntryAnimationSchema.optional().default('fade')
    .describe('Entry animation for words as they appear: none, fade, pop, slideUp, or scale'),
  wordEntryDurationMs: z.number().int().min(0).max(1000).optional().default(200)
    .describe('Duration for word entry animation in milliseconds'),
  captionTransitionMs: z.number().int().min(0).max(1000).optional().default(150)
    .describe('Duration for caption segment crossfade transitions in milliseconds')
});

// ----------------------------------------------------------------------------
// Video Input Types
// ----------------------------------------------------------------------------

export const VideoNoneSchema = z.object({
  type: z.literal('none'),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().default('#000000')
    .describe('Solid background color when no video')
});

export const VideoFileSchema = z.object({
  type: z.literal('file'),
  path: z.string().min(1).describe('Absolute path to video file')
});

export const VideoUrlSchema = z.object({
  type: z.literal('url'),
  url: z.string().url().describe('Public URL to video file')
});

export const VideoInputSchema = z.union([VideoNoneSchema, VideoFileSchema, VideoUrlSchema]);

// ----------------------------------------------------------------------------
// Webhook Types
// ----------------------------------------------------------------------------

export const WebhookConfigSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  events: z.array(z.enum(['queued', 'started', 'progress', 'completed', 'failed'])).optional()
    .default(['completed', 'failed'])
});

// ----------------------------------------------------------------------------
// Settings Schema
// ----------------------------------------------------------------------------

export const SettingsSchema = z.object({
  width: z.number().int().min(100).max(4096).optional().default(1080)
    .describe('Output width in pixels'),
  height: z.number().int().min(100).max(4096).optional().default(1920)
    .describe('Output height in pixels'),
  fps: z.number().int().min(1).max(120).optional().default(30)
    .describe('Frames per second'),
  durationMs: z.number().int().min(100).optional()
    .describe('Override duration in ms (defaults to last caption end time)')
});

// ----------------------------------------------------------------------------
// Render Request/Response
// ----------------------------------------------------------------------------

export const RenderRequestSchema = z.object({
  // Job identification
  jobId: z.string().uuid().optional()
    .describe('Optional unique job ID (generated if not provided)'),

  // Caption data
  captions: z.array(CaptionSegmentSchema).min(1)
    .describe('Caption segments with timing and optional word-level timestamps'),

  // Video input - default to none with black background
  video: z.union([VideoNoneSchema, VideoFileSchema, VideoUrlSchema]).optional()
    .describe('Video input configuration'),

  // Caption styling
  style: CaptionStyleSchema.optional()
    .describe('Caption styling options'),

  // Output configuration
  output: z.object({
    path: z.string().min(1).describe('Absolute output path for rendered video'),
    format: z.enum(['mp4', 'webm']).optional().default('mp4')
      .describe('Output video format'),
    codec: z.enum(['h264', 'h265', 'vp8', 'vp9', 'prores']).optional().default('h264')
      .describe('Video codec')
  }),

  // Render settings
  settings: SettingsSchema.optional()
    .describe('Render settings'),

  // Webhook configuration for job lifecycle notifications
  webhook: WebhookConfigSchema.optional()
    .describe('Webhook URL and event configuration. Events: queued, started, progress, completed, failed')
});

// Success response
export const SuccessResponseSchema = z.object({
  status: z.literal('success'),
  jobId: z.string().uuid(),
  outputPath: z.string(),
  durationMs: z.number().int(),
  renderedFrames: z.number().int(),
  renderTimeMs: z.number().int()
});

// Error response
export const ErrorResponseSchema = z.object({
  status: z.literal('error'),
  jobId: z.string().uuid().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional()
  })
});

// Queued response
export const QueuedResponseSchema = z.object({
  status: z.literal('queued'),
  jobId: z.string().uuid(),
  queuePosition: z.number().int().optional(),
  estimatedStartMs: z.number().int().optional()
});

// Processing response
export const ProcessingResponseSchema = z.object({
  status: z.literal('processing'),
  jobId: z.string().uuid(),
  progress: z.object({
    framesRendered: z.number().int(),
    totalFrames: z.number().int(),
    percent: z.number().min(0).max(100)
  }),
  estimatedCompletionMs: z.number().int().optional()
});

export const RenderResponseSchema = z.union([
  SuccessResponseSchema,
  ErrorResponseSchema,
  QueuedResponseSchema,
  ProcessingResponseSchema
]);

// ----------------------------------------------------------------------------
// Health/Status Types
// ----------------------------------------------------------------------------

export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  capabilities: z.object({
    maxConcurrentRenders: z.number().int(),
    supportedCodecs: z.array(z.string()),
    supportedFormats: z.array(z.string())
  }),
  queue: z.object({
    pending: z.number().int(),
    active: z.number().int(),
    completed: z.number().int()
  })
});

// ----------------------------------------------------------------------------
// Type Exports
// ----------------------------------------------------------------------------

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;
export type CaptionSegment = z.infer<typeof CaptionSegmentSchema>;
export type HighlightMode = z.infer<typeof HighlightModeSchema>;
export type WordEntryAnimation = z.infer<typeof WordEntryAnimationSchema>;
export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;
export type VideoInput = z.infer<typeof VideoInputSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type RenderRequest = z.infer<typeof RenderRequestSchema>;
export type RenderResponse = z.infer<typeof RenderResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type QueuedResponse = z.infer<typeof QueuedResponseSchema>;
export type ProcessingResponse = z.infer<typeof ProcessingResponseSchema>;
export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
