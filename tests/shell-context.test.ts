import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('node:fs')

const loadContextModule = async () => {
  vi.resetModules()
  return import('../src/context.js')
}

const loadConfigModule = async () => {
  vi.resetModules()
  return import('../src/config.js')
}

const loadBothModules = async () => {
  vi.resetModules()
  const context = await import('../src/context.js')
  const config = await import('../src/config.js')
  return { context, config }
}

describe('Shell context wiring (refreshProjectState integration)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns projectContext and mergedConfig for a Node.js directory', async () => {
    const testDir = '/test/nodejs-project'

    // Mock: package.json exists, .nesh.json does not
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return String(p).endsWith('package.json')
    })
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const filePath = String(p)
      if (filePath.endsWith('package.json')) {
        return JSON.stringify({ name: 'test-app', dependencies: { express: '^4.0.0' } })
      }
      if (filePath.includes('config.json')) {
        return JSON.stringify({ history_size: 1000 })
      }
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    })

    const { context, config } = await loadBothModules()
    context.clearContextCache()

    const projectContext = context.detectProject(testDir)
    const projectConfig = config.loadProjectConfig(testDir)
    const globalConfig = config.loadConfig()
    const mergedConfig = config.mergeConfigs(globalConfig, projectConfig)

    expect(projectContext).not.toBeNull()
    expect(projectContext!.type).toBe('Node.js')
    expect(projectContext!.name).toBe('test-app')
    // mergedConfig should be equivalent to globalConfig since no .nesh.json
    expect(mergedConfig.history_size).toBe(1000)
  })

  it('returns null projectContext and global config for empty directory', async () => {
    const testDir = '/test/empty-dir'

    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const filePath = String(p)
      if (filePath.includes('config.json') && filePath.includes('.nesh')) {
        return JSON.stringify({ history_size: 500, model: 'claude-sonnet' })
      }
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    })

    const { context, config } = await loadBothModules()
    context.clearContextCache()

    const projectContext = context.detectProject(testDir)
    const projectConfig = config.loadProjectConfig(testDir)
    const globalConfig = config.loadConfig()
    const mergedConfig = config.mergeConfigs(globalConfig, projectConfig)

    expect(projectContext).toBeNull()
    expect(projectConfig).toBeNull()
    // mergedConfig should equal globalConfig when no project config
    expect(mergedConfig.model).toBe('claude-sonnet')
    expect(mergedConfig.history_size).toBe(500)
  })

  it('project .nesh.json permissions override global config', async () => {
    const testDir = '/test/deny-project'

    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return String(p).endsWith('package.json')
    })
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const filePath = String(p)
      if (filePath.endsWith('package.json')) {
        return JSON.stringify({ name: 'secure-app' })
      }
      if (filePath === path.join(testDir, '.nesh.json')) {
        return JSON.stringify({ permissions: 'deny' })
      }
      if (filePath.includes('config.json') && filePath.includes('.nesh/')) {
        return JSON.stringify({ permissions: 'auto', history_size: 1000 })
      }
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    })

    const { config } = await loadBothModules()

    const globalConfig = config.loadConfig()
    expect(globalConfig.permissions).toBe('auto')

    const projectConfig = config.loadProjectConfig(testDir)
    expect(projectConfig).not.toBeNull()
    expect(projectConfig!.permissions).toBe('deny')

    const mergedConfig = config.mergeConfigs(globalConfig, projectConfig)
    expect(mergedConfig.permissions).toBe('deny')
  })

  it('project .nesh.json prefix overrides global prefix', async () => {
    const testDir = '/test/custom-prefix'

    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const filePath = String(p)
      if (filePath === path.join(testDir, '.nesh.json')) {
        return JSON.stringify({ prefix: 'claude' })
      }
      if (filePath.includes('config.json') && filePath.includes('.nesh/')) {
        return JSON.stringify({ prefix: 'a', history_size: 1000 })
      }
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    })

    const { config } = await loadBothModules()

    const globalConfig = config.loadConfig()
    expect(globalConfig.prefix).toBe('a')

    const projectConfig = config.loadProjectConfig(testDir)
    expect(projectConfig).not.toBeNull()
    expect(projectConfig!.prefix).toBe('claude')

    const mergedConfig = config.mergeConfigs(globalConfig, projectConfig)
    expect(mergedConfig.prefix).toBe('claude')
  })
})
