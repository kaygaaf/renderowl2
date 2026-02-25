import type {CaptionSegment} from '../types';

type ActiveCaptionResult = {caption: CaptionSegment | null; index: number};

// Captions are expected to be sorted by startMs (as produced by parseSubtitles).
// We cache the sortedness check per array instance so we can safely use binary search
// without adding per-frame O(n) overhead.
const sortednessCache = new WeakMap<CaptionSegment[], boolean>();

const isSortedByStartMs = (captions: CaptionSegment[]): boolean => {
  const cached = sortednessCache.get(captions);
  if (cached !== undefined) return cached;

  let sorted = true;
  for (let i = 1; i < captions.length; i++) {
    if (captions[i].startMs < captions[i - 1].startMs) {
      sorted = false;
      break;
    }
  }

  sortednessCache.set(captions, sorted);
  return sorted;
};

const linearScanActiveCaption = (
  captions: CaptionSegment[],
  timeMs: number
): ActiveCaptionResult => {
  for (let i = 0; i < captions.length; i++) {
    const c = captions[i];
    if (timeMs >= c.startMs && timeMs < c.endMs) {
      return {caption: c, index: i};
    }
  }
  return {caption: null, index: -1};
};

/**
 * Returns the caption active at timeMs.
 *
 * Complexity:
 * - O(log n) for sorted arrays (expected)
 * - O(n) fallback for unsorted inputs
 */
export const getActiveCaption = (
  captions: CaptionSegment[],
  timeMs: number
): ActiveCaptionResult => {
  if (captions.length === 0) return {caption: null, index: -1};

  if (!isSortedByStartMs(captions)) {
    // Preserve correctness even if caller passes an unsorted array.
    return linearScanActiveCaption(captions, timeMs);
  }

  // Find the last caption where startMs <= timeMs.
  let lo = 0;
  let hi = captions.length; // exclusive
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (captions[mid].startMs <= timeMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const idx = lo - 1;
  if (idx < 0) return {caption: null, index: -1};

  const c = captions[idx];
  if (timeMs >= c.startMs && timeMs < c.endMs) {
    return {caption: c, index: idx};
  }

  return {caption: null, index: -1};
};
