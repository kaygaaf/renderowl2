/**
 * Main Integration Orchestrator
 * Connects all components: AI → Templates → Timeline → Assets → Export
 * 
 * This is the central hub that manages the complete user flow:
 * Landing → Signup → Dashboard → Template/AI → Editor → Voiceover → Export → Download
 */

import { 
  AIScript, 
  AIGenerationRequest, 
  Template, 
  TimelineTrack, 
  ExportJob,
  ExportSettings,
  UserFlowStep,
  UserFlowState,
  Asset
} from '@/types/integration';
import { CaptionStyle } from '@/types/timeline';
import { aiService, scriptToTimeline, generateVoiceoversForScript } from './ai';
import { templateService, TemplateApplyResult } from './templates';
import { exportService, timelineToRemotionRequest, getExportPreset } from './export';
import { assetLibrary, uploadManager } from './assets';
import { useTimelineStore } from '@/store/timelineStore';

// ============================================================================
// Integration Orchestrator
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

class IntegrationOrchestrator {
  private flowState: UserFlowState = { currentStep: 'landing' };
  private listeners: Set<(state: UserFlowState) => void> = new Set();

  // ============================================================================
  // Flow State Management
  // ============================================================================

  /**
   * Get current flow state
   */
  getFlowState(): UserFlowState {
    return { ...this.flowState };
  }

  /**
   * Update flow state
   */
  private setStep(step: UserFlowStep, updates?: Partial<UserFlowState>): void {
    this.flowState = {
      ...this.flowState,
      currentStep: step,
      ...updates,
    };
    this.notifyListeners();
  }

  /**
   * Subscribe to flow state changes
   */
  subscribe(callback: (state: UserFlowState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getFlowState());
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const state = this.getFlowState();
    this.listeners.forEach(cb => cb(state));
  }

  // ============================================================================
  // Step 1: Dashboard → Template Selection
  // ============================================================================

  /**
   * Start creating a new project from template
   */
  async startFromTemplate(templateId: string, context: ProjectContext): Promise<EditorState> {
    this.setStep('template-selection', { 
      projectId: context.projectId,
      timelineId: context.timelineId,
      templateId 
    });

    // Apply template to create initial timeline state
    const result = templateService.applyTemplate(templateId);
    
    // Update timeline store
    const store = useTimelineStore.getState();
    
    // Set tracks
    result.tracks.forEach(track => {
      store.addTrack(track.type);
    });

    this.setStep('editor');

    return {
      tracks: result.tracks,
      captionStyle: result.style,
      currentTime: 0,
      totalDuration: this.calculateTotalDuration(result.tracks),
    };
  }

  /**
   * Start creating a new project from scratch (blank)
   */
  async startFromScratch(context: ProjectContext): Promise<EditorState> {
    this.setStep('editor', { 
      projectId: context.projectId,
      timelineId: context.timelineId 
    });

    // Get default template style but empty tracks
    const defaultTemplate = templateService.getDefaultTemplate();

    return {
      tracks: [],
      captionStyle: defaultTemplate.style,
      currentTime: 0,
      totalDuration: 60,
    };
  }

  // ============================================================================
  // Step 2: AI Generation → Timeline
  // ============================================================================

  /**
   * Generate content using AI and populate timeline
   */
  async generateWithAI(
    request: AIGenerationRequest,
    context: ProjectContext
  ): Promise<{ script: AIScript; editorState: EditorState }> {
    this.setStep('ai-generation', { 
      projectId: context.projectId,
      timelineId: context.timelineId 
    });

    try {
      // Step 1: Generate script
      const script = await aiService.generateScript(request);
      
      // Step 2: Generate voiceovers if requested
      let voiceovers: Map<string, any> = new Map();
      if (request.includeVoiceover && request.voiceId) {
        voiceovers = await generateVoiceoversForScript(script, request.voiceId);
      }

      // Step 3: Search for images if requested
      // This is handled in the scriptToTimeline function

      // Step 4: Convert script to timeline
      const { tracks, captionStyle } = scriptToTimeline(script, {
        includeVoiceover: request.includeVoiceover,
        includeImages: true,
      });

      // Step 5: Apply template style based on video type
      const templateMap: Record<string, string> = {
        'youtube': 'youtube-short',
        'tiktok': 'tiktok-viral',
        'instagram': 'instagram-reel',
      };
      
      const templateId = templateMap[request.videoType] || 'youtube-short';
      const templateResult = templateService.applyTemplate(templateId);

      const finalStyle = {
        ...templateResult.style,
        ...captionStyle,
      };

      this.setStep('editor', { scriptId: script.id });

      return {
        script,
        editorState: {
          tracks,
          captionStyle: finalStyle,
          currentTime: 0,
          totalDuration: script.totalDuration,
        },
      };
    } catch (error) {
      console.error('AI generation failed:', error);
      throw error;
    }
  }

