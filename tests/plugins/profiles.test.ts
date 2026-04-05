import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PROFILES, expandProfile } from '../../src/plugins/profiles.js'
import type { ProfileDefinition } from '../../src/plugins/profiles.js'

describe('PROFILES', () => {
  it('has exactly 5 entries', () => {
    expect(PROFILES).toHaveLength(5)
  })

  it('contains core, developer, devops, cloud, ai-engineer', () => {
    const names = PROFILES.map((p) => p.name)
    expect(names).toContain('core')
    expect(names).toContain('developer')
    expect(names).toContain('devops')
    expect(names).toContain('cloud')
    expect(names).toContain('ai-engineer')
  })

  it('each profile has name, description, and plugins', () => {
    for (const profile of PROFILES) {
      expect(typeof profile.name).toBe('string')
      expect(typeof profile.description).toBe('string')
      expect(Array.isArray(profile.plugins)).toBe(true)
      expect(profile.plugins.length).toBeGreaterThan(0)
    }
  })
})

describe('expandProfile', () => {
  it('core returns ["git"]', () => {
    const result = expandProfile('core')
    expect(result).toEqual(['git'])
  })

  it('developer returns core plugins plus developer-specific plugins', () => {
    const result = expandProfile('developer')
    expect(result).toContain('git')
    expect(result).toContain('npm-completions')
    expect(result).toContain('docker-completions')
    expect(result).toContain('git-completions')
    expect(result).toContain('extract')
    expect(result).toContain('copypath')
    expect(result).toContain('jsontools')
  })

  it('devops returns developer plugins plus devops-specific plugins', () => {
    const result = expandProfile('devops')
    expect(result).toContain('git')
    expect(result).toContain('npm-completions')
    expect(result).toContain('kubectl-completions')
    expect(result).toContain('cloud-completions')
    expect(result).toContain('sysadmin-completions')
  })

  it('cloud returns developer plugins plus cloud-completions', () => {
    const result = expandProfile('cloud')
    expect(result).toContain('git')
    expect(result).toContain('npm-completions')
    expect(result).toContain('cloud-completions')
  })

  it('ai-engineer returns developer plugins plus encode64, deduplicates jsontools', () => {
    const result = expandProfile('ai-engineer')
    expect(result).toContain('git')
    expect(result).toContain('npm-completions')
    expect(result).toContain('encode64')
    expect(result).toContain('jsontools')
    // jsontools should appear only once (deduplicated)
    const jsontoolsCount = result.filter((n) => n === 'jsontools').length
    expect(jsontoolsCount).toBe(1)
  })

  it('returns empty array for unknown profile name', () => {
    const result = expandProfile('nonexistent')
    expect(result).toEqual([])
  })

  it('results have no duplicates', () => {
    for (const profile of PROFILES) {
      const result = expandProfile(profile.name)
      const unique = new Set(result)
      expect(result.length).toBe(unique.size)
    }
  })
})
