interface CacheEntry<T> {
  readonly value: T
  readonly expiresAt: number
}

export interface CompletionCache<T> {
  get(key: string): T | undefined
  set(key: string, value: T, ttlMs: number): void
  clear(): void
}

export function createCompletionCache<T>(maxSize = 500): CompletionCache<T> {
  const store = new Map<string, CacheEntry<T>>()

  return {
    get(key: string): T | undefined {
      const entry = store.get(key)
      if (!entry) return undefined
      if (Date.now() > entry.expiresAt) {
        store.delete(key)
        return undefined
      }
      return entry.value
    },

    set(key: string, value: T, ttlMs: number): void {
      if (store.size >= maxSize) {
        const firstKey = store.keys().next().value as string
        store.delete(firstKey)
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
    },

    clear(): void {
      store.clear()
    },
  }
}
