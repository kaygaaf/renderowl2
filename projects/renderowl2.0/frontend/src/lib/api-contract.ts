/**
 * API Contract Types
 * Re-export from the renderowl-remotion project for type safety
 */

// Caption Types
export interface WordTimestamp {
  startMs: number;
  endMs: number;
  word: string;
}

export interface CaptionSegment {
  startMs: number;
  endMs: number;
  text: string;
  words?: WordTimestamp[];
}

export type HighlightMode = 'color' | 'pill' | 'underline' | 'glow' | 'fill';
export type WordEntryAnimation = 'none' | 'fade' | 'pop' | 'slideUp' | 'scale';

export interface CaptionStyle {
  maxCharsPerLine?: number;
  maxLines?: number;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  textColor?: string;
  highlightColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
  paddingX?: number;
  paddingY?: number;
  borderRadius?: number;
  bottomOffset?: number;
  highlightMode?: HighlightMode;
  highlightTransitionMs?: number;
  highlightPillColor?: string;
  highlightScale?: number;
  wordEntryAnimation?: WordEntryAnimation;
  wordEntryDurationMs?: number;
  captionTransitionMs?: number;
}

// Video Input Types
export interface VideoNone {
  type: 'none';
  backgroundColor?: string;
}

export interface VideoFile {
  type: 'file';
  path: string;
}

export interface VideoUrl {
  type: 'url';
  url: string;
}

export type VideoInput = VideoNone | VideoFile | VideoUrl;

// Webhook Types
export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  events?: Array<'queued' | 'started' | 'progress' | 'completed' | 'failed'>;
}

// Settings
export interface Settings {
  width?: number;
  height?: number;
  fps?: number;
  durationMs?: number;
}

// Render Request/Response
export interface RenderRequest {
  jobId?: string;
  captions: CaptionSegment[];
  video?: VideoInput;
  style?: CaptionStyle;
  output: {
    path: string;
    format?: 'mp4' | 'webm';
    codec?: 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores';
  };
  settings?: Settings;
  webhook?: WebhookConfig;
}

export interface SuccessResponse {
  status: 'success';
  jobId: string;
  outputPath: string;
  durationMs: number;
  renderedFrames: number;
  renderTimeMs: number;
}

export interface ErrorResponse {
  status: 'error';
  jobId?: string;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface QueuedResponse {
  status: 'queued';
  jobId: string;
  queuePosition?: number;
  estimatedStartMs?: number;
}

export interface ProcessingResponse {
  status: 'processing';
  jobId: string;
  progress: {
    framesRendered: number;
    totalFrames: number;
    percent: number;
  };
  estimatedCompletionMs?: number;
}

export type RenderResponse = 
  | SuccessResponse 
  | ErrorResponse 
  | QueuedResponse 
  | ProcessingResponse;

// Health Response
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  capabilities: {
    maxConcurrentRenders: number;
    supportedCodecs: string[];
    supportedFormats: string[];
  };
  queue: {
    pending: number;
    active: number;
    completed: number;
  };
}
