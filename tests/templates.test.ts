import { describe, it, expect, vi } from 'vitest'

// Mock getGitBranch before importing templates
vi.mock('../src/prompt.js', async () => {
  const actual = await vi.importActual<typeof import('../src/prompt.js')>('../src/prompt.js')
  return {
    ...actual,
    getGitBranch: vi.fn(() => 'main'),
  }
})

import {
  TEMPLATES,
  getTemplateByName,
  buildPromptFromTemplate,
  DEFAULT_TEMPLATE_NAME,
} from '../src/templates.js'
import { getGitBranch } from '../src/prompt.js'

const mockedGetGitBranch = vi.mocked(getGitBranch)

describe('TEMPLATES', () => {
  it('contains exactly 5 templates', () => {
    expect(TEMPLATES).toHaveLength(5)
  })

  it('contains minimal, classic, powerline, hacker, pastel', () => {
    const names = TEMPLATES.map((t) => t.name)
    expect(names).toEqual(['minimal', 'classic', 'powerline', 'hacker', 'pastel'])
  })

  it('only powerline requires Nerd Font', () => {
    for (const t of TEMPLATES) {
      if (t.name === 'powerline') {
        expect(t.requiresNerdFont).toBe(true)
      } else {
        expect(t.requiresNerdFont).toBe(false)
      }
    }
  })
})

describe('DEFAULT_TEMPLATE_NAME', () => {
  it('is minimal', () => {
    expect(DEFAULT_TEMPLATE_NAME).toBe('minimal')
  })
})

describe('getTemplateByName', () => {
  it('returns the minimal template object', () => {
    const t = getTemplateByName('minimal')
    expect(t).toBeDefined()
    expect(t!.name).toBe('minimal')
  })

  it('returns undefined for nonexistent', () => {
    expect(getTemplateByName('nonexistent')).toBeUndefined()
  })
})

describe('buildPromptFromTemplate', () => {
  it('minimal template contains cwd and > but no powerline glyphs', () => {
    const t = getTemplateByName('minimal')!
    const result = buildPromptFromTemplate(t, '/Users/tal/Projects', '/Users/tal')
    expect(result).toContain('~/Projects')
    expect(result).toContain('>')
    expect(result).not.toContain('\uE0B0')
  })

  it('powerline template contains \\uE0B0', () => {
    const t = getTemplateByName('powerline')!
    const result = buildPromptFromTemplate(t, '/Users/tal/Projects', '/Users/tal')
    expect(result).toContain('\uE0B0')
  })

  it('hacker template uses green coloring', () => {
    const t = getTemplateByName('hacker')!
    const result = buildPromptFromTemplate(t, '/tmp', '/Users/tal')
    // ANSI 256-color green (color 2) = \x1b[38;5;2m
    expect(result).toMatch(/\x1b\[38;5;2m/)
  })

  it('all templates produce prompts ending with trailing space', () => {
    for (const t of TEMPLATES) {
      const result = buildPromptFromTemplate(t, '/tmp', '/Users/tal')
      expect(result.endsWith(' '), `${t.name} should end with trailing space`).toBe(true)
    }
  })

  it('all templates include git branch when getGitBranch returns non-empty', () => {
    mockedGetGitBranch.mockReturnValue('main')
    for (const t of TEMPLATES) {
      const result = buildPromptFromTemplate(t, '/tmp', '/Users/tal')
      expect(result, `${t.name} should include branch 'main'`).toContain('main')
    }
  })

  it('all templates work without git branch', () => {
    mockedGetGitBranch.mockReturnValue('')
    for (const t of TEMPLATES) {
      const result = buildPromptFromTemplate(t, '/tmp', '/Users/tal')
      expect(result).toContain('nesh')
    }
  })

  it('reuses abbreviatePath from prompt.ts (tilde abbreviation works)', () => {
    const t = getTemplateByName('minimal')!
    const result = buildPromptFromTemplate(t, '/Users/tal', '/Users/tal')
    expect(result).toContain('~')
    expect(result).not.toContain('/Users/tal')
  })
})
