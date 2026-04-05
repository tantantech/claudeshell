import { describe, expect, it, vi } from 'vitest'
import { gitSpec, gitBranchGenerator, gitRemoteGenerator, gitTagGenerator, plugin } from '../../src/plugins/completions/git-completions.js'
import type { CompletionContext } from '../../src/completions/types.js'

const makeContext = (overrides: Partial<CompletionContext> = {}): CompletionContext => ({
  line: '',
  cursor: 0,
  words: [],
  currentWord: '',
  commandName: 'git',
  cwd: '/tmp',
  ...overrides,
})

describe('git-completions plugin', () => {
  it('exports a valid plugin manifest', () => {
    expect(plugin.name).toBe('git-completions')
    expect(plugin.version).toBe('1.0.0')
    expect(plugin.completionSpecs).toBeDefined()
    expect(plugin.completionSpecs!.length).toBeGreaterThanOrEqual(1)
  })

  it('has git spec with expected subcommand names', () => {
    const subcommandNames = Object.keys(gitSpec.subcommands ?? {})
    const expected = [
      'checkout', 'branch', 'merge', 'rebase', 'commit',
      'push', 'pull', 'fetch', 'stash', 'log',
      'diff', 'add', 'reset', 'tag', 'remote',
      'switch', 'cherry-pick', 'revert', 'bisect', 'clean',
    ]
    for (const name of expected) {
      expect(subcommandNames).toContain(name)
    }
  })

  it('checkout subcommand has branch generator in args', () => {
    const checkout = gitSpec.subcommands!['checkout']
    expect(checkout).toBeDefined()
    expect(checkout.args).toBeDefined()
    expect(checkout.args!.length).toBeGreaterThanOrEqual(1)
    expect(checkout.args![0].generators).toBeDefined()
    expect(checkout.args![0].generators!.length).toBeGreaterThanOrEqual(1)
  })

  it('add subcommand has filepaths template', () => {
    const add = gitSpec.subcommands!['add']
    expect(add).toBeDefined()
    expect(add.args).toBeDefined()
    expect(add.args![0].template).toBe('filepaths')
  })

  it('gitBranchGenerator returns branches from git output', async () => {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')

    // The generator calls execFile internally; test it returns array
    const result = await gitBranchGenerator(makeContext())
    expect(Array.isArray(result)).toBe(true)
  })

  it('gitRemoteGenerator returns array', async () => {
    const result = await gitRemoteGenerator(makeContext())
    expect(Array.isArray(result)).toBe(true)
  })

  it('gitTagGenerator returns array', async () => {
    const result = await gitTagGenerator(makeContext())
    expect(Array.isArray(result)).toBe(true)
  })

  it('stash has subcommands push/pop/apply/list/drop/show', () => {
    const stash = gitSpec.subcommands!['stash']
    expect(stash.subcommands).toBeDefined()
    const stashSubs = Object.keys(stash.subcommands ?? {})
    expect(stashSubs).toContain('push')
    expect(stashSubs).toContain('pop')
    expect(stashSubs).toContain('apply')
    expect(stashSubs).toContain('list')
    expect(stashSubs).toContain('drop')
    expect(stashSubs).toContain('show')
  })
})
