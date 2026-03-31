export type BuiltinName = 'cd' | 'exit' | 'quit' | 'clear' | 'export'

export type InputAction =
  | { readonly type: 'builtin'; readonly name: BuiltinName; readonly args: string }
  | { readonly type: 'passthrough'; readonly command: string }
  | { readonly type: 'ai'; readonly prompt: string }
  | { readonly type: 'empty' }

export interface LastError {
  readonly command: string
  readonly stderr: string
  readonly exitCode: number
}

export interface CdState {
  readonly previousDir: string | undefined
}

export interface ShellState {
  readonly cdState: CdState
  readonly running: boolean
  readonly lastError: LastError | undefined
  readonly aiStreaming: boolean
}
