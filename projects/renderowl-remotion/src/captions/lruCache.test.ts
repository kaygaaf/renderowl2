import {describe, expect, it} from 'vitest';
import {LruCache} from './lruCache';

describe('LruCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LruCache<number>(3);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('returns undefined for missing keys', () => {
    const cache = new LruCache<number>(3);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('evicts LRU when over capacity', () => {
    const cache = new LruCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // Evicts 'a'

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('updates access order on get', () => {
    const cache = new LruCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' is now most recently used
    cache.set('c', 3); // Should evict 'b', not 'a'

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('updates value and moves to front on existing key', () => {
    const cache = new LruCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 10); // Update 'a', move to front
    cache.set('c', 3); // Evicts 'b'

    expect(cache.get('a')).toBe(10);
    expect(cache.get('b')).toBeUndefined();
  });

  it('tracks hit rate correctly', () => {
    const cache = new LruCache<number>(10);
    expect(cache.hitRate).toBe(0);

    cache.set('a', 1);
    cache.get('a'); // hit
    cache.get('a'); // hit
    cache.get('missing'); // miss

    expect(cache.stats.hits).toBe(2);
    expect(cache.stats.misses).toBe(1);
    expect(cache.hitRate).toBeCloseTo(2 / 3);
  });

  it('clears all entries', () => {
    const cache = new LruCache<number>(10);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
    expect(cache.size).toBe(0);
    expect(cache.hitRate).toBe(0);
  });

  it('respects minimum size of 1', () => {
    const cache = new LruCache<number>(0);
    cache.set('a', 1);
    cache.set('b', 2);

    // With size 1, only most recent should remain
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
  });

  it('handles single item correctly', () => {
    const cache = new LruCache<number>(1);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    cache.set('b', 2);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
  });
});
