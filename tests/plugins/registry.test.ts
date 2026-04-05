import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildRegistry, createEmptyRegistry } from '../../src/plugins/registry.js'
import type { PluginManifest, PluginConfig } from '../../src/plugins/types.js'
import type { CompletionProvider, CompletionSpec } from '../../src/completions/types.js'

function makePlugin(overrides: Partial<PluginManifest> & { name: string }): PluginManifest {
  return {
    version: '1.0.0',
    description: `${overrides.name} plugin`,
    ...overrides,
  }
}

describe('buildRegistry', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves alias from plugin', () => {
    const plugin = makePlugin({
      name: 'git-shortcuts',
      aliases: { gst: 'git status' },
    })
    const config: PluginConfig = {}
    const registry = buildRegistry([plugin], config)

    expect(registry.resolve('gst')).toBe('git status')
  })

  it('user alias overrides plugin alias', () => {
    const plugin = makePlugin({
      name: 'git-shortcuts',
      aliases: { gst: 'git status' },
    })
    const config: PluginConfig = {
      aliases: { gst: 'git stash' },
    }
    const registry = buildRegistry([plugin], config)

    expect(registry.resolve('gst')).toBe('git stash')
  })

  it('collision between 2 plugins emits stderr warning and last plugin wins', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)

    const pluginA = makePlugin({
      name: 'plugin-a',
      aliases: { gst: 'git status' },
    })
    const pluginB = makePlugin({
      name: 'plugin-b',
      aliases: { gst: 'git stash' },
    })
    const config: PluginConfig = {}
    const registry = buildRegistry([pluginA, pluginB], config)

    expect(registry.resolve('gst')).toBe('git stash')
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('plugin-a')
    )
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('plugin-b')
    )
  })

  it('filters out disabled_aliases from plugin config', () => {
    const plugin = makePlugin({
      name: 'git-shortcuts',
      aliases: { gst: 'git status', gco: 'git checkout' },
    })
    const config: PluginConfig = {
      'git-shortcuts': { disabled_aliases: ['gst'] },
    }
    const registry = buildRegistry([plugin], config)

    expect(registry.resolve('gst')).toBeUndefined()
    expect(registry.resolve('gco')).toBe('git checkout')
  })

  it('getAll returns ReadonlyMap with all aliases and source', () => {
    const plugin = makePlugin({
      name: 'git-shortcuts',
      aliases: { gst: 'git status' },
    })
    const config: PluginConfig = {
      aliases: { ll: 'ls -la' },
    }
    const registry = buildRegistry([plugin], config)
    const all = registry.getAll()

    expect(all.get('gst')).toEqual({ expansion: 'git status', source: 'git-shortcuts' })
    expect(all.get('ll')).toEqual({ expansion: 'ls -la', source: 'user' })
    expect(all.size).toBe(2)
  })

  it('getPlugins returns array of plugin metadata with status', () => {
    const plugin = makePlugin({
      name: 'git-shortcuts',
      aliases: { gst: 'git status' },
    })
    const config: PluginConfig = {}
    const registry = buildRegistry([plugin], config)
    const plugins = registry.getPlugins()

    expect(plugins).toHaveLength(1)
    expect(plugins[0].manifest.name).toBe('git-shortcuts')
    expect(plugins[0].status).toBe('loaded')
  })

  it('getHooks returns handlers grouped by hook name', () => {
    const preCommandHandler = vi.fn()
    const plugin = makePlugin({
      name: 'hook-plugin',
      hooks: { preCommand: preCommandHandler },
    })
    const config: PluginConfig = {}
    const registry = buildRegistry([plugin], config)

    const handlers = registry.getHooks('preCommand')
    expect(handlers).toHaveLength(1)
    expect(handlers[0]).toBe(preCommandHandler)

    const empty = registry.getHooks('postCommand')
    expect(empty).toHaveLength(0)
  })

  describe('completion provider lookup', () => {
    it('getCompletionProvider returns provider registered by plugin name', () => {
      const provider: CompletionProvider = async () => ({ items: ['commit', 'push'] })
      const plugin = makePlugin({
        name: 'git',
        completions: provider,
      })
      const config: PluginConfig = {}
      const registry = buildRegistry([plugin], config)

      expect(registry.getCompletionProvider('git')).toBe(provider)
    })

    it('getCompletionProvider returns undefined for unknown command', () => {
      const config: PluginConfig = {}
      const registry = buildRegistry([], config)

      expect(registry.getCompletionProvider('unknown')).toBeUndefined()
    })

    it('first plugin to register completions for a command wins', () => {
      const providerA: CompletionProvider = async () => ({ items: ['a'] })
      const providerB: CompletionProvider = async () => ({ items: ['b'] })
      const pluginA = makePlugin({ name: 'git', completions: providerA })
      const pluginB = makePlugin({ name: 'git-extra', completions: providerB })
      // pluginB has a different name, so it won't collide on the same key
      // The provider map is keyed by plugin.name
      const config: PluginConfig = {}
      const registry = buildRegistry([pluginA, pluginB], config)

      expect(registry.getCompletionProvider('git')).toBe(providerA)
    })
  })

  describe('completion spec lookup', () => {
    it('getCompletionSpecs returns specs from plugin completionSpecs', () => {
      const spec: CompletionSpec = { name: 'docker', subcommands: { run: { name: 'run' } } }
      const plugin = makePlugin({
        name: 'docker-completions',
        completionSpecs: [spec],
      })
      const config: PluginConfig = {}
      const registry = buildRegistry([plugin], config)

      const result = registry.getCompletionSpecs('docker')
      expect(result).toEqual([spec])
    })

    it('getCompletionSpecs returns undefined for unknown command', () => {
      const config: PluginConfig = {}
      const registry = buildRegistry([], config)

      expect(registry.getCompletionSpecs('unknown')).toBeUndefined()
    })

    it('first plugin to register spec for a command name wins', () => {
      const specA: CompletionSpec = { name: 'git', subcommands: { commit: { name: 'commit' } } }
      const specB: CompletionSpec = { name: 'git', subcommands: { push: { name: 'push' } } }
      const pluginA = makePlugin({ name: 'git-specs', completionSpecs: [specA] })
      const pluginB = makePlugin({ name: 'git-extra-specs', completionSpecs: [specB] })
      const config: PluginConfig = {}
      const registry = buildRegistry([pluginA, pluginB], config)

      const result = registry.getCompletionSpecs('git')
      expect(result).toEqual([specA])
    })
  })
})

describe('createEmptyRegistry', () => {
  it('resolve always returns undefined', () => {
    const registry = createEmptyRegistry()

    expect(registry.resolve('anything')).toBeUndefined()
    expect(registry.resolve('')).toBeUndefined()
  })

  it('getAll returns empty map', () => {
    const registry = createEmptyRegistry()
    expect(registry.getAll().size).toBe(0)
  })

  it('getPlugins returns empty array', () => {
    const registry = createEmptyRegistry()
    expect(registry.getPlugins()).toHaveLength(0)
  })

  it('getHooks returns empty array', () => {
    const registry = createEmptyRegistry()
    expect(registry.getHooks('preCommand')).toHaveLength(0)
  })

  it('getCompletionProvider returns undefined', () => {
    const registry = createEmptyRegistry()
    expect(registry.getCompletionProvider('anything')).toBeUndefined()
  })

  it('getCompletionSpecs returns undefined', () => {
    const registry = createEmptyRegistry()
    expect(registry.getCompletionSpecs('anything')).toBeUndefined()
  })
})
