/**
 * Video Export Pipeline Integration
 * Connects Timeline to Remotion Renderer
 * 
 * Features:
 * - Convert timeline to Remotion composition
 * - Submit render jobs
 * - Track render progress
 * - Handle webhooks for completion
 * - Download exported videos
 */

import { 
  ExportJob, 
  ExportSettings, 
  ExportRequest, 
  ExportStatus,
  TimelineTrack,
  CaptionSegment,
  Asset
} from '@/types/integration';
import { CaptionStyle, TimelineClip } from '@/types/timeline';

// ============================================================================
// Export API Client
// ============================================================================

const EXPORT_API_BASE = process.env.NEXT_PUBLIC_EXPORT_API_URL || 'http://localhost:3000';

class ExportServiceClient {
  private baseUrl: string;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private progressCallbacks: Map<string, (progress: ExportJob['progress']) => void> = new Map();
  private completionCallbacks: Map<string, (job: ExportJob) => void> = new Map();

  constructor(baseUrl: string = EXPORT_API_BASE) {
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

  /**
   * Submit a render job
   */
  async submitRender(request: ExportRequest): Promise<ExportJob> {
    return this.request('/render', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<ExportJob> {
    return this.request(`/render/${jobId}`);
  }

  /**
   * Cancel a render job
   */
  async cancelRender(jobId: string): Promise<void> {
    await this.request(`/render/${jobId}/cancel`, {
      method: 'POST',
    });
  }

  /**
   * Check server health
   */
  async health(): Promise<{ status: string; queue: { pending: number; active: number } }> {
    return this.request('/health');
  }

  /**
   * Start polling for job progress
   */
  startPolling(
    jobId: string,
    callbacks: {
      onProgress?: (progress: ExportJob['progress']) => void;
      onComplete?: (job: ExportJob) => void;
      onError?: (error: Error) => void;
      intervalMs?: number;
    }
  ): void {
    const { onProgress, onComplete, onError, intervalMs = 1000 } = callbacks;

    // Stop any existing polling
    this.stopPolling(jobId);

    // Store callbacks
    if (onProgress) this.progressCallbacks.set(jobId, onProgress);
    if (onComplete) this.completionCallbacks.set(jobId, onComplete);

    const poll = async () => {
      try {
        const job = await this.getJobStatus(jobId);

        // Call progress callback
        const progressCallback = this.progressCallbacks.get(jobId);
        if (progressCallback && job.progress) {
          progressCallback(job.progress);
        }

        // Check if complete
        if (job.status === 'completed') {
          const completeCallback = this.completionCallbacks.get(jobId);
          if (completeCallback) completeCallback(job);
          this.stopPolling(jobId);
        }

        // Check if failed
        if (job.status === 'failed') {
          if (onError) onError(new Error(job.error?.message || 'Render failed'));
          this.stopPolling(jobId);
        }
      } catch (error) {
        if (onError) onError(error as Error);
        this.stopPolling(jobId);
      }
    };

    // Start polling
    const interval = setInterval(poll, intervalMs);
    this.pollingIntervals.set(jobId, interval);

    // Initial poll
    poll();
  }

  /**
   * Stop polling for a job
   */
  stopPolling(jobId: string): void {
    const interval = this.pollingIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(jobId);
    }
    this.progressCallbacks.delete(jobId);
    this.completionCallbacks.delete(jobId);
  }

  /**
   * Wait for job completion (promise-based)
   */
  async waitForCompletion(
    jobId: string,
    options: {
      timeoutMs?: number;
      onProgress?: (progress: ExportJob['progress']) => void;
      pollIntervalMs?: number;
    } = {}
  ): Promise<ExportJob> {
    const { timeoutMs = 300000, onProgress, pollIntervalMs = 1000 } = options;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const elapsed = Date.now() - startTime;
          if (elapsed > timeoutMs) {
            reject(new Error(`Timeout waiting for job ${jobId}`));
            return;
          }

          const job = await this.getJobStatus(jobId);

          if (onProgress && job.progress) {
            onProgress(job.progress);
          }

          if (job.status === 'completed') {
            resolve(job);
            return;
          }

          if (job.status === 'failed') {
            reject(new Error(job.error?.message || 'Render failed'));
            return;
          }

          setTimeout(checkStatus, pollIntervalMs);
        } catch (error) {
          reject(error);
        }
      };

      checkStatus();
    });
  }
}

