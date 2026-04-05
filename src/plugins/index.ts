import { plugin as git } from './git.js'
import { plugin as gitCompletions } from './completions/git-completions.js'
import { plugin as dockerCompletions } from './completions/docker-completions.js'
import { plugin as npmCompletions } from './completions/npm-completions.js'
import { plugin as kubectlCompletions } from './completions/kubectl-completions.js'
import { plugin as cloudCompletions } from './completions/cloud-completions.js'
import { plugin as devtoolsCompletions } from './completions/devtools-completions.js'
import { plugin as sysadminCompletions } from './completions/sysadmin-completions.js'
import { plugin as extract } from './utilities/extract.js'
import { plugin as sudo } from './utilities/sudo.js'
import { plugin as copypath } from './utilities/copypath.js'
import { plugin as encode64 } from './utilities/encode64.js'
import { plugin as urltools } from './utilities/urltools.js'
import { plugin as jsontools } from './utilities/jsontools.js'
import { plugin as webSearch } from './utilities/web-search.js'
import { plugin as dirhistory } from './utilities/dirhistory.js'
import type { PluginManifest } from './types.js'
import { PLUGIN_CATALOG } from './catalog.js'

// Legacy: use loadBundledPlugins() for full catalog
export const BUNDLED_PLUGINS: readonly PluginManifest[] = [
  // Alias plugin
  git,
  // Completion plugins
  gitCompletions,
  dockerCompletions,
  npmCompletions,
  kubectlCompletions,
  cloudCompletions,
  devtoolsCompletions,
  sysadminCompletions,
  // Utility plugins
  extract,
  sudo,
  copypath,
  encode64,
  urltools,
  jsontools,
  webSearch,
  dirhistory,
]

/**
 * Category directory lookup for dynamic imports.
 * Maps plugin name to its subdirectory under src/plugins/.
 * Root-level plugins use '.', others use their category directory.
 */
export const PLUGIN_CATEGORY: Readonly<Record<string, string>> = (() => {
  const lookup: Record<string, string> = {}

  // Root-level plugins (original 16)
  lookup['git'] = '.'

  // Completion plugins
  for (const entry of PLUGIN_CATALOG) {
    if (entry.status === 'no-equivalent') continue

    if (entry.category === 'completion') {
      lookup[entry.name] = 'completions'
    } else if (entry.category === 'alias') {
      lookup[entry.name] = 'aliases'
    } else if (entry.category === 'utility') {
      lookup[entry.name] = 'utilities'
    } else if (entry.category === 'hook') {
      lookup[entry.name] = 'hooks'
    }
  }

  // Override for root-level plugins already imported above
  lookup['git'] = '.'

  return Object.freeze(lookup)
})()

/**
 * Lightweight catalog list for search and display.
 * Excludes no-equivalent plugins since they can't be loaded.
 */
export const PLUGIN_CATALOG_LIST: readonly {
  readonly name: string
  readonly description: string
  readonly category: string
}[] = PLUGIN_CATALOG
  .filter((entry) => entry.status !== 'no-equivalent')
  .map((entry) => Object.freeze({
    name: entry.name,
    description: entry.description,
    category: entry.category,
  }))

/**
 * Lazy-load plugins by name using dynamic imports.
 * Only loads the modules for plugins in the `enabled` list.
 * Falls back to BUNDLED_PLUGINS for the original 16 root-level plugins.
 */
export async function loadBundledPlugins(
  enabled: readonly string[],
): Promise<readonly PluginManifest[]> {
  const plugins: PluginManifest[] = []

  for (const name of enabled) {
    const category = PLUGIN_CATEGORY[name]
    if (!category) continue

    try {
      if (category === '.') {
        // Root-level plugin (original 16 — already statically imported)
        const existing = BUNDLED_PLUGINS.find((p) => p.name === name)
        if (existing) plugins.push(existing)
      } else {
        const mod = await import(`./${category}/${name}.js`) as { plugin: PluginManifest }
        plugins.push(mod.plugin)
      }
    } catch {
      // Plugin file missing or broken — skip silently, loader handles errors
    }
  }

  return plugins
}
