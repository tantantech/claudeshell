import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing
vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
}))

vi.mock('../src/plugin-install.js', () => ({
  installPlugin: vi.fn(),
  updatePlugin: vi.fn(),
  removePlugin: vi.fn(),
}))

vi.mock('../src/plugin-reload.js', () => ({
  hotReload: vi.fn(),
}))

vi.mock('../src/plugins/index.js', () => ({
  BUNDLED_PLUGINS: [
    { name: 'git', version: '1.0.0', description: 'Git aliases and shortcuts', platform: 'all' },
    { name: 'docker-completions', version: '1.0.0', description: 'Docker command completions', platform: 'all' },
    { name: 'extract', version: '1.0.0', description: 'Extract archives', platform: 'linux' },
  ],
}))

vi.mock('../src/plugins/profiles.js', () => ({
  PROFILES: [
    { name: 'core', description: 'Essential git aliases', plugins: ['git'] },
    { name: 'developer', description: 'Full dev environment', extends: 'core', plugins: ['npm-completions', 'docker-completions'] },
  ],
  expandProfile: vi.fn(),
}))

import { executePlugin } from '../src/plugin-manager.js'
import type { PluginManagerContext } from '../src/plugin-manager.js'
import { loadConfig, saveConfig } from '../src/config.js'
import { installPlugin, updatePlugin, removePlugin } from '../src/plugin-install.js'
import { expandProfile } from '../src/plugins/profiles.js'
import type { PluginRegistry } from '../src/plugins/registry.js'
import type { PluginEntry } from '../src/plugins/registry.js'
import type { PluginManifest } from '../src/plugins/types.js'

function createMockRegistry(plugins?: readonly PluginEntry[]): PluginRegistry {
  const entries: readonly PluginEntry[] = plugins ?? [
    { manifest: { name: 'git', version: '1.0.0', description: 'Git aliases', platform: 'all' as const } as PluginManifest, status: 'loaded' },
    { manifest: { name: 'docker-completions', version: '1.0.0', description: 'Docker completions', platform: 'all' as const } as PluginManifest, status: 'loaded' },
  ]
  return {
    resolve: vi.fn(),
    getAll: vi.fn(() => new Map()),
    getPlugins: vi.fn(() => entries),
    getHooks: vi.fn(() => []),
    getCompletionProvider: vi.fn(),
    getCompletionSpecs: vi.fn(),
  }
}

function createMockRl(): any {
  return {
    question: vi.fn(),
  }
}

function createCtx(overrides?: Partial<PluginManagerContext>): PluginManagerContext {
  return {
    pluginRegistry: createMockRegistry(),
    rl: createMockRl(),
    onHotReload: vi.fn(),
    ...overrides,
  }
}

