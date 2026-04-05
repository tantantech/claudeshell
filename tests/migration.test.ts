import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseZshrcPlugins, generateMigrationReport, detectOMZ } from '../src/migration/detector.js'
import type { MigrationStatus } from '../src/migration/detector.js'

describe('parseZshrcPlugins', () => {
  it('parses single-line plugins declaration', () => {
    const result = parseZshrcPlugins('plugins=(git docker)')
    expect(result).toEqual(['git', 'docker'])
  })

  it('parses multi-line plugins declaration', () => {
    const content = `plugins=(
  git
  docker
  kubectl
)`
    const result = parseZshrcPlugins(content)
    expect(result).toEqual(['git', 'docker', 'kubectl'])
  })

  it('returns empty array when no plugins line exists', () => {
    const result = parseZshrcPlugins('# no plugins here\nexport PATH=$PATH:/usr/bin')
    expect(result).toEqual([])
  })

  it('strips inline comments from plugin names', () => {
    const content = `plugins=(
  git # version control
  docker
)`
    const result = parseZshrcPlugins(content)
    expect(result).toEqual(['git', 'docker'])
  })

  it('handles empty plugins declaration', () => {
    const result = parseZshrcPlugins('plugins=()')
    expect(result).toEqual([])
  })

  it('handles plugins with extra whitespace', () => {
    const result = parseZshrcPlugins('plugins=(  git   docker   npm  )')
    expect(result).toEqual(['git', 'docker', 'npm'])
  })

  it('handles plugins declaration among other config', () => {
    const content = `# .zshrc
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="robbyrussell"
plugins=(git docker)
source $ZSH/oh-my-zsh.sh`
    const result = parseZshrcPlugins(content)
    expect(result).toEqual(['git', 'docker'])
  })
})

describe('generateMigrationReport', () => {
  it('maps known OMZ plugins to Nesh equivalents', () => {
    const report = generateMigrationReport(['git', 'docker'])
    const gitEntry = report.find(r => r.omzName === 'git')
    expect(gitEntry).toBeDefined()
    expect(gitEntry!.status).toBe('available')
    expect(gitEntry!.neshEquivalent).toBeTruthy()
  })

  it('marks unknown plugins as missing', () => {
    const report = generateMigrationReport(['nonexistent-plugin-xyz'])
    expect(report).toHaveLength(1)
    expect(report[0].status).toBe('missing')
    expect(report[0].neshEquivalent).toBeNull()
  })

  it('handles mix of available, partial, and missing plugins', () => {
    const report = generateMigrationReport(['git', 'fzf', 'nonexistent-plugin-xyz'])
    expect(report).toHaveLength(3)

    const git = report.find(r => r.omzName === 'git')
    expect(git!.status).toBe('available')

    const fzf = report.find(r => r.omzName === 'fzf')
    // fzf is in catalog as no-equivalent
    expect(fzf!.status).toBe('missing')

    const unknown = report.find(r => r.omzName === 'nonexistent-plugin-xyz')
    expect(unknown!.status).toBe('missing')
  })

  it('returns empty array for empty input', () => {
    const report = generateMigrationReport([])
    expect(report).toEqual([])
  })
})

describe('detectOMZ', () => {
  it('returns a boolean', () => {
    const result = detectOMZ()
    expect(typeof result).toBe('boolean')
  })
})
