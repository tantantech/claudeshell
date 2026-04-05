interface CacheEntry<T> {
  readonly value: T
  readonly expiresAt: number
}

export class SegmentCache<T = unknown> {
  private readonly defaultTtl: number
  private cache = new Map<string, CacheEntry<T>>()

  constructor(defaultTtl = 2000) {
    this.defaultTtl = defaultTtl
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T, ttlOverride?: number): void {
    const ttl = ttlOverride ?? this.defaultTtl
    const entry: CacheEntry<T> = { value, expiresAt: Date.now() + ttl }
    // Create new map to avoid mutation of iteration state
    const next = new Map(this.cache)
    next.set(key, entry)
    this.cache = next
  }

  clear(): void {
    this.cache = new Map()
  }
}

export const segmentCache = new SegmentCache(2000)
