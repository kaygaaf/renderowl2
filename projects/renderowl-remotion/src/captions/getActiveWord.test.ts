import {describe, expect, it} from 'vitest';
import {getActiveWordIndex} from './getActiveWord';
import type {WordTimestamp} from '../types';

const word = (startMs: number, endMs: number, text = 'word'): WordTimestamp => ({
  startMs,
  endMs,
  word: text,
});

describe('getActiveWordIndex', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Empty / trivial
  // ──────────────────────────────────────────────────────────────────────────
  it('returns -1 for empty words array', () => {
    expect(getActiveWordIndex([], 0)).toBe(-1);
    expect(getActiveWordIndex([], 500)).toBe(-1);
  });

  it('finds single word when active', () => {
    const words = [word(0, 500)];
    expect(getActiveWordIndex(words, 0)).toBe(0);
    expect(getActiveWordIndex(words, 250)).toBe(0);
    expect(getActiveWordIndex(words, 499)).toBe(0);
  });

  it('returns -1 for single word before its start', () => {
    const words = [word(200, 500)];
    expect(getActiveWordIndex(words, 0)).toBe(-1);
    expect(getActiveWordIndex(words, 199)).toBe(-1);
  });

  it('returns -1 for single word after its end (exclusive)', () => {
    const words = [word(0, 500)];
    expect(getActiveWordIndex(words, 500)).toBe(-1);
    expect(getActiveWordIndex(words, 9999)).toBe(-1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Boundary conditions
  // ──────────────────────────────────────────────────────────────────────────
  it('startMs is inclusive', () => {
    const words = [word(100, 200)];
    expect(getActiveWordIndex(words, 100)).toBe(0);
  });

  it('endMs is exclusive', () => {
    const words = [word(100, 200)];
    expect(getActiveWordIndex(words, 200)).toBe(-1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Multiple words — uses binary search
  // ──────────────────────────────────────────────────────────────────────────
  it('identifies each word in sequence', () => {
    const words = [
      word(0, 400, 'Hello'),
      word(400, 800, 'beautiful'),
      word(800, 1200, 'world'),
    ];

    expect(getActiveWordIndex(words, 0)).toBe(0);
    expect(getActiveWordIndex(words, 200)).toBe(0);
    expect(getActiveWordIndex(words, 399)).toBe(0);

    expect(getActiveWordIndex(words, 400)).toBe(1);
    expect(getActiveWordIndex(words, 600)).toBe(1);
    expect(getActiveWordIndex(words, 799)).toBe(1);

    expect(getActiveWordIndex(words, 800)).toBe(2);
    expect(getActiveWordIndex(words, 1000)).toBe(2);
    expect(getActiveWordIndex(words, 1199)).toBe(2);
    expect(getActiveWordIndex(words, 1200)).toBe(-1);
  });

  it('returns -1 when time falls in gap between adjacent words', () => {
    const words = [word(0, 400), word(600, 1000)];
    expect(getActiveWordIndex(words, 400)).toBe(-1);
    expect(getActiveWordIndex(words, 500)).toBe(-1);
    expect(getActiveWordIndex(words, 599)).toBe(-1);
    expect(getActiveWordIndex(words, 600)).toBe(1);
  });

  it('returns -1 before the first word when words do not start at 0', () => {
    const words = [word(500, 800), word(800, 1200)];
    expect(getActiveWordIndex(words, 0)).toBe(-1);
    expect(getActiveWordIndex(words, 499)).toBe(-1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Large array — ensures binary search behaves correctly at scale
  // ──────────────────────────────────────────────────────────────────────────
  it('correctly locates a word in a long list via binary search', () => {
    const n = 500;
    const words = Array.from({length: n}, (_, i) => word(i * 200, (i + 1) * 200));

    // Check various positions
    expect(getActiveWordIndex(words, 0)).toBe(0);
    expect(getActiveWordIndex(words, 50 * 200 + 100)).toBe(50);
    expect(getActiveWordIndex(words, 249 * 200)).toBe(249);
    expect(getActiveWordIndex(words, 499 * 200 + 199)).toBe(499);
    // Just past the last word
    expect(getActiveWordIndex(words, 500 * 200)).toBe(-1);
  });

  it('handles all words with the same end as the next start (contiguous)', () => {
    const words = Array.from({length: 10}, (_, i) => word(i * 100, (i + 1) * 100));

    for (let i = 0; i < 10; i++) {
      expect(getActiveWordIndex(words, i * 100)).toBe(i);
      expect(getActiveWordIndex(words, i * 100 + 50)).toBe(i);
    }
    // The very end
    expect(getActiveWordIndex(words, 1000)).toBe(-1);
  });
});
