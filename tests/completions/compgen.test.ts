import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:child_process', () => {
  const execFileFn = vi.fn()
  return {
    execFile: execFileFn,
  }
})

import { execFile } from 'node:child_process'
import { compgenComplete } from '../../src/completions/compgen.js'

const mockExecFile = vi.mocked(execFile)

function setupExecFile(stdout: string, err: Error | null = null) {
  mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
    const callback = cb as (err: Error | null, stdout: string, stderr: string) => void
    if (err) {
      callback(err, '', err.message)
    } else {
      callback(null, stdout, '')
    }
    return {} as ReturnType<typeof execFile>
  })
}

describe('compgenComplete', () => {
  beforeEach(() => {
    mockExecFile.mockReset()
  })

  it('compgenComplete("command", "gi") returns array of strings', async () => {
    setupExecFile('git\ngit-upload-pack\n')
    const result = await compgenComplete('command', 'gi')
    expect(result).toEqual(['git', 'git-upload-pack'])
  })

  it('compgenComplete("file", "src/") returns array of strings', async () => {
    setupExecFile('src/cli.ts\nsrc/shell.ts\n')
    const result = await compgenComplete('file', 'src/')
    expect(result).toEqual(['src/cli.ts', 'src/shell.ts'])
  })

  it('rejects unsafe input containing shell metacharacters', async () => {
    const unsafeInputs = ['foo;bar', 'foo|bar', 'foo&bar', 'foo`bar', 'foo$bar']
    for (const input of unsafeInputs) {
      const result = await compgenComplete('command', input)
      expect(result).toEqual([])
    }
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('returns empty array on subprocess timeout', async () => {
    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
      const callback = cb as (err: Error | null, stdout: string, stderr: string) => void
      const err = new Error('timeout') as Error & { killed: boolean }
      err.killed = true
      callback(err, '', '')
      return {} as ReturnType<typeof execFile>
    })
    const result = await compgenComplete('command', 'gi')
    expect(result).toEqual([])
  })

  it('returns empty array when bash not found', async () => {
    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
      const callback = cb as (err: Error | null, stdout: string, stderr: string) => void
      const err = new Error('ENOENT') as Error & { code: string }
      err.code = 'ENOENT'
      callback(err, '', '')
      return {} as ReturnType<typeof execFile>
    })
    const result = await compgenComplete('command', 'gi')
    expect(result).toEqual([])
  })
})
