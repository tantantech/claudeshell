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

export const DEFAULT_SEGMENTS: readonly SegmentName[] = [
  'shell-name',
  'dir',
  'git-branch',
  'git-status',
  'exec-time',
  'exit-code',
]

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
