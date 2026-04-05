export type BuiltinName = 'cd' | 'exit' | 'quit' | 'clear' | 'export' | 'theme' | 'model' | 'keys' | 'settings' | 'aliases' | 'plugin'

export type InputAction =
  | { readonly type: 'builtin'; readonly name: BuiltinName; readonly args: string }
  | { readonly type: 'passthrough'; readonly command: string }
  | { readonly type: 'ai'; readonly prompt: string; readonly model?: string }
  | { readonly type: 'empty' }

export interface LastError {
  readonly command: string
  readonly stderr: string
  readonly exitCode: number
}

export interface CdState {
  readonly previousDir: string | undefined
}

export interface UsageInfo {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly costUsd: number
  readonly durationMs: number
}

export interface CostAccumulator {
  readonly totalCostUsd: number
  readonly totalInputTokens: number
  readonly totalOutputTokens: number
  readonly messageCount: number
}

export type NeshPermission = 'auto' | 'ask' | 'deny'

export interface AIResult {
  readonly sessionId: string | undefined
  readonly usage: UsageInfo | undefined
}

export interface ShellState {
  readonly cdState: CdState
  readonly running: boolean
  readonly lastError: LastError | undefined
  readonly aiStreaming: boolean
  readonly interactiveRunning: boolean
  readonly sessionId: string | undefined
  readonly chatMode: boolean
  readonly currentModel: string | undefined
  readonly sessionCost: CostAccumulator
  readonly lastSuggestedFix: string | undefined
  readonly projectContext: import('./context.js').ProjectContext | null
  readonly permissionMode: NeshPermission
}
