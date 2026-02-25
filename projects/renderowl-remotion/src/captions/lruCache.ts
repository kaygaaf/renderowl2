// ============================================================================
// LRU Cache for Text Measurements
// ============================================================================
// Prevents unbounded memory growth during long renders while maintaining
// good cache hit rates for repeated text measurements.
//
// Typical usage: ~80% hit rate with 1000 entries, ~95% with 5000 entries
// Memory: ~200 bytes per entry (string key + number value + linked list node)
// ============================================================================

interface LruNode<V> {
  key: string;
  value: V;
  prev: LruNode<V> | null;
  next: LruNode<V> | null;
}

export class LruCache<V> {
  private cache: Map<string, LruNode<V>>;
  private head: LruNode<V> | null = null;
  private tail: LruNode<V> | null = null;
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number) {
    this.maxSize = Math.max(1, maxSize);
    this.cache = new Map();
  }

  get size(): number {
    return this.cache.size;
  }

  get(key: string): V | undefined {
    const node = this.cache.get(key);
    if (node === undefined) {
      this.misses++;
      return undefined;
    }

    this.hits++;
    this.moveToFront(node);
    return node.value;
  }

  set(key: string, value: V): void {
    const existing = this.cache.get(key);
    if (existing !== undefined) {
      existing.value = value;
      this.moveToFront(existing);
      return;
    }

    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const node: LruNode<V> = {
      key,
      value,
      prev: null,
      next: this.head
    };

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }

    this.cache.set(key, node);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.hits = 0;
    this.misses = 0;
  }

  /** Hit rate between 0 and 1 (0% to 100%) */
  get hitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  get stats(): {hits: number; misses: number; hitRate: number; size: number} {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hitRate,
      size: this.cache.size
    };
  }

  private moveToFront(node: LruNode<V>): void {
    if (node === this.head) return;

    // Remove from current position
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.tail) this.tail = node.prev;

    // Insert at front
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
  }

  private evictLRU(): void {
    if (!this.tail) return;

    this.cache.delete(this.tail.key);

    if (this.tail.prev) {
      this.tail.prev.next = null;
      this.tail = this.tail.prev;
    } else {
      this.head = null;
      this.tail = null;
    }
  }
}
