import { describe, it, expect } from 'vitest'
import type {
  CompletionContext,
  CompletionResult,
  CompletionSpec,
  CompletionOption,
  CompletionArg,
  CompletionGenerator,
  CompletionProvider,
} from '../../src/completions/types.js'
import { parseCompletionContext } from '../../src/completions/types.js'

describe('CompletionContext', () => {
  it('has fields: line, cursor, words, currentWord, commandName, cwd', () => {
    const ctx: CompletionContext = {
      line: 'git checkout main',
      cursor: 17,
      words: ['git', 'checkout', 'main'],
      currentWord: 'main',
      commandName: 'git',
      cwd: '/home/user',
    }
    expect(ctx.line).toBe('git checkout main')
    expect(ctx.cursor).toBe(17)
    expect(ctx.words).toEqual(['git', 'checkout', 'main'])
    expect(ctx.currentWord).toBe('main')
    expect(ctx.commandName).toBe('git')
    expect(ctx.cwd).toBe('/home/user')
  })
})

describe('CompletionResult', () => {
  it('has fields: items (readonly string[]), prefix (optional string)', () => {
    const result: CompletionResult = {
      items: ['main', 'master', 'develop'],
      prefix: 'ma',
    }
    expect(result.items).toEqual(['main', 'master', 'develop'])
    expect(result.prefix).toBe('ma')

    const noPrefix: CompletionResult = { items: ['a', 'b'] }
    expect(noPrefix.prefix).toBeUndefined()
  })
})

describe('CompletionSpec', () => {
  it('has fields: name, subcommands (optional Record), options (optional array), args (optional array)', () => {
    const spec: CompletionSpec = {
      name: 'git',
      subcommands: {
        checkout: { name: 'checkout', options: [{ name: ['-b', '--branch'] }] },
      },
      options: [{ name: '--help', description: 'Show help' }],
      args: [{ name: 'pathspec' }],
    }
    expect(spec.name).toBe('git')
    expect(spec.subcommands?.checkout.name).toBe('checkout')
    expect(spec.options).toHaveLength(1)
    expect(spec.args).toHaveLength(1)
  })
})

describe('CompletionOption', () => {
  it('supports name as string or string[] (short/long aliases)', () => {
    const single: CompletionOption = { name: '--verbose' }
    expect(single.name).toBe('--verbose')

    const aliased: CompletionOption = { name: ['-v', '--verbose'], description: 'Verbose output' }
    expect(aliased.name).toEqual(['-v', '--verbose'])
    expect(aliased.description).toBe('Verbose output')
  })
})

describe('CompletionArg', () => {
  it('supports template (filepaths | folders) and generators (CompletionGenerator[])', () => {
    const gen: CompletionGenerator = async () => ['branch1', 'branch2']
    const arg: CompletionArg = {
      name: 'branch',
      template: 'filepaths',
      generators: [gen],
    }
    expect(arg.name).toBe('branch')
    expect(arg.template).toBe('filepaths')
    expect(arg.generators).toHaveLength(1)
  })
})

describe('CompletionGenerator', () => {
  it('is async function returning string[]', async () => {
    const gen: CompletionGenerator = async () => ['a', 'b', 'c']
    const result = await gen({
      line: 'test',
      cursor: 4,
      words: ['test'],
      currentWord: 'test',
      commandName: 'test',
      cwd: '/tmp',
    })
    expect(result).toEqual(['a', 'b', 'c'])
  })
})

describe('CompletionProvider', () => {
  it('is async function taking CompletionContext returning CompletionResult', async () => {
    const provider: CompletionProvider = async (ctx) => ({
      items: [ctx.currentWord + '1'],
    })
    const result = await provider({
      line: 'foo',
      cursor: 3,
      words: ['foo'],
      currentWord: 'foo',
      commandName: 'foo',
      cwd: '/tmp',
    })
    expect(result.items).toEqual(['foo1'])
  })
})

describe('parseCompletionContext', () => {
  it('splits line into words and extracts currentWord, commandName, cursor', () => {
    const ctx = parseCompletionContext('git checkout main')
    expect(ctx.line).toBe('git checkout main')
    expect(ctx.cursor).toBe(17)
    expect(ctx.words).toEqual(['git', 'checkout', 'main'])
    expect(ctx.currentWord).toBe('main')
    expect(ctx.commandName).toBe('git')
  })

  it('returns empty currentWord when line ends with space', () => {
    const ctx = parseCompletionContext('git checkout ')
    expect(ctx.currentWord).toBe('')
    expect(ctx.words).toEqual(['git', 'checkout'])
  })

  it('handles empty line', () => {
    const ctx = parseCompletionContext('')
    expect(ctx.words).toEqual([])
    expect(ctx.currentWord).toBe('')
    expect(ctx.commandName).toBe('')
  })

  it('handles single word', () => {
    const ctx = parseCompletionContext('git')
    expect(ctx.words).toEqual(['git'])
    expect(ctx.currentWord).toBe('git')
    expect(ctx.commandName).toBe('git')
  })
})
