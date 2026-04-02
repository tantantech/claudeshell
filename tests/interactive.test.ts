import { describe, it, expect } from 'vitest'
import { isInteractiveCommand, executeInteractive } from '../src/interactive.js'

describe('isInteractiveCommand', () => {
  it('returns true for vim', () => {
    expect(isInteractiveCommand('vim file.txt')).toBe(true)
  })

  it('returns true for vi', () => {
    expect(isInteractiveCommand('vi')).toBe(true)
  })

  it('returns true for nvim', () => {
    expect(isInteractiveCommand('nvim')).toBe(true)
  })

  it('returns true for nano', () => {
    expect(isInteractiveCommand('nano readme.md')).toBe(true)
  })

  it('returns true for less', () => {
    expect(isInteractiveCommand('less log.txt')).toBe(true)
  })

  it('returns true for more', () => {
    expect(isInteractiveCommand('more file')).toBe(true)
  })

  it('returns true for man', () => {
    expect(isInteractiveCommand('man ls')).toBe(true)
  })

  it('returns true for ssh', () => {
    expect(isInteractiveCommand('ssh host')).toBe(true)
  })

  it('returns true for htop', () => {
    expect(isInteractiveCommand('htop')).toBe(true)
  })

  it('returns true for top', () => {
    expect(isInteractiveCommand('top')).toBe(true)
  })

  it('returns true for tmux', () => {
    expect(isInteractiveCommand('tmux')).toBe(true)
  })

  it('returns true for screen', () => {
    expect(isInteractiveCommand('screen')).toBe(true)
  })

  it('returns true for fzf', () => {
    expect(isInteractiveCommand('fzf')).toBe(true)
  })

  it('returns false for piped command (cat file | less)', () => {
    expect(isInteractiveCommand('cat file | less')).toBe(false)
  })

  it('returns false for piped command (echo hello | vim -)', () => {
    expect(isInteractiveCommand('echo hello | vim -')).toBe(false)
  })

  it('returns false for ls (not in list)', () => {
    expect(isInteractiveCommand('ls')).toBe(false)
  })

  it('returns false for git log', () => {
    expect(isInteractiveCommand('git log')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isInteractiveCommand('')).toBe(false)
  })

  it('returns true for default command even with user list', () => {
    expect(isInteractiveCommand('vim file.txt', ['python3'])).toBe(true)
  })

  it('returns true for user-configured command', () => {
    expect(isInteractiveCommand('python3', ['python3'])).toBe(true)
  })

  it('returns false for python3 without user list', () => {
    expect(isInteractiveCommand('python3')).toBe(false)
  })
})

describe('executeInteractive', () => {
  it('resolves with exitCode 0 for successful command', async () => {
    const result = await executeInteractive('echo hello')
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })

  it('resolves with non-zero exitCode for failing command', async () => {
    const result = await executeInteractive('exit 42')
    expect(result.exitCode).toBe(42)
    expect(result.stderr).toBe('')
  })
})
