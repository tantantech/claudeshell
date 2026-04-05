import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn(() => ({
    plugins: { enabled: ['git'] },
  })),
}))

vi.mock('../src/plugins/loader.js', () => ({
  loadPluginsPhase1: vi.fn(() => ({
    registry: { resolve: vi.fn() },
    enabledPlugins: [],
  })),
  loadPluginsPhase2: vi.fn(async () => []),
}))

vi.mock('../src/plugins/hooks.js', () => ({
  buildHookBus: vi.fn(() => ({
    preCommand: [],
    postCommand: [],
    prePrompt: [],
    onCd: [],
  })),
}))

vi.mock('../src/plugins/index.js', () => ({
  BUNDLED_PLUGINS: [],
}))

vi.mock('../src/plugins/external.js', () => ({
  discoverExternalPlugins: vi.fn(async () => []),
}))

import { loadConfig } from '../src/config.js'
import { loadPluginsPhase1 } from '../src/plugins/loader.js'
import { buildHookBus } from '../src/plugins/hooks.js'
import { discoverExternalPlugins } from '../src/plugins/external.js'
import { hotReload } from '../src/plugin-reload.js'
import type { PluginManifest } from '../src/plugins/types.js'

describe('plugin-reload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns object with registry, hookBus, enabled properties', async () => {
    const result = await hotReload()

    expect(result).toHaveProperty('registry')
    expect(result).toHaveProperty('hookBus')
    expect(result).toHaveProperty('enabled')
  })

  it('calls loadConfig to get fresh config', async () => {
    await hotReload()

    expect(loadConfig).toHaveBeenCalledOnce()
  })

  it('calls discoverExternalPlugins', async () => {
    await hotReload()

    expect(discoverExternalPlugins).toHaveBeenCalledOnce()
  })

  it('calls loadPluginsPhase1 with combined bundled + external plugins', async () => {
    const externalPlugin: PluginManifest = {
      name: 'ext-plugin',
      version: '1.0.0',
      description: 'External',
    }
    vi.mocked(discoverExternalPlugins).mockResolvedValue([externalPlugin])

    await hotReload()

    expect(loadPluginsPhase1).toHaveBeenCalledOnce()
    const callArgs = vi.mocked(loadPluginsPhase1).mock.calls[0]
    // First arg: config.plugins
    expect(callArgs[0]).toEqual({ enabled: ['git'] })
    // Second arg: combined array (BUNDLED_PLUGINS is [] + external)
    expect(callArgs[1]).toContainEqual(externalPlugin)
  })

  it('calls buildHookBus with enabledPlugins from phase1', async () => {
    const mockPlugin: PluginManifest = {
      name: 'git',
      version: '1.0.0',
      description: 'Git plugin',
    }
    vi.mocked(loadPluginsPhase1).mockReturnValue({
      registry: { resolve: vi.fn() } as never,
      enabledPlugins: [mockPlugin],
    })

    await hotReload()

    expect(buildHookBus).toHaveBeenCalledOnce()
    expect(buildHookBus).toHaveBeenCalledWith([mockPlugin])
  })

  it('returns the hookBus from buildHookBus', async () => {
    const mockBus = {
      preCommand: [],
      postCommand: [],
      prePrompt: [],
      onCd: [],
    }
    vi.mocked(buildHookBus).mockReturnValue(mockBus)

    const result = await hotReload()

    expect(result.hookBus).toBe(mockBus)
  })
})
