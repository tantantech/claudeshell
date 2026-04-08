import { abbreviatePath, getGitBranch } from './prompt.js'
import { getGitStatus, getClock, getNodeVersion, getPythonVenv } from './segments.js'
import { getIcon, getSeparatorStyle, getColorSchemeByName, DEFAULT_SEGMENTS } from './prompt-config.js'
import { interpolateSegments } from './segment-registry.js'
import type { IconMode, ColorScheme, SeparatorSet } from './prompt-config.js'
import { loadConfig } from './config.js'
import type { NeshConfig } from './config.js'

// Shared render config loaded from NeshConfig
interface RenderConfig {
  readonly scheme: ColorScheme
  readonly mode: IconMode
  readonly sep: SeparatorSet
  readonly height: 'one-line' | 'two-line'
  readonly spacing: 'compact' | 'sparse'
  readonly density: 'few' | 'many'
  readonly flow: 'concise' | 'fluent'
  readonly timeFormat: 'none' | '12h' | '24h'
  readonly config: NeshConfig
}

function loadRenderConfig(overrideConfig?: NeshConfig): RenderConfig {
  const config = overrideConfig ?? loadConfig()
  return {
    scheme: getColorSchemeByName(config.prompt_color_scheme ?? 'default'),
    mode: config.prompt_icon_mode ?? 'unicode',
    sep: getSeparatorStyle(config.prompt_separator_style ?? 'angled'),
    height: config.prompt_height ?? 'one-line',
    spacing: config.prompt_spacing ?? 'compact',
    density: config.prompt_icon_density ?? 'few',
    flow: config.prompt_flow ?? 'concise',
    timeFormat: config.prompt_time_format ?? 'none',
    config,
  }
}

// ANSI helpers
const ESC = '\x1b'
const RESET = `${ESC}[0m`
const BOLD = `${ESC}[1m`
const DIM = `${ESC}[2m`
const fg = (n: number): string => `${ESC}[38;5;${n}m`
const bg = (n: number): string => `${ESC}[48;5;${n}m`

export interface PromptTemplate {
  readonly name: string
  readonly label: string
  readonly description: string
  readonly requiresNerdFont: boolean
}

type PromptBuilder = (cwd: string, homedir: string, overrideConfig?: NeshConfig) => string

const WHITE = 15
const GRAY = 240

// Icon helper respecting density
function icon(name: string, rc: RenderConfig, essential = false): string {
  if (rc.density === 'few' && !essential) return ''
  return getIcon(name, rc.mode)
}

// Flow label helper
function flowLabel(concise: string, fluent: string, rc: RenderConfig): string {
  return rc.flow === 'fluent' ? fluent : concise
}

// Time segment helper
function timeSegment(rc: RenderConfig): string | undefined {
  const clock = getClock(rc.timeFormat)
  if (!clock) return undefined
  const clockIcon = icon('clock', rc)
  return `${clockIcon}${clockIcon ? ' ' : ''}${clock}`
}

// Spacing prefix
function spacingPrefix(rc: RenderConfig): string {
  return rc.spacing === 'sparse' ? '\n' : ''
}

// Strip ANSI escape sequences to calculate visible string width
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

// Height-aware prompt assembly
function applyHeight(mainLine: string, promptChar: string, rc: RenderConfig): string {
  const prefix = spacingPrefix(rc)
  if (rc.height === 'two-line') {
    return `${prefix}${mainLine}\n${promptChar} `
  }
  return `${prefix}${mainLine} ${promptChar} `
}

