/**
 * Core types for Renderowl 2.0 integrations
 * Connects AI, Timeline, Templates, Assets, and Export
 */

import type { TimelineTrack, TimelineClip, CaptionStyle } from './timeline';

// Re-export for convenience
export type { TimelineTrack, TimelineClip, CaptionStyle };
export type { TimelineState, TimelineActions } from './timeline';
export type { HighlightMode, WordEntryAnimation } from './timeline';

// Caption Segment (from api-contract)
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

// ============================================================================
// AI Integration Types
// ============================================================================

export interface AIScriptScene {
  id: string;
  index: number;
  title: string;
  description: string;
  narration: string;
  visualPrompt: string;
  durationSeconds: number;
  suggestedImages?: string[];
  suggestedVideos?: string[];
}

export interface AIScript {
  id: string;
  title: string;
  description: string;
  scenes: AIScriptScene[];
  totalDuration: number;
  tone: string;
  targetAudience: string;
  createdAt: string;
}

export interface AIVoiceover {
  id: string;
  scriptId: string;
  sceneId: string;
  url: string;
  durationMs: number;
  voiceId: string;
  voiceName: string;
}

export interface AIGeneratedAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string;
  prompt: string;
  sceneId: string;
}

export interface AIGenerationRequest {
  prompt: string;
  videoType: 'youtube' | 'tiktok' | 'instagram' | 'custom';
  durationSeconds: number;
  tone: string;
  targetAudience?: string;
  includeVoiceover: boolean;
  voiceId?: string;
  imageStyle?: string;
}

// ============================================================================
// Template Types
// ============================================================================

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  previewUrl?: string;
  isDefault: boolean;
  isPremium: boolean;
  
  // Style configuration
  style: CaptionStyle;
  
  // Timeline configuration
  defaultTracks: Array<{
    type: 'video' | 'audio';
    name: string;
    clips: Array<Partial<TimelineClip>>;
  }>;
  
  // Template variables
  variables: TemplateVariable[];
  
  // Pre-populated content
  introClip?: TemplateClipConfig;
  outroClip?: TemplateClipConfig;
  watermark?: TemplateWatermarkConfig;
  
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariable {
  key: string;
  type: 'string' | 'number' | 'color' | 'boolean' | 'select' | 'image' | 'video';
  label: string;
  description?: string;
  default?: unknown;
  options?: string[];
  required: boolean;
}

export interface TemplateClipConfig {
  src: string;
  duration: number;
  type: 'video' | 'image';
}

export interface TemplateWatermarkConfig {
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  size: number;
}

export interface TemplateApplyResult {
  tracks: TimelineTrack[];
  style: CaptionStyle;
  appliedVariables: Record<string, unknown>;
}

// ============================================================================
// Asset Types
// ============================================================================

export type AssetType = 'video' | 'audio' | 'image' | 'font' | 'template';
export type AssetStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface Asset {
  id: string;
  projectId: string;
  type: AssetType;
  name: string;
  description?: string;
  status: AssetStatus;
  sizeBytes: number;
  mimeType: string;
  
  // Metadata
  metadata?: {
    width?: number;
    height?: number;
    durationSeconds?: number;
    codec?: string;
    fps?: number;
  };
  
  // URLs
  urls: {
    original: string;
    thumbnail?: string;
    preview?: string;
    cdn?: string;
  };
  
  // Tags for organization
  tags: string[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface AssetUploadRequest {
  name: string;
  type: AssetType;
  file: File;
  description?: string;
  tags?: string[];
}

export interface AssetUploadResponse {
  asset: Asset;
  uploadUrl: string;
  uploadFields?: Record<string, string>;
  expiresAt: string;
}

// ============================================================================
// Export/Render Types
// ============================================================================

export type ExportFormat = 'mp4' | 'webm' | 'mov';
export type ExportCodec = 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores';
export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ExportSettings {
  format: ExportFormat;
  codec: ExportCodec;
  width: number;
  height: number;
  fps: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface ExportJob {
  id: string;
  timelineId: string;
  userId: string;
  status: ExportStatus;
  settings: ExportSettings;
  
  // Progress
  progress: {
    percent: number;
    framesRendered: number;
    totalFrames: number;
    currentPhase: string;
  };
  
  // Output
  output?: {
    url: string;
    sizeBytes: number;
    durationMs: number;
  };
  
  // Error
  error?: {
    code: string;
    message: string;
  };
  
  // Timestamps
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ExportRequest {
  timelineId: string;
  settings: ExportSettings;
  webhookUrl?: string;
}

// ============================================================================
// Integration Events
// ============================================================================

export type IntegrationEventType = 
  | 'ai.script.generated'
  | 'ai.voice.generated'
  | 'ai.assets.generated'
  | 'template.applied'
  | 'asset.uploaded'
  | 'asset.processed'
  | 'export.started'
  | 'export.progress'
  | 'export.completed'
  | 'export.failed'
  | 'timeline.updated'
  | 'clip.added';

export interface IntegrationEvent<T = unknown> {
  type: IntegrationEventType;
  timestamp: string;
  data: T;
}

export type IntegrationEventHandler<T = unknown> = (event: IntegrationEvent<T>) => void | Promise<void>;

// ============================================================================
// User Flow Types
// ============================================================================

export type UserFlowStep = 
  | 'landing'
  | 'signup'
  | 'dashboard'
  | 'template-selection'
  | 'ai-generation'
  | 'editor'
  | 'voiceover'
  | 'export'
  | 'download';

export interface UserFlowState {
  currentStep: UserFlowStep;
  projectId?: string;
  timelineId?: string;
  templateId?: string;
  scriptId?: string;
  exportJobId?: string;
}

// ============================================================================
// Upload Types
// ============================================================================

export interface UploadTask {
  id: string;
  file: File;
  assetType: AssetType;
  projectId: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  asset?: Asset;
  error?: string;
}

export interface AssetLibraryFilters {
  type?: AssetType;
  status?: AssetStatus;
  search?: string;
  tags?: string[];
}

// ============================================================================
// Export Types
// ============================================================================

export interface RemotionComposition {
  id: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  videoSrc?: string;
  captions: CaptionSegment[];
  captionStyle: CaptionStyle;
}

export interface WebhookPayload {
  event: 'queued' | 'started' | 'progress' | 'completed' | 'failed';
  jobId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ============================================================================
// Orchestrator Types
// ============================================================================

export interface ProjectContext {
  projectId: string;
  timelineId: string;
  userId: string;
}

export interface EditorState {
  tracks: TimelineTrack[];
  captionStyle: CaptionStyle;
  currentTime: number;
  totalDuration: number;
}
