/**
 * Integration Module Exports
 * Main entry point for all Renderowl 2.0 integrations
 */

// AI Integration
export {
  aiService,
  scriptToTimeline,
  generateVoiceoversForScript,
  assignImagesToScenes,
  AVAILABLE_VOICES,
} from './ai';

// Template Integration
export {
  templateService,
  BUILT_IN_TEMPLATES,
  useTemplates,
} from './templates';

// Export Integration
export {
  exportService,
  timelineToRemotionRequest,
  getExportPreset,
  getAllExportPresets,
  handleRenderWebhook,
  useExport,
  EXPORT_PRESETS,
} from './export';

// Asset Integration
export {
  assetService,
  uploadManager,
  assetLibrary,
  useAssetUpload,
  useAssetLibrary,
} from './assets';

// Orchestrator
export {
  orchestrator,
  useIntegration,
} from './orchestrator';

// Types - exported from @/types
export type {
  // AI
  AIScriptScene,
  AIScript,
  AIVoiceover,
  AIGeneratedAsset,
  AIGenerationRequest,
  
  // Templates
  Template,
  TemplateVariable,
  TemplateClipConfig,
  TemplateWatermarkConfig,
  TemplateApplyResult,
  
  // Assets
  Asset,
  AssetType,
  AssetStatus,
  AssetUploadRequest,
  AssetUploadResponse,
  UploadTask,
  AssetLibraryFilters,
  
  // Export
  ExportFormat,
  ExportCodec,
  ExportStatus,
  ExportSettings,
  ExportJob,
  ExportRequest,
  RemotionComposition,
  WebhookPayload,
  
  // User Flow
  UserFlowStep,
  UserFlowState,
  ProjectContext,
  EditorState,
  
  // Timeline
  TimelineClip,
  TimelineTrack,
  TimelineState,
  TimelineActions,
  CaptionStyle,
  HighlightMode,
  WordEntryAnimation,
} from '@/types';
