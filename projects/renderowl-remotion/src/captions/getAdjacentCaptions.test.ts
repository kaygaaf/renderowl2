import {describe, expect, it} from 'vitest';
import {getAdjacentCaptions, getTransitionProgress} from './getAdjacentCaptions';
import type {CaptionSegment} from '../types';

const seg = (startMs: number, endMs: number, text = 'test'): CaptionSegment => ({
  startMs,
  endMs,
  text,
});

describe('getAdjacentCaptions', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Empty / trivial
  // ──────────────────────────────────────────────────────────────────────────
  it('returns null for empty captions array', () => {
    const result = getAdjacentCaptions([], 500);
    expect(result.current).toBeNull();
    expect(result.previous).toBeNull();
    expect(result.next).toBeNull();
    expect(result.currentIndex).toBe(-1);
  });

  it('returns single caption as current when active', () => {
    const captions = [seg(0, 1000)];
    const result = getAdjacentCaptions(captions, 500);
    expect(result.current).toBe(captions[0]);
    expect(result.previous).toBeNull();
    expect(result.next).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Previous caption during transition
  // ──────────────────────────────────────────────────────────────────────────
  it('returns previous caption during transition window after it ends', () => {
    const captions = [seg(0, 1000), seg(1000, 2000)];
    const result = getAdjacentCaptions(captions, 1100, 200); // 100ms after first ends
    expect(result.current).toBe(captions[1]);
    expect(result.previous).toBe(captions[0]);
    expect(result.previousIndex).toBe(0);
  });

  it('does not return previous caption after transition window', () => {
    const captions = [seg(0, 1000), seg(1000, 2000)];
    const result = getAdjacentCaptions(captions, 1250, 200); // 250ms after first ends
    expect(result.current).toBe(captions[1]);
    expect(result.previous).toBeNull();
  });

  it('does not return previous when at first caption', () => {
    const captions = [seg(1000, 2000), seg(2000, 3000)];
    const result = getAdjacentCaptions(captions, 1500, 200);
    expect(result.current).toBe(captions[0]);
    expect(result.previous).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Next caption preview
  // ──────────────────────────────────────────────────────────────────────────
  it('returns next caption during transition window before it starts', () => {
    const captions = [seg(0, 1000), seg(1000, 2000)];
    const result = getAdjacentCaptions(captions, 950, 100); // 50ms before next starts
    expect(result.current).toBe(captions[0]);
    expect(result.next).toBe(captions[1]);
    expect(result.nextIndex).toBe(1);
  });

  it('does not return next caption outside transition window', () => {
    const captions = [seg(0, 1000), seg(1000, 2000)];
    const result = getAdjacentCaptions(captions, 800, 100); // 200ms before next starts
    expect(result.current).toBe(captions[0]);
    expect(result.next).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Gap handling
  // ──────────────────────────────────────────────────────────────────────────
  it('handles gaps between captions correctly', () => {
    const captions = [seg(0, 500), seg(1500, 2500)];
    
    // In the gap
    const inGap = getAdjacentCaptions(captions, 1000, 200);
    expect(inGap.current).toBeNull();
    expect(inGap.previous).toBeNull(); // Too far from previous
    expect(inGap.next).toBeNull(); // Too far from next

    // Near previous end
    const nearPrev = getAdjacentCaptions(captions, 600, 200);
    expect(nearPrev.current).toBeNull();
    expect(nearPrev.previous).toBe(captions[0]); // 100ms after end, within transition
    expect(nearPrev.next).toBeNull();

    // Near next start
    const nearNext = getAdjacentCaptions(captions, 1400, 100);
    expect(nearNext.current).toBeNull();
    expect(nearNext.previous).toBeNull();
    expect(nearNext.next).toBe(captions[1]); // 100ms before start, within transition
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Multiple captions
  // ──────────────────────────────────────────────────────────────────────────
  it('handles multiple captions with transitions', () => {
    const captions = [
      seg(0, 1000, 'first'),
      seg(1000, 2000, 'second'),
      seg(2000, 3000, 'third'),
    ];

    const result = getAdjacentCaptions(captions, 1100, 150);
    expect(result.current?.text).toBe('second');
    expect(result.previous?.text).toBe('first');
    expect(result.next).toBeNull();
  });

  it('returns correct indices for all properties', () => {
    const captions = [
      seg(0, 1000),
      seg(1000, 2000),
      seg(2000, 3000),
    ];

    const result = getAdjacentCaptions(captions, 1100, 200);
    expect(result.currentIndex).toBe(1);
    expect(result.previousIndex).toBe(0);
    expect(result.nextIndex).toBe(-1);
  });
});

describe('getTransitionProgress', () => {
  it('calculates fade-in progress correctly', () => {
    const caption = seg(1000, 2000);
    
    expect(getTransitionProgress(caption, 1000, 200, 'in')).toBe(0);
    expect(getTransitionProgress(caption, 1100, 200, 'in')).toBe(0.5);
    expect(getTransitionProgress(caption, 1200, 200, 'in')).toBe(1);
    expect(getTransitionProgress(caption, 1500, 200, 'in')).toBe(1);
  });

  it('calculates fade-out progress correctly', () => {
    const caption = seg(1000, 2000);
    
    expect(getTransitionProgress(caption, 1800, 200, 'out')).toBe(1);
    expect(getTransitionProgress(caption, 1900, 200, 'out')).toBe(0.5);
    expect(getTransitionProgress(caption, 2000, 200, 'out')).toBe(0);
    expect(getTransitionProgress(caption, 1500, 200, 'out')).toBe(1);
  });

  it('handles edge cases', () => {
    const caption = seg(1000, 2000);
    
    // Before caption starts, fade-in should be 0
    expect(getTransitionProgress(caption, 500, 200, 'in')).toBe(0);
    
    // After caption ends, fade-out should be 0
    expect(getTransitionProgress(caption, 2500, 200, 'out')).toBe(0);
  });
});
