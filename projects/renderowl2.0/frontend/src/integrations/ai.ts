/**
 * AI Integration Service
 * Connects AI generation to the Timeline editor
 * 
 * Features:
 * - Generate scripts from prompts
 * - Generate voiceovers for scenes
 * - Search/generate images for scenes
 * - Convert AI output to Timeline clips
 */

import { 
  AIScript, 
  AIScriptScene, 
  AIGenerationRequest, 
  AIVoiceover,
  AIGeneratedAsset,
  TimelineTrack,
  TimelineClip,
  CaptionSegment 
} from '@/types/integration';
import { api } from '@/lib/api';
import { CaptionStyle } from '@/types/timeline';

// ============================================================================
// API Client for AI Services
// ============================================================================

const AI_API_BASE = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8080/api/v1/ai';

class AIServiceClient {
  private baseUrl: string;

  constructor(baseUrl: string = AI_API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Generate a script from a prompt
  async generateScript(request: AIGenerationRequest): Promise<AIScript> {
    return this.request('/scripts/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Generate voiceover for a scene
  async generateVoiceover(sceneId: string, text: string, voiceId: string): Promise<AIVoiceover> {
    return this.request('/voice/generate', {
      method: 'POST',
      body: JSON.stringify({ sceneId, text, voiceId }),
    });
  }

  // Generate images for a scene
  async generateImages(sceneId: string, prompt: string, count: number = 3): Promise<AIGeneratedAsset[]> {
    return this.request('/images/generate', {
      method: 'POST',
      body: JSON.stringify({ sceneId, prompt, count }),
    });
  }

  // Search stock images/videos
  async searchStock(query: string, type: 'image' | 'video', limit: number = 10): Promise<AIGeneratedAsset[]> {
    return this.request(`/stock/search?query=${encodeURIComponent(query)}&type=${type}&limit=${limit}`);
  }
}

export const aiService = new AIServiceClient();

// ============================================================================
// Script to Timeline Conversion
// ============================================================================

export interface ScriptToTimelineOptions {
  includeVoiceover: boolean;
  includeImages: boolean;
  captionStyle?: Partial<CaptionStyle>;
  defaultImageDuration?: number;
}

/**
 * Convert an AI-generated script to Timeline tracks
 */
export function scriptToTimeline(
  script: AIScript,
  options: ScriptToTimelineOptions
): { tracks: TimelineTrack[]; captionStyle: CaptionStyle } {
  const { 
    includeVoiceover, 
    includeImages, 
    captionStyle: customStyle,
    defaultImageDuration = 5 
  } = options;

  // Build video track clips from scenes
  const videoClips: TimelineClip[] = script.scenes.map((scene, index) => ({
    id: `scene-video-${scene.id}`,
    name: scene.title || `Scene ${index + 1}`,
    type: 'video',
    startTime: getSceneStartTime(script.scenes, index),
    duration: scene.durationSeconds || defaultImageDuration,
    trackId: '', // Will be set when added to track
    src: scene.suggestedImages?.[0] || scene.suggestedVideos?.[0],
    thumbnail: scene.suggestedImages?.[0],
  }));

  // Build audio track from voiceovers
  const audioClips: TimelineClip[] = includeVoiceover 
    ? script.scenes.map((scene, index) => ({
        id: `scene-audio-${scene.id}`,
        name: `Voice: ${scene.title || `Scene ${index + 1}`}`,
        type: 'audio',
        startTime: getSceneStartTime(script.scenes, index),
        duration: scene.durationSeconds || defaultImageDuration,
        trackId: '',
        src: undefined, // Will be populated after voice generation
      }))
    : [];

  // Build caption segments from narration
  const captionSegments: CaptionSegment[] = script.scenes.map((scene, index) => {
    const startTime = getSceneStartTime(script.scenes, index);
    return {
      startMs: startTime * 1000,
      endMs: (startTime + (scene.durationSeconds || defaultImageDuration)) * 1000,
      text: scene.narration,
      words: parseWords(scene.narration, startTime * 1000, scene.durationSeconds || defaultImageDuration),
    };
  });

  // Create tracks
  const tracks: TimelineTrack[] = [
    {
      id: 'track-video-1',
      name: 'Video',
      type: 'video',
      clips: videoClips,
      isMuted: false,
      isLocked: false,
      isVisible: true,
    },
  ];

  if (includeVoiceover && audioClips.length > 0) {
    tracks.push({
      id: 'track-audio-1',
      name: 'Voiceover',
      type: 'audio',
      clips: audioClips,
      isMuted: false,
      isLocked: false,
      isVisible: true,
    });
  }

  // Add captions as text track
  tracks.push({
    id: 'track-captions',
    name: 'Captions',
    type: 'video',
    clips: captionSegments.map((seg, i) => ({
      id: `caption-${i}`,
      name: `Caption ${i + 1}`,
      type: 'text',
      startTime: seg.startMs / 1000,
      duration: (seg.endMs - seg.startMs) / 1000,
      trackId: 'track-captions',
    })),
    isMuted: true,
    isLocked: true,
    isVisible: true,
  });

  // Default caption style
  const defaultCaptionStyle: CaptionStyle = {
    fontSize: 64,
    textColor: '#FFFFFF',
    highlightColor: '#FFD54A',
    highlightMode: 'fill',
    strokeWidth: 10,
    strokeColor: 'rgba(0,0,0,0.85)',
    backgroundOpacity: 0.35,
    maxCharsPerLine: 28,
    maxLines: 2,
    ...customStyle,
  };

  return { tracks, captionStyle: defaultCaptionStyle };
}

/**
 * Calculate the start time for a scene based on previous scenes
 */
function getSceneStartTime(scenes: AIScriptScene[], index: number): number {
  let time = 0;
  for (let i = 0; i < index; i++) {
    time += scenes[i].durationSeconds || 5;
  }
  return time;
}

/**
 * Parse narration text into word-level timestamps
 */
function parseWords(text: string, startMs: number, durationSeconds: number): Array<{
  startMs: number;
  endMs: number;
  word: string;
}> {
  const words = text.split(/\s+/).filter(Boolean);
  const durationMs = durationSeconds * 1000;
  const wordDuration = durationMs / words.length;

  return words.map((word, index) => ({
    startMs: startMs + index * wordDuration,
    endMs: startMs + (index + 1) * wordDuration,
    word,
  }));
}

// ============================================================================
// Voiceover Integration
// ============================================================================

export interface VoiceoverIntegration {
  voiceId: string;
  voiceName: string;
  previewUrl?: string;
}

export const AVAILABLE_VOICES: VoiceoverIntegration[] = [
  { voiceId: 'alloy', voiceName: 'Alloy (Neutral)' },
  { voiceId: 'echo', voiceName: 'Echo (Male)' },
  { voiceId: 'fable', voiceName: 'Fable (Male)' },
  { voiceId: 'onyx', voiceName: 'Onyx (Male)' },
  { voiceId: 'nova', voiceName: 'Nova (Female)' },
  { voiceId: 'shimmer', voiceName: 'Shimmer (Female)' },
];

/**
 * Generate voiceovers for all scenes in a script
 */
export async function generateVoiceoversForScript(
  script: AIScript,
  voiceId: string
): Promise<Map<string, AIVoiceover>> {
  const voiceovers = new Map<string, AIVoiceover>();

  for (const scene of script.scenes) {
    try {
      const voiceover = await aiService.generateVoiceover(
        scene.id,
        scene.narration,
        voiceId
      );
      voiceovers.set(scene.id, voiceover);
    } catch (error) {
      console.error(`Failed to generate voiceover for scene ${scene.id}:`, error);
    }
  }

  return voiceovers;
}

// ============================================================================
// Image Search Integration
// ============================================================================

/**
 * Search and assign images to script scenes
 */
export async function assignImagesToScenes(
  script: AIScript,
  searchProvider: 'pexels' | 'unsplash' | 'pixabay' = 'pexels'
): Promise<AIScript> {
  const updatedScenes = await Promise.all(
    script.scenes.map(async (scene) => {
      try {
        const searchQuery = scene.visualPrompt || scene.description || scene.title;
        const images = await aiService.searchStock(searchQuery, 'image', 5);
        
        return {
          ...scene,
          suggestedImages: images.map(img => img.url),
        };
      } catch (error) {
        console.error(`Failed to search images for scene ${scene.id}:`, error);
        return scene;
      }
    })
  );

  return {
    ...script,
    scenes: updatedScenes,
  };
}

// ============================================================================
// Export Integration Types
// ============================================================================

export interface AITimelineIntegration {
  script: AIScript;
  tracks: TimelineTrack[];
  captionStyle: CaptionStyle;
  voiceovers: Map<string, AIVoiceover>;
}
