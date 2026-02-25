import type {CaptionSegment} from '../types';

type AdjacentCaptionsResult = {
  current: CaptionSegment | null;
  currentIndex: number;
  previous: CaptionSegment | null;
  previousIndex: number;
  next: CaptionSegment | null;
  nextIndex: number;
};

/**
 * Returns the current active caption along with its adjacent captions.
 * Useful for implementing crossfade transitions between segments.
 * 
 * @param captions - Array of caption segments (expected sorted by startMs)
 * @param timeMs - Current time in milliseconds
 * @param transitionMs - Transition duration for fading (default 200ms)
 * @returns Object with current, previous, and next captions with their indices
 */
export const getAdjacentCaptions = (
  captions: CaptionSegment[],
  timeMs: number,
  transitionMs = 200
): AdjacentCaptionsResult => {
  if (captions.length === 0) {
    return {
      current: null,
      currentIndex: -1,
      previous: null,
      previousIndex: -1,
      next: null,
      nextIndex: -1
    };
  }

  // Find current active caption using binary search
  let lo = 0;
  let hi = captions.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (captions[mid].startMs <= timeMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const currentIndex = lo - 1;
  const current = currentIndex >= 0 && currentIndex < captions.length &&
    timeMs >= captions[currentIndex].startMs && 
    timeMs < captions[currentIndex].endMs
    ? captions[currentIndex]
    : null;

  // Previous caption (only show during transition out)
  let previousIndex = -1;
  let previous: CaptionSegment | null = null;
  
  if (currentIndex >= 0) {
    // Check if we're in the transition window after the previous caption ended
    const prevIdx = current ? currentIndex - 1 : currentIndex;
    if (prevIdx >= 0) {
      const prevCaption = captions[prevIdx];
      const timeSincePrevEnd = timeMs - prevCaption.endMs;
      if (timeSincePrevEnd >= 0 && timeSincePrevEnd < transitionMs) {
        previousIndex = prevIdx;
        previous = prevCaption;
      }
    }
  } else if (currentIndex === -1 && lo < captions.length) {
    // Before first caption - check if we're in transition from nothing
    const firstCaption = captions[0];
    const timeBeforeFirst = firstCaption.startMs - timeMs;
    // No previous to show before first caption starts
  }

  // Next caption (show during transition in)
  let nextIndex = -1;
  let next: CaptionSegment | null = null;
  
  const nextIdx = current ? currentIndex + 1 : lo;
  if (nextIdx < captions.length) {
    const nextCaption = captions[nextIdx];
    const timeBeforeNext = nextCaption.startMs - timeMs;
    if (timeBeforeNext > 0 && timeBeforeNext <= transitionMs) {
      nextIndex = nextIdx;
      next = nextCaption;
    }
  }

  return {
    current,
    currentIndex: current ? currentIndex : -1,
    previous,
    previousIndex,
    next,
    nextIndex
  };
};

/**
 * Calculates transition progress (0-1) for crossfade effects.
 * 
 * @param caption - The caption to check
 * @param timeMs - Current time
 * @param transitionMs - Duration of transition
 * @param direction - 'in' for fade in, 'out' for fade out
 * @returns Progress from 0 to 1
 */
export const getTransitionProgress = (
  caption: CaptionSegment,
  timeMs: number,
  transitionMs: number,
  direction: 'in' | 'out'
): number => {
  if (direction === 'in') {
    // Fade in at the start of the caption
    const timeSinceStart = timeMs - caption.startMs;
    if (timeSinceStart < 0) return 0;
    if (timeSinceStart >= transitionMs) return 1;
    return timeSinceStart / transitionMs;
  } else {
    // Fade out at the end of the caption
    const timeUntilEnd = caption.endMs - timeMs;
    if (timeUntilEnd <= 0) return 0;
    if (timeUntilEnd >= transitionMs) return 1;
    return timeUntilEnd / transitionMs;
  }
};
