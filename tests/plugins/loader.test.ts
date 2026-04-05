import { describe, expect, it, vi } from 'vitest'
import { loadPluginsPhase1, loadPluginsPhase2 } from '../../src/plugins/loader.js'
import { plugin as gitPlugin } from '../../src/plugins/git.js'
import type { HookContext, PluginManifest } from '../../src/plugins/types.js'

const ctx: HookContext = { cwd: '/tmp' }

function makePlugin(name: string, opts?: Partial<PluginManifest>): PluginManifest {
  return {
    name,
    version: '1.0.0',
    description: `Test plugin ${name}`,
    aliases: { [`${name}-alias`]: `${name} command` },
    ...opts,
  }
}

describe('loadPluginsPhase1', () => {
  it('with git plugin enabled, resolve("gst") returns "git status"', () => {
    const { registry } = loadPluginsPhase1(
      { enabled: ['git'] },
      [gitPlugin],
    )

    expect(registry.resolve('gst')).toBe('git status')
  })

  it('with unknown plugin name in enabled list, skips without crashing', () => {
    const p = makePlugin('real')

    const { registry } = loadPluginsPhase1(
      { enabled: ['real', 'nonexistent'] },
      [p],
    )

    expect(registry.getPlugins()).toHaveLength(1)
    expect(registry.getPlugins()[0].manifest.name).toBe('real')
  })

  it('completes in under 50ms with 30 mock alias-only plugins', () => {
    const plugins: PluginManifest[] = Array.from({ length: 30 }, (_, i) => {
      const aliases: Record<string, string> = {}
      for (let j = 0; j < 10; j++) {
        aliases[`p${i}a${j}`] = `command-${i}-${j}`
      }
      return {
        name: `plugin-${i}`,
        version: '1.0.0',
        description: `Mock plugin ${i}`,
        aliases,
      }
    })
    const enabled = plugins.map((p) => p.name)

    const start = performance.now()
    const { registry } = loadPluginsPhase1({ enabled }, plugins)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(50)
    expect(registry.getAll().size).toBe(300)
  })

  it('respects topological sort order', () => {
    const a = makePlugin('A', { dependencies: ['B'] })
    const b = makePlugin('B')

    const { enabledPlugins } = loadPluginsPhase1(
      { enabled: ['A', 'B'] },
      [a, b],
    )

    const names = enabledPlugins.map((p) => p.name)
    expect(names.indexOf('B')).toBeLessThan(names.indexOf('A'))
  })
})

describe('loadPluginsPhase2', () => {
  it('calls init() on plugins that have it', async () => {
    const initFn = vi.fn().mockResolvedValue(undefined)
    const p = makePlugin('initable', { init: initFn })

    const failed = await loadPluginsPhase2([p], ctx)

    expect(initFn).toHaveBeenCalledWith(ctx)
    expect(failed).toEqual([])
  })

  it('with crashing init(), logs warning and does not throw', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    const badInit = vi.fn().mockRejectedValue(new Error('kaboom'))
    const p = makePlugin('crasher', { init: badInit })

    const failed = await loadPluginsPhase2([p], ctx)

    expect(failed).toEqual(['crasher'])
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('kaboom'),
    )

    stderrSpy.mockRestore()
  })
})

describe('platform filtering', () => {
  it('includes plugin with no platform field', () => {
    const p = makePlugin('noplat')

    const { enabledPlugins } = loadPluginsPhase1(
      { enabled: ['noplat'] },
      [p],
    )

    expect(enabledPlugins.map((x) => x.name)).toContain('noplat')
  })

  it('includes plugin with platform "all"', () => {
    const p = makePlugin('allplat', { platform: 'all' })

    const { enabledPlugins } = loadPluginsPhase1(
      { enabled: ['allplat'] },
      [p],
    )

    expect(enabledPlugins.map((x) => x.name)).toContain('allplat')
  })

  it('includes plugin with platform "macos" when process.platform is darwin', () => {
    // On macOS CI/dev this test validates inclusion
    if (process.platform !== 'darwin') return

    const p = makePlugin('maconly', { platform: 'macos' })

    const { enabledPlugins } = loadPluginsPhase1(
      { enabled: ['maconly'] },
      [p],
    )

    expect(enabledPlugins.map((x) => x.name)).toContain('maconly')
  })

  it('excludes plugin with platform "linux" when process.platform is darwin', () => {
    if (process.platform !== 'darwin') return

    const p = makePlugin('linuxonly', { platform: 'linux' })

    const { enabledPlugins } = loadPluginsPhase1(
      { enabled: ['linuxonly'] },
      [p],
    )

    expect(enabledPlugins.map((x) => x.name)).not.toContain('linuxonly')
  })
})

describe('git plugin', () => {
  it('has name "git", version "1.0.0", and at least 25 aliases', () => {
    expect(gitPlugin.name).toBe('git')
    expect(gitPlugin.version).toBe('1.0.0')
    expect(Object.keys(gitPlugin.aliases ?? {}).length).toBeGreaterThanOrEqual(25)
  })

  it('has no init or destroy functions (pure data)', () => {
    expect(gitPlugin.init).toBeUndefined()
    expect(gitPlugin.destroy).toBeUndefined()
  })
})
