import * as readline from 'node:readline/promises'
import * as os from 'node:os'
import pc from 'picocolors'
import { loadConfig, saveConfig } from './config.js'
import {
  SEPARATOR_STYLES,
  HEAD_STYLES,
  COLOR_SCHEMES,
  DEFAULT_SEGMENTS,
  ALL_SEGMENTS,
  getColorSchemeByName,
  getSeparator,
  getIcon,
} from './prompt-config.js'
import type { IconMode, WizardConfig, SeparatorSet } from './prompt-config.js'
import { TEMPLATES, buildPromptFromTemplate } from './templates.js'
import type { PromptTemplate } from './templates.js'
import { abbreviatePath, getGitBranch } from './prompt.js'
import type { ThemeResult } from './builtins.js'

export interface WizardResult extends ThemeResult {
  readonly separatorStyle?: string
  readonly headStyle?: string
  readonly height?: string
  readonly spacing?: string
  readonly iconDensity?: string
  readonly flow?: string
  readonly transient?: boolean
  readonly timeFormat?: string
}

const ESC = '\x1b'
const RESET = `${ESC}[0m`
const BOLD = `${ESC}[1m`
const fg = (n: number): string => `${ESC}[38;5;${n}m`
const bg = (n: number): string => `${ESC}[48;5;${n}m`
const WHITE = 15

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function askChoice(
  rl: readline.Interface,
  prompt: string,
  max: number,
): Promise<number | 'quit'> {
  const answer = await rl.question(prompt)
  const trimmed = answer.trim().toLowerCase()
  if (trimmed === 'q') return 'quit'
  const num = parseInt(trimmed, 10)
  if (isNaN(num) || num < 1 || num > max) return 'quit'
  return num
}

async function askYesNo(
  rl: readline.Interface,
  prompt: string,
): Promise<boolean | 'quit'> {
  const answer = await rl.question(prompt)
  const trimmed = answer.trim().toLowerCase()
  if (trimmed === 'q') return 'quit'
  return trimmed === 'y' || trimmed === 'yes'
}

function sectionHeader(step: number, total: number, title: string): void {
  process.stdout.write(
    `\n${pc.bold(`[${step}/${total}]`)} ${pc.bold(title)}\n\n`,
  )
}

function renderSeparatorPreview(sep: SeparatorSet, label: string): string {
  const scheme = getColorSchemeByName('default')
  const seg1 = `${bg(scheme.primary)}${fg(WHITE)}${BOLD} nesh ${RESET}`
  const arrow = `${fg(scheme.primary)}${bg(scheme.primaryDark)}${sep.right}${RESET}`
  const seg2 = `${bg(scheme.primaryDark)}${fg(WHITE)}${BOLD} ~/code ${RESET}`
  const arrow2 = `${fg(scheme.primaryDark)}${RESET}`
  return `  ${seg1}${arrow}${seg2}${arrow2}  ${pc.dim(label)}`
}

function templateUsePowerline(t: PromptTemplate): boolean {
  return t.requiresNerdFont
}

// ---------------------------------------------------------------------------
// Wizard steps
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 12

async function stepFontTest(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  sectionHeader(1, TOTAL_STEPS, 'Font Detection')
  process.stdout.write(`  Does this look like a diamond (rotated square)?  \uE0B2\n\n`)
  process.stdout.write(`  [y] Yes\n`)
  process.stdout.write(`  [n] No\n\n`)

  const result = await askYesNo(rl, 'Answer (y/n): ')
  if (result === 'quit') return null

  if (result) {
    return { ...config, iconMode: 'nerd-font' }
  }
  return stepUnicodeTest(rl, config)
}

async function stepUnicodeTest(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  process.stdout.write(`\n  Does this look like a right-pointing arrow?  \u25B6\n\n`)
  process.stdout.write(`  [y] Yes\n`)
  process.stdout.write(`  [n] No\n\n`)

  const result = await askYesNo(rl, 'Answer (y/n): ')
  if (result === 'quit') return null

  return { ...config, iconMode: result ? 'unicode' : 'ascii' }
}

