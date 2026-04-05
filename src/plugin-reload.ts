import { loadConfig } from './config.js'
import { loadPluginsPhase1, loadPluginsPhase2 } from './plugins/loader.js'
import { buildHookBus } from './plugins/hooks.js'
import { BUNDLED_PLUGINS } from './plugins/index.js'
import { discoverExternalPlugins } from './plugins/external.js'
import type { PluginRegistry } from './plugins/registry.js'
import type { HookBus } from './plugins/hooks.js'
import type { PluginManifest } from './plugins/types.js'

export interface HotReloadResult {
  readonly registry: PluginRegistry
  readonly hookBus: HookBus
  readonly enabled: readonly PluginManifest[]
}

export async function hotReload(): Promise<HotReloadResult> {
  // Re-read config from disk (enable/disable already saved it)
  const freshConfig = loadConfig()

  // Discover external plugins from ~/.nesh/plugins/
  const external = await discoverExternalPlugins()

  // Combine bundled + external plugins
  const allPlugins = [...BUNDLED_PLUGINS, ...external]

  // Full rebuild of registry from scratch
  const phase1 = loadPluginsPhase1(freshConfig.plugins ?? {}, allPlugins)

  // Rebuild hook bus
  const newHookBus = buildHookBus(phase1.enabledPlugins)

  // Fire-and-forget Phase 2 async init for newly-enabled plugins
  setImmediate(() => {
    void loadPluginsPhase2(phase1.enabledPlugins, { cwd: process.cwd() })
  })

  return {
    registry: phase1.registry,
    hookBus: newHookBus,
    enabled: phase1.enabledPlugins,
  }
}
