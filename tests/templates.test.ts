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
  it('contains exactly 9 templates', () => {
    expect(TEMPLATES).toHaveLength(9)
  })

  it('contains all expected template names', () => {
    const names = TEMPLATES.map((t) => t.name)
    expect(names).toEqual(['minimal', 'classic', 'powerline', 'hacker', 'pastel', 'rainbow', 'lean', 'classic-p10k', 'pure'])
  })

  it('powerline, rainbow, and classic-p10k require Nerd Font', () => {
    const nerdFontThemes = new Set(['powerline', 'rainbow', 'classic-p10k'])
    for (const t of TEMPLATES) {
      if (nerdFontThemes.has(t.name)) {
        expect(t.requiresNerdFont, `${t.name} should require Nerd Font`).toBe(true)
      } else {
        expect(t.requiresNerdFont, `${t.name} should not require Nerd Font`).toBe(false)
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

  it('hacker template uses color scheme git color', () => {
    const t = getTemplateByName('hacker')!
    const result = buildPromptFromTemplate(t, '/tmp', '/Users/tal')
    // Uses color scheme git color (default = 114)
    expect(result).toMatch(/\x1b\[38;5;\d+m/)
    expect(result).toContain('nesh')
    expect(result).toContain('\u250C') // box drawing top
    expect(result).toContain('\u2514') // box drawing bottom
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
    const themesWithNesh = new Set(['minimal', 'classic', 'powerline', 'hacker', 'pastel', 'rainbow', 'classic-p10k'])
    for (const t of TEMPLATES) {
      const result = buildPromptFromTemplate(t, '/tmp', '/Users/tal')
      if (themesWithNesh.has(t.name)) {
        expect(result, `${t.name} should contain 'nesh'`).toContain('nesh')
      } else {
        // lean and pure are ultra-minimal, no shell name
        expect(result.length, `${t.name} should produce non-empty output`).toBeGreaterThan(0)
      }
    }
  })

  it('reuses abbreviatePath from prompt.ts (tilde abbreviation works)', () => {
    const t = getTemplateByName('minimal')!
    const result = buildPromptFromTemplate(t, '/Users/tal', '/Users/tal')
    expect(result).toContain('~')
    expect(result).not.toContain('/Users/tal')
  })
})