async function stepPromptStyle(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  sectionHeader(2, TOTAL_STEPS, 'Prompt Style')

  const cwd = process.cwd()
  const homedir = os.homedir()

  const available = TEMPLATES.filter(
    (t) => !t.requiresNerdFont || config.iconMode === 'nerd-font',
  )

  for (let i = 0; i < available.length; i++) {
    const t = available[i]
    const preview = buildPromptFromTemplate(t, cwd, homedir)
    process.stdout.write(`  [${i + 1}] ${t.label} \u2014 ${t.description}\n`)
    process.stdout.write(`      ${preview}\n\n`)
  }

  const choice = await askChoice(rl, `Select template (1-${available.length}): `, available.length)
  if (choice === 'quit') return null

  return { ...config, template: available[choice - 1].name }
}

async function stepColorScheme(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  sectionHeader(3, TOTAL_STEPS, 'Color Scheme')

  for (let i = 0; i < COLOR_SCHEMES.length; i++) {
    const s = COLOR_SCHEMES[i]
    const swatch = `${ESC}[48;5;${s.primary}m  ${ESC}[0m${ESC}[48;5;${s.primaryDark}m  ${ESC}[0m${ESC}[48;5;${s.accent}m  ${ESC}[0m`
    process.stdout.write(`  [${i + 1}] ${s.label} \u2014 ${s.description}\n`)
    process.stdout.write(`      ${swatch}\n\n`)
  }

  const choice = await askChoice(rl, `Select color scheme (1-${COLOR_SCHEMES.length}): `, COLOR_SCHEMES.length)
  if (choice === 'quit') return null

  return { ...config, colorScheme: COLOR_SCHEMES[choice - 1].name }
}

async function stepTimeFormat(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  sectionHeader(4, TOTAL_STEPS, 'Show Current Time?')

  process.stdout.write('  [1] No\n')
  process.stdout.write('  [2] 12-hour (1:23 PM)\n')
  process.stdout.write('  [3] 24-hour (13:23)\n\n')

  const choice = await askChoice(rl, 'Select (1-3): ', 3)
  if (choice === 'quit') return null

  const formats = ['none', '12h', '24h'] as const
  return { ...config, timeFormat: formats[choice - 1] }
}

async function stepSeparatorStyle(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  const tmpl = TEMPLATES.find((t) => t.name === config.template)
  if (!tmpl || !templateUsePowerline(tmpl)) {
    return config
  }

  sectionHeader(5, TOTAL_STEPS, 'Separator Style')

  const styles = Object.keys(SEPARATOR_STYLES)
  const labels = ['Angled (default)', 'Vertical', 'Slanted', 'Round']

  for (let i = 0; i < styles.length; i++) {
    const sep = SEPARATOR_STYLES[styles[i]]
    process.stdout.write(`${renderSeparatorPreview(sep, labels[i])}\n`)
    process.stdout.write(`  [${i + 1}] ${labels[i]}  ${sep.right}\n\n`)
  }

  const choice = await askChoice(rl, `Select (1-${styles.length}): `, styles.length)
  if (choice === 'quit') return null

  return { ...config, separatorStyle: styles[choice - 1] }
}

async function stepHeadStyle(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  const tmpl = TEMPLATES.find((t) => t.name === config.template)
  if (!tmpl || !templateUsePowerline(tmpl)) {
    return config
  }

  sectionHeader(6, TOTAL_STEPS, 'Prompt Head/Tail Style')

  const styles = Object.keys(HEAD_STYLES)
  const labels = ['Sharp (flat edge)', 'Blurred', 'Slanted', 'Round']

  for (let i = 0; i < styles.length; i++) {
    const hs = HEAD_STYLES[styles[i]]
    const glyphPreview = hs.left || hs.right ? `  ${hs.left} ... ${hs.right}` : '  (no decorations)'
    process.stdout.write(`  [${i + 1}] ${labels[i]}${glyphPreview}\n`)
  }
  process.stdout.write('\n')

  const choice = await askChoice(rl, `Select (1-${styles.length}): `, styles.length)
  if (choice === 'quit') return null

  return { ...config, headStyle: styles[choice - 1] }
}

