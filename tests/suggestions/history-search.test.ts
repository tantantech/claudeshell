import { describe, it, expect } from 'vitest'
import {
  findSuggestion,
  buildSensitiveFilters,
  DEFAULT_SENSITIVE_PATTERNS,
} from '../../src/suggestions/history-search.js'

describe('findSuggestion', () => {
  it('returns most recent prefix match', () => {
    const history = ['git checkout main', 'git cherry-pick abc', 'ls -la']
    expect(findSuggestion('git ch', history, [])).toBe('git checkout main')
  })

  it('returns null for exact match (skip duplicate)', () => {
    const history = ['git checkout main', 'git push']
    expect(findSuggestion('git checkout main', history, [])).toBeNull()
  })

  it('returns null for empty prefix', () => {
    const history = ['git status', 'ls']
    expect(findSuggestion('', history, [])).toBeNull()
  })

  it('skips entries matching sensitive filter', () => {
    const sensitiveRegex = /API_KEY=\S+/
    const history = ['export API_KEY=sk-1234', 'export API_URL=http']
    expect(findSuggestion('export API', history, [sensitiveRegex])).toBe(
      'export API_URL=http'
    )
  })

  it('returns null when no match exists', () => {
    const history = ['abc', 'def']
    expect(findSuggestion('xyz', history, [])).toBeNull()
  })

  it('returns null for empty history', () => {
    expect(findSuggestion('git', [], [])).toBeNull()
  })

  it('is case-sensitive', () => {
    const history = ['Git checkout', 'git checkout']
    expect(findSuggestion('Git', history, [])).toBe('Git checkout')
    expect(findSuggestion('git', history, [])).toBe('git checkout')
  })
})

describe('DEFAULT_SENSITIVE_PATTERNS', () => {
  it('matches KEY=value patterns', () => {
    const matches = DEFAULT_SENSITIVE_PATTERNS.some((re) =>
      re.test('export ANTHROPIC_API_KEY=sk-ant-xxx')
    )
    expect(matches).toBe(true)
  })

  it('matches AWS_SECRET_ACCESS_KEY', () => {
    const matches = DEFAULT_SENSITIVE_PATTERNS.some((re) =>
      re.test('export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI')
    )
    expect(matches).toBe(true)
  })

  it('matches Bearer tokens', () => {
    const matches = DEFAULT_SENSITIVE_PATTERNS.some((re) =>
      re.test('curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5"')
    )
    expect(matches).toBe(true)
  })

  it('matches common API key prefixes (sk-, ghp_, etc.)', () => {
    expect(
      DEFAULT_SENSITIVE_PATTERNS.some((re) => re.test('echo sk-proj-abc123'))
    ).toBe(true)
    expect(
      DEFAULT_SENSITIVE_PATTERNS.some((re) => re.test('echo ghp_xxxxxxxxxxxx'))
    ).toBe(true)
  })

  it('matches --password flag', () => {
    expect(
      DEFAULT_SENSITIVE_PATTERNS.some((re) =>
        re.test('mysql --password=secret123')
      )
    ).toBe(true)
  })

  it('does not match safe commands', () => {
    const safe = 'git checkout main'
    const matches = DEFAULT_SENSITIVE_PATTERNS.some((re) => re.test(safe))
    expect(matches).toBe(false)
  })
})

describe('buildSensitiveFilters', () => {
  it('returns defaults when no custom patterns', () => {
    const filters = buildSensitiveFilters([])
    expect(filters.length).toBe(DEFAULT_SENSITIVE_PATTERNS.length)
  })

  it('merges defaults with custom patterns', () => {
    const filters = buildSensitiveFilters(['custom_pattern'])
    expect(filters.length).toBe(DEFAULT_SENSITIVE_PATTERNS.length + 1)
    expect(filters.some((re) => re.test('custom_pattern'))).toBe(true)
  })

  it('skips invalid regex patterns with no throw', () => {
    const filters = buildSensitiveFilters(['[invalid'])
    expect(filters.length).toBe(DEFAULT_SENSITIVE_PATTERNS.length)
  })
})
