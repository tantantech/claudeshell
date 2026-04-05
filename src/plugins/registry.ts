import type {
  PluginManifest,
  PluginConfig,
  PluginPerConfig,
  PluginStatus,
  HookName,
  HookHandler,
} from './types.js'
import type { CompletionProvider, CompletionSpec } from '../completions/types.js'

export interface AliasEntry {
  readonly expansion: string
  readonly source: string
}

export interface PluginEntry {
  readonly manifest: PluginManifest
  readonly status: PluginStatus
}

export interface PluginRegistry {
  resolve(firstWord: string): string | undefined
  getAll(): ReadonlyMap<string, AliasEntry>
  getPlugins(): readonly PluginEntry[]
  getHooks(name: HookName): readonly HookHandler[]
  getCompletionProvider(commandName: string): CompletionProvider | undefined
  getCompletionSpecs(commandName: string): readonly CompletionSpec[] | undefined
}

export function buildRegistry(
  plugins: readonly PluginManifest[],
  config: PluginConfig,
): PluginRegistry {
  const aliasMap = new Map<string, AliasEntry>()
  const pluginEntries: PluginEntry[] = []
  const hookMap = new Map<HookName, HookHandler[]>()
  const completionProviderMap = new Map<string, CompletionProvider>()
  const completionSpecMap = new Map<string, CompletionSpec>()

  // Step 1: Insert user aliases first (source: 'user')
  const userAliases = config.aliases ?? {}
  for (const [alias, expansion] of Object.entries(userAliases)) {
    aliasMap.set(alias, { expansion, source: 'user' })
  }

  // Step 2: Process each plugin in order
  for (const plugin of plugins) {
    pluginEntries.push({ manifest: plugin, status: 'loaded' })

    // Get per-plugin config for disabled_aliases
    const perConfig = config[plugin.name] as PluginPerConfig | undefined
    const disabledAliases = new Set(perConfig?.disabled_aliases ?? [])

    // Register plugin aliases
    const pluginAliases = plugin.aliases ?? {}
    for (const [alias, expansion] of Object.entries(pluginAliases)) {
      // Skip disabled aliases
      if (disabledAliases.has(alias)) continue

      const existing = aliasMap.get(alias)
      if (existing !== undefined) {
        // User aliases always win silently
        if (existing.source === 'user') continue

        // Plugin collision: warn and overwrite (last-loaded wins)
        process.stderr.write(
          `[nesh] alias collision: "${alias}" defined by ${existing.source} and ${plugin.name} \u2014 ${plugin.name} wins\n`,
        )
      }

      aliasMap.set(alias, { expansion, source: plugin.name })
    }

    // Collect hooks
    if (plugin.hooks) {
      for (const [hookName, handler] of Object.entries(plugin.hooks)) {
        if (handler === undefined) continue
        const name = hookName as HookName
        const handlers = hookMap.get(name) ?? []
        hookMap.set(name, [...handlers, handler])
      }
    }

    // Register completion provider (keyed by plugin name, first wins per D-11)
    if (plugin.completions && !completionProviderMap.has(plugin.name)) {
      completionProviderMap.set(plugin.name, plugin.completions)
    }

    // Register completion specs (keyed by spec.name, first wins per D-11)
    if (plugin.completionSpecs) {
      for (const spec of plugin.completionSpecs) {
        if (!completionSpecMap.has(spec.name)) {
          completionSpecMap.set(spec.name, spec)
        }
      }
    }
  }

  const frozenAliasMap: ReadonlyMap<string, AliasEntry> = aliasMap
  const frozenPlugins: readonly PluginEntry[] = Object.freeze([...pluginEntries])

  const registry: PluginRegistry = {
    resolve(firstWord: string): string | undefined {
      return aliasMap.get(firstWord)?.expansion
    },

    getAll(): ReadonlyMap<string, AliasEntry> {
      return frozenAliasMap
    },

    getPlugins(): readonly PluginEntry[] {
      return frozenPlugins
    },

    getHooks(name: HookName): readonly HookHandler[] {
      return hookMap.get(name) ?? []
    },

    getCompletionProvider(commandName: string): CompletionProvider | undefined {
      return completionProviderMap.get(commandName)
    },

    getCompletionSpecs(commandName: string): readonly CompletionSpec[] | undefined {
      const spec = completionSpecMap.get(commandName)
      return spec ? [spec] : undefined
    },
  }

  return Object.freeze(registry)
}

export function createEmptyRegistry(): PluginRegistry {
  const emptyMap: ReadonlyMap<string, AliasEntry> = new Map()
  const emptyPlugins: readonly PluginEntry[] = Object.freeze([])
  const emptyHandlers: readonly HookHandler[] = Object.freeze([])

  const registry: PluginRegistry = {
    resolve(): string | undefined {
      return undefined
    },

    getAll(): ReadonlyMap<string, AliasEntry> {
      return emptyMap
    },

    getPlugins(): readonly PluginEntry[] {
      return emptyPlugins
    },

    getHooks(): readonly HookHandler[] {
      return emptyHandlers
    },

    getCompletionProvider(): CompletionProvider | undefined {
      return undefined
    },

    getCompletionSpecs(): readonly CompletionSpec[] | undefined {
      return undefined
    },
  }

  return Object.freeze(registry)
}