async function stepHeight(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  sectionHeader(7, TOTAL_STEPS, 'Prompt Height')

  const scheme = getColorSchemeByName(config.colorScheme)
  const dir = abbreviatePath(process.cwd(), os.homedir())

  process.stdout.write(`  [1] One line\n`)
  process.stdout.write(`      ${fg(scheme.accent)}${dir}${RESET} ${fg(scheme.primary)}${scheme.promptChar}${RESET} command\n\n`)
  process.stdout.write(`  [2] Two lines\n`)
  process.stdout.write(`      ${fg(scheme.accent)}${dir}${RESET}\n      ${fg(scheme.primary)}${scheme.promptChar}${RESET} command\n\n`)

  const choice = await askChoice(rl, 'Select (1-2): ', 2)
  if (choice === 'quit') return null

  return { ...config, height: choice === 1 ? 'one-line' : 'two-line' }
}

async function stepSpacing(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  sectionHeader(8, TOTAL_STEPS, 'Prompt Spacing')

  process.stdout.write('  [1] Compact (no extra newline before prompt)\n')
  process.stdout.write('  [2] Sparse  (blank line before each prompt)\n\n')

  const choice = await askChoice(rl, 'Select (1-2): ', 2)
  if (choice === 'quit') return null

  return { ...config, spacing: choice === 1 ? 'compact' : 'sparse' }
}

async function stepIconDensity(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  if (config.iconMode === 'ascii') {
    return config
  }

  sectionHeader(9, TOTAL_STEPS, 'Icon Density')

  const branchIcon = getIcon('branch', config.iconMode)
  const folderIcon = getIcon('folder', config.iconMode)

  process.stdout.write(`  [1] Few icons  \u2014 only essential (${branchIcon} git branch, errors)\n`)
  process.stdout.write(`  [2] Many icons \u2014 all segments get icons (${folderIcon} ${branchIcon})\n\n`)

  const choice = await askChoice(rl, 'Select (1-2): ', 2)
  if (choice === 'quit') return null

  return { ...config, iconDensity: choice === 1 ? 'few' : 'many' }
}

async function stepFlow(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  sectionHeader(10, TOTAL_STEPS, 'Prompt Flow')

  process.stdout.write('  [1] Concise \u2014 short segment labels (main, ~/code)\n')
  process.stdout.write('  [2] Fluent  \u2014 verbose labels (on branch main, in ~/code)\n\n')

  const choice = await askChoice(rl, 'Select (1-2): ', 2)
  if (choice === 'quit') return null

  return { ...config, flow: choice === 1 ? 'concise' : 'fluent' }
}

async function stepTransient(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  sectionHeader(11, TOTAL_STEPS, 'Transient Prompt')

  process.stdout.write('  [1] No  \u2014 keep full prompt for past commands\n')
  process.stdout.write('  [2] Yes \u2014 show simplified prompt for command history\n\n')

  const choice = await askChoice(rl, 'Select (1-2): ', 2)
  if (choice === 'quit') return null

  return { ...config, transient: choice === 2 }
}

