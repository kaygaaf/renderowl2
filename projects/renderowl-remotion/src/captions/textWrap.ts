import {measureTextWidth} from './measureTextWidth';

const DEFAULT_MAX_CHARS_PER_LINE = 28;
const DEFAULT_MAX_LINES = 2;

const cleanWhitespace = (t: string) => t.replace(/\s+/g, ' ').trim();

export type TextWrapOpts = {
  maxCharsPerLine?: number;
  maxLines?: number;
  /** If provided, uses pixel-accurate wrapping instead of character-count wrapping. */
  maxWidthPx?: number;
  /** Canvas font string, e.g. `64px Inter`. Required when `maxWidthPx` is set. */
  font?: string;
};

const truncateToWidth = (text: string, maxWidthPx: number, font: string): string => {
  const ellipsis = '…';
  if (measureTextWidth(text, {font}) <= maxWidthPx) return text;

  // Binary search for the largest prefix that fits with ellipsis
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

export const wrapCaptionText = (
  text: string,
  opts?: TextWrapOpts
): {lines: string[]; wasTruncated: boolean} => {
  const maxCharsPerLine = opts?.maxCharsPerLine ?? DEFAULT_MAX_CHARS_PER_LINE;
  const maxLines = opts?.maxLines ?? DEFAULT_MAX_LINES;

  const words = cleanWhitespace(text).split(' ').filter(Boolean);
  const lines: string[] = [];

  const maxWidthPx = opts?.maxWidthPx;
  const font = opts?.font;

  // Pixel-accurate wrapping (preferred when font and maxWidthPx provided)
  if (typeof maxWidthPx === 'number' && maxWidthPx > 0 && font) {
    let cursor = 0;

    while (cursor < words.length) {
      if (lines.length >= maxLines) {
        return {lines, wasTruncated: true};
      }

      const single = words[cursor];
      const singleWidth = measureTextWidth(single, {font});

      // If single word doesn't fit, truncate it
      if (singleWidth > maxWidthPx) {
        lines.push(truncateToWidth(single, maxWidthPx, font));
        cursor += 1;
        continue;
      }

      // Binary search: find the largest end index such that words[cursor..end) fit on one line
      let lo = cursor + 1;
      let hi = words.length;
      let best = lo;

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const slice = words.slice(cursor, mid);
        const lineText = slice.join(' ');
        const width = measureTextWidth(lineText, {font});
        if (width <= maxWidthPx) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      // Safety: always advance
      if (best <= cursor) best = cursor + 1;

      lines.push(words.slice(cursor, best).join(' '));
      cursor = best;
    }

    return {lines, wasTruncated: false};
  }

  // Character-count fallback wrapping
  let current = '';

  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }

    // If single word is too long, hard-break it.
    if (!current) {
      lines.push(w.slice(0, maxCharsPerLine - 1) + '…');
      if (lines.length >= maxLines) {
        return {lines, wasTruncated: true};
      }
      continue;
    }

    lines.push(current);
    if (lines.length >= maxLines) {
      return {lines, wasTruncated: true};
    }
    current = w;
  }

  if (current) lines.push(current);

  if (lines.length > maxLines) {
    return {lines: lines.slice(0, maxLines), wasTruncated: true};
  }

  return {lines, wasTruncated: false};
};
