import {describe, expect, it, vi, beforeEach} from 'vitest';
import type {WordTimestamp} from '../types';

// Mock measureTextWidth: each character = 10px
// This mock is hoisted by vitest and applies before wrapCaptionWords is loaded.
vi.mock('./measureTextWidth', () => ({
  measureTextWidth: vi.fn((text: string, _opts: {font: string}): number => text.length * 10),
  getTextMeasureStats: vi.fn(() => ({hits: 0, misses: 0})),
  clearTextMeasureCache: vi.fn(),
}));

import {wrapCaptionWords} from './wrapCaptionWords';
import {measureTextWidth} from './measureTextWidth';

const w = (text: string, startMs: number, endMs: number): WordTimestamp => ({
  word: text,
  startMs,
  endMs,
});

// Convenience: extract display strings from a line
const displays = (line: ReturnType<typeof wrapCaptionWords>['lines'][number]) =>
  line.map((t) => t.display);

describe('wrapCaptionWords — character count mode', () => {
  const words = [w('Hello', 0, 400), w('beautiful', 400, 800), w('world', 800, 1200)];

  it('places all words on one line when they fit', () => {
    const {lines, wasTruncated} = wrapCaptionWords(words, {
      maxCharsPerLine: 40,
      maxLines: 2,
    });
    expect(wasTruncated).toBe(false);
    expect(lines).toHaveLength(1);
    expect(displays(lines[0])).toEqual(['Hello', 'beautiful', 'world']);
  });

  it('wraps onto a second line when combined width exceeds maxCharsPerLine', () => {
    // 'Hello' (5) + ' ' + 'beautiful' (9) = 15 > 12 → wrap
    const {lines, wasTruncated} = wrapCaptionWords(words, {
      maxCharsPerLine: 12,
      maxLines: 3,
    });
    expect(wasTruncated).toBe(false);
    expect(lines).toHaveLength(3);
    expect(displays(lines[0])).toEqual(['Hello']);
    expect(displays(lines[1])).toEqual(['beautiful']);
    expect(displays(lines[2])).toEqual(['world']);
  });

  it('truncates when words exceed maxLines', () => {
    // With maxCharsPerLine=12 and maxLines=2:
    // line 1: 'Hello', line 2: 'beautiful', 'world' would be line 3 → truncated
    const {lines, wasTruncated} = wrapCaptionWords(words, {
      maxCharsPerLine: 12,
      maxLines: 2,
    });
    expect(wasTruncated).toBe(true);
    expect(lines).toHaveLength(2);
    expect(displays(lines[0])).toEqual(['Hello']);
    expect(displays(lines[1])).toEqual(['beautiful']);
  });

  it('hard-truncates a word that exceeds maxCharsPerLine on its own', () => {
    const longWord = [w('superlongword', 0, 500)]; // 13 chars
    const {lines} = wrapCaptionWords(longWord, {maxCharsPerLine: 8, maxLines: 2});
    // Should be truncated to 7 chars + '…'
    expect(lines[0][0].display).toMatch(/…$/);
    expect(lines[0][0].display.length).toBeLessThanOrEqual(8);
  });

  it('preserves word timestamp references on wrapped lines', () => {
    const {lines} = wrapCaptionWords(words, {maxCharsPerLine: 40, maxLines: 2});
    // All three words should map back to their original WordTimestamp objects
    expect(lines[0][0].word).toBe(words[0]);
    expect(lines[0][1].word).toBe(words[1]);
    expect(lines[0][2].word).toBe(words[2]);
  });

  it('filters out empty / whitespace-only words', () => {
    const withBlanks = [w('', 0, 100), w('Hello', 100, 400), w('  ', 400, 500), w('world', 500, 800)];
    const {lines} = wrapCaptionWords(withBlanks, {maxCharsPerLine: 40, maxLines: 2});
    const allDisplays = lines.flatMap(displays);
    expect(allDisplays).toEqual(['Hello', 'world']);
  });

  it('cleans extra whitespace inside word text', () => {
    const messy = [w('  hello  ', 0, 400), w('  world  ', 400, 800)];
    const {lines} = wrapCaptionWords(messy, {maxCharsPerLine: 40, maxLines: 2});
    expect(displays(lines[0])).toEqual(['hello', 'world']);
  });

  it('returns empty lines for an empty words array', () => {
    const {lines, wasTruncated} = wrapCaptionWords([], {maxCharsPerLine: 28, maxLines: 2});
    expect(lines).toHaveLength(0);
    expect(wasTruncated).toBe(false);
  });
});

