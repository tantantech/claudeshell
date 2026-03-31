export type BuiltinName = 'cd' | 'exit' | 'quit' | 'clear' | 'export'

export type InputAction =
  | { readonly type: 'builtin'; readonly name: BuiltinName; readonly args: string }
  | { readonly type: 'passthrough'; readonly command: string }
  | { readonly type: 'ai_placeholder'; readonly prompt: string }
  | { readonly type: 'empty' }

export interface CdState {
  readonly previousDir: string | undefined
}

export interface ShellState {
  readonly cdState: CdState
  readonly running: boolean
}