const builders: Record<string, PromptBuilder> = {
  minimal(cwd: string, homedir: string, overrideConfig?: NeshConfig): string {
    const rc = loadRenderConfig(overrideConfig)
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const branchPart = branch ? ` ${DIM}(${branch})${RESET}` : ''
    const time = timeSegment(rc)
    const timePart = time ? ` ${DIM}${time}${RESET}` : ''
    const mainLine = `${DIM}nesh${RESET} ${display}${branchPart}${timePart}`
    return applyHeight(mainLine, '>', rc)
  },

  classic(cwd: string, homedir: string, overrideConfig?: NeshConfig): string {
    const rc = loadRenderConfig(overrideConfig)
    const s = rc.scheme
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const dirLabel = flowLabel(display, `in ${display}`, rc)
    const branchPart = branch
      ? ` ${fg(s.accent)}(${RESET}${flowLabel(branch, `on ${branch}`, rc)}${fg(s.accent)})${RESET}`
      : ''
    const time = timeSegment(rc)
    const timePart = time ? ` ${fg(s.info)}${time}${RESET}` : ''
    const mainLine = `${fg(s.accent)}[${RESET}nesh${fg(s.accent)}]${RESET} \u2500 ${dirLabel}${branchPart}${timePart}`
    return applyHeight(mainLine, `${fg(s.accent)}\u2500\u25B8${RESET}`, rc)
  },

  powerline(cwd: string, homedir: string, overrideConfig?: NeshConfig): string {
    const rc = loadRenderConfig(overrideConfig)
    const s = rc.scheme
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const folderIcon = icon('folder', rc)
    const dirText = `${folderIcon}${folderIcon ? ' ' : ''}${flowLabel(display, `in ${display}`, rc)}`

    const seg1 = `${bg(s.primary)}${fg(WHITE)}${BOLD}  nesh ${RESET}`
    const sep1 = `${fg(s.primary)}${bg(s.primaryDark)}${rc.sep.right}${RESET}`
    const seg2 = `${bg(s.primaryDark)}${fg(WHITE)}${BOLD}  ${dirText} ${RESET}`

    let result: string
    if (branch) {
      const sep2 = `${fg(s.primaryDark)}${bg(GRAY)}${rc.sep.right}${RESET}`
      const branchIcon = icon('branch', rc, true)
      const branchLabel = flowLabel(branch, `on ${branch}`, rc)
      const seg3 = `${bg(GRAY)}${fg(WHITE)}  ${branchIcon}${branchIcon ? ' ' : ''}${branchLabel} ${RESET}`
      const sep3 = `${fg(GRAY)}${rc.sep.right}${RESET}`
      result = `${seg1}${sep1}${seg2}${sep2}${seg3}${sep3}`
    } else {
      const sep2 = `${fg(s.primaryDark)}${rc.sep.right}${RESET}`
      result = `${seg1}${sep1}${seg2}${sep2}`
    }

    // Time segment
    const time = timeSegment(rc)
    if (time) result += ` ${fg(s.info)}${time}${RESET}`

    return applyHeight(result, `${fg(s.primary)}${s.promptChar}${RESET}`, rc)
  },

  hacker(cwd: string, homedir: string, overrideConfig?: NeshConfig): string {
    const rc = loadRenderConfig(overrideConfig)
    const s = rc.scheme
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const g = fg(s.git)
    const dirLabel = flowLabel(display, `in ${display}`, rc)
    const branchPart = branch
      ? `${g}\u2500[${RESET}${flowLabel(branch, `on ${branch}`, rc)}${g}]${RESET}`
      : ''
    const time = timeSegment(rc)
    const timePart = time ? `${g}\u2500[${RESET}${time}${g}]${RESET}` : ''
    const prefix = spacingPrefix(rc)
    // Hacker is always two-line
    return `${prefix}${g}\u250C\u2500[${RESET}nesh${g}]\u2500[${RESET}${dirLabel}${g}]${branchPart}${timePart}${RESET}\n${g}\u2514\u2500\u2500\u257C${RESET} `
  },

  pastel(cwd: string, homedir: string, overrideConfig?: NeshConfig): string {
    const rc = loadRenderConfig(overrideConfig)
    const s = rc.scheme
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const dirLabel = flowLabel(display, `in ${display}`, rc)
    const branchPart = branch
      ? ` ${fg(s.primary)}\u2502${RESET} ${fg(s.git)}${flowLabel(branch, `on ${branch}`, rc)}${RESET}`
      : ''
    const time = timeSegment(rc)
    const timePart = time ? ` ${fg(s.primary)}\u2502${RESET} ${fg(s.info)}${time}${RESET}` : ''
    const mainLine = `${fg(s.primary)}\u25CF${RESET} nesh ${fg(s.primary)}\u2502${RESET} ${fg(s.accent)}${dirLabel}${RESET}${branchPart}${timePart}`
    return applyHeight(mainLine, `${fg(s.primary)}${s.promptChar}${RESET}`, rc)
  },

  rainbow(cwd: string, homedir: string, overrideConfig?: NeshConfig): string {
    const rc = loadRenderConfig(overrideConfig)
    const s = rc.scheme
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const gitStatus = getGitStatus()
    const segments: string[] = []

    // Shell name - primary bg
    segments.push(`${bg(s.primary)}${fg(WHITE)}${BOLD} nesh ${RESET}`)
    segments.push(`${fg(s.primary)}${bg(s.primaryDark)}${rc.sep.right}${RESET}`)

    // Directory - primaryDark bg
    const folderIcon = icon('folder', rc)
    const dirLabel = flowLabel(display, `in ${display}`, rc)
    segments.push(`${bg(s.primaryDark)}${fg(WHITE)}${BOLD} ${folderIcon}${folderIcon ? ' ' : ''}${dirLabel} ${RESET}`)

    if (branch) {
      segments.push(`${fg(s.primaryDark)}${bg(s.git)}${rc.sep.right}${RESET}`)
      const branchIcon = icon('branch', rc, true)
      const branchLabel = flowLabel(branch, `on ${branch}`, rc)
      let branchText = `${bg(s.git)}${fg(WHITE)} ${branchIcon}${branchIcon ? ' ' : ''}${branchLabel}`
      if (gitStatus) {
        const parts: string[] = []
        if (gitStatus.dirty) parts.push(`~${gitStatus.dirty}`)
        if (gitStatus.staged) parts.push(`+${gitStatus.staged}`)
        if (gitStatus.untracked) parts.push(`?${gitStatus.untracked}`)
        if (parts.length > 0) branchText += ` ${parts.join(' ')}`
        if (gitStatus.ahead) branchText += ` \u2191${gitStatus.ahead}`
        if (gitStatus.behind) branchText += ` \u2193${gitStatus.behind}`
      }
      branchText += ` ${RESET}`
      segments.push(branchText)
      segments.push(`${fg(s.git)}${rc.sep.right}${RESET}`)
    } else {
      segments.push(`${fg(s.primaryDark)}${rc.sep.right}${RESET}`)
    }

    // Time segment inline for rainbow
    const time = timeSegment(rc)
    if (time) segments.push(` ${fg(s.info)}${time}${RESET}`)

    const mainLine = segments.join('')
    return applyHeight(mainLine, `${fg(s.primary)}${s.promptChar}${RESET}`, rc)
  },

  lean(cwd: string, homedir: string, overrideConfig?: NeshConfig): string {
    const rc = loadRenderConfig(overrideConfig)
    const s = rc.scheme
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const gitStatus = getGitStatus()
    const nodeVer = getNodeVersion()
    const venv = getPythonVenv()

    // Left: dir + git
    const leftParts: string[] = []
    const dirLabel = flowLabel(display, `in ${display}`, rc)
    leftParts.push(`${fg(s.accent)}${dirLabel}${RESET}`)

    if (branch) {
      const branchIcon = icon('branch', rc, true)
      const branchLabel = flowLabel(branch, `on ${branch}`, rc)
      let gitPart = `${fg(s.git)}${branchIcon}${branchIcon ? ' ' : ''}${branchLabel}`
      if (gitStatus) {
        const parts: string[] = []
        if (gitStatus.dirty) parts.push(`${fg(s.error)}~${gitStatus.dirty}`)
        if (gitStatus.staged) parts.push(`${fg(s.git)}+${gitStatus.staged}`)
        if (gitStatus.untracked) parts.push(`${fg(227)}?${gitStatus.untracked}`)
        if (parts.length > 0) gitPart += ` ${parts.join(' ')}`
      }
      gitPart += RESET
      leftParts.push(gitPart)
    }

    // Right: info segments
    const rightParts: string[] = []
    if (venv) {
      const pyIcon = icon('python', rc)
      rightParts.push(`${fg(221)}${pyIcon}${pyIcon ? ' ' : ''}${venv}${RESET}`)
    }
    const nodeIcon = icon('node', rc)
    rightParts.push(`${fg(s.git)}${nodeIcon}${nodeIcon ? ' ' : ''}${nodeVer}${RESET}`)
    const time = timeSegment(rc)
    if (time) rightParts.push(`${fg(s.info)}${time}${RESET}`)

    const line1 = `${leftParts.join(' ')}  ${rightParts.join('  ')}`
    const prefix = spacingPrefix(rc)

    // Lean is always two-line
    return `${prefix}${line1}\n${fg(s.accent)}${s.promptChar}${RESET} `
  },

  'classic-p10k'(cwd: string, homedir: string, overrideConfig?: NeshConfig): string {
    const rc = loadRenderConfig(overrideConfig)
    const s = rc.scheme
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const gitStatus = getGitStatus()
    const segments: string[] = []

    // Shell name - dark bg 236
    segments.push(`${bg(236)}${fg(250)}${BOLD} nesh ${RESET}`)
    segments.push(`${fg(236)}${bg(238)}${rc.sep.right}${RESET}`)

    // Directory - dark bg 238
    const folderIcon = icon('folder', rc)
    const dirLabel = flowLabel(display, `in ${display}`, rc)
    segments.push(`${bg(238)}${fg(s.accent)}${BOLD} ${folderIcon}${folderIcon ? ' ' : ''}${dirLabel} ${RESET}`)

    if (branch) {
      segments.push(`${fg(238)}${bg(240)}${rc.sep.right}${RESET}`)
      const branchIcon = icon('branch', rc, true)
      const branchLabel = flowLabel(branch, `on ${branch}`, rc)
      let branchText = `${bg(240)}${fg(s.git)} ${branchIcon}${branchIcon ? ' ' : ''}${branchLabel}`
      if (gitStatus) {
        const parts: string[] = []
        if (gitStatus.dirty) parts.push(`${fg(s.error)}~${gitStatus.dirty}`)
        if (gitStatus.staged) parts.push(`${fg(s.git)}+${gitStatus.staged}`)
        if (gitStatus.untracked) parts.push(`${fg(227)}?${gitStatus.untracked}`)
        if (parts.length > 0) branchText += ` ${parts.join(' ')}`
      }
      branchText += ` ${RESET}`
      segments.push(branchText)
      segments.push(`${fg(240)}${rc.sep.right}${RESET}`)
    } else {
      segments.push(`${fg(238)}${rc.sep.right}${RESET}`)
    }

    // Time
    const time = timeSegment(rc)
    if (time) segments.push(` ${fg(s.info)}${time}${RESET}`)

    const mainLine = segments.join('')
    return applyHeight(mainLine, `${fg(s.accent)}${s.promptChar}${RESET}`, rc)
  },

  p10k(cwd: string, homedir: string, overrideConfig?: NeshConfig): string {
    const rc = loadRenderConfig(overrideConfig)
    const s = rc.scheme
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const gitStatus = getGitStatus()

    // --- Left side segments ---
    const leftParts: string[] = []

    // Shell icon/name
    const shellLabel = icon('folder', rc, true) ? '' : 'nesh'
    leftParts.push(`${fg(s.primary)}${BOLD}${shellLabel || ''}${RESET}`)

    // Directory
    const folderIcon = icon('folder', rc)
    const dirLabel = flowLabel(display, `in ${display}`, rc)
    leftParts.push(`${fg(s.accent)}${folderIcon}${folderIcon ? ' ' : ''}${dirLabel}${RESET}`)

    // Git branch
    if (branch) {
      const branchIcon = icon('branch', rc, true)
      const branchLabel = flowLabel(branch, `on ${branch}`, rc)
      leftParts.push(`${fg(s.git)}${branchIcon}${branchIcon ? ' ' : ''}${branchLabel}${RESET}`)
    }

    const leftSep = ` ${fg(s.primary)}\u276F${RESET} `
    const leftStr = leftParts.join(leftSep)

    // --- Right side segments ---
    const rightParts: string[] = []

    // Git status indicator (clean/dirty)
    if (branch) {
      const isClean = !gitStatus || (gitStatus.dirty === 0 && gitStatus.staged === 0 && gitStatus.untracked === 0)
      const checkIcon = icon('check', rc)
      if (isClean) {
        rightParts.push(`${fg(s.git)}${checkIcon || '\u2713'}${RESET}`)
      } else {
        const errorIcon = icon('error', rc)
        rightParts.push(`${fg(s.error)}${errorIcon || '\u2717'}${RESET}`)
      }
    }

    // Local label
    rightParts.push(`${DIM}local${RESET}`)

    // Time
    const time = timeSegment(rc)
    if (time) {
      rightParts.push(`${fg(s.info)}${time}${RESET}`)
    }

    const rightSep = ` ${fg(s.primary)}\u276E${RESET} `
    const rightStr = rightParts.join(rightSep)

    // --- Combine with padding ---
    const columns = process.stdout.columns || 80
    const visibleLeft = stripAnsi(leftStr).length
    const visibleRight = stripAnsi(rightStr).length
    const padding = Math.max(1, columns - visibleLeft - visibleRight)
    const mainLine = `${leftStr}${' '.repeat(padding)}${rightStr}`

    return applyHeight(mainLine, `${fg(s.primary)}${s.promptChar}${RESET}`, rc)
  },

  pure(cwd: string, homedir: string, overrideConfig?: NeshConfig): string {
    const rc = loadRenderConfig(overrideConfig)
    const s = rc.scheme
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const gitStatus = getGitStatus()

    const dirLabel = flowLabel(display, `in ${display}`, rc)
    let line = `${fg(s.accent)}${dirLabel}${RESET}`

    if (branch) {
      const branchLabel = flowLabel(branch, `on ${branch}`, rc)
      let gitPart = `${fg(s.info)}${branchLabel}`
      if (gitStatus && gitStatus.dirty > 0) {
        gitPart += `${fg(s.error)}*`
      }
      gitPart += RESET
      line += ` ${gitPart}`
    }

    const time = timeSegment(rc)
    if (time) line += ` ${fg(s.info)}${time}${RESET}`

    const prefix = spacingPrefix(rc)
    // Pure is always two-line
    return `${prefix}${line}\n${fg(s.primary)}${s.promptChar}${RESET} `
  },
}

