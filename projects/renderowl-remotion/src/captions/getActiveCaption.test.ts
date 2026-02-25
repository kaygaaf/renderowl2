import {describe, expect, it} from 'vitest';
import {getActiveCaption} from './getActiveCaption';
import type {CaptionSegment} from '../types';

const seg = (startMs: number, endMs: number, text = 'test'): CaptionSegment => ({
  startMs,
  endMs,
  text,
});

describe('getActiveCaption', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Empty / trivial
  // ──────────────────────────────────────────────────────────────────────────
  it('returns null for empty captions array', () => {
    const {caption, index} = getActiveCaption([], 500);
    expect(caption).toBeNull();
    expect(index).toBe(-1);
  });

  it('handles a single caption that covers the time', () => {
    const captions = [seg(0, 1000)];
    const {caption, index} = getActiveCaption(captions, 500);
    expect(caption).toBe(captions[0]);
    expect(index).toBe(0);
  });

  it('returns null before the first caption starts', () => {
    const captions = [seg(500, 1500)];
    expect(getActiveCaption(captions, 0).caption).toBeNull();
    expect(getActiveCaption(captions, 499).caption).toBeNull();
  });

  it('returns null after the last caption ends', () => {
    const captions = [seg(0, 1000)];
    expect(getActiveCaption(captions, 1000).caption).toBeNull();
    expect(getActiveCaption(captions, 9999).caption).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Boundary conditions
  // ──────────────────────────────────────────────────────────────────────────
  it('is inclusive of startMs', () => {
    const captions = [seg(1000, 2000)];
    const {caption} = getActiveCaption(captions, 1000);
    expect(caption).toBe(captions[0]);
  });

  it('is exclusive of endMs', () => {
    const captions = [seg(1000, 2000)];
    const {caption} = getActiveCaption(captions, 2000);
    expect(caption).toBeNull();
  });

  it('finds caption at the last millisecond of its range', () => {
    const captions = [seg(0, 1000)];
    expect(getActiveCaption(captions, 999).caption).toBe(captions[0]);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Multiple captions (sorted — uses binary search)
  // ──────────────────────────────────────────────────────────────────────────
  it('returns correct segment among several', () => {
    const captions = [seg(0, 1000), seg(1000, 2000), seg(2000, 3000)];
    expect(getActiveCaption(captions, 0).index).toBe(0);
    expect(getActiveCaption(captions, 1000).index).toBe(1);
    expect(getActiveCaption(captions, 2000).index).toBe(2);
  });

  it('returns null when time falls in a gap between captions', () => {
    const captions = [seg(0, 1000), seg(2000, 3000)];
    expect(getActiveCaption(captions, 1500).caption).toBeNull();
  });

  it('identifies the correct index for all segments', () => {
    const n = 10;
    const captions = Array.from({length: n}, (_, i) => seg(i * 1000, (i + 1) * 1000));

    for (let i = 0; i < n; i++) {
      const {caption, index} = getActiveCaption(captions, i * 1000 + 100);
      expect(index).toBe(i);
      expect(caption).toBe(captions[i]);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Large array — verifies O(log n) path is exercised correctly
  // ──────────────────────────────────────────────────────────────────────────
  it('finds correct segment in a large sorted array', () => {
    const n = 2000;
    const captions = Array.from({length: n}, (_, i) => seg(i * 1000, (i + 1) * 1000));
    const {caption, index} = getActiveCaption(captions, 1337 * 1000 + 500);
    expect(index).toBe(1337);
    expect(caption).toBe(captions[1337]);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Unsorted input — falls back to linear scan for correctness
  // ──────────────────────────────────────────────────────────────────────────
  it('falls back to linear scan for unsorted captions', () => {
    const unsorted: CaptionSegment[] = [
      seg(2000, 3000, 'third'),
      seg(0, 1000, 'first'),
      seg(1000, 2000, 'second'),
    ];

    const {caption} = getActiveCaption(unsorted, 500);
    expect(caption?.text).toBe('first');

    const {caption: c2} = getActiveCaption(unsorted, 1500);
    expect(c2?.text).toBe('second');

    const {caption: c3} = getActiveCaption(unsorted, 2500);
    expect(c3?.text).toBe('third');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Sortedness cache — same array reference reuses cached result
  // ──────────────────────────────────────────────────────────────────────────
  it('caches sortedness check and returns consistent results across calls', () => {
    const captions = [seg(0, 1000), seg(1000, 2000), seg(2000, 3000)];

    // Populate the cache with the first call
    const first = getActiveCaption(captions, 500);
    // Second call should use the cached sortedness and still return the right result
    const second = getActiveCaption(captions, 1500);
    const third = getActiveCaption(captions, 2500);

    expect(first.index).toBe(0);
    expect(second.index).toBe(1);
    expect(third.index).toBe(2);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Captions with gaps of varying sizes
  // ──────────────────────────────────────────────────────────────────────────
  it('handles captions with large gaps between segments', () => {
    const captions = [seg(0, 100), seg(50000, 60000), seg(200000, 210000)];

    expect(getActiveCaption(captions, 50).caption).toBe(captions[0]);
    expect(getActiveCaption(captions, 5000).caption).toBeNull();
    expect(getActiveCaption(captions, 55000).caption).toBe(captions[1]);
    expect(getActiveCaption(captions, 100000).caption).toBeNull();
    expect(getActiveCaption(captions, 205000).caption).toBe(captions[2]);
  });
});
