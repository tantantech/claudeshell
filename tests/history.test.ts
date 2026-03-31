import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as os from 'node:os'
import * as path from 'node:path'
import * as fs from 'node:fs'
import {
  loadHistory,
  saveHistory,
  shouldSaveToHistory,
  HISTORY_PATH,
  MAX_HISTORY,
} from '../src/history.js'

describe('HISTORY_PATH', () => {
  it('ends with .claudeshell_history', () => {
    expect(HISTORY_PATH.endsWith('.claudeshell_history')).toBe(true)
  })

  it('is in the home directory', () => {
    expect(HISTORY_PATH).toBe(path.join(os.homedir(), '.claudeshell_history'))
  })
})

describe('MAX_HISTORY', () => {
  it('is 10000', () => {
    expect(MAX_HISTORY).toBe(10_000)
  })
})

describe('loadHistory', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'claudeshell-hist-')))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns lines from existing file', () => {
    const filePath = path.join(tempDir, 'history')
    fs.writeFileSync(filePath, 'ls\npwd\ngit status\n', 'utf-8')
    const result = loadHistory(filePath)
    expect(result).toEqual(['ls', 'pwd', 'git status'])
  })

  it('returns empty array for nonexistent file', () => {
    const result = loadHistory(path.join(tempDir, 'nonexistent'))
    expect(result).toEqual([])
  })

  it('filters out empty lines', () => {
    const filePath = path.join(tempDir, 'history')
    fs.writeFileSync(filePath, 'ls\n\npwd\n\n', 'utf-8')
    const result = loadHistory(filePath)
    expect(result).toEqual(['ls', 'pwd'])
  })

  it('truncates to MAX_HISTORY entries keeping the most recent', () => {
    const filePath = path.join(tempDir, 'history')
    const lines = Array.from({ length: 10_005 }, (_, i) => `cmd-${i}`)
    fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8')
    const result = loadHistory(filePath)
    expect(result.length).toBe(MAX_HISTORY)
    expect(result[0]).toBe('cmd-5')
    expect(result[result.length - 1]).toBe('cmd-10004')
  })
})

describe('saveHistory', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'claudeshell-hist-')))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('writes entries to file with newline separator', () => {
    const filePath = path.join(tempDir, 'history')
    saveHistory(['ls', 'pwd', 'git status'], filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    expect(content).toBe('ls\npwd\ngit status\n')
  })

  it('creates parent directory if it does not exist', () => {
    const filePath = path.join(tempDir, 'subdir', 'nested', 'history')
    saveHistory(['ls'], filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    expect(content).toBe('ls\n')
  })

  it('does not throw on write failure', () => {
    // /dev/null/impossible is not writable
    expect(() => saveHistory(['ls'], '/dev/null/impossible/history')).not.toThrow()
  })
})

describe('shouldSaveToHistory', () => {
  it('returns true for a valid new command', () => {
    expect(shouldSaveToHistory('ls', undefined)).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(shouldSaveToHistory('', undefined)).toBe(false)
  })

  it('returns false for whitespace-only string', () => {
    expect(shouldSaveToHistory('  ', undefined)).toBe(false)
  })

  it('returns false for space-prefixed command', () => {
    expect(shouldSaveToHistory(' secret cmd', undefined)).toBe(false)
  })

  it('returns false for consecutive duplicate', () => {
    expect(shouldSaveToHistory('ls', 'ls')).toBe(false)
  })

  it('returns true when different from previous', () => {
    expect(shouldSaveToHistory('ls', 'pwd')).toBe(true)
  })

  it('returns false for duplicate even with trailing spaces in previous', () => {
    expect(shouldSaveToHistory('ls', 'ls  ')).toBe(false)
  })
})
