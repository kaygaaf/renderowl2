/**
 * Template Integration Service
 * Connects Templates to the Timeline Editor
 * 
 * Features:
 * - Load and apply templates
 * - Pre-populate timeline with template tracks
 * - Apply template styles to captions
 * - Variable substitution
 */

import type { 
  Template, 
  TemplateVariable, 
  TemplateApplyResult,
  TimelineTrack, 
  TimelineClip,
  CaptionStyle,
  Asset 
} from '@/types';

// ============================================================================
// Built-in Templates
// ============================================================================

export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'youtube-short',
    name: 'YouTube Short',
    description: 'Optimized for YouTube Shorts - 9:16 vertical format with bold captions',
    category: 'social',
    thumbnailUrl: '/templates/youtube-short-thumb.jpg',
    isDefault: true,
    isPremium: false,
    style: {
      fontSize: 72,
      textColor: '#FFFFFF',
      highlightColor: '#FFD54A',
      highlightMode: 'fill',
      strokeWidth: 12,
      strokeColor: 'rgba(0,0,0,0.9)',
      backgroundOpacity: 0,
      maxCharsPerLine: 24,
      maxLines: 2,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      bottomOffset: 180,
    },
    defaultTracks: [
      {
        type: 'video',
        name: 'Main Video',
        clips: [],
      },
      {
        type: 'audio',
        name: 'Voiceover',
        clips: [],
      },
    ],
    variables: [
      {
        key: 'captionStyle',
        type: 'select',
        label: 'Caption Style',
        default: 'fill',
        options: ['fill', 'pill', 'underline', 'glow'],
        required: false,
      },
      {
        key: 'accentColor',
        type: 'color',
        label: 'Accent Color',
        default: '#FFD54A',
        required: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tiktok-viral',
    name: 'TikTok Viral',
    description: 'High-energy TikTok style with pop animations and bright colors',
    category: 'social',
    thumbnailUrl: '/templates/tiktok-viral-thumb.jpg',
    isDefault: false,
    isPremium: false,
    style: {
      fontSize: 80,
      textColor: '#FFFFFF',
      highlightColor: '#FE2C55',
      highlightMode: 'pill',
      highlightPillColor: 'rgba(254, 44, 85, 0.4)',
      strokeWidth: 0,
      backgroundOpacity: 0,
      maxCharsPerLine: 20,
      maxLines: 2,
      fontFamily: 'Arial Black, system-ui, sans-serif',
      bottomOffset: 200,
      wordEntryAnimation: 'pop',
      wordEntryDurationMs: 300,
    },
    defaultTracks: [
      {
        type: 'video',
        name: 'Main Video',
        clips: [],
      },
      {
        type: 'audio',
        name: 'Voiceover',
        clips: [],
      },
      {
        type: 'audio',
        name: 'Background Music',
        clips: [],
      },
    ],
    variables: [
      {
        key: 'primaryColor',
        type: 'color',
        label: 'Primary Color',
        default: '#FE2C55',
        required: false,
      },
      {
        key: 'includeWatermark',
        type: 'boolean',
        label: 'Include Watermark',
        default: true,
        required: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'instagram-reel',
    name: 'Instagram Reel',
    description: 'Clean, aesthetic style perfect for Instagram',
    category: 'social',
    thumbnailUrl: '/templates/instagram-reel-thumb.jpg',
    isDefault: false,
    isPremium: false,
    style: {
      fontSize: 64,
      textColor: '#FFFFFF',
      highlightColor: '#E1306C',
      highlightMode: 'underline',
      strokeWidth: 8,
      strokeColor: 'rgba(0,0,0,0.7)',
      backgroundOpacity: 0.2,
      backgroundColor: '#000000',
      borderRadius: 12,
      maxCharsPerLine: 26,
      maxLines: 2,
      fontFamily: 'Inter, system-ui, sans-serif',
      bottomOffset: 160,
    },
    defaultTracks: [
      {
        type: 'video',
        name: 'Main Video',
        clips: [],
      },
      {
        type: 'audio',
        name: 'Voiceover',
        clips: [],
      },
    ],
    variables: [
      {
        key: 'backgroundOverlay',
        type: 'boolean',
        label: 'Dark Overlay',
        default: true,
        required: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'podcast-minimal',
    name: 'Podcast Clip',
    description: 'Minimal style for podcast excerpts with waveform visualization',
    category: 'podcast',
    thumbnailUrl: '/templates/podcast-minimal-thumb.jpg',
    isDefault: false,
    isPremium: true,
    style: {
      fontSize: 56,
      textColor: '#F5F5F5',
      highlightColor: '#6366F1',
      highlightMode: 'color',
      strokeWidth: 6,
      strokeColor: 'rgba(0,0,0,0.8)',
      backgroundOpacity: 0.4,
      backgroundColor: '#1a1a2e',
      borderRadius: 16,
      maxCharsPerLine: 32,
      maxLines: 3,
      fontFamily: 'Georgia, serif',
      bottomOffset: 140,
    },
    defaultTracks: [
      {
        type: 'video',
        name: 'Waveform Background',
        clips: [
          {
            id: 'waveform-placeholder',
            name: 'Waveform',
            type: 'video',
            startTime: 0,
            duration: 60,
          },
        ],
      },
      {
        type: 'audio',
        name: 'Podcast Audio',
        clips: [],
      },
    ],
    introClip: {
      src: '/templates/podcast-intro.mp4',
      duration: 3,
      type: 'video',
    },
    variables: [
      {
        key: 'showWaveform',
        type: 'boolean',
        label: 'Show Waveform',
        default: true,
        required: false,
      },
      {
        key: 'podcastName',
        type: 'string',
        label: 'Podcast Name',
        default: 'My Podcast',
        required: true,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Clear, readable style for educational content',
    category: 'education',
    thumbnailUrl: '/templates/educational-thumb.jpg',
    isDefault: false,
    isPremium: false,
    style: {
      fontSize: 60,
      textColor: '#FFFFFF',
      highlightColor: '#10B981',
      highlightMode: 'fill',
      strokeWidth: 10,
      strokeColor: 'rgba(0,0,0,0.85)',
      backgroundOpacity: 0.1,
      backgroundColor: '#000000',
      borderRadius: 8,
      maxCharsPerLine: 30,
      maxLines: 3,
      fontFamily: 'Inter, system-ui, sans-serif',
      bottomOffset: 150,
      captionTransitionMs: 200,
    },
    defaultTracks: [
      {
        type: 'video',
        name: 'Screen Recording',
        clips: [],
      },
      {
        type: 'video',
        name: 'Camera',
        clips: [],
      },
      {
        type: 'audio',
        name: 'Voiceover',
        clips: [],
      },
    ],
    variables: [
      {
        key: 'highlightColor',
        type: 'color',
        label: 'Highlight Color',
        default: '#10B981',
        required: false,
      },
      {
        key: 'codeHighlighting',
        type: 'boolean',
        label: 'Code Highlighting',
        default: false,
        required: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Movie trailer style with dramatic captions',
    category: 'cinematic',
    thumbnailUrl: '/templates/cinematic-thumb.jpg',
    isDefault: false,
    isPremium: true,
    style: {
      fontSize: 68,
      textColor: '#E5E5E5',
      highlightColor: '#DC2626',
      highlightMode: 'glow',
      strokeWidth: 4,
      strokeColor: 'rgba(0,0,0,0.9)',
      backgroundOpacity: 0.3,
      backgroundColor: '#000000',
      borderRadius: 4,
      maxCharsPerLine: 24,
      maxLines: 2,
      fontFamily: 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',
      bottomOffset: 170,
      highlightTransitionMs: 200,
    },
    defaultTracks: [
      {
        type: 'video',
        name: 'Cinematic Footage',
        clips: [],
      },
      {
        type: 'audio',
        name: 'Dramatic Audio',
        clips: [],
      },
    ],
    introClip: {
      src: '/templates/cinematic-intro.mp4',
      duration: 5,
      type: 'video',
    },
    outroClip: {
      src: '/templates/cinematic-outro.mp4',
      duration: 3,
      type: 'video',
    },
    variables: [
      {
        key: 'dramaticEffect',
        type: 'select',
        label: 'Dramatic Effect',
        default: 'none',
        options: ['none', 'shake', 'flash', 'zoom'],
        required: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ============================================================================
// Template Service
// ============================================================================

class TemplateService {
  private templates: Map<string, Template> = new Map();

  constructor() {
    // Load built-in templates
    BUILT_IN_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): Template[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  /**
   * Get default template
   */
  getDefaultTemplate(): Template {
    return (
      this.getAllTemplates().find(t => t.isDefault) || 
      BUILT_IN_TEMPLATES[0]
    );
  }

  /**
   * Register a custom template
   */
  registerTemplate(template: Template): void {
    this.templates.set(template.id, template);
  }

  /**
   * Apply a template to create timeline tracks
   */
  applyTemplate(
    templateId: string,
    variables: Record<string, unknown> = {}
  ): TemplateApplyResult {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Apply variable substitutions to style
    const style = applyVariablesToStyle(template.style, variables);

    // Create tracks from template
    const tracks: TimelineTrack[] = template.defaultTracks.map((trackConfig, index) => ({
      id: `track-${trackConfig.type}-${index}`,
      name: trackConfig.name,
      type: trackConfig.type,
      clips: trackConfig.clips?.map((clipConfig, clipIndex) => ({
        id: `clip-${index}-${clipIndex}`,
        name: clipConfig.name || `Clip ${clipIndex + 1}`,
        type: clipConfig.type || 'video',
        startTime: clipConfig.startTime || 0,
        duration: clipConfig.duration || 5,
        trackId: `track-${trackConfig.type}-${index}`,
        src: clipConfig.src,
      })) || [],
      isMuted: false,
      isLocked: false,
      isVisible: true,
    }));

    // Add intro clip if present
    if (template.introClip) {
      const introTrack = tracks.find(t => t.type === 'video');
      if (introTrack) {
        introTrack.clips.unshift({
          id: 'template-intro',
          name: 'Intro',
          type: template.introClip.type,
          startTime: 0,
          duration: template.introClip.duration,
          trackId: introTrack.id,
          src: template.introClip.src,
        });

        // Shift other clips
        introTrack.clips.forEach((clip, index) => {
          if (index > 0) {
            clip.startTime += template.introClip!.duration;
          }
        });
      }
    }

    // Add outro clip if present
    if (template.outroClip) {
      const outroTrack = tracks.find(t => t.type === 'video');
      if (outroTrack) {
        const totalDuration = outroTrack.clips.reduce(
          (sum, clip) => Math.max(sum, clip.startTime + clip.duration),
          0
        );
        outroTrack.clips.push({
          id: 'template-outro',
          name: 'Outro',
          type: template.outroClip.type,
          startTime: totalDuration,
          duration: template.outroClip.duration,
          trackId: outroTrack.id,
          src: template.outroClip.src,
        });
      }
    }

    return {
      tracks,
      style,
      appliedVariables: variables,
    };
  }

  /**
   * Validate template variables
   */
  validateVariables(
    templateId: string,
    variables: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const template = this.getTemplate(templateId);
    if (!template) {
      return { valid: false, errors: ['Template not found'] };
    }

    const errors: string[] = [];

    for (const variable of template.variables) {
      if (variable.required && !(variable.key in variables)) {
        errors.push(`Required variable '${variable.key}' is missing`);
      }

      const value = variables[variable.key];
      if (value !== undefined) {
        // Type validation
        if (variable.type === 'number' && typeof value !== 'number') {
          errors.push(`Variable '${variable.key}' must be a number`);
        }
        if (variable.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Variable '${variable.key}' must be a boolean`);
        }
        if (variable.type === 'select' && variable.options && !variable.options.includes(String(value))) {
          errors.push(`Variable '${variable.key}' must be one of: ${variable.options.join(', ')}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get categories
   */
  getCategories(): string[] {
    const categories = new Set(this.getAllTemplates().map(t => t.category));
    return Array.from(categories);
  }
}

/**
 * Apply variable substitutions to caption style
 */
function applyVariablesToStyle(
  style: CaptionStyle,
  variables: Record<string, unknown>
): CaptionStyle {
  const newStyle = { ...style };

  if (variables.accentColor) {
    newStyle.highlightColor = String(variables.accentColor);
  }
  if (variables.primaryColor) {
    newStyle.highlightColor = String(variables.primaryColor);
  }
  if (variables.highlightColor) {
    newStyle.highlightColor = String(variables.highlightColor);
  }
  if (variables.captionStyle) {
    newStyle.highlightMode = variables.captionStyle as CaptionStyle['highlightMode'];
  }

  return newStyle;
}

// Export singleton
export const templateService = new TemplateService();

// ============================================================================
// Template Hooks (for React)
// ============================================================================

import { useState, useCallback } from 'react';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>(() => 
    templateService.getAllTemplates()
  );

  const applyTemplate = useCallback((templateId: string, variables?: Record<string, unknown>) => {
    return templateService.applyTemplate(templateId, variables);
  }, []);

  const getTemplate = useCallback((templateId: string) => {
    return templateService.getTemplate(templateId);
  }, []);

  const getCategories = useCallback(() => {
    return templateService.getCategories();
  }, []);

  return {
    templates,
    applyTemplate,
    getTemplate,
    getCategories,
  };
}
