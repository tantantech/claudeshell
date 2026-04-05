import type { PluginManifest, PluginConfig, HookContext } from './types.js'
import type { PluginRegistry } from './registry.js'
import { buildRegistry } from './registry.js'
import { topologicalSort } from './resolver.js'

export interface Phase1Result {
  readonly registry: PluginRegistry
  readonly enabledPlugins: readonly PluginManifest[]
}

export function loadPluginsPhase1(
  config: PluginConfig,
  bundled: readonly PluginManifest[],
): Phase1Result {
  const enabledNames = new Set(config.enabled ?? [])

  // Filter to only enabled plugins
  const enabled = bundled.filter((p) => enabledNames.has(p.name))

  // Sort by dependency order
  const { sorted, cycles } = topologicalSort(enabled)

  // Exclude cycled plugins
  const cycleSet = new Set(cycles)
  const validPlugins = sorted.filter((p) => !cycleSet.has(p.name))

  // Build immutable registry
  const registry = buildRegistry(validPlugins, config)

  return { registry, enabledPlugins: validPlugins }
}

export async function loadPluginsPhase2(
  plugins: readonly PluginManifest[],
  context: Readonly<HookContext>,
): Promise<readonly string[]> {
  const failed: string[] = []

  for (const plugin of plugins) {
    if (!plugin.init) continue

    try {
      await plugin.init(context)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      process.stderr.write(
        `[nesh] plugin "${plugin.name}" failed to initialize: ${message}\n`,
      )
      failed.push(plugin.name)
    }
  }

  return failed
}
