import {describe, expect, it, vi, beforeEach} from 'vitest';

// Mock measureTextWidth: each character = 10px (including spaces)
vi.mock('./measureTextWidth', () => ({
  measureTextWidth: vi.fn((text: string, _opts: {font: string}): number => text.length * 10),
  getTextMeasureStats: vi.fn(() => ({hits: 0, misses: 0})),
  clearTextMeasureCache: vi.fn(),
}));

import {wrapCaptionText} from './textWrap';
import {measureTextWidth} from './measureTextWidth';

describe('wrapCaptionText — character count mode', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Basic wrapping
  // ──────────────────────────────────────────────────────────────────────────
  it('returns single word as a single line', () => {
    const {lines, wasTruncated} = wrapCaptionText('Hello', {maxCharsPerLine: 20, maxLines: 2});
    expect(lines).toEqual(['Hello']);
    expect(wasTruncated).toBe(false);
  });

  it('returns entire text on one line when it fits', () => {
    const {lines, wasTruncated} = wrapCaptionText('Hello world', {maxCharsPerLine: 20, maxLines: 2});
    expect(lines).toEqual(['Hello world']);
    expect(wasTruncated).toBe(false);
  });

  it('text at exactly maxCharsPerLine fits on one line', () => {
    const text = 'a'.repeat(20); // 20 chars
    const {lines, wasTruncated} = wrapCaptionText(text, {maxCharsPerLine: 20, maxLines: 2});
    expect(lines).toEqual([text]);
    expect(wasTruncated).toBe(false);
  });

  it('wraps at word boundaries when line would be too long', () => {
    // 'Hello' = 5, 'world' = 5, together = 'Hello world' = 11 > 8
    const {lines, wasTruncated} = wrapCaptionText('Hello world', {maxCharsPerLine: 8, maxLines: 2});
    expect(lines).toEqual(['Hello', 'world']);
    expect(wasTruncated).toBe(false);
  });

  it('packs as many words as fit on each line', () => {
    // 'one two' = 7, 'one two three' = 13 > 10; line 1 = 'one two'
    // 'three' = 5, 'three four' = 9 <= 10; line 2 = 'three four'
    // 'five' would be line 3 → truncated
    const {lines, wasTruncated} = wrapCaptionText('one two three four five', {
      maxCharsPerLine: 10,
      maxLines: 2,
    });
    expect(lines[0]).toBe('one two');
    expect(lines[1]).toBe('three four');
    expect(wasTruncated).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Truncation
  // ──────────────────────────────────────────────────────────────────────────
  it('truncates after maxLines is reached', () => {
    const long = 'a b c d e f g h i j'; // 10 words, each line fits 1
    const {lines, wasTruncated} = wrapCaptionText(long, {maxCharsPerLine: 1, maxLines: 2});
    expect(wasTruncated).toBe(true);
    expect(lines.length).toBe(2);
  });

  it('wasTruncated is false when all words fit within maxLines', () => {
    const {lines, wasTruncated} = wrapCaptionText('short text', {
      maxCharsPerLine: 50,
      maxLines: 5,
    });
    expect(wasTruncated).toBe(false);
    expect(lines).toEqual(['short text']);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Single long word (no break point)
  // ──────────────────────────────────────────────────────────────────────────
  it('hard-truncates a single word that exceeds maxCharsPerLine', () => {
    const {lines} = wrapCaptionText('superlongword', {maxCharsPerLine: 8, maxLines: 2});
    // slice(0, maxCharsPerLine - 1) + '…' = slice(0, 7) + '…' = 'superlo…'
    expect(lines[0]).toBe('superlo…');
    expect(lines[0].length).toBe(8);
    expect(lines[0]).toMatch(/…$/);
  });

  it('stops adding lines after hard-truncating a single long word when at maxLines', () => {
    const {lines, wasTruncated} = wrapCaptionText('longword short', {
      maxCharsPerLine: 5,
      maxLines: 1,
    });
    expect(wasTruncated).toBe(true);
    expect(lines.length).toBe(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Whitespace normalisation
  // ──────────────────────────────────────────────────────────────────────────
  it('normalises extra whitespace between words', () => {
    const {lines} = wrapCaptionText('  hello   world  ', {maxCharsPerLine: 20, maxLines: 2});
    expect(lines).toEqual(['hello world']);
  });

  it('returns empty array for whitespace-only input', () => {
    const {lines, wasTruncated} = wrapCaptionText('   ', {maxCharsPerLine: 20, maxLines: 2});
    expect(lines).toEqual([]);
    expect(wasTruncated).toBe(false);
  });

  it('returns empty array for empty string', () => {
    const {lines} = wrapCaptionText('', {maxCharsPerLine: 20, maxLines: 2});
    expect(lines).toEqual([]);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Default options
  // ──────────────────────────────────────────────────────────────────────────
  it('uses sensible defaults when no opts provided', () => {
    const {lines, wasTruncated} = wrapCaptionText('A short caption');
    expect(wasTruncated).toBe(false);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // maxLines = 1
  // ──────────────────────────────────────────────────────────────────────────
  it('enforces maxLines: 1 correctly', () => {
    const {lines, wasTruncated} = wrapCaptionText('one two three', {
      maxCharsPerLine: 5,
      maxLines: 1,
    });
    expect(lines.length).toBe(1);
    expect(wasTruncated).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Sentence with multiple words that fill both lines exactly
  // ──────────────────────────────────────────────────────────────────────────
  it('fills both lines exactly without truncation', () => {
    // 'Hello' = 5, 'world' = 5; together > 8 → line 1 = 'Hello'
    // 'world' = 5 <= 8 → line 2 = 'world'
    // No more words → wasTruncated: false
    const {lines, wasTruncated} = wrapCaptionText('Hello world', {
      maxCharsPerLine: 8,
      maxLines: 2,
    });
    expect(lines).toEqual(['Hello', 'world']);
    expect(wasTruncated).toBe(false);
  });
});

describe('wrapCaptionText — pixel width mode (measureTextWidth mocked at 10px/char)', () => {
  const FONT = '64px Inter';

  beforeEach(() => {
    vi.mocked(measureTextWidth).mockClear();
  });

  it('uses measureTextWidth when maxWidthPx and font are provided', () => {
    wrapCaptionText('Hello world', {maxWidthPx: 200, font: FONT, maxLines: 2});
    expect(vi.mocked(measureTextWidth)).toHaveBeenCalled();
  });

  it('puts all words on one line when they fit within maxWidthPx', () => {
    // 'Hello world' = 11 chars × 10px = 110px ≤ 150px
    const {lines, wasTruncated} = wrapCaptionText('Hello world', {
      maxWidthPx: 150,
      font: FONT,
      maxLines: 2,
    });
    expect(wasTruncated).toBe(false);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Hello world');
  });

  it('wraps when combined width exceeds maxWidthPx', () => {
    // 'Hello' = 50px, 'beautiful' = 90px, 'world' = 50px
    // 'Hello beautiful' = 150px > 120px → wrap after 'Hello'
    // 'beautiful world' = 150px > 120px → wrap after 'beautiful'
    const {lines, wasTruncated} = wrapCaptionText('Hello beautiful world', {
      maxWidthPx: 120,
      font: FONT,
      maxLines: 3,
    });
    expect(wasTruncated).toBe(false);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Hello');
    expect(lines[1]).toBe('beautiful');
    expect(lines[2]).toBe('world');
  });

  it('packs multiple words on a line when they fit together', () => {
    // 'Hello world' = 150px ≤ 160px → same line
    // 'beautiful' = 90px — starts line 2
    const {lines, wasTruncated} = wrapCaptionText('Hello world beautiful', {
      maxWidthPx: 160,
      font: FONT,
      maxLines: 2,
    });
    expect(wasTruncated).toBe(false);
    expect(lines[0]).toBe('Hello world');
    expect(lines[1]).toBe('beautiful');
  });

  it('truncates when words would exceed maxLines', () => {
    const {lines, wasTruncated} = wrapCaptionText('Hello beautiful world', {
      maxWidthPx: 120,
      font: FONT,
      maxLines: 2,
    });
    expect(wasTruncated).toBe(true);
    expect(lines).toHaveLength(2);
  });

  it('truncates a word that exceeds maxWidthPx by itself', () => {
    // 'superlongword' = 130px > 100px → must truncate
    const {lines} = wrapCaptionText('superlongword', {
      maxWidthPx: 100,
      font: FONT,
      maxLines: 2,
    });
    expect(lines[0]).toMatch(/…$/);
    // Resulting text must fit within 100px (10 chars)
    const resultWidth = (lines[0].length) * 10;
    expect(resultWidth).toBeLessThanOrEqual(100);
  });

  it('falls back to char-count wrapping when maxWidthPx is not provided', () => {
    vi.mocked(measureTextWidth).mockClear();
    wrapCaptionText('Hello world', {maxCharsPerLine: 40, maxLines: 2});
    // measureTextWidth should NOT be called in char-count mode
    expect(vi.mocked(measureTextWidth)).not.toHaveBeenCalled();
  });

  it('falls back to char-count wrapping when font is not provided', () => {
    vi.mocked(measureTextWidth).mockClear();
    wrapCaptionText('Hello world', {maxWidthPx: 200, maxLines: 2});
    expect(vi.mocked(measureTextWidth)).not.toHaveBeenCalled();
  });

  it('cleans extra whitespace in pixel mode', () => {
    const {lines} = wrapCaptionText('  hello   world  ', {
      maxWidthPx: 200,
      font: FONT,
      maxLines: 2,
    });
    expect(lines).toEqual(['hello world']);
  });
});