export const TEMPLATES: readonly PromptTemplate[] = [
  { name: 'p10k', label: 'P10k', description: 'Two-sided prompt with left and right segments', requiresNerdFont: false },
  { name: 'minimal', label: 'Minimal', description: 'Clean and simple, no special characters', requiresNerdFont: false },
  { name: 'classic', label: 'Classic', description: 'Box-drawing characters with accents', requiresNerdFont: false },
  { name: 'powerline', label: 'Powerline', description: 'Segments with arrow separators (requires Nerd Font)', requiresNerdFont: true },
  { name: 'hacker', label: 'Hacker', description: 'Two-line terminal aesthetic', requiresNerdFont: false },
  { name: 'pastel', label: 'Pastel', description: 'Soft colored sections with Unicode separators', requiresNerdFont: false },
  { name: 'rainbow', label: 'Rainbow', description: 'P10k multi-colored segments with powerline arrows (requires Nerd Font)', requiresNerdFont: true },
  { name: 'lean', label: 'Lean', description: 'P10k two-line with colored text, no backgrounds', requiresNerdFont: false },
  { name: 'classic-p10k', label: 'Classic P10k', description: 'P10k dark background segments (requires Nerd Font)', requiresNerdFont: true },
  { name: 'pure', label: 'Pure', description: 'Ultra-minimal two-line inspired by sindresorhus/pure', requiresNerdFont: false },
]

export const DEFAULT_TEMPLATE_NAME = 'p10k'

export function getTemplateByName(name: string): PromptTemplate | undefined {
  return TEMPLATES.find((t) => t.name === name)
}

export function buildPromptFromTemplate(template: PromptTemplate, cwd: string, homedir: string, overrideConfig?: NeshConfig): string {
  const builder = builders[template.name]
  if (!builder) {
    return interpolateSegments(builders.minimal(cwd, homedir, overrideConfig))
  }
  return interpolateSegments(builder(cwd, homedir, overrideConfig))
}
