import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCompletionCache } from '../../src/completions/cache.js'

describe('createCompletionCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('get() returns undefined for missing key', () => {
    const cache = createCompletionCache<string>()
    expect(cache.get('missing')).toBeUndefined()
  })

  it('set() then get() returns stored value', () => {
    const cache = createCompletionCache<string>()
    cache.set('key1', 'value1', 5000)
    expect(cache.get('key1')).toBe('value1')
  })

  it('get() returns undefined after TTL expires', () => {
    const cache = createCompletionCache<string>()
    cache.set('key1', 'value1', 1000)
    expect(cache.get('key1')).toBe('value1')

    vi.advanceTimersByTime(1001)
    expect(cache.get('key1')).toBeUndefined()
  })

  it('set() evicts oldest entry when maxSize exceeded', () => {
    const cache = createCompletionCache<string>(2)
    cache.set('a', 'first', 10000)
    cache.set('b', 'second', 10000)
    cache.set('c', 'third', 10000)

    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe('second')
    expect(cache.get('c')).toBe('third')
  })

  it('clear() removes all entries', () => {
    const cache = createCompletionCache<string>()
    cache.set('a', 'one', 10000)
    cache.set('b', 'two', 10000)
    cache.clear()

    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
  })
})
