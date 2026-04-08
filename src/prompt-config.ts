import * as readline from 'node:readline/promises'
import pc from 'picocolors'
import { loadConfig, saveConfig } from './config.js'
import type { SegmentName } from './segments.js'

export type IconMode = 'nerd-font' | 'unicode' | 'ascii'

export interface PromptConfigResult {
  readonly segments?: readonly string[]
  readonly iconMode?: IconMode
}

const ICON_MAP: Readonly<Record<string, Readonly<Record<IconMode, string>>>> = {
  branch:  { 'nerd-font': '\uE0A0', unicode: '\u2387', ascii: '' },
  folder:  { 'nerd-font': '\uF115', unicode: '\uD83D\uDCC1', ascii: '' },
  clock:   { 'nerd-font': '\uF017', unicode: '\u231A', ascii: '' },
  node:    { 'nerd-font': '\uE718', unicode: 'N', ascii: 'N' },
  python:  { 'nerd-font': '\uE73C', unicode: 'Py', ascii: 'Py' },
  error:   { 'nerd-font': '\uF071', unicode: '!', ascii: '!' },
  check:   { 'nerd-font': '\uF00C', unicode: '\u2714', ascii: '+' },
  stash:   { 'nerd-font': '\uF01C', unicode: '*', ascii: '*' },
}

export function getIcon(name: string, mode: IconMode): string {
  const entry = ICON_MAP[name]
  if (!entry) return ''
  return entry[mode]
}

export interface SeparatorSet {
  readonly right: string
  readonly rightThin: string
}

const SEPARATOR_MAP: Readonly<Record<IconMode, SeparatorSet>> = {
  'nerd-font': { right: '\uE0B0', rightThin: '\uE0B1' },
  unicode:     { right: '\u25B6', rightThin: '\u276F' },
  ascii:       { right: '|', rightThin: '|' },
}

export function getSeparator(mode: IconMode): SeparatorSet {
  return SEPARATOR_MAP[mode]
}

export const SEPARATOR_STYLES: Readonly<Record<string, SeparatorSet>> = {
  angled:   { right: '\uE0B0', rightThin: '\uE0B1' },
  vertical: { right: '\u2502', rightThin: '\u2502' },
  slanted:  { right: '\uE0BC', rightThin: '\uE0BD' },
  round:    { right: '\uE0B4', rightThin: '\uE0B5' },
}

export interface HeadStyleSet {
  readonly left: string
  readonly right: string
}

export const HEAD_STYLES: Readonly<Record<string, HeadStyleSet>> = {
  sharp:   { left: '', right: '' },
  blurred: { left: '\uE0C0', right: '\uE0C0' },
  slanted: { left: '\uE0BC', right: '\uE0BA' },
  round:   { left: '\uE0B6', right: '\uE0B4' },
}

export function getSeparatorStyle(name: string): SeparatorSet {
  return SEPARATOR_STYLES[name] ?? SEPARATOR_STYLES.angled
}

export interface WizardConfig {
  readonly iconMode: IconMode
  readonly template: string
  readonly colorScheme: string
  readonly separatorStyle: string
  readonly headStyle: string
  readonly height: string
  readonly spacing: string
  readonly iconDensity: string
  readonly flow: string
  readonly transient: boolean
  readonly timeFormat: string
  readonly segments: readonly string[]
}

export const DEFAULT_SEGMENTS: readonly SegmentName[] = [
  'shell-name',
  'dir',
  'git-branch',
  'git-status',
  'exec-time',
  'exit-code',
]

export interface ColorScheme {
  readonly name: string
  readonly label: string
  readonly description: string
  readonly primary: number
  readonly primaryDark: number
  readonly accent: number
  readonly git: number
  readonly info: number
  readonly error: number
  readonly promptChar: string
}

