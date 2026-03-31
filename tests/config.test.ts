import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import { resolveApiKey } from '../src/config.js'

vi.mock('node:fs')

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

  it('returns env var when ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-key-123'
    const result = resolveApiKey()
    expect(result).toBe('sk-test-key-123')
  })

  it('returns undefined when no env var and no config file', () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory')
    })
    const result = resolveApiKey()
    expect(result).toBeUndefined()
  })

  it('reads api_key from config file when env var is unset', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ api_key: 'sk-from-config-file' })
    )
    const result = resolveApiKey()
    expect(result).toBe('sk-from-config-file')
  })

  it('returns undefined on malformed config file', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('not valid json {{{')
    const result = resolveApiKey()
    expect(result).toBeUndefined()
  })
})
