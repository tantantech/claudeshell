import * as path from 'node:path'
import * as os from 'node:os'
import * as readline from 'node:readline/promises'
import pc from 'picocolors'
import type { CdState } from './types.js'
import type { PluginRegistry } from './plugins/registry.js'
import { TEMPLATES, buildPromptFromTemplate } from './templates.js'
import { abbreviatePath, getGitBranch } from './prompt.js'
import { COLOR_SCHEMES, getColorSchemeByName } from './prompt-config.js'
import { executePromptConfig } from './prompt-config.js'
import { loadConfig, saveConfig } from './config.js'

export function expandTilde(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

export function executeCd(
  args: string,
  state: CdState
): { readonly newState: CdState; readonly error?: string; readonly output?: string } {
  const currentDir = process.cwd()
  let targetDir: string

  if (!args || args === '') {
    targetDir = os.homedir()
  } else if (args === '-') {
    if (!state.previousDir) {
      return { newState: state, error: 'cd: OLDPWD not set' }
    }
    targetDir = state.previousDir
  } else {
    targetDir = path.resolve(expandTilde(args))
  }

  try {
    process.chdir(targetDir)
    return {
      newState: { ...state, previousDir: currentDir },
      output: args === '-' ? targetDir : undefined,
    }
  } catch {
    return {
      newState: state,
      error: `cd: no such file or directory: ${args}`,
    }
  }
}

export function executeExport(args: string): string | undefined {
  const eqIndex = args.indexOf('=')
  if (eqIndex === -1) {
    return `export: invalid format: ${args} (expected KEY=VALUE)`
  }
  const key = args.slice(0, eqIndex)
  const value = args.slice(eqIndex + 1)
  process.env[key] = value
  return undefined
}

export interface ThemeResult {
  readonly templateName?: string
  readonly colorScheme?: string
  readonly segments?: readonly string[]
  readonly iconMode?: 'nerd-font' | 'unicode' | 'ascii'
}

export async function executeTheme(rl: readline.Interface): Promise<ThemeResult> {
  const config = loadConfig()
  const currentTemplate = config.prompt_template ?? 'minimal'
  const currentScheme = config.prompt_color_scheme ?? 'default'

  process.stdout.write(`\n${pc.bold('Theme Configuration')}\n\n`)
  process.stdout.write(`  Current: ${pc.bold(currentTemplate)} template, ${pc.bold(currentScheme)} colors\n\n`)
  process.stdout.write('  [1] Template    \u2014 Choose prompt layout style\n')
  process.stdout.write('  [2] Colors      \u2014 Change color scheme\n')
  process.stdout.write('  [3] Segments    \u2014 Configure info segments & icons\n\n')

  const answer = await rl.question('Select (1-3): ')
  const choice = parseInt(answer.trim(), 10)

  switch (choice) {
    case 1:
      return executeTemplateSelection(rl)
    case 2:
      return executeColorSelection(rl)
    case 3: {
      const result = await executePromptConfig(rl)
      return result.segments || result.iconMode
        ? { segments: result.segments, iconMode: result.iconMode }
        : {}
    }
    default:
      process.stdout.write('Selection cancelled.\n')
      return {}
  }
}

async function executeTemplateSelection(rl: readline.Interface): Promise<ThemeResult> {
  const cwd = process.cwd()
  const homedir = os.homedir()

  process.stdout.write('\nAvailable templates:\n\n')

  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i]
    const preview = buildPromptFromTemplate(t, cwd, homedir)
    process.stdout.write(`  [${i + 1}] ${t.label} \u2014 ${t.description}\n`)
    process.stdout.write(`      Preview: ${preview}\n\n`)
  }

  const answer = await rl.question(`Select template (1-${TEMPLATES.length}): `)
  const num = parseInt(answer.trim(), 10)

  if (isNaN(num) || num < 1 || num > TEMPLATES.length) {
    process.stdout.write('Selection cancelled.\n')
    return {}
  }

  const selected = TEMPLATES[num - 1].name
  saveConfig({ ...loadConfig(), prompt_template: selected })
  process.stdout.write(`Template set to: ${pc.bold(selected)}\n`)
  return { templateName: selected }
}

async function executeColorSelection(rl: readline.Interface): Promise<ThemeResult> {
  const config = loadConfig()
  const current = config.prompt_color_scheme ?? 'default'

  process.stdout.write('\nColor Schemes:\n\n')

  for (let i = 0; i < COLOR_SCHEMES.length; i++) {
    const s = COLOR_SCHEMES[i]
    const marker = s.name === current ? pc.green(' *') : ''
    const ESC = '\x1b'
    const swatch = `${ESC}[48;5;${s.primary}m  ${ESC}[0m${ESC}[48;5;${s.primaryDark}m  ${ESC}[0m${ESC}[48;5;${s.accent}m  ${ESC}[0m`
    process.stdout.write(`  [${i + 1}] ${s.label}${marker} \u2014 ${s.description}\n`)
    process.stdout.write(`      ${swatch}\n\n`)
  }

  const answer = await rl.question(`Select color scheme (1-${COLOR_SCHEMES.length}): `)
  const num = parseInt(answer.trim(), 10)

  if (isNaN(num) || num < 1 || num > COLOR_SCHEMES.length) {
    process.stdout.write('Selection cancelled.\n')
    return {}
  }

  const selected = COLOR_SCHEMES[num - 1].name
  saveConfig({ ...config, prompt_color_scheme: selected })
  process.stdout.write(`Color scheme set to: ${pc.bold(selected)}\n`)
  return { colorScheme: selected }
}

export function executeAliases(registry: PluginRegistry): void {
  const allAliases = registry.getAll()
  if (allAliases.size === 0) {
    process.stdout.write('No aliases configured.\n')
    return
  }

  // Group by source
  const grouped = new Map<string, Array<{ alias: string; expansion: string }>>()
  for (const [alias, entry] of allAliases) {
    const list = grouped.get(entry.source) ?? []
    list.push({ alias, expansion: entry.expansion })
    grouped.set(entry.source, [...list])
  }

  // Print user aliases first, then plugins alphabetically
  const userAliases = grouped.get('user')
  if (userAliases) {
    process.stdout.write(`\n${pc.bold('User aliases')}\n`)
    for (const { alias, expansion } of userAliases.sort((a, b) => a.alias.localeCompare(b.alias))) {
      process.stdout.write(`  ${alias} ${pc.dim('->')} ${expansion}\n`)
    }
    grouped.delete('user')
  }

  const sortedPlugins = [...grouped.keys()].sort()
  for (const pluginName of sortedPlugins) {
    const aliases = grouped.get(pluginName)!
    process.stdout.write(`\n${pc.dim(`[${pluginName}]`)} ${pc.bold(pluginName)}\n`)
    for (const { alias, expansion } of aliases.sort((a, b) => a.alias.localeCompare(b.alias))) {
      process.stdout.write(`  ${alias} ${pc.dim('->')} ${expansion}\n`)
    }
  }
  process.stdout.write('\n')
}