export const COLOR_SCHEMES: readonly ColorScheme[] = [
  // Nesh originals
  { name: 'default', label: 'Default', description: 'Orange powerline (nesh signature)', primary: 208, primaryDark: 166, accent: 75, git: 114, info: 245, error: 203, promptChar: '\u276F' },
  { name: 'ocean', label: 'Ocean', description: 'Cool blues and teals', primary: 33, primaryDark: 25, accent: 81, git: 114, info: 245, error: 203, promptChar: '\u276F' },
  { name: 'forest', label: 'Forest', description: 'Deep greens and earthy tones', primary: 34, primaryDark: 28, accent: 150, git: 114, info: 245, error: 167, promptChar: '\u276F' },
  { name: 'sunset', label: 'Sunset', description: 'Warm reds, oranges, and purples', primary: 196, primaryDark: 161, accent: 213, git: 221, info: 245, error: 203, promptChar: '\u276F' },
  { name: 'mono', label: 'Mono', description: 'Elegant grayscale', primary: 250, primaryDark: 240, accent: 255, git: 248, info: 245, error: 203, promptChar: '\u276F' },
  // P10k-inspired palettes
  { name: 'p10k-rainbow', label: 'P10k Rainbow', description: 'Classic p10k multi-color powerline', primary: 31, primaryDark: 24, accent: 75, git: 76, info: 244, error: 196, promptChar: '\u276F' },
  { name: 'p10k-lean', label: 'P10k Lean', description: 'Clean p10k with muted tones', primary: 39, primaryDark: 31, accent: 45, git: 76, info: 244, error: 160, promptChar: '\u276F' },
  { name: 'p10k-classic', label: 'P10k Classic', description: 'Traditional p10k dark segments', primary: 31, primaryDark: 236, accent: 39, git: 148, info: 242, error: 196, promptChar: '\u276F' },
  { name: 'p10k-pure', label: 'P10k Pure', description: 'Minimal p10k with subtle colors', primary: 243, primaryDark: 238, accent: 110, git: 76, info: 244, error: 203, promptChar: '\u276D' },
  // Editor-inspired themes
  { name: 'nord', label: 'Nord', description: 'Arctic blue palette inspired by Nord', primary: 67, primaryDark: 60, accent: 110, git: 108, info: 245, error: 174, promptChar: '\u276F' },
  { name: 'dracula', label: 'Dracula', description: 'Dark purple theme inspired by Dracula', primary: 141, primaryDark: 98, accent: 212, git: 84, info: 245, error: 203, promptChar: '\u276F' },
  { name: 'gruvbox', label: 'Gruvbox', description: 'Warm retro palette with earthy browns', primary: 214, primaryDark: 172, accent: 142, git: 108, info: 246, error: 167, promptChar: '\u276F' },
  { name: 'solarized', label: 'Solarized', description: 'Balanced blue-yellow by Ethan Schoonover', primary: 33, primaryDark: 24, accent: 136, git: 64, info: 244, error: 160, promptChar: '\u276F' },
  { name: 'catppuccin', label: 'Catppuccin', description: 'Soothing pastel palette (Mocha)', primary: 183, primaryDark: 140, accent: 117, git: 115, info: 245, error: 210, promptChar: '\u276F' },
  { name: 'tokyo-night', label: 'Tokyo Night', description: 'Vibrant neon on dark background', primary: 111, primaryDark: 61, accent: 176, git: 115, info: 245, error: 203, promptChar: '\u276F' },
  { name: 'one-dark', label: 'One Dark', description: 'Atom One Dark inspired palette', primary: 39, primaryDark: 24, accent: 204, git: 114, info: 245, error: 204, promptChar: '\u276F' },
  // Vibrant & creative
  { name: 'cyberpunk', label: 'Cyberpunk', description: 'Neon pink and electric cyan', primary: 199, primaryDark: 162, accent: 51, git: 46, info: 245, error: 196, promptChar: '\u276F' },
  { name: 'aurora', label: 'Aurora', description: 'Northern lights green and purple', primary: 48, primaryDark: 35, accent: 183, git: 84, info: 245, error: 203, promptChar: '\u276F' },
  { name: 'rose-pine', label: 'Rose Pine', description: 'Soft rose and pine tones', primary: 175, primaryDark: 132, accent: 146, git: 108, info: 245, error: 174, promptChar: '\u276F' },
  { name: 'kanagawa', label: 'Kanagawa', description: 'Japanese wave art blue and gold', primary: 67, primaryDark: 24, accent: 222, git: 108, info: 244, error: 167, promptChar: '\u276F' },
]