  /**
   * Apply AI-generated script to existing timeline
   */
  async applyScriptToTimeline(
    script: AIScript,
    existingContext?: EditorState
  ): Promise<EditorState> {
    const { tracks, captionStyle } = scriptToTimeline(script, {
      includeVoiceover: true,
      includeImages: true,
      captionStyle: existingContext?.captionStyle,
    });

    // Merge with existing tracks if provided
    const mergedTracks = existingContext 
      ? this.mergeTracks(existingContext.tracks, tracks)
      : tracks;

    return {
      tracks: mergedTracks,
      captionStyle,
      currentTime: 0,
      totalDuration: Math.max(
        existingContext?.totalDuration || 0,
        script.totalDuration
      ),
    };
  }

  // ============================================================================
  // Step 3: Editor Operations
  // ============================================================================

  /**
   * Add AI-generated voiceover to timeline
   */
  async addVoiceoverToTimeline(
    text: string,
    voiceId: string,
    trackId: string,
    startTime: number,
    context: ProjectContext
  ): Promise<{ clipId: string; audioUrl: string; duration: number }> {
    this.setStep('voiceover');

    try {
      // Generate voiceover
      const voiceover = await aiService.generateVoiceover(
        `clip-${Date.now()}`,
        text,
        voiceId
      );

      // Add to timeline store
      const store = useTimelineStore.getState();
      const clipId = `voiceover-${Date.now()}`;

      store.addClip(trackId, {
        name: `Voice: ${text.substring(0, 30)}...`,
        type: 'audio',
        startTime,
        duration: voiceover.durationMs / 1000,
        src: voiceover.url,
        trackId,
      });

      return {
        clipId,
        audioUrl: voiceover.url,
        duration: voiceover.durationMs / 1000,
      };
    } finally {
      this.setStep('editor');
    }
  }

  /**
   * Search and add stock media to timeline
   */
  async addStockMediaToTimeline(
    query: string,
    type: 'image' | 'video',
    trackId: string,
    startTime: number,
    duration: number
  ): Promise<Asset> {
    const assets = await aiService.searchStock(query, type, 5);
    
    if (assets.length === 0) {
      throw new Error('No assets found for query');
    }

    const selectedAsset = assets[0];
    
    // Add to timeline
    const store = useTimelineStore.getState();
    store.addClip(trackId, {
      name: `${type === 'image' ? 'Image' : 'Video'}: ${query}`,
      type,
      startTime,
      duration,
      src: selectedAsset.url,
      thumbnail: selectedAsset.thumbnailUrl,
      trackId,
    });

    return selectedAsset as Asset;
  }

  /**
   * Upload and add media to timeline
   */
  async uploadAndAddToTimeline(
    file: File,
    trackId: string,
    startTime: number,
    projectId: string
  ): Promise<{ asset: Asset; clipId: string }> {
    const type: 'image' | 'video' | 'audio' = file.type.startsWith('video/') 
      ? 'video' 
      : file.type.startsWith('audio/')
      ? 'audio'
      : 'image';

    // Upload asset
    const asset = await uploadManager.upload(
      { name: file.name, type, file },
      projectId
    );

    // Add to timeline
    const store = useTimelineStore.getState();
    const clipId = `upload-${Date.now()}`;

    store.addClip(trackId, {
      name: file.name,
      type,
      startTime,
      duration: asset.metadata?.durationSeconds || 5,
      src: asset.urls.original,
      thumbnail: asset.urls.thumbnail,
      trackId,
    });

    return { asset, clipId };
  }

