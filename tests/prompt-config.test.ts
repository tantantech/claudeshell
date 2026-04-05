import { describe, it, expect } from 'vitest'
import { getIcon, getSeparator, DEFAULT_SEGMENTS } from '../src/prompt-config.js'
import type { IconMode } from '../src/prompt-config.js'

describe('getIcon', () => {
  it('returns nerd font glyphs for nerd-font mode', () => {
    expect(getIcon('branch', 'nerd-font')).toBe('\uE0A0')
    expect(getIcon('folder', 'nerd-font')).toBe('\uF115')
    expect(getIcon('error', 'nerd-font')).toBe('\uF071')
    expect(getIcon('check', 'nerd-font')).toBe('\uF00C')
  })

  it('returns unicode symbols for unicode mode', () => {
    expect(getIcon('check', 'unicode')).toBe('\u2714')
    expect(getIcon('error', 'unicode')).toBe('!')
    expect(getIcon('stash', 'unicode')).toBe('*')
  })

  it('returns ascii fallbacks for ascii mode', () => {
    expect(getIcon('node', 'ascii')).toBe('N')
    expect(getIcon('python', 'ascii')).toBe('Py')
    expect(getIcon('check', 'ascii')).toBe('+')
    expect(getIcon('error', 'ascii')).toBe('!')
    expect(getIcon('branch', 'ascii')).toBe('')
  })

  it('returns empty string for unknown icon name', () => {
    expect(getIcon('nonexistent', 'nerd-font')).toBe('')
  })

  const modes: IconMode[] = ['nerd-font', 'unicode', 'ascii']
  for (const mode of modes) {
    it(`returns string for all icons in ${mode} mode`, () => {
      const names = ['branch', 'folder', 'clock', 'node', 'python', 'error', 'check', 'stash']
      for (const name of names) {
        expect(typeof getIcon(name, mode)).toBe('string')
      }
    })
  }
})

describe('getSeparator', () => {
  it('returns powerline arrows for nerd-font mode', () => {
    const sep = getSeparator('nerd-font')
    expect(sep.right).toBe('\uE0B0')
    expect(sep.rightThin).toBe('\uE0B1')
  })

  it('returns unicode triangles for unicode mode', () => {
    const sep = getSeparator('unicode')
    expect(sep.right).toBe('\u25B6')
    expect(sep.rightThin).toBe('\u276F')
  })

  it('returns pipes for ascii mode', () => {
    const sep = getSeparator('ascii')
    expect(sep.right).toBe('|')
    expect(sep.rightThin).toBe('|')
  })
})

describe('DEFAULT_SEGMENTS', () => {
  it('contains 6 default segments', () => {
    expect(DEFAULT_SEGMENTS).toHaveLength(6)
  })

  it('includes essential segments', () => {
    expect(DEFAULT_SEGMENTS).toContain('shell-name')
    expect(DEFAULT_SEGMENTS).toContain('dir')
    expect(DEFAULT_SEGMENTS).toContain('git-branch')
    expect(DEFAULT_SEGMENTS).toContain('git-status')
    expect(DEFAULT_SEGMENTS).toContain('exec-time')
    expect(DEFAULT_SEGMENTS).toContain('exit-code')
  })

  it('does not include optional segments by default', () => {
    expect(DEFAULT_SEGMENTS).not.toContain('clock')
    expect(DEFAULT_SEGMENTS).not.toContain('node-version')
    expect(DEFAULT_SEGMENTS).not.toContain('python-venv')
    expect(DEFAULT_SEGMENTS).not.toContain('user-host')
  })
})
