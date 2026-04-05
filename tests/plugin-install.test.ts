import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock node:child_process
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}))

// Mock node:fs
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
  },
}))

// Mock config
vi.mock('../src/config.js', () => ({
  CONFIG_DIR: '/mock/.nesh',
  loadConfig: vi.fn(() => ({ plugins: { enabled: ['test-plugin'] } })),
  saveConfig: vi.fn(),
}))

// Mock external plugin loader
vi.mock('../src/plugins/external.js', () => ({
  loadExternalPlugin: vi.fn(),
}))

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { loadConfig, saveConfig } from '../src/config.js'
import { loadExternalPlugin } from '../src/plugins/external.js'
import { installPlugin, updatePlugin, removePlugin } from '../src/plugin-install.js'
import type { PluginManifest } from '../src/plugins/types.js'
import { EventEmitter } from 'node:events'

function createMockProcess(code: number, stderr = ''): ReturnType<typeof spawn> {
  const proc = new EventEmitter() as ReturnType<typeof spawn>
  const stderrEmitter = new EventEmitter()
  ;(proc as unknown as Record<string, unknown>).stderr = stderrEmitter
  ;(proc as unknown as Record<string, unknown>).stdout = new EventEmitter()
  setImmediate(() => {
    if (stderr) stderrEmitter.emit('data', Buffer.from(stderr))
    proc.emit('close', code)
  })
  return proc
}

function createMockReadline(answer: string) {
  return {
    question: vi.fn((_prompt: string, cb: (ans: string) => void) => cb(answer)),
  } as unknown as import('node:readline').Interface
}

describe('plugin-install', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('installPlugin', () => {
    it('expands user/repo to GitHub URL and clones with --depth 1', async () => {
      const rl = createMockReadline('y')
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(spawn)
        .mockReturnValueOnce(createMockProcess(0)) // git --version
        .mockReturnValueOnce(createMockProcess(0)) // git clone
      vi.mocked(loadExternalPlugin).mockResolvedValue({
        name: 'my-plugin',
        version: '1.0.0',
        description: 'Test plugin',
      })

      const result = await installPlugin('user/my-plugin', rl)

      expect(result).not.toBeNull()
      expect(result?.name).toBe('my-plugin')
      const cloneCall = vi.mocked(spawn).mock.calls[1]
      expect(cloneCall[0]).toBe('git')
      expect(cloneCall[1]).toContain('clone')
      expect(cloneCall[1]).toContain('--depth')
      expect(cloneCall[1]).toContain('1')
      expect(cloneCall[1]).toContain('https://github.com/user/my-plugin.git')
    })

    it('rejects if git is not available', async () => {
      const rl = createMockReadline('y')
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(spawn).mockReturnValueOnce(createMockProcess(127))

      const result = await installPlugin('user/repo', rl)

      expect(result).toBeNull()
    })

    it('rejects if plugin directory already exists', async () => {
      const rl = createMockReadline('y')
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(spawn).mockReturnValueOnce(createMockProcess(0)) // git --version

      const result = await installPlugin('user/repo', rl)

      expect(result).toBeNull()
    })

    it('returns null if user declines confirmation', async () => {
      const rl = createMockReadline('n')
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(spawn).mockReturnValueOnce(createMockProcess(0)) // git --version

      const result = await installPlugin('user/my-plugin', rl)

      expect(result).toBeNull()
    })

    it('cleans up on clone failure', async () => {
      const rl = createMockReadline('y')
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(spawn)
        .mockReturnValueOnce(createMockProcess(0)) // git --version
        .mockReturnValueOnce(createMockProcess(1, 'clone error')) // git clone fails

      const result = await installPlugin('user/my-plugin', rl)

      expect(result).toBeNull()
      expect(fs.rmSync).toHaveBeenCalled()
    })

    it('cleans up if manifest is invalid', async () => {
      const rl = createMockReadline('y')
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(spawn)
        .mockReturnValueOnce(createMockProcess(0)) // git --version
        .mockReturnValueOnce(createMockProcess(0)) // git clone
      vi.mocked(loadExternalPlugin).mockResolvedValue(null)

      const result = await installPlugin('user/my-plugin', rl)

      expect(result).toBeNull()
      expect(fs.rmSync).toHaveBeenCalled()
    })

    it('handles full URL format', async () => {
      const rl = createMockReadline('y')
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(spawn)
        .mockReturnValueOnce(createMockProcess(0))
        .mockReturnValueOnce(createMockProcess(0))
      vi.mocked(loadExternalPlugin).mockResolvedValue({
        name: 'custom-plugin',
        version: '1.0.0',
        description: 'Custom',
      })

      const result = await installPlugin('https://gitlab.com/org/custom-plugin.git', rl)

      expect(result).not.toBeNull()
      const cloneCall = vi.mocked(spawn).mock.calls[1]
      expect(cloneCall[1]).toContain('https://gitlab.com/org/custom-plugin.git')
    })
  })

  describe('updatePlugin', () => {
    it('runs git pull in plugin directory', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(spawn).mockReturnValueOnce(createMockProcess(0))

      const result = await updatePlugin('my-plugin')

      expect(result).toBeNull()
      const pullCall = vi.mocked(spawn).mock.calls[0]
      expect(pullCall[0]).toBe('git')
      expect(pullCall[1]).toContain('pull')
      expect(pullCall[1]).toContain('--ff-only')
    })

    it('returns error if directory does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = await updatePlugin('nonexistent')

      expect(result).not.toBeNull()
      expect(typeof result).toBe('string')
    })

    it('returns error on pull failure', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(spawn).mockReturnValueOnce(createMockProcess(1, 'merge conflict'))

      const result = await updatePlugin('my-plugin')

      expect(result).not.toBeNull()
      expect(result).toContain('merge conflict')
    })
  })

  describe('removePlugin', () => {
    it('removes directory and updates config', async () => {
      vi.mocked(loadConfig).mockReturnValue({
        plugins: { enabled: ['my-plugin', 'other'] },
      })

      await removePlugin('my-plugin')

      expect(fs.rmSync).toHaveBeenCalled()
      expect(saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          plugins: expect.objectContaining({
            enabled: ['other'],
          }),
        }),
      )
    })

    it('handles plugin not in enabled list', async () => {
      vi.mocked(loadConfig).mockReturnValue({
        plugins: { enabled: ['other'] },
      })

      await removePlugin('nonexistent')

      expect(fs.rmSync).toHaveBeenCalled()
      // saveConfig still called (config unchanged but save is fine)
      expect(saveConfig).toHaveBeenCalled()
    })
  })
})
