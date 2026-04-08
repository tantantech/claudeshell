import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as os from 'node:os'

// Mock child_process before importing
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

// Mock segment-cache to avoid real caching in tests
vi.mock('../src/segment-cache.js', () => {
  const cache = {
    get: vi.fn(() => undefined),
    set: vi.fn(),
    clear: vi.fn(),
  }
  return { segmentCache: cache }
})

import { execFileSync } from 'node:child_process'
import {
  getGitStatus,
  getExecTime,
  getExitCode,
  getClock,
  getNodeVersion,
  getPythonVenv,
  getUserHost,
} from '../src/segments.js'
import { segmentCache } from '../src/segment-cache.js'

const mockExecFileSync = vi.mocked(execFileSync)
const mockCache = vi.mocked(segmentCache)

describe('getGitStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCache.get.mockReturnValue(undefined)
  })

  it('parses modified, staged, untracked, and branch info', () => {
    const output = [
      '# branch.oid abc123',
      '# branch.head main',
      '# branch.ab +2 -1',
      '1 .M N... 100644 100644 100644 abc def file1.ts',
      '1 M. N... 100644 100644 100644 abc def file2.ts',
      '1 MM N... 100644 100644 100644 abc def file3.ts',
      '? untracked.txt',
    ].join('\n')

    mockExecFileSync.mockReturnValue(output)
    const result = getGitStatus()

    expect(result).not.toBeNull()
    expect(result!.dirty).toBe(2)     // .M and MM have worktree changes
    expect(result!.staged).toBe(2)    // M. and MM have index changes
    expect(result!.untracked).toBe(1)
    expect(result!.ahead).toBe(2)
    expect(result!.behind).toBe(1)
  })

  it('returns null outside git repo', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('not a git repo')
    })
    expect(getGitStatus()).toBeNull()
  })

  it('returns cached result if available', () => {
    const cached = { dirty: 1, staged: 0, untracked: 0, ahead: 0, behind: 0, stash: 0 }
    mockCache.get.mockReturnValue(cached)
    const result = getGitStatus()
    expect(result).toBe(cached)
    expect(mockExecFileSync).not.toHaveBeenCalled()
  })

  it('handles repo with no remote tracking (no branch.ab)', () => {
    const output = [
      '# branch.oid abc123',
      '# branch.head main',
      '1 .M N... 100644 100644 100644 abc def file1.ts',
    ].join('\n')

    mockExecFileSync.mockReturnValue(output)
    const result = getGitStatus()
    expect(result).not.toBeNull()
    expect(result!.ahead).toBe(0)
    expect(result!.behind).toBe(0)
  })
})

describe('getExecTime', () => {
  it('returns undefined when below threshold', () => {
    const start = Date.now()
    expect(getExecTime(start, 1000)).toBeUndefined()
  })

  it('returns formatted seconds for short durations', () => {
    const start = Date.now() - 1500
    const result = getExecTime(start, 1000)
    expect(result).toMatch(/^1\.\d+s$/)
  })

  it('returns formatted minutes and seconds for long durations', () => {
    const start = Date.now() - 135000  // 2m 15s
    const result = getExecTime(start, 1000)
    expect(result).toBe('2m 15s')
  })

  it('uses default 1000ms threshold', () => {
    const start = Date.now() - 500
    expect(getExecTime(start)).toBeUndefined()
  })
})

describe('getExitCode', () => {
  it('returns undefined for code 0', () => {
    expect(getExitCode(0)).toBeUndefined()
  })

  it('returns string for non-zero code', () => {
    expect(getExitCode(1)).toBe('1')
    expect(getExitCode(127)).toBe('127')
  })
})

describe('getClock', () => {
  it('returns HH:MM:SS format in 24h mode', () => {
    const result = getClock('24h')
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })

  it('returns 12h format with AM/PM', () => {
    const result = getClock('12h')
    expect(result).toMatch(/^\d{1,2}:\d{2}:\d{2} (AM|PM)$/)
  })

  it('returns undefined for none', () => {
    expect(getClock('none')).toBeUndefined()
  })

  it('defaults to 24h when called without args', () => {
    const result = getClock()
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})

describe('getNodeVersion', () => {
  it('returns major version string', () => {
    const result = getNodeVersion()
    expect(result).toMatch(/^v\d+$/)
  })
})

describe('getPythonVenv', () => {
  const origEnv = process.env.VIRTUAL_ENV

  afterEach(() => {
    if (origEnv !== undefined) {
      process.env.VIRTUAL_ENV = origEnv
    } else {
      delete process.env.VIRTUAL_ENV
    }
  })

  it('returns basename of VIRTUAL_ENV', () => {
    process.env.VIRTUAL_ENV = '/home/user/project/.venv'
    expect(getPythonVenv()).toBe('.venv')
  })

  it('returns undefined when VIRTUAL_ENV not set', () => {
    delete process.env.VIRTUAL_ENV
    expect(getPythonVenv()).toBeUndefined()
  })
})

describe('getUserHost', () => {
  it('returns user@hostname format', () => {
    const result = getUserHost()
    const expected = `${os.userInfo().username}@${os.hostname()}`
    expect(result).toBe(expected)
  })
})
