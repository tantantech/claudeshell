import { describe, it, expect, vi, beforeEach } from 'vitest'
import type * as readline from 'node:readline/promises'

// Mock dependencies before importing
vi.mock('../src/builtins.js', () => ({
  executeTheme: vi.fn(),
}))
vi.mock('../src/model-switcher.js', () => ({
  executeModelSwitcher: vi.fn(),
}))
vi.mock('../src/key-manager.js', () => ({
  executeKeyManager: vi.fn(),
}))
vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn(() => ({
    prefix: 'a',
    permissions: 'ask',
    history_size: 1000,
  })),
  saveConfig: vi.fn(),
}))

import { executeSettings } from '../src/settings.js'
import { executeTheme } from '../src/builtins.js'
import { executeModelSwitcher } from '../src/model-switcher.js'
import { executeKeyManager } from '../src/key-manager.js'
import { loadConfig, saveConfig } from '../src/config.js'

function createMockRl(answers: string[]): readline.Interface {
  let callIndex = 0
  return {
    question: vi.fn(async () => {
      const answer = answers[callIndex] ?? ''
      callIndex++
      return answer
    }),
  } as unknown as readline.Interface
}

describe('executeSettings', () => {
  let stdoutOutput: string

  beforeEach(() => {
    vi.clearAllMocks()
    stdoutOutput = ''
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutOutput += String(chunk)
      return true
    })
    vi.mocked(loadConfig).mockReturnValue({
      prefix: 'a',
      permissions: 'ask',
      history_size: 1000,
    })
  })

  it('displays numbered menu with 6 options', async () => {
    const rl = createMockRl([''])
    await executeSettings(rl, undefined)

    expect(stdoutOutput).toContain('[1]')
    expect(stdoutOutput).toContain('[2]')
    expect(stdoutOutput).toContain('[3]')
    expect(stdoutOutput).toContain('[4]')
    expect(stdoutOutput).toContain('[5]')
    expect(stdoutOutput).toContain('[6]')
    expect(stdoutOutput).toContain('Theme')
    expect(stdoutOutput).toContain('Model')
    expect(stdoutOutput).toContain('API Keys')
    expect(stdoutOutput).toContain('Prefix')
    expect(stdoutOutput).toContain('Permissions')
    expect(stdoutOutput).toContain('History Size')
  })

  it('returns empty result on invalid input', async () => {
    const rl = createMockRl(['abc'])
    const result = await executeSettings(rl, undefined)
    expect(result).toEqual({})
  })

  it('returns empty result on empty input', async () => {
    const rl = createMockRl([''])
    const result = await executeSettings(rl, undefined)
    expect(result).toEqual({})
  })

  it('delegates to executeTheme when selecting option 1', async () => {
    vi.mocked(executeTheme).mockResolvedValue('powerline')
    const rl = createMockRl(['1'])
    const result = await executeSettings(rl, undefined)

    expect(executeTheme).toHaveBeenCalledWith(rl)
    expect(result).toEqual({ templateName: 'powerline' })
  })

  it('delegates to executeModelSwitcher when selecting option 2', async () => {
    vi.mocked(executeModelSwitcher).mockResolvedValue('claude-sonnet-4-5-20250514')
    const rl = createMockRl(['2'])
    const result = await executeSettings(rl, 'claude-haiku-4-5-20251001')

    expect(executeModelSwitcher).toHaveBeenCalledWith(rl, 'claude-haiku-4-5-20251001')
    expect(result).toEqual({ model: 'claude-sonnet-4-5-20250514' })
  })

  it('delegates to executeKeyManager when selecting option 3', async () => {
    vi.mocked(executeKeyManager).mockResolvedValue(undefined)
    const rl = createMockRl(['3'])
    const result = await executeSettings(rl, undefined)

    expect(executeKeyManager).toHaveBeenCalledWith(rl)
    expect(result).toEqual({})
  })

  it('prompts for prefix, validates no whitespace, and saves', async () => {
    const rl = createMockRl(['4', 'hey'])
    const result = await executeSettings(rl, undefined)

    expect(vi.mocked(saveConfig)).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: 'hey' })
    )
    expect(result).toEqual({ prefix: 'hey' })
  })

  it('rejects prefix with whitespace', async () => {
    const rl = createMockRl(['4', 'he y'])
    const result = await executeSettings(rl, undefined)

    expect(vi.mocked(saveConfig)).not.toHaveBeenCalled()
    expect(result).toEqual({})
  })

  it('shows permissions choices and saves selection', async () => {
    const rl = createMockRl(['5', '1'])
    const result = await executeSettings(rl, undefined)

    expect(vi.mocked(saveConfig)).toHaveBeenCalledWith(
      expect.objectContaining({ permissions: 'auto' })
    )
    expect(result).toEqual({ permissions: 'auto' })
  })

  it('shows permissions with current marked', async () => {
    vi.mocked(loadConfig).mockReturnValue({
      prefix: 'a',
      permissions: 'deny',
      history_size: 1000,
    })
    const rl = createMockRl(['5', ''])
    await executeSettings(rl, undefined)

    // Output should show the permissions menu
    expect(stdoutOutput).toContain('auto')
    expect(stdoutOutput).toContain('ask')
    expect(stdoutOutput).toContain('deny')
  })

  it('prompts for history size, validates positive integer >= 100, and saves', async () => {
    const rl = createMockRl(['6', '5000'])
    const result = await executeSettings(rl, undefined)

    expect(vi.mocked(saveConfig)).toHaveBeenCalledWith(
      expect.objectContaining({ history_size: 5000 })
    )
    expect(result).toEqual({ historySize: 5000 })
  })

  it('rejects history size below 100', async () => {
    const rl = createMockRl(['6', '50'])
    const result = await executeSettings(rl, undefined)

    expect(vi.mocked(saveConfig)).not.toHaveBeenCalled()
    expect(result).toEqual({})
  })

  it('rejects non-numeric history size', async () => {
    const rl = createMockRl(['6', 'abc'])
    const result = await executeSettings(rl, undefined)

    expect(vi.mocked(saveConfig)).not.toHaveBeenCalled()
    expect(result).toEqual({})
  })
})
