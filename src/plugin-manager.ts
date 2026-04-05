import type { Interface as ReadlineInterface } from 'node:readline/promises'
import pc from 'picocolors'
import type { PluginRegistry } from './plugins/registry.js'
import type { PluginManifest } from './plugins/types.js'
import { BUNDLED_PLUGINS } from './plugins/index.js'
import { PROFILES, expandProfile } from './plugins/profiles.js'
import { loadConfig, saveConfig } from './config.js'
import { installPlugin, updatePlugin, removePlugin } from './plugin-install.js'
import type { HotReloadResult } from './plugin-reload.js'

export interface PluginManagerContext {
  readonly pluginRegistry: PluginRegistry
  readonly rl: ReadlineInterface
  readonly onHotReload?: (result: HotReloadResult) => void
}

export async function executePlugin(
  args: string,
  ctx: PluginManagerContext,
): Promise<void> {
  const trimmed = args.trim()
  const spaceIdx = trimmed.indexOf(' ')
  const subcommand = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)
  const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim()

  switch (subcommand) {
    case 'list':
      return listPlugins(ctx)
    case 'enable':
      return enablePlugin(rest, ctx)
    case 'disable':
      return disablePlugin(rest, ctx)
    case 'install':
      return installCmd(rest, ctx)
    case 'update':
      return updateCmd(rest, ctx)
    case 'remove':
      return removeCmd(rest, ctx)
    case 'search':
      return searchPlugins(rest)
    case 'doctor':
      return doctorCmd(ctx)
    case 'times':
      return timesCmd(ctx)
    case 'profile':
      return profileCmd(ctx)
    case 'help':
    case '':
      return showHelp()
    default:
      return showHelp()
  }
}

function showHelp(): void {
  process.stdout.write(`\n${pc.bold('Plugin Manager')}\n\n`)
  process.stdout.write('  plugin list                List all plugins with status\n')
  process.stdout.write('  plugin enable <name>       Enable a plugin\n')
  process.stdout.write('  plugin disable <name>      Disable a plugin\n')
  process.stdout.write('  plugin install <repo>      Install plugin from git repo\n')
  process.stdout.write('  plugin update <name>       Update an installed plugin\n')
  process.stdout.write('  plugin remove <name>       Remove an installed plugin\n')
  process.stdout.write('  plugin search <query>      Search bundled plugins\n')
  process.stdout.write('  plugin doctor              Diagnose plugin issues\n')
  process.stdout.write('  plugin times               Show plugin load timing\n')
  process.stdout.write('  plugin profile             Select a plugin profile\n')
  process.stdout.write('  plugin help                Show this help\n\n')
}

function listPlugins(ctx: PluginManagerContext): void {
  const config = loadConfig()
  const enabled = new Set(config.plugins?.enabled ?? [])
  const entries = ctx.pluginRegistry.getPlugins()

  process.stdout.write(`\n${pc.bold('Plugins')}\n\n`)

  for (const entry of entries) {
    const { manifest, status } = entry
    const isEnabled = enabled.has(manifest.name)
    const statusTag = isEnabled
      ? pc.green('[enabled]')
      : pc.dim('[disabled]')
    const platformTag = formatPlatform(manifest.platform)
    const statusInfo = status === 'failed' ? pc.red(' (failed)') : ''

    process.stdout.write(
      `  ${manifest.name} ${pc.dim(`v${manifest.version}`)} ${statusTag}${platformTag}${statusInfo}\n`,
    )
  }

  process.stdout.write('\n')
}

function formatPlatform(platform?: string): string {
  if (!platform || platform === 'all') return ''
  return pc.dim(` [${platform}]`)
}

function enablePlugin(name: string, ctx: PluginManagerContext): void {
  if (!name) {
    process.stdout.write('Usage: plugin enable <name>\n')
    return
  }

  const config = loadConfig()
  const enabled = [...(config.plugins?.enabled ?? [])] as string[]

  if (enabled.includes(name)) {
    process.stdout.write(`Plugin "${name}" is already enabled.\n`)
    return
  }

  const newEnabled = [...enabled, name]
  const newConfig = {
    ...config,
    plugins: {
      ...config.plugins,
      enabled: newEnabled,
    },
  }
  saveConfig(newConfig)
  process.stdout.write(`Enabled plugin: ${pc.bold(name)}\n`)

  triggerHotReload(ctx)
}

function disablePlugin(name: string, ctx: PluginManagerContext): void {
  if (!name) {
    process.stdout.write('Usage: plugin disable <name>\n')
    return
  }

  const config = loadConfig()
  const enabled = [...(config.plugins?.enabled ?? [])] as string[]
  const newEnabled = enabled.filter((p) => p !== name)

  const newConfig = {
    ...config,
    plugins: {
      ...config.plugins,
      enabled: newEnabled,
    },
  }
  saveConfig(newConfig)
  process.stdout.write(`Disabled plugin: ${pc.bold(name)}\n`)

  triggerHotReload(ctx)
}

