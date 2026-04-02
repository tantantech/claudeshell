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

  it('reads from ~/.nesh/config.json path', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    const { loadConfig } = await loadModule()
    loadConfig()
    expect(vi.mocked(fs.readFileSync)).toHaveBeenCalledWith(
      path.join('/mock-home', '.nesh', 'config.json'),
      'utf-8'
    )
  })
})

describe('loadConfig prefix validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads valid prefix from config', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ prefix: 'ai' })
    )
    const { loadConfig } = await loadModule()
    const config = loadConfig()
    expect(config.prefix).toBe('ai')
  })

  it('ignores empty string prefix', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ prefix: '' })
    )
    const { loadConfig } = await loadModule()
    const config = loadConfig()
    expect(config.prefix).toBeUndefined()
  })

  it('ignores prefix containing whitespace', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ prefix: 'my prefix' })
    )
    const { loadConfig } = await loadModule()
    const config = loadConfig()
    expect(config.prefix).toBeUndefined()
  })

  it('ignores non-string prefix', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ prefix: 123 })
    )
    const { loadConfig } = await loadModule()
    const config = loadConfig()
    expect(config.prefix).toBeUndefined()
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

describe('loadProjectConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns partial config when valid .nesh.json exists with model override', async () => {
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const s = String(p)
      if (s.endsWith('.nesh.json')) {
        return JSON.stringify({ model: 'claude-opus' })
      }
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    const { loadProjectConfig } = await loadModule()
    const result = loadProjectConfig('/test/project')
    expect(result).not.toBeNull()
    expect(result!.model).toBe('claude-opus')
  })

  it('returns null when .nesh.json does not exist', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    const { loadProjectConfig } = await loadModule()
    const result = loadProjectConfig('/no/config')
    expect(result).toBeNull()
  })

  it('warns to stderr and returns null for invalid JSON', async () => {
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const s = String(p)
      if (s.endsWith('.nesh.json')) {
        return 'not valid json {{{'
      }
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    const { loadProjectConfig } = await loadModule()
    const result = loadProjectConfig('/bad/json')
    expect(result).toBeNull()
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Warning'))
    stderrSpy.mockRestore()
  })

  it('validates fields -- only accepts known fields', async () => {
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const s = String(p)
      if (s.endsWith('.nesh.json')) {
        return JSON.stringify({ model: 'claude-opus', unknown_field: 'ignored', extra: 123 })
      }
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    const { loadProjectConfig } = await loadModule()
    const result = loadProjectConfig('/test/project')
    expect(result).not.toBeNull()
    expect(result!.model).toBe('claude-opus')
    expect((result as Record<string, unknown>).unknown_field).toBeUndefined()
    expect((result as Record<string, unknown>).extra).toBeUndefined()
  })

  it('validates permissions field -- only accepts auto, ask, deny', async () => {
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const s = String(p)
      if (s.endsWith('.nesh.json')) {
        return JSON.stringify({ permissions: 'invalid-mode' })
      }
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    const { loadProjectConfig } = await loadModule()
    const result = loadProjectConfig('/test/project')
    // invalid permissions should be stripped
    expect(result).toBeNull()  // no valid fields => null or empty
  })
})

describe('mergeConfigs', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns global when project is null', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    const { mergeConfigs } = await loadModule()
    const global = { model: 'claude-sonnet', history_size: 1000 }
    const result = mergeConfigs(global, null)
    expect(result).toEqual(global)
  })

  it('spreads project over global -- project model overrides global model', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    const { mergeConfigs } = await loadModule()
    const global = { model: 'claude-sonnet', history_size: 1000 }
    const project = { model: 'claude-opus' }
    const result = mergeConfigs(global, project)
    expect(result.model).toBe('claude-opus')
    expect(result.history_size).toBe(1000)
  })

  it('preserves global fields not in project config', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    const { mergeConfigs } = await loadModule()
    const global = { api_key: 'sk-global', model: 'claude-sonnet', history_size: 500 }
    const project = { permissions: 'ask' as const }
    const result = mergeConfigs(global, project)
    expect(result.api_key).toBe('sk-global')
    expect(result.model).toBe('claude-sonnet')
    expect(result.history_size).toBe(500)
    expect(result.permissions).toBe('ask')
  })
})

describe('ensureConfigDir', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates ~/.nesh/ directory with recursive option', async () => {
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined)
    const { ensureConfigDir } = await loadModule()
    ensureConfigDir()
    expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(
      path.join('/mock-home', '.nesh'),
      { recursive: true }
    )
  })
})
