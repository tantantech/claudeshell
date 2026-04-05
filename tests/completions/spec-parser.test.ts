import { describe, it, expect, vi } from 'vitest'
import type { CompletionSpec, CompletionContext } from '../../src/completions/types.js'
import { resolveFromSpec } from '../../src/completions/spec-parser.js'

vi.mock('../../src/completions/compgen.js', () => ({
  compgenComplete: vi.fn(async (_type: string, currentWord: string) => {
    if (currentWord === 'src/') return ['src/cli.ts', 'src/shell.ts']
    return [`${currentWord}file1`, `${currentWord}file2`]
  }),
}))

const baseContext: CompletionContext = {
  line: 'git checkout main',
  cursor: 17,
  words: ['git', 'checkout', 'main'],
  currentWord: 'main',
  commandName: 'git',
  cwd: '/home/user',
}

const branchGenerator = vi.fn(async () => ['main', 'develop', 'feature/login'])

const gitSpec: CompletionSpec = {
  name: 'git',
  subcommands: {
    checkout: {
      name: 'checkout',
      options: [
        { name: ['-b', '--branch'], description: 'Create new branch' },
        { name: '--track', description: 'Track upstream' },
      ],
      args: [{ name: 'branch', generators: [branchGenerator] }],
    },
    branch: {
      name: 'branch',
      options: [
        {
          name: ['-d', '--delete'],
          description: 'Delete branch',
          args: [{ name: 'branch', generators: [branchGenerator] }],
        },
        { name: ['-m', '--move'], description: 'Rename branch' },
      ],
    },
    remote: {
      name: 'remote',
      subcommands: {
        add: {
          name: 'add',
          args: [{ name: 'name' }, { name: 'url' }],
        },
        remove: {
          name: 'remove',
          args: [{ name: 'name' }],
        },
      },
    },
    add: {
      name: 'add',
      args: [{ name: 'pathspec', template: 'filepaths' }],
    },
  },
  options: [
    { name: '--version', description: 'Show version' },
    { name: '--help', description: 'Show help' },
  ],
}

describe('resolveFromSpec', () => {
  it('with tokens ["checkout"] returns checkout subcommand completions (branch generators)', async () => {
    const result = await resolveFromSpec(gitSpec, ['checkout'], '', {
      ...baseContext,
      currentWord: '',
    })
    expect(result.items).toContain('main')
    expect(result.items).toContain('develop')
    expect(result.items).toContain('feature/login')
    expect(branchGenerator).toHaveBeenCalled()
  })

  it('with tokens ["branch", "-d"] returns branch names from generator for -d option arg', async () => {
    branchGenerator.mockClear()
    const result = await resolveFromSpec(gitSpec, ['branch', '-d'], '', {
      ...baseContext,
      line: 'git branch -d ',
      currentWord: '',
    })
    expect(result.items).toContain('main')
    expect(result.items).toContain('develop')
    expect(branchGenerator).toHaveBeenCalled()
  })

  it('with unknown subcommand returns top-level subcommand names as completions', async () => {
    const result = await resolveFromSpec(gitSpec, [], 'foo', {
      ...baseContext,
      currentWord: 'foo',
    })
    // 'foo' doesn't match any subcommand, so returns matching subcommands (none start with foo)
    expect(result.items).toEqual([])
  })

  it('with empty tokens returns all top-level subcommand names', async () => {
    const result = await resolveFromSpec(gitSpec, [], '', {
      ...baseContext,
      currentWord: '',
    })
    expect(result.items).toContain('checkout')
    expect(result.items).toContain('branch')
    expect(result.items).toContain('remote')
    expect(result.items).toContain('add')
  })

  it('with option starting with "-" returns matching options from current spec level', async () => {
    const result = await resolveFromSpec(gitSpec, ['checkout'], '--', {
      ...baseContext,
      currentWord: '--',
    })
    expect(result.items).toContain('--branch')
    expect(result.items).toContain('--track')
  })

  it('invokes generators from CompletionArg when present', async () => {
    branchGenerator.mockClear()
    const result = await resolveFromSpec(gitSpec, ['checkout'], '', {
      ...baseContext,
      currentWord: '',
    })
    expect(branchGenerator).toHaveBeenCalled()
    expect(result.items).toContain('main')
    expect(result.items).toContain('develop')
    expect(result.items).toContain('feature/login')
  })

  it('handles CompletionArg with template "filepaths" by returning compgen file results', async () => {
    const result = await resolveFromSpec(gitSpec, ['add'], 'src/', {
      ...baseContext,
      currentWord: 'src/',
    })
    expect(result.items).toContain('src/cli.ts')
    expect(result.items).toContain('src/shell.ts')
  })

  it('with deeply nested spec (3 levels) walks correctly', async () => {
    const result = await resolveFromSpec(gitSpec, ['remote', 'add'], '', {
      ...baseContext,
      currentWord: '',
      line: 'git remote add ',
    })
    // 'add' subcommand has args but no generators or template, so items may be empty
    expect(result).toBeDefined()
    expect(result.prefix).toBe('')
  })

  it('returns matching top-level options with "-" prefix', async () => {
    const result = await resolveFromSpec(gitSpec, [], '--v', {
      ...baseContext,
      currentWord: '--v',
    })
    expect(result.items).toContain('--version')
    expect(result.items).not.toContain('--help')
  })
})
