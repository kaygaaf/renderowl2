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
export type {
  AIScriptScene,
  AIScript,
  AIVoiceover,
  AIGeneratedAsset,
  AIGenerationRequest,
  AITimelineIntegration,
  ScriptToTimelineOptions,
  VoiceoverIntegration,
} from './ai';

// Template Integration
export {
  templateService,
  BUILT_IN_TEMPLATES,
  useTemplates,
} from './templates';
export type {
  TemplateApplyResult,
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
export type {
  RemotionComposition,
  WebhookPayload,
} from './export';

// Asset Integration
export {
  assetService,
  uploadManager,
  assetLibrary,
  useAssetUpload,
  useAssetLibrary,
} from './assets';
export type {
  UploadTask,
  AssetLibraryFilters,
} from './assets';

// Orchestrator
export {
  orchestrator,
  useIntegration,
} from './orchestrator';
export type {
  ProjectContext,
  EditorState,
} from './orchestrator';