async function stepConfirm(
  rl: readline.Interface,
  config: WizardConfig,
): Promise<WizardConfig | null> {
  sectionHeader(12, TOTAL_STEPS, 'Confirmation')

  process.stdout.write(`  ${pc.bold('Your selections:')}\n\n`)
  process.stdout.write(`    Icon mode:        ${config.iconMode}\n`)
  process.stdout.write(`    Template:         ${config.template}\n`)
  process.stdout.write(`    Color scheme:     ${config.colorScheme}\n`)
  process.stdout.write(`    Time format:      ${config.timeFormat}\n`)
  process.stdout.write(`    Separator style:  ${config.separatorStyle}\n`)
  process.stdout.write(`    Head style:       ${config.headStyle}\n`)
  process.stdout.write(`    Height:           ${config.height}\n`)
  process.stdout.write(`    Spacing:          ${config.spacing}\n`)
  process.stdout.write(`    Icon density:     ${config.iconDensity}\n`)
  process.stdout.write(`    Flow:             ${config.flow}\n`)
  process.stdout.write(`    Transient:        ${config.transient ? 'yes' : 'no'}\n`)

  // Show live preview
  const cwd = process.cwd()
  const homedir = os.homedir()
  const tmpl = TEMPLATES.find((t) => t.name === config.template) ?? TEMPLATES[0]
  const preview = buildPromptFromTemplate(tmpl, cwd, homedir)
  process.stdout.write(`\n  ${pc.bold('Preview:')}\n`)
  process.stdout.write(`  ${preview}\n\n`)

  const result = await askYesNo(rl, `${pc.bold('Apply these settings?')} (y/n): `)
  if (result === 'quit' || !result) return null

  return config
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export async function executeWizard(
  rl: readline.Interface,
): Promise<WizardResult> {
  process.stdout.write(`\n${pc.bold('Nesh Configuration Wizard')}\n`)
  process.stdout.write(`${pc.dim('Press q at any step to cancel')}\n`)

  const existingConfig = loadConfig()

  let config: WizardConfig = {
    iconMode: existingConfig.prompt_icon_mode ?? 'unicode',
    template: existingConfig.prompt_template ?? 'minimal',
    colorScheme: existingConfig.prompt_color_scheme ?? 'default',
    separatorStyle: existingConfig.prompt_separator_style ?? 'angled',
    headStyle: existingConfig.prompt_head_style ?? 'sharp',
    height: existingConfig.prompt_height ?? 'one-line',
    spacing: existingConfig.prompt_spacing ?? 'compact',
    iconDensity: existingConfig.prompt_icon_density ?? 'few',
    flow: existingConfig.prompt_flow ?? 'concise',
    transient: existingConfig.prompt_transient ?? false,
    timeFormat: existingConfig.prompt_time_format ?? 'none',
    segments: [...(existingConfig.prompt_segments ?? DEFAULT_SEGMENTS)],
  }

  const steps: ReadonlyArray<
    (rl: readline.Interface, c: WizardConfig) => Promise<WizardConfig | null>
  > = [
    stepFontTest,
    stepPromptStyle,
    stepColorScheme,
    stepTimeFormat,
    stepSeparatorStyle,
    stepHeadStyle,
    stepHeight,
    stepSpacing,
    stepIconDensity,
    stepFlow,
    stepTransient,
    stepConfirm,
  ]

  for (const step of steps) {
    const result = await step(rl, config)
    if (result === null) {
      process.stdout.write(`\n${pc.yellow('Wizard cancelled.')}\n`)
      return {}
    }
    config = result
  }

  // Save all settings atomically
  saveConfig({
    ...existingConfig,
    prompt_icon_mode: config.iconMode,
    prompt_template: config.template,
    prompt_color_scheme: config.colorScheme,
    prompt_separator_style: config.separatorStyle as 'angled' | 'vertical' | 'slanted' | 'round',
    prompt_head_style: config.headStyle as 'sharp' | 'blurred' | 'slanted' | 'round',
    prompt_height: config.height as 'one-line' | 'two-line',
    prompt_spacing: config.spacing as 'compact' | 'sparse',
    prompt_icon_density: config.iconDensity as 'few' | 'many',
    prompt_flow: config.flow as 'concise' | 'fluent',
    prompt_transient: config.transient,
    prompt_time_format: config.timeFormat as 'none' | '12h' | '24h',
    prompt_segments: config.segments,
  })

  process.stdout.write(`\n${pc.green('Configuration saved successfully!')}\n`)

  return {
    templateName: config.template,
    colorScheme: config.colorScheme,
    segments: config.segments,
    iconMode: config.iconMode,
    separatorStyle: config.separatorStyle,
    headStyle: config.headStyle,
    height: config.height,
    spacing: config.spacing,
    iconDensity: config.iconDensity,
    flow: config.flow,
    transient: config.transient,
    timeFormat: config.timeFormat,
  }
}