export const exportService = new ExportServiceClient();

// ============================================================================
// Timeline to Remotion Conversion
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

/**
 * Convert timeline tracks to Remotion render request
 */
export function timelineToRemotionRequest(
  timelineId: string,
  tracks: TimelineTrack[],
  captionStyle: CaptionStyle,
  settings: ExportSettings,
  webhookUrl?: string
): ExportRequest {
  // Calculate total duration
  const totalDuration = tracks.reduce((max, track) => {
    const trackEnd = track.clips.reduce((end, clip) => 
      Math.max(end, clip.startTime + clip.duration), 0
    );
    return Math.max(max, trackEnd);
  }, 0);

  // Find video source (first video clip)
  const videoTrack = tracks.find(t => t.type === 'video');
  const firstVideoClip = videoTrack?.clips.find(c => c.type === 'video' || c.type === 'image');

  // Build caption segments from text tracks or use provided captions
  const captionSegments = buildCaptionSegments(tracks, totalDuration);

  const request: ExportRequest = {
    timelineId,
    settings,
    webhookUrl,
  };

  return request;
}

/**
 * Build caption segments from timeline tracks
 */
function buildCaptionSegments(tracks: TimelineTrack[], totalDuration: number): CaptionSegment[] {
  // Look for caption/text tracks
  const captionTrack = tracks.find(t => 
    t.clips.some(c => c.type === 'text')
  );

  if (captionTrack) {
    return captionTrack.clips.map(clip => ({
      startMs: clip.startTime * 1000,
      endMs: (clip.startTime + clip.duration) * 1000,
      text: clip.name,
      words: parseWords(clip.name, clip.startTime * 1000, clip.duration * 1000),
    }));
  }

  // If no caption track, create empty segments
  return [{
    startMs: 0,
    endMs: totalDuration * 1000,
    text: '',
  }];
}

/**
 * Parse text into word timestamps
 */
function parseWords(text: string, startMs: number, durationMs: number): Array<{
  startMs: number;
  endMs: number;
  word: string;
}> {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const wordDuration = durationMs / words.length;

  return words.map((word, index) => ({
    startMs: startMs + index * wordDuration,
    endMs: startMs + (index + 1) * wordDuration,
    word,
  }));
}

// ============================================================================
// Export Presets
// ============================================================================

export const EXPORT_PRESETS: Record<string, ExportSettings> = {
  'youtube-short': {
    format: 'mp4',
    codec: 'h264',
    width: 1080,
    height: 1920,
    fps: 30,
    quality: 'high',
  },
  'tiktok': {
    format: 'mp4',
    codec: 'h264',
    width: 1080,
    height: 1920,
    fps: 30,
    quality: 'high',
  },
  'instagram-reel': {
    format: 'mp4',
    codec: 'h264',
    width: 1080,
    height: 1920,
    fps: 30,
    quality: 'high',
  },
  'instagram-post': {
    format: 'mp4',
    codec: 'h264',
    width: 1080,
    height: 1080,
    fps: 30,
    quality: 'high',
  },
  'youtube-video': {
    format: 'mp4',
    codec: 'h264',
    width: 1920,
    height: 1080,
    fps: 30,
    quality: 'high',
  },
  'twitter': {
    format: 'mp4',
    codec: 'h264',
    width: 1280,
    height: 720,
    fps: 30,
    quality: 'medium',
  },
  'hd': {
    format: 'mp4',
    codec: 'h264',
    width: 1920,
    height: 1080,
    fps: 30,
    quality: 'ultra',
  },
  '4k': {
    format: 'mp4',
    codec: 'h265',
    width: 3840,
    height: 2160,
    fps: 30,
    quality: 'ultra',
  },
  'web': {
    format: 'webm',
    codec: 'vp9',
    width: 1920,
    height: 1080,
    fps: 30,
    quality: 'medium',
  },
  'draft': {
    format: 'mp4',
    codec: 'h264',
    width: 720,
    height: 1280,
    fps: 24,
    quality: 'low',
  },
};

