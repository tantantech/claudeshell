export interface CompletionContext {
  readonly line: string
  readonly cursor: number
  readonly words: readonly string[]
  readonly currentWord: string
  readonly commandName: string
  readonly cwd: string
}

export interface CompletionResult {
  readonly items: readonly string[]
  readonly prefix?: string
}

export type CompletionProvider = (
  context: Readonly<CompletionContext>,
) => Promise<CompletionResult>

export interface CompletionSpec {
  readonly name: string
  readonly subcommands?: Readonly<Record<string, CompletionSpec>>
  readonly options?: readonly CompletionOption[]
  readonly args?: readonly CompletionArg[]
}

export interface CompletionOption {
  readonly name: string | readonly string[]
  readonly description?: string
  readonly args?: readonly CompletionArg[]
}

export interface CompletionArg {
  readonly name: string
  readonly template?: 'filepaths' | 'folders'
  readonly generators?: readonly CompletionGenerator[]
}

export type CompletionGenerator = (
  context: Readonly<CompletionContext>,
) => Promise<readonly string[]>

export function parseCompletionContext(line: string): CompletionContext {
  const trimmed = line
  const endsWithSpace = trimmed.length > 0 && trimmed.endsWith(' ')
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0)
  const currentWord = endsWithSpace ? '' : (words[words.length - 1] ?? '')
  const commandName = words[0] ?? ''

  return {
    line,
    cursor: line.length,
    words: endsWithSpace ? words : (words.length > 0 ? words : []),
    currentWord,
    commandName,
    cwd: process.cwd(),
  }
}
