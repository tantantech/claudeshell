export type HookName = 'preCommand' | 'postCommand' | 'prePrompt' | 'onCd'

export interface HookContext {
  readonly cwd: string
  readonly command?: string
  readonly exitCode?: number
  readonly previousDir?: string
  readonly env?: Readonly<Record<string, string | undefined>>
}

export type HookHandler = (context: Readonly<HookContext>) => void | Promise<void>

export type PluginStatus = 'loaded' | 'failed' | 'disabled'

import type { CompletionProvider, CompletionSpec } from '../completions/types.js'

export interface PluginManifest {
  readonly name: string
  readonly version: string
  readonly description: string
  readonly aliases?: Readonly<Record<string, string>>
  readonly dependencies?: readonly string[]
  readonly platform?: 'macos' | 'linux' | 'all'
  readonly permissions?: readonly string[]
  readonly hooks?: Readonly<Partial<Record<HookName, HookHandler>>>
  readonly completions?: CompletionProvider
  readonly completionSpecs?: readonly CompletionSpec[]
  readonly init?: (context: Readonly<HookContext>) => Promise<void>
  readonly destroy?: (context: Readonly<HookContext>) => Promise<void>
}

export interface PluginConfig {
  readonly enabled?: readonly string[]
  readonly aliases?: Readonly<Record<string, string>>
  readonly [pluginName: string]: unknown
}

export interface PluginPerConfig {
  readonly disabled_aliases?: readonly string[]
}