/**
 * Get export preset by name
 */
export function getExportPreset(name: string): ExportSettings {
  return EXPORT_PRESETS[name] || EXPORT_PRESETS['youtube-short'];
}

/**
 * Get all export presets
 */
export function getAllExportPresets(): Array<{ name: string; label: string; settings: ExportSettings }> {
  return [
    { name: 'youtube-short', label: 'YouTube Short (9:16)', settings: EXPORT_PRESETS['youtube-short'] },
    { name: 'tiktok', label: 'TikTok (9:16)', settings: EXPORT_PRESETS['tiktok'] },
    { name: 'instagram-reel', label: 'Instagram Reel (9:16)', settings: EXPORT_PRESETS['instagram-reel'] },
    { name: 'instagram-post', label: 'Instagram Post (1:1)', settings: EXPORT_PRESETS['instagram-post'] },
    { name: 'youtube-video', label: 'YouTube Video (16:9)', settings: EXPORT_PRESETS['youtube-video'] },
    { name: 'twitter', label: 'Twitter/X (16:9)', settings: EXPORT_PRESETS['twitter'] },
    { name: 'hd', label: 'HD 1080p', settings: EXPORT_PRESETS['hd'] },
    { name: '4k', label: '4K Ultra HD', settings: EXPORT_PRESETS['4k'] },
    { name: 'web', label: 'Web Optimized', settings: EXPORT_PRESETS['web'] },
    { name: 'draft', label: 'Draft Quality', settings: EXPORT_PRESETS['draft'] },
  ];
}

// ============================================================================
// Webhook Handler
// ============================================================================

export interface WebhookPayload {
  event: 'queued' | 'started' | 'progress' | 'completed' | 'failed';
  jobId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Handle incoming webhooks from the render server
 */
export function handleRenderWebhook(payload: WebhookPayload): void {
  const { event, jobId, data } = payload;

  switch (event) {
    case 'queued':
      console.log(`[Export] Job ${jobId} queued`);
      break;
    case 'started':
      console.log(`[Export] Job ${jobId} started`);
      break;
    case 'progress':
      console.log(`[Export] Job ${jobId} progress:`, data);
      break;
    case 'completed':
      console.log(`[Export] Job ${jobId} completed:`, data);
      break;
    case 'failed':
      console.error(`[Export] Job ${jobId} failed:`, data);
      break;
  }
}

// ============================================================================
// React Hooks
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

export function useExport() {
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportJob['progress'] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const startExport = useCallback(async (
    timelineId: string,
    settings: ExportSettings,
    options?: {
      webhookUrl?: string;
      onComplete?: (job: ExportJob) => void;
    }
  ) => {
    setIsExporting(true);
    setError(null);
    setProgress(null);

    try {
      const job = await exportService.submitRender({
        timelineId,
        settings,
        webhookUrl: options?.webhookUrl,
      });

      setCurrentJob(job);

      // Start polling
      exportService.startPolling(job.id, {
        onProgress: setProgress,
        onComplete: (completedJob) => {
          setCurrentJob(completedJob);
          setIsExporting(false);
          options?.onComplete?.(completedJob);
        },
        onError: (err) => {
          setError(err);
          setIsExporting(false);
        },
      });

      return job;
    } catch (err) {
      setError(err as Error);
      setIsExporting(false);
      throw err;
    }
  }, []);

  const cancelExport = useCallback(async () => {
    if (currentJob) {
      await exportService.cancelRender(currentJob.id);
      exportService.stopPolling(currentJob.id);
      setIsExporting(false);
    }
  }, [currentJob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentJob) {
        exportService.stopPolling(currentJob.id);
      }
    };
  }, [currentJob]);

  return {
    currentJob,
    isExporting,
    progress,
    error,
    startExport,
    cancelExport,
  };
}
