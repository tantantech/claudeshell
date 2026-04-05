import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCompletionEngine } from '../../src/completions/engine.js'
import type { PluginRegistry } from '../../src/plugins/registry.js'
import type { CompletionProvider, CompletionSpec } from '../../src/completions/types.js'
import { createEmptyRegistry } from '../../src/plugins/registry.js'

function makeRegistry(overrides: Partial<PluginRegistry> = {}): PluginRegistry {
  const empty = createEmptyRegistry()
  return { ...empty, ...overrides }
}

describe('createCompletionEngine', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns [[], line] on empty input', async () => {
    const engine = createCompletionEngine(makeRegistry())
    const result = await engine.complete('')

    expect(result).toEqual([[], ''])
  })

  it('dispatches to plugin CompletionProvider when registry has one', async () => {
    const provider: CompletionProvider = vi.fn(async () => ({
      items: ['commit', 'checkout'],
      prefix: 'co',
    }))
    const registry = makeRegistry({
      getCompletionProvider: (name: string) => (name === 'git' ? provider : undefined),
    })
    const engine = createCompletionEngine(registry)
    const result = await engine.complete('git co')

    expect(provider).toHaveBeenCalled()
    expect(result).toEqual([['commit', 'checkout'], 'co'])
  })

  it('dispatches to spec parser when registry has CompletionSpec', async () => {
    const spec: CompletionSpec = {
      name: 'docker',
      subcommands: { run: { name: 'run' }, build: { name: 'build' } },
    }
    const registry = makeRegistry({
      getCompletionSpecs: (name: string) => (name === 'docker' ? [spec] : undefined),
    })
    const engine = createCompletionEngine(registry)
    const result = await engine.complete('docker r')

    expect(result[0]).toContain('run')
    expect(result[1]).toBe('r')
  })

  it('falls back to compgen when no plugin or spec exists', async () => {
    const registry = makeRegistry()
    const engine = createCompletionEngine(registry)
    // compgen 'command' for first word position - this won't match much but shouldn't throw
    const result = await engine.complete('nonexistent_cmd_xyz')

    expect(Array.isArray(result[0])).toBe(true)
    expect(typeof result[1]).toBe('string')
  })

  it('times out slow providers after 1 second', async () => {
    const slowProvider: CompletionProvider = vi.fn(
      () => new Promise((resolve) => setTimeout(() => resolve({ items: ['slow'] }), 5000)),
    )
    const registry = makeRegistry({
      getCompletionProvider: (name: string) => (name === 'slow' ? slowProvider : undefined),
    })
    const engine = createCompletionEngine(registry)
    const start = Date.now()
    const result = await engine.complete('slow arg')
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(2000)
    expect(result[0]).toEqual([])
  }, 10000)

  it('caches results and returns them on repeated calls', async () => {
    let callCount = 0
    const provider: CompletionProvider = vi.fn(async () => {
      callCount++
      return { items: ['commit', 'checkout'], prefix: 'co' }
    })
    const registry = makeRegistry({
      getCompletionProvider: (name: string) => (name === 'git' ? provider : undefined),
    })
    const engine = createCompletionEngine(registry)

    const result1 = await engine.complete('git co')
    const result2 = await engine.complete('git co')

    expect(result1).toEqual(result2)
    expect(callCount).toBe(1)
  })

  it('never throws -- returns empty results on provider error', async () => {
    const badProvider: CompletionProvider = vi.fn(async () => {
      throw new Error('provider crashed')
    })
    const registry = makeRegistry({
      getCompletionProvider: (name: string) => (name === 'bad' ? badProvider : undefined),
    })
    const engine = createCompletionEngine(registry)
    const result = await engine.complete('bad arg')

    expect(result[0]).toEqual([])
  })

  it('returns complete method on created engine', () => {
    const engine = createCompletionEngine(makeRegistry())

    expect(typeof engine.complete).toBe('function')
  })
})
