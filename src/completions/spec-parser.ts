import type {
  CompletionSpec,
  CompletionResult,
  CompletionContext,
  CompletionOption,
  CompletionArg,
  CompletionGenerator,
} from './types.js'
import { compgenComplete } from './compgen.js'

const GENERATOR_TIMEOUT_MS = 1000

function optionNames(opt: CompletionOption): readonly string[] {
  return typeof opt.name === 'string' ? [opt.name] : opt.name
}

function matchesOption(opt: CompletionOption, token: string): boolean {
  return optionNames(opt).some((n) => n === token)
}

async function runGenerator(
  gen: CompletionGenerator,
  context: Readonly<CompletionContext>,
): Promise<readonly string[]> {
  try {
    const timeout = new Promise<readonly string[]>((resolve) => {
      setTimeout(() => resolve([]), GENERATOR_TIMEOUT_MS)
    })
    return await Promise.race([gen(context), timeout])
  } catch {
    return []
  }
}

async function resolveArgs(
  args: readonly CompletionArg[],
  currentWord: string,
  context: Readonly<CompletionContext>,
): Promise<readonly string[]> {
  const items: string[] = []

  for (const arg of args) {
    if (arg.template === 'filepaths') {
      const files = await compgenComplete('file', currentWord)
      items.push(...files)
    } else if (arg.template === 'folders') {
      const folders = await compgenComplete('file', currentWord)
      items.push(...folders)
    }

    if (arg.generators) {
      for (const gen of arg.generators) {
        const results = await runGenerator(gen, context)
        items.push(...results.filter((r) => r.startsWith(currentWord)))
      }
    }
  }

  return items
}

export async function resolveFromSpec(
  spec: CompletionSpec,
  tokens: readonly string[],
  currentWord: string,
  context: Readonly<CompletionContext>,
): Promise<CompletionResult> {
  let current = spec

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    // Check if token is a subcommand
    if (current.subcommands && token in current.subcommands) {
      current = current.subcommands[token]
      continue
    }

    // Check if token is an option with args - if so, the next token is the option's arg
    if (current.options) {
      const matchedOpt = current.options.find((o) => matchesOption(o, token))
      if (matchedOpt?.args && i === tokens.length - 1) {
        // Last token is an option that takes args - complete the arg
        const argItems = await resolveArgs(matchedOpt.args, currentWord, context)
        return { items: argItems, prefix: currentWord }
      }
    }
  }

  // At the final spec level, generate completions based on currentWord
  if (currentWord.startsWith('-')) {
    // Complete options
    const matchingOptions: string[] = []
    if (current.options) {
      for (const opt of current.options) {
        for (const name of optionNames(opt)) {
          if (name.startsWith(currentWord)) {
            matchingOptions.push(name)
          }
        }
      }
    }
    return { items: matchingOptions, prefix: currentWord }
  }

  // Complete subcommands
  const items: string[] = []
  if (current.subcommands) {
    for (const name of Object.keys(current.subcommands)) {
      if (name.startsWith(currentWord)) {
        items.push(name)
      }
    }
  }

  // If no subcommand matches and spec has args, invoke arg generators
  if (items.length === 0 && current.args) {
    const argItems = await resolveArgs(current.args, currentWord, context)
    items.push(...argItems)
  }

  // If we have subcommand matches but also args with generators, include both
  if (items.length > 0 && currentWord === '' && current.args) {
    // Only include subcommands when there's a prefix match or empty word
  }

  return { items, prefix: currentWord }
}
