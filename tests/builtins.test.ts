import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as os from 'node:os'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { executeCd, executeExport, expandTilde } from '../src/builtins.js'
import type { CdState } from '../src/types.js'

describe('expandTilde', () => {
  it('expands lone ~ to homedir', () => {
    expect(expandTilde('~')).toBe(os.homedir())
  })

  it('expands ~/foo to homedir/foo', () => {
    expect(expandTilde('~/foo')).toBe(path.join(os.homedir(), 'foo'))
  })

  it('leaves absolute paths unchanged', () => {
    expect(expandTilde('/tmp')).toBe('/tmp')
  })

  it('leaves relative paths unchanged', () => {
    expect(expandTilde('foo/bar')).toBe('foo/bar')
  })
})

describe('executeCd', () => {
  let originalCwd: string
  let tempDir: string

  beforeEach(() => {
    originalCwd = process.cwd()
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nesh-test-')))
  })

  afterEach(() => {
    process.chdir(originalCwd)
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('changes to HOME when no args given', () => {
    const state: CdState = { previousDir: undefined }
    const result = executeCd('', state)
    expect(process.cwd()).toBe(os.homedir())
    expect(result.error).toBeUndefined()
  })

  it('returns new state with previousDir set to cwd before change', () => {
    const state: CdState = { previousDir: undefined }
    const cwdBefore = process.cwd()
    const result = executeCd('', state)
    expect(result.newState.previousDir).toBe(cwdBefore)
  })

  it('does not mutate the original state', () => {
    const state: CdState = { previousDir: undefined }
    const result = executeCd('', state)
    expect(state.previousDir).toBeUndefined()
    expect(result.newState.previousDir).toBeDefined()
  })

  it('changes to previousDir when - is given', () => {
    process.chdir(tempDir)
    const state: CdState = { previousDir: originalCwd }
    const result = executeCd('-', state)
    expect(process.cwd()).toBe(originalCwd)
    expect(result.output).toBe(originalCwd)
    expect(result.error).toBeUndefined()
  })

  it('returns error when - is given but no previousDir', () => {
    const state: CdState = { previousDir: undefined }
    const result = executeCd('-', state)
    expect(result.error).toBe('cd: OLDPWD not set')
    expect(result.newState).toBe(state)
  })

  it('expands ~ to homedir', () => {
    const state: CdState = { previousDir: undefined }
    const result = executeCd('~', state)
    expect(process.cwd()).toBe(os.homedir())
    expect(result.error).toBeUndefined()
  })

  it('expands ~/subdir to homedir/subdir', () => {
    const subdir = path.join(tempDir, 'subtest')
    fs.mkdirSync(subdir)
    // Use a path relative to tempDir that we can tilde-expand
    const state: CdState = { previousDir: undefined }
    const result = executeCd(subdir, state)
    expect(process.cwd()).toBe(subdir)
    expect(result.error).toBeUndefined()
  })

  it('changes to a valid absolute path', () => {
    const state: CdState = { previousDir: undefined }
    const result = executeCd(tempDir, state)
    expect(process.cwd()).toBe(tempDir)
    expect(result.error).toBeUndefined()
  })

  it('returns error for nonexistent path without changing cwd', () => {
    const cwdBefore = process.cwd()
    const state: CdState = { previousDir: undefined }
    const result = executeCd('/nonexistent_dir_12345', state)
    expect(result.error).toBe('cd: no such file or directory: /nonexistent_dir_12345')
    expect(process.cwd()).toBe(cwdBefore)
    expect(result.newState).toBe(state)
  })

  it('sets previousDir to cwd before change on successful cd', () => {
    const cwdBefore = process.cwd()
    const state: CdState = { previousDir: '/some/old/dir' }
    const result = executeCd(tempDir, state)
    expect(result.newState.previousDir).toBe(cwdBefore)
  })
})

describe('executeExport', () => {
  const testEnvKey = '__NESH_TEST_EXPORT__'

  afterEach(() => {
    delete process.env[testEnvKey]
  })

  it('sets environment variable with KEY=VALUE', () => {
    const result = executeExport(`${testEnvKey}=bar`)
    expect(result).toBeUndefined()
    expect(process.env[testEnvKey]).toBe('bar')
  })

  it('sets environment variable to empty string with KEY=', () => {
    const result = executeExport(`${testEnvKey}=`)
    expect(result).toBeUndefined()
    expect(process.env[testEnvKey]).toBe('')
  })

  it('returns error for input without equals sign', () => {
    const result = executeExport('invalid-no-equals')
    expect(result).toContain('invalid format')
  })

  it('handles values containing equals signs', () => {
    const result = executeExport(`${testEnvKey}=a=b=c`)
    expect(result).toBeUndefined()
    expect(process.env[testEnvKey]).toBe('a=b=c')
  })
})
