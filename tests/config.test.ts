import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('node:fs')
vi.mock('node:os', () => ({
  default: { homedir: () => '/mock-home' },
  homedir: () => '/mock-home',
}))

// Dynamic import to pick up mocks
const loadModule = async () => {
  vi.resetModules()
  return import('../src/config.js')
}

describe('loadConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns defaults when no config file exists', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    const { loadConfig } = await loadModule()
    const config = loadConfig()
    expect(config).toEqual({ history_size: 1000 })
  })

  it('parses valid JSON config with all fields', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ api_key: 'sk-test', model: 'claude-4', history_size: 5000 })
    )
    const { loadConfig } = await loadModule()
    const config = loadConfig()
    expect(config.api_key).toBe('sk-test')
    expect(config.model).toBe('claude-4')
    expect(config.history_size).toBe(5000)
  })

  it('warns on stderr and returns defaults for invalid JSON', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue('not valid json {{{')
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    const { loadConfig } = await loadModule()
    const config = loadConfig()
    expect(config).toEqual({ history_size: 1000 })
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Warning')
    )
    stderrSpy.mockRestore()
  })

  it('ignores unknown fields in config JSON', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ api_key: 'sk-test', unknown_field: 'ignored', extra: 123 })
    )
    const { loadConfig } = await loadModule()
    const config = loadConfig()
    expect(config.api_key).toBe('sk-test')
    expect((config as Record<string, unknown>).unknown_field).toBeUndefined()
    expect((config as Record<string, unknown>).extra).toBeUndefined()
  })

  it('merges partial config with defaults', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ api_key: 'sk-partial' })
    )
    const { loadConfig } = await loadModule()
    const config = loadConfig()
    expect(config.api_key).toBe('sk-partial')
    expect(config.history_size).toBe(1000)
  })

  it('reads from ~/.claudeshell/config.json path', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    const { loadConfig } = await loadModule()
    loadConfig()
    expect(vi.mocked(fs.readFileSync)).toHaveBeenCalledWith(
      path.join('/mock-home', '.claudeshell', 'config.json'),
      'utf-8'
    )
  })
})

describe('resolveApiKey', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.ANTHROPIC_API_KEY
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalEnv
    } else {
      delete process.env.ANTHROPIC_API_KEY
    }
  })

  it('returns env var when ANTHROPIC_API_KEY is set', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-env-key'
    const { resolveApiKey } = await loadModule()
    const result = resolveApiKey({ api_key: 'sk-config-key' })
    expect(result).toBe('sk-env-key')
  })

  it('returns config api_key when env var is unset', async () => {
    const { resolveApiKey } = await loadModule()
    const result = resolveApiKey({ api_key: 'sk-config-key' })
    expect(result).toBe('sk-config-key')
  })

  it('returns undefined when neither env var nor config key exists', async () => {
    const { resolveApiKey } = await loadModule()
    const result = resolveApiKey({})
    expect(result).toBeUndefined()
  })

  it('returns undefined when called with no config', async () => {
    const { resolveApiKey } = await loadModule()
    const result = resolveApiKey()
    expect(result).toBeUndefined()
  })
})

describe('ensureConfigDir', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates ~/.claudeshell/ directory with recursive option', async () => {
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined)
    const { ensureConfigDir } = await loadModule()
    ensureConfigDir()
    expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(
      path.join('/mock-home', '.claudeshell'),
      { recursive: true }
    )
  })
})