describe('wrapCaptionWords — pixel width mode (measureTextWidth mocked at 10px/char)', () => {
  // With mock: 10px per char
  // maxWidthPx = 100  →  fits ~10 chars
  // maxWidthPx = 150  →  fits ~15 chars

  const FONT = '64px Inter';

  beforeEach(() => {
    vi.mocked(measureTextWidth).mockClear();
  });

  it('uses measureTextWidth when maxWidthPx and font are provided', () => {
    const words = [w('Hello', 0, 400), w('world', 400, 800)];
    wrapCaptionWords(words, {maxWidthPx: 200, font: FONT, maxLines: 2});
    expect(vi.mocked(measureTextWidth)).toHaveBeenCalled();
  });

  it('puts all words on one line when they fit within maxWidthPx', () => {
    // 'Hello world' = 11 chars × 10px = 110px ≤ 150px
    const words = [w('Hello', 0, 400), w('world', 400, 800)];
    const {lines, wasTruncated} = wrapCaptionWords(words, {
      maxWidthPx: 150,
      font: FONT,
      maxLines: 2,
    });
    expect(wasTruncated).toBe(false);
    expect(lines).toHaveLength(1);
    expect(displays(lines[0])).toEqual(['Hello', 'world']);
  });

  it('wraps when combined width exceeds maxWidthPx', () => {
    // 'Hello' = 50px, 'beautiful' = 90px, 'world' = 50px
    // 'Hello beautiful' = 150px > 120px → wrap after 'Hello'
    // 'beautiful world' = 150px > 120px → wrap after 'beautiful'
    const words = [w('Hello', 0, 400), w('beautiful', 400, 800), w('world', 800, 1200)];
    const {lines, wasTruncated} = wrapCaptionWords(words, {
      maxWidthPx: 120,
      font: FONT,
      maxLines: 3,
    });
    expect(wasTruncated).toBe(false);
    expect(lines).toHaveLength(3);
    expect(displays(lines[0])).toEqual(['Hello']);
    expect(displays(lines[1])).toEqual(['beautiful']);
    expect(displays(lines[2])).toEqual(['world']);
  });

  it('packs multiple words on a line when they fit together', () => {
    // 'Hello world' = 150px ≤ 160px → same line
    // 'beautiful' = 90px — starts line 2
    const words = [w('Hello', 0, 300), w('world', 300, 600), w('beautiful', 600, 900)];
    const {lines, wasTruncated} = wrapCaptionWords(words, {
      maxWidthPx: 160,
      font: FONT,
      maxLines: 2,
    });
    expect(wasTruncated).toBe(false);
    expect(displays(lines[0])).toEqual(['Hello', 'world']);
    expect(displays(lines[1])).toEqual(['beautiful']);
  });

  it('truncates when words would exceed maxLines', () => {
    const words = [w('Hello', 0, 400), w('beautiful', 400, 800), w('world', 800, 1200)];
    const {lines, wasTruncated} = wrapCaptionWords(words, {
      maxWidthPx: 120,
      font: FONT,
      maxLines: 2,
    });
    expect(wasTruncated).toBe(true);
    expect(lines).toHaveLength(2);
  });

  it('truncates a word that exceeds maxWidthPx by itself', () => {
    // 'superlongword' = 130px > 100px → must truncate
    const words = [w('superlongword', 0, 500)];
    const {lines} = wrapCaptionWords(words, {
      maxWidthPx: 100,
      font: FONT,
      maxLines: 2,
    });
    expect(lines[0][0].display).toMatch(/…$/);
    // Resulting text must fit within 100px
    const resultWidth = (lines[0][0].display.length) * 10;
    expect(resultWidth).toBeLessThanOrEqual(100);
  });

  it('falls back to char-count wrapping when maxWidthPx is not provided', () => {
    vi.mocked(measureTextWidth).mockClear();
    const words = [w('Hello', 0, 400), w('world', 400, 800)];
    wrapCaptionWords(words, {maxCharsPerLine: 40, maxLines: 2});
    // measureTextWidth should NOT be called in char-count mode
    expect(vi.mocked(measureTextWidth)).not.toHaveBeenCalled();
  });

  it('falls back to char-count wrapping when font is not provided', () => {
    vi.mocked(measureTextWidth).mockClear();
    const words = [w('Hello', 0, 400)];
    wrapCaptionWords(words, {maxWidthPx: 200, maxLines: 2});
    expect(vi.mocked(measureTextWidth)).not.toHaveBeenCalled();
  });
});

describe('wrapCaptionWords — defaults', () => {
  it('uses default maxCharsPerLine and maxLines when no opts given', () => {
    const words = [w('Hi', 0, 500)];
    const {lines, wasTruncated} = wrapCaptionWords(words);
    expect(wasTruncated).toBe(false);
    expect(lines).toHaveLength(1);
    expect(displays(lines[0])).toEqual(['Hi']);
  });
});