  // ============================================================================
  // Step 4: Export
  // ============================================================================

  /**
   * Start export process
   */
  async startExport(
    editorState: EditorState,
    presetName: string,
    context: ProjectContext,
    webhookUrl?: string
  ): Promise<ExportJob> {
    this.setStep('export');

    const settings = getExportPreset(presetName);
    
    // Create render request
    const request = timelineToRemotionRequest(
      context.timelineId,
      editorState.tracks,
      editorState.captionStyle,
      settings,
      webhookUrl
    );

    // Submit render job
    const job = await exportService.submitRender(request);
    
    this.setStep('export', { exportJobId: job.id });

    return job;
  }

  /**
   * Wait for export and get download URL
   */
  async waitForExport(
    jobId: string,
    onProgress?: (progress: { percent: number; phase: string }) => void
  ): Promise<{ downloadUrl: string; sizeBytes: number }> {
    const job = await exportService.waitForCompletion(jobId, {
      onProgress: (progress) => {
        onProgress?.({
          percent: progress.percent,
          phase: progress.currentPhase,
        });
      },
    });

    this.setStep('download');

    return {
      downloadUrl: job.output!.url,
      sizeBytes: job.output!.sizeBytes,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Calculate total duration from tracks
   */
  private calculateTotalDuration(tracks: TimelineTrack[]): number {
    return tracks.reduce((max, track) => {
      const trackEnd = track.clips.reduce((end, clip) => 
        Math.max(end, clip.startTime + clip.duration), 0
      );
      return Math.max(max, trackEnd);
    }, 0);
  }

  /**
   * Merge tracks from different sources
   */
  private mergeTracks(
    existing: TimelineTrack[],
    newTracks: TimelineTrack[]
  ): TimelineTrack[] {
    const merged = [...existing];

    newTracks.forEach(newTrack => {
      const existingTrack = merged.find(t => t.type === newTrack.type);
      if (existingTrack) {
        existingTrack.clips.push(...newTrack.clips);
        existingTrack.clips.sort((a, b) => a.startTime - b.startTime);
      } else {
        merged.push(newTrack);
      }
    });

    return merged;
  }

  /**
   * Get available templates for the current user
   */
  getAvailableTemplates(): Template[] {
    return templateService.getAllTemplates();
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): Template | undefined {
    return templateService.getTemplate(templateId);
  }
}

// Export singleton
export const orchestrator = new IntegrationOrchestrator();

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useIntegration() {
  const [flowState, setFlowState] = useState<UserFlowState>(() => 
    orchestrator.getFlowState()
  );

  useEffect(() => {
    return orchestrator.subscribe(setFlowState);
  }, []);

  const startFromTemplate = useCallback(
    (templateId: string, context: ProjectContext) => 
      orchestrator.startFromTemplate(templateId, context),
    []
  );

  const startFromScratch = useCallback(
    (context: ProjectContext) => 
      orchestrator.startFromScratch(context),
    []
  );

  const generateWithAI = useCallback(
    (request: AIGenerationRequest, context: ProjectContext) => 
      orchestrator.generateWithAI(request, context),
    []
  );

  const addVoiceover = useCallback(
    (text: string, voiceId: string, trackId: string, startTime: number, context: ProjectContext) => 
      orchestrator.addVoiceoverToTimeline(text, voiceId, trackId, startTime, context),
    []
  );

  const startExport = useCallback(
    (editorState: EditorState, presetName: string, context: ProjectContext, webhookUrl?: string) => 
      orchestrator.startExport(editorState, presetName, context, webhookUrl),
    []
  );

  const getTemplates = useCallback(() => 
    orchestrator.getAvailableTemplates(),
  []);

  return {
    flowState,
    startFromTemplate,
    startFromScratch,
    generateWithAI,
    addVoiceover,
    startExport,
    getTemplates,
  };
}