async function installCmd(
  repoRef: string,
  ctx: PluginManagerContext,
): Promise<void> {
  if (!repoRef) {
    process.stdout.write('Usage: plugin install <user/repo>\n')
    return
  }

  const manifest = await installPlugin(repoRef, ctx.rl)

  if (!manifest) {
    process.stdout.write('Installation aborted.\n')
    return
  }

  // Add to enabled list
  const config = loadConfig()
  const enabled = [...(config.plugins?.enabled ?? [])] as string[]

  if (!enabled.includes(manifest.name)) {
    const newConfig = {
      ...config,
      plugins: {
        ...config.plugins,
        enabled: [...enabled, manifest.name],
      },
    }
    saveConfig(newConfig)
  }

  process.stdout.write(`Installed and enabled: ${pc.bold(manifest.name)}\n`)
  triggerHotReload(ctx)
}

async function updateCmd(
  name: string,
  ctx: PluginManagerContext,
): Promise<void> {
  if (!name) {
    process.stdout.write('Usage: plugin update <name>\n')
    return
  }

  const errorMsg = await updatePlugin(name)

  if (errorMsg) {
    process.stdout.write(`${errorMsg}\n`)
    return
  }

  process.stdout.write(`Plugin "${name}" updated successfully.\n`)
  triggerHotReload(ctx)
}

async function removeCmd(
  name: string,
  ctx: PluginManagerContext,
): Promise<void> {
  if (!name) {
    process.stdout.write('Usage: plugin remove <name>\n')
    return
  }

  await removePlugin(name)
  process.stdout.write(`Plugin "${name}" removed.\n`)
  triggerHotReload(ctx)
}

function searchPlugins(query: string): void {
  if (!query) {
    process.stdout.write('Usage: plugin search <query>\n')
    return
  }

  const lowerQuery = query.toLowerCase()
  const matches = BUNDLED_PLUGINS.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery),
  )

  if (matches.length === 0) {
    process.stdout.write(`No plugins found matching "${query}".\n`)
    return
  }

  process.stdout.write(`\n${pc.bold('Search Results')}\n\n`)
  for (const plugin of matches) {
    process.stdout.write(
      `  ${pc.bold(plugin.name)} ${pc.dim(`v${plugin.version}`)}\n`,
    )
    process.stdout.write(`    ${plugin.description}\n\n`)
  }
}

function doctorCmd(ctx: PluginManagerContext): void {
  const entries = ctx.pluginRegistry.getPlugins()
  const failed = entries.filter((e) => e.status === 'failed')
  const total = entries.length
  const enabledCount = entries.filter((e) => e.status === 'loaded').length

  process.stdout.write(`\n${pc.bold('Plugin Health Check')}\n\n`)
  process.stdout.write(`  Total plugins: ${total}\n`)
  process.stdout.write(`  Enabled: ${enabledCount}\n`)
  process.stdout.write(`  Failed: ${failed.length}\n\n`)

  if (failed.length > 0) {
    process.stdout.write(`${pc.red('Failed plugins:')}\n\n`)
    for (const entry of failed) {
      process.stdout.write(`  ${pc.red(entry.manifest.name)} - ${entry.manifest.description}\n`)
    }
    process.stdout.write(`\n  Recommendation: try ${pc.bold('nesh --safe')} to start with plugins disabled.\n\n`)
  } else {
    process.stdout.write(`  ${pc.green('All plugins healthy.')}\n\n`)
  }
}

function timesCmd(ctx: PluginManagerContext): void {
  const entries = ctx.pluginRegistry.getPlugins()
  const loaded = entries.filter((e) => e.status === 'loaded')

  process.stdout.write(`\n${pc.bold('Plugin Load Times')}\n\n`)
  process.stdout.write(`  Loaded plugins: ${loaded.length}\n`)
  process.stdout.write(`  Phase 1 (sync): aliases and completions registered\n`)
  process.stdout.write(`  Phase 2 (async): init() callbacks deferred\n\n`)
  process.stdout.write(`  ${pc.dim('Individual timing available in verbose mode (--verbose)')}\n\n`)
}

async function profileCmd(ctx: PluginManagerContext): Promise<void> {
  process.stdout.write(`\n${pc.bold('Plugin Profiles')}\n\n`)

  for (let i = 0; i < PROFILES.length; i++) {
    const profile = PROFILES[i]
    const plugins = expandProfile(profile.name)
    process.stdout.write(`  [${i + 1}] ${pc.bold(profile.name)} - ${profile.description}\n`)
    process.stdout.write(`      Plugins: ${pc.dim(plugins.join(', ') || profile.plugins.join(', '))}\n\n`)
  }

  const answer = await ctx.rl.question(`Select profile (1-${PROFILES.length}): `)
  const num = parseInt(String(answer).trim(), 10)

  if (isNaN(num) || num < 1 || num > PROFILES.length) {
    process.stdout.write('Selection cancelled.\n')
    return
  }

  const selected = PROFILES[num - 1]
  const expanded = expandProfile(selected.name)

  const config = loadConfig()
  const newConfig = {
    ...config,
    plugins: {
      ...config.plugins,
      enabled: [...expanded],
    },
  }
  saveConfig(newConfig)

  process.stdout.write(`Profile set to: ${pc.bold(selected.name)}\n`)
  process.stdout.write(`Enabled plugins: ${expanded.join(', ')}\n`)
  triggerHotReload(ctx)
}

function triggerHotReload(ctx: PluginManagerContext): void {
  if (!ctx.onHotReload) return

  import('./plugin-reload.js')
    .then(({ hotReload }) => hotReload())
    .then((result) => {
      ctx.onHotReload?.(result)
    })
    .catch(() => {
      // Hot-reload failure is non-critical
    })
}