export const DEFAULT_COLOR_SCHEME = 'default'

export function getColorSchemeByName(name: string): ColorScheme {
  return COLOR_SCHEMES.find((s) => s.name === name) ?? COLOR_SCHEMES[0]
}

export const ALL_SEGMENTS: readonly SegmentName[] = [
  'shell-name',
  'dir',
  'git-branch',
  'git-status',
  'exec-time',
  'exit-code',
  'clock',
  'node-version',
  'python-venv',
  'user-host',
]

export async function executePromptConfig(
  rl: readline.Interface,
): Promise<PromptConfigResult> {
  const config = loadConfig()
  const currentSegments = [...(config.prompt_segments ?? DEFAULT_SEGMENTS)]
  let currentMode: IconMode = config.prompt_icon_mode ?? 'unicode'

  // Step 1: Icon mode selection
  process.stdout.write(`\n${pc.bold('Prompt Configuration')}\n\n`)
  process.stdout.write(`${pc.bold('Step 1: Icon Mode')}\n`)
  process.stdout.write(`  Does this look like a diamond? \uE0B2\n\n`)
  process.stdout.write(`  [1] Nerd Font (powerline icons)\n`)
  process.stdout.write(`  [2] Unicode (standard symbols)\n`)
  process.stdout.write(`  [3] ASCII (plain text)\n\n`)

  const modeAnswer = await rl.question('Select (1-3): ')
  const modeNum = parseInt(modeAnswer.trim(), 10)

  if (modeNum === 1) currentMode = 'nerd-font'
  else if (modeNum === 2) currentMode = 'unicode'
  else if (modeNum === 3) currentMode = 'ascii'

  // Step 2: Segment selection
  process.stdout.write(`\n${pc.bold('Step 2: Segments')}\n`)
  process.stdout.write(`Toggle segments by number, type ${pc.bold('"done"')} to finish.\n\n`)

  let editing = true
  while (editing) {
    for (let i = 0; i < ALL_SEGMENTS.length; i++) {
      const seg = ALL_SEGMENTS[i]
      const enabled = currentSegments.includes(seg)
      const marker = enabled ? pc.green('[x]') : pc.dim('[ ]')
      process.stdout.write(`  ${marker} [${i + 1}] ${seg}\n`)
    }
    process.stdout.write('\n')

    const segAnswer = await rl.question('Toggle # or "done": ')
    const trimmed = segAnswer.trim().toLowerCase()

    if (trimmed === 'done' || trimmed === '') {
      editing = false
    } else {
      const num = parseInt(trimmed, 10)
      if (!isNaN(num) && num >= 1 && num <= ALL_SEGMENTS.length) {
        const seg = ALL_SEGMENTS[num - 1]
        const idx = currentSegments.indexOf(seg)
        if (idx >= 0) {
          currentSegments.splice(idx, 1)
        } else {
          currentSegments.push(seg)
        }
      }
    }
  }

  // Save
  const result: PromptConfigResult = {
    segments: currentSegments,
    iconMode: currentMode,
  }

  saveConfig({
    ...config,
    prompt_segments: result.segments,
    prompt_icon_mode: result.iconMode,
  })

  process.stdout.write(`\n${pc.green('Prompt configuration saved.')}\n`)
  return result
}
