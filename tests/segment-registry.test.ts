import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to mock dependencies before importing the module under test
vi.mock('../src/prompt.js', () => ({
  abbreviatePath: vi.fn(() => '~/projects'),
  getGitBranch: vi.fn(() => 'main'),
}))

vi.mock('../src/segments.js', () => ({
  getGitStatus: vi.fn(() => ({ dirty: 2, staged: 1, untracked: 3, ahead: 0, behind: 0, stash: 0 })),
  getNodeVersion: vi.fn(() => 'v22'),
  getPythonVenv: vi.fn(() => undefined),
  getClock: vi.fn(() => '14:30'),
}))

describe('segment-registry', () => {
  beforeEach(async () => {
    // Reset module registry between tests to get clean state
    vi.resetModules()
  })

  it('registerSegment then resolveSegment returns value', async () => {
    const { registerSegment, resolveSegment } = await import('../src/segment-registry.js')
    registerSegment('test', () => 'hello')
    expect(resolveSegment('test')).toBe('hello')
  })

  it('resolveSegment returns empty string for nonexistent segment', async () => {
    const { resolveSegment } = await import('../src/segment-registry.js')
    expect(resolveSegment('nonexistent')).toBe('')
  })

  it('interpolateSegments replaces {segment:name} with value', async () => {
    const { registerSegment, interpolateSegments } = await import('../src/segment-registry.js')
    registerSegment('test', () => 'hello')
    expect(interpolateSegments('{segment:test}')).toBe('hello')
  })

  it('interpolateSegments handles mixed content', async () => {
    const { registerSegment, interpolateSegments } = await import('../src/segment-registry.js')
    registerSegment('test', () => 'hello')
    expect(interpolateSegments('prefix {segment:test} suffix')).toBe('prefix hello suffix')
  })

  it('interpolateSegments returns string unchanged when no segments present', async () => {
    const { interpolateSegments } = await import('../src/segment-registry.js')
    expect(interpolateSegments('no segments here')).toBe('no segments here')
  })

  it('registerSegment overwrites existing segment', async () => {
    const { registerSegment, resolveSegment } = await import('../src/segment-registry.js')
    registerSegment('test', () => 'first')
    registerSegment('test', () => 'second')
    expect(resolveSegment('test')).toBe('second')
  })

  it('resolveSegment catches errors and returns empty string', async () => {
    const { registerSegment, resolveSegment } = await import('../src/segment-registry.js')
    registerSegment('broken', () => { throw new Error('boom') })
    expect(resolveSegment('broken')).toBe('')
  })

  it('built-in segments are pre-registered', async () => {
    const { resolveSegment } = await import('../src/segment-registry.js')
    // cwd should resolve (mocked abbreviatePath returns ~/projects)
    expect(resolveSegment('cwd')).toBe('~/projects')
    // git_branch should resolve (mocked getGitBranch returns 'main')
    expect(resolveSegment('git_branch')).toBe('main')
    // node_version should resolve (mocked getNodeVersion returns 'v22')
    expect(resolveSegment('node_version')).toBe('v22')
    // time should resolve (mocked getClock returns '14:30')
    expect(resolveSegment('time')).toBe('14:30')
    // exit_code is placeholder, returns ''
    expect(resolveSegment('exit_code')).toBe('')
  })

  it('built-in git_status formats as compact string', async () => {
    const { resolveSegment } = await import('../src/segment-registry.js')
    // mocked getGitStatus returns { dirty: 2, staged: 1, untracked: 3 }
    expect(resolveSegment('git_status')).toBe('~2 +1 ?3')
  })

  it('interpolateSegments handles multiple segments in one string', async () => {
    const { registerSegment, interpolateSegments } = await import('../src/segment-registry.js')
    registerSegment('a', () => 'X')
    registerSegment('b', () => 'Y')
    expect(interpolateSegments('{segment:a}-{segment:b}')).toBe('X-Y')
  })
})
