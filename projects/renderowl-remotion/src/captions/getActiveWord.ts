import type {WordTimestamp} from '../types';

/**
 * Returns index of the word active at timeMs, or -1.
 * Assumes words are sorted by startMs.
 */
export const getActiveWordIndex = (words: WordTimestamp[], timeMs: number): number => {
  if (words.length === 0) return -1;

  // Find last word where startMs <= timeMs
  let lo = 0;
  let hi = words.length; // exclusive
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].startMs <= timeMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const idx = lo - 1;
  if (idx < 0) return -1;
  const w = words[idx];
  return timeMs >= w.startMs && timeMs < w.endMs ? idx : -1;
};
