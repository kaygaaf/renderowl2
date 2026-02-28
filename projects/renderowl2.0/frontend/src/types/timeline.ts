/**
 * Timeline Types for Renderowl 2.0
 */

// Caption Style Types
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

export interface TimelineClip {
  id: string;
  name: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  trackId: string;
  type: 'video' | 'audio' | 'image' | 'text';
  src?: string;
  thumbnail?: string;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio';
  clips: TimelineClip[];
  isMuted: boolean;
  isLocked: boolean;
  isVisible: boolean;
}

export interface TimelineState {
  tracks: TimelineTrack[];
  currentTime: number;
  totalDuration: number;
  zoom: number; // pixels per second
  selectedClipIds: string[];
  selectedTrackId: string | null;
  isPlaying: boolean;
}

export interface TimelineActions {
  // Track actions
  addTrack: (type: 'video' | 'audio') => void;
  removeTrack: (trackId: string) => void;
  moveTrack: (trackId: string, newIndex: number) => void;
  updateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;
  
  // Clip actions
  addClip: (trackId: string, clip: Omit<TimelineClip, 'id'>) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  
  // Selection actions
  selectClip: (clipId: string, multi?: boolean) => void;
  deselectClip: (clipId: string) => void;
  clearSelection: () => void;
  selectTrack: (trackId: string | null) => void;
  
  // Playback actions
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  
  // Timeline actions
  splitClip: (clipId: string, splitTime: number) => void;
  trimClip: (clipId: string, startOffset: number, endOffset: number) => void;
}
