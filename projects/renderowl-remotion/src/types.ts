export type CaptionSegment = {
  startMs: number;
  endMs: number;
  text: string;
  /** Optional word-level timestamps for per-word highlighting. */
  words?: WordTimestamp[];
};

export type WordTimestamp = {
  startMs: number;
  endMs: number;
  word: string;
};

export type HighlightMode = 'color' | 'pill' | 'underline' | 'glow' | 'fill';

/** Animation style for words as they appear (entry animation) */
export type WordEntryAnimation = 'none' | 'fade' | 'pop' | 'slideUp' | 'scale';

export type CaptionStyle = {
  /** Max characters per line before wrapping. Heuristic; exact width depends on font. */
  maxCharsPerLine?: number;
  /** Maximum number of lines to show per caption. */
  maxLines?: number;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  textColor?: string;
  /** Color for the currently spoken word when word timestamps are available. */
  highlightColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  /** Background behind text */
  backgroundColor?: string;
  backgroundOpacity?: number;
  paddingX?: number;
  paddingY?: number;
  borderRadius?: number;
  /** Distance from bottom in pixels */
  bottomOffset?: number;
  /**
   * Highlight mode for per-word karaoke-style captions:
   * - 'color': Simple color change (default)
   * - 'pill': Rounded background pill behind active word
   * - 'underline': Underline effect
   * - 'glow': Text shadow glow effect
   */
  highlightMode?: HighlightMode;
  /** Duration (in ms) for the highlight animation transition. Default: 120ms */
  highlightTransitionMs?: number;
  /** Background color for the pill highlight mode. Default: highlightColor with 0.3 opacity */
  highlightPillColor?: string;
  /** Scale effect for active word (1.0 = no scale). Default: 1.05 */
  highlightScale?: number;
  /**
   * Entry animation for words as they appear:
   * - 'none': No entry animation (words appear instantly)
   * - 'fade': Fade in (default)
   * - 'pop': Pop in with bounce
   * - 'slideUp': Slide up from below
   * - 'scale': Scale up from 0
   */
  wordEntryAnimation?: WordEntryAnimation;
  /** Duration (in ms) for word entry animation. Default: 200ms */
  wordEntryDurationMs?: number;
  /**
   * Duration (in ms) for caption segment transitions (crossfade between segments).
   * Set to 0 to disable transitions. Default: 150ms
   */
  captionTransitionMs?: number;
};
