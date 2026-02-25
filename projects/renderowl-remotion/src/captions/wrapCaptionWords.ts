import type {WordTimestamp} from '../types';
import {measureTextWidth} from './measureTextWidth';

const DEFAULT_MAX_CHARS_PER_LINE = 28;
const DEFAULT_MAX_LINES = 2;

const cleanWhitespace = (t: string) => t.replace(/\s+/g, ' ').trim();

export type WrappedWord = {
  word: WordTimestamp;
  display: string;
};

type WrapOpts = {
  maxCharsPerLine?: number;
  maxLines?: number;
  /** If provided, uses pixel-accurate wrapping instead of character-count wrapping. */
  maxWidthPx?: number;
  /** Canvas font string, e.g. `64px Inter`. Required when `maxWidthPx` is set. */
  font?: string;
};

const joinTokens = (tokens: WrappedWord[]) => tokens.map((t) => t.display).join(' ');

const truncateToWidth = (text: string, maxWidthPx: number, font: string): string => {
  const ellipsis = '…';
  if (measureTextWidth(text, {font}) <= maxWidthPx) return text;

  // Binary search the largest prefix that fits with ellipsis.
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = text.slice(0, Math.max(0, mid)).trimEnd() + ellipsis;
    const w = measureTextWidth(candidate, {font});
    if (w <= maxWidthPx) lo = mid;
    else hi = mid - 1;
  }

  const prefix = text.slice(0, Math.max(1, lo)).trimEnd();
  return prefix + ellipsis;
};

export const wrapCaptionWords = (
  words: WordTimestamp[],
  opts?: WrapOpts
): {lines: WrappedWord[][]; wasTruncated: boolean} => {
  const maxCharsPerLine = opts?.maxCharsPerLine ?? DEFAULT_MAX_CHARS_PER_LINE;
  const maxLines = opts?.maxLines ?? DEFAULT_MAX_LINES;

  const tokens: WrappedWord[] = words
    .map((w) => ({word: w, display: cleanWhitespace(w.word)}))
    .filter((t) => t.display.length > 0);

  const maxWidthPx = opts?.maxWidthPx;
  const font = opts?.font;

  // Width-based wrapping (preferred)
  if (typeof maxWidthPx === 'number' && maxWidthPx > 0 && font) {
    const lines: WrappedWord[][] = [];
    let cursor = 0;

    while (cursor < tokens.length) {
      if (lines.length >= maxLines) {
        return {lines, wasTruncated: true};
      }

      // If even a single word doesn't fit, truncate it.
      const single = tokens[cursor];
      const singleWidth = measureTextWidth(single.display, {font});
      if (singleWidth > maxWidthPx) {
        const truncated = truncateToWidth(single.display, maxWidthPx, font);
        lines.push([{word: single.word, display: truncated}]);
        cursor += 1;
        continue;
      }

      // Binary search: find the largest end index such that tokens[cursor..end)
      // fit on a single line.
      let lo = cursor + 1;
      let hi = tokens.length;
      let best = lo;

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const slice = tokens.slice(cursor, mid);
        const text = joinTokens(slice);
        const width = measureTextWidth(text, {font});
        if (width <= maxWidthPx) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      // Safety: always advance.
      if (best <= cursor) best = cursor + 1;

      lines.push(tokens.slice(cursor, best));
      cursor = best;
    }

    return {lines, wasTruncated: false};
  }

  // Character-count fallback wrapping
  const lines: WrappedWord[][] = [];
  let current: WrappedWord[] = [];

  const currentLen = () =>
    current.reduce((acc, t, idx) => acc + t.display.length + (idx === 0 ? 0 : 1), 0);

  for (const t of tokens) {
    const candidateLen = current.length === 0 ? t.display.length : currentLen() + 1 + t.display.length;

    if (candidateLen <= maxCharsPerLine) {
      current.push(t);
      continue;
    }

    // If single word is too long, hard-truncate it.
    if (current.length === 0) {
      const truncated = t.display.slice(0, Math.max(1, maxCharsPerLine - 1)) + '…';
      lines.push([{word: t.word, display: truncated}]);
      if (lines.length >= maxLines) {
        return {lines, wasTruncated: true};
      }
      continue;
    }

    lines.push(current);
    if (lines.length >= maxLines) {
      return {lines, wasTruncated: true};
    }
    current = [t];
  }

  if (current.length > 0) lines.push(current);

  if (lines.length > maxLines) {
    return {lines: lines.slice(0, maxLines), wasTruncated: true};
  }

  return {lines, wasTruncated: false};
};