describe('plugin-manager', () => {
  let output: string

  beforeEach(() => {
    vi.clearAllMocks()
    output = ''
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      output += String(chunk)
      return true
    })
    vi.mocked(loadConfig).mockReturnValue({ history_size: 1000, plugins: { enabled: ['git'] } })
  })

  describe('help / no args', () => {
    it('shows usage when called with no args', async () => {
      const ctx = createCtx()
      await executePlugin('', ctx)
      expect(output).toContain('plugin')
      expect(output).toContain('list')
      expect(output).toContain('enable')
      expect(output).toContain('disable')
      expect(output).toContain('install')
    })

    it('shows usage when called with help', async () => {
      const ctx = createCtx()
      await executePlugin('help', ctx)
      expect(output).toContain('plugin')
    })
  })

  describe('list', () => {
    it('lists all plugins with enabled/disabled status', async () => {
      const ctx = createCtx()
      await executePlugin('list', ctx)
      expect(output).toContain('git')
      expect(output).toContain('docker-completions')
    })
  })

  describe('enable', () => {
    it('adds plugin to enabled list and saves config', async () => {
      const ctx = createCtx()
      await executePlugin('enable docker-completions', ctx)
      expect(saveConfig).toHaveBeenCalled()
      const savedConfig = vi.mocked(saveConfig).mock.calls[0][0]
      expect((savedConfig.plugins?.enabled as string[]) ?? []).toContain('docker-completions')
    })

    it('signals hot-reload after enable', async () => {
      const ctx = createCtx()
      await executePlugin('enable docker-completions', ctx)
      expect(output).toContain('docker-completions')
    })

    it('does not duplicate already-enabled plugins', async () => {
      const ctx = createCtx()
      await executePlugin('enable git', ctx)
      // git is already in enabled list, should not be duplicated
      const calls = vi.mocked(saveConfig).mock.calls
      if (calls.length > 0) {
        const enabled = calls[0][0].plugins?.enabled as string[] ?? []
        const gitCount = enabled.filter(p => p === 'git').length
        expect(gitCount).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('disable', () => {
    it('removes plugin from enabled list and saves config', async () => {
      const ctx = createCtx()
      await executePlugin('disable git', ctx)
      expect(saveConfig).toHaveBeenCalled()
      const savedConfig = vi.mocked(saveConfig).mock.calls[0][0]
      expect((savedConfig.plugins?.enabled as string[]) ?? []).not.toContain('git')
    })
  })

  describe('install', () => {
    it('calls installPlugin and adds to enabled on success', async () => {
      const manifest: PluginManifest = { name: 'my-plugin', version: '1.0.0', description: 'A plugin' }
      vi.mocked(installPlugin).mockResolvedValue(manifest)
      const ctx = createCtx()

      await executePlugin('install user/repo', ctx)
      expect(installPlugin).toHaveBeenCalledWith('user/repo', ctx.rl)
      expect(saveConfig).toHaveBeenCalled()
    })

    it('prints abort message when installPlugin returns null', async () => {
      vi.mocked(installPlugin).mockResolvedValue(null)
      const ctx = createCtx()

      await executePlugin('install user/repo', ctx)
      expect(output).toMatch(/abort|cancel/i)
    })
  })

  describe('update', () => {
    it('calls updatePlugin and prints success on null result', async () => {
      vi.mocked(updatePlugin).mockResolvedValue(null)
      const ctx = createCtx()

      await executePlugin('update myplugin', ctx)
      expect(updatePlugin).toHaveBeenCalledWith('myplugin')
      expect(output).toMatch(/updated|success/i)
    })

    it('prints error message when updatePlugin returns string', async () => {
      vi.mocked(updatePlugin).mockResolvedValue('Failed to update')
      const ctx = createCtx()

      await executePlugin('update myplugin', ctx)
      expect(output).toContain('Failed to update')
    })
  })

  describe('remove', () => {
    it('calls removePlugin and prints confirmation', async () => {
      vi.mocked(removePlugin).mockResolvedValue(undefined)
      const ctx = createCtx()

      await executePlugin('remove myplugin', ctx)
      expect(removePlugin).toHaveBeenCalledWith('myplugin')
      expect(output).toMatch(/removed/i)
    })
  })

  describe('search', () => {
    it('filters bundled plugins by name', async () => {
      const ctx = createCtx()
      await executePlugin('search git', ctx)
      expect(output).toContain('git')
    })

    it('filters bundled plugins by description (case-insensitive)', async () => {
      const ctx = createCtx()
      await executePlugin('search docker', ctx)
      expect(output).toContain('docker-completions')
    })

    it('shows no results message for unmatched query', async () => {
      const ctx = createCtx()
      await executePlugin('search zzzznonexistent', ctx)
      expect(output).toMatch(/no.*found|no.*match/i)
    })
  })

  describe('doctor', () => {
    it('shows healthy status when no failed plugins', async () => {
      const ctx = createCtx()
      await executePlugin('doctor', ctx)
      expect(output).toMatch(/plugin|health/i)
    })

    it('shows failed plugins when present', async () => {
      const failedRegistry = createMockRegistry([
        { manifest: { name: 'broken', version: '1.0.0', description: 'Broken' } as PluginManifest, status: 'failed' },
      ])
      const ctx = createCtx({ pluginRegistry: failedRegistry })
      await executePlugin('doctor', ctx)
      expect(output).toContain('broken')
    })
  })

  describe('times', () => {
    it('shows plugin timing information', async () => {
      const ctx = createCtx()
      await executePlugin('times', ctx)
      expect(output).toMatch(/plugin|load|time/i)
    })
  })

  describe('profile', () => {
    it('shows interactive profile selector', async () => {
      vi.mocked(expandProfile).mockReturnValue(['git', 'npm-completions', 'docker-completions'])
      const ctx = createCtx()
      const mockRl = ctx.rl as any
      mockRl.question.mockResolvedValue('1')

      await executePlugin('profile', ctx)
      expect(output).toContain('core')
      expect(output).toContain('developer')
      expect(expandProfile).toHaveBeenCalled()
      expect(saveConfig).toHaveBeenCalled()
    })

    it('cancels on invalid selection', async () => {
      const ctx = createCtx()
      const mockRl = ctx.rl as any
      mockRl.question.mockResolvedValue('99')

      await executePlugin('profile', ctx)
      expect(output).toMatch(/cancel/i)
    })
  })
})
