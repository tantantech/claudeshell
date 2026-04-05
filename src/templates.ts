import { abbreviatePath, getGitBranch } from './prompt.js'
import { getGitStatus, getExecTime, getExitCode, getClock, getNodeVersion, getPythonVenv, getUserHost } from './segments.js'
import { getIcon, getSeparator, DEFAULT_SEGMENTS } from './prompt-config.js'
import type { IconMode } from './prompt-config.js'
import { loadConfig } from './config.js'

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

type PromptBuilder = (cwd: string, homedir: string) => string

// Powerline constants
const ORANGE = 208
const DARK_ORANGE = 166
const WHITE = 15
const GRAY = 240
const RIGHT_SEP = '\uE0B0'

const builders: Record<string, PromptBuilder> = {
  minimal(cwd: string, homedir: string): string {
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const branchPart = branch ? ` ${DIM}(${branch})${RESET}` : ''
    return `${DIM}nesh${RESET} ${display}${branchPart} > `
  },

  classic(cwd: string, homedir: string): string {
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const branchPart = branch ? ` ${fg(6)}(${branch})${RESET}` : ''
    return `${fg(6)}[${RESET}nesh${fg(6)}]${RESET} \u2500 ${display}${branchPart} \u2500\u25B8 `
  },

  powerline(cwd: string, homedir: string): string {
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()

    const seg1 = `${bg(ORANGE)}${fg(WHITE)}${BOLD}  nesh ${RESET}`
    const sep1 = `${fg(ORANGE)}${bg(DARK_ORANGE)}${RIGHT_SEP}${RESET}`
    const seg2 = `${bg(DARK_ORANGE)}${fg(WHITE)}${BOLD}  ${display} ${RESET}`

    if (branch) {
      const sep2 = `${fg(DARK_ORANGE)}${bg(GRAY)}${RIGHT_SEP}${RESET}`
      const seg3 = `${bg(GRAY)}${fg(WHITE)}  ${branch} ${RESET}`
      const sep3 = `${fg(GRAY)}${RIGHT_SEP}${RESET}`
      return `${seg1}${sep1}${seg2}${sep2}${seg3}${sep3} ${fg(ORANGE)}\u276F${RESET} `
    }

    const sep2 = `${fg(DARK_ORANGE)}${RIGHT_SEP}${RESET}`
    return `${seg1}${sep1}${seg2}${sep2} ${fg(ORANGE)}\u276F${RESET} `
  },

  hacker(cwd: string, homedir: string): string {
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const GREEN = 2
    const g = fg(GREEN)
    const branchPart = branch ? `${g}\u2500[${RESET}${branch}${g}]${RESET}` : ''
    return `${g}\u250C\u2500[${RESET}nesh${g}]\u2500[${RESET}${display}${g}]${branchPart}${RESET}\n${g}\u2514\u2500\u2500\u257C${RESET} `
  },

  pastel(cwd: string, homedir: string): string {
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const PURPLE = 141
    const BLUE = 111
    const PINK = 218
    const branchPart = branch ? ` ${fg(PURPLE)}\u2502${RESET} ${fg(PINK)}${branch}${RESET}` : ''
    return `${fg(PURPLE)}\u25CF${RESET} nesh ${fg(PURPLE)}\u2502${RESET} ${fg(BLUE)}${display}${RESET}${branchPart} ${fg(PURPLE)}\u276F${RESET} `
  },

  rainbow(cwd: string, homedir: string): string {
    const config = loadConfig()
    const mode: IconMode = config.prompt_icon_mode ?? 'unicode'
    const sep = getSeparator(mode)
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const gitStatus = getGitStatus()
    const segments: string[] = []

    // Shell name - blue bg
    segments.push(`${bg(31)}${fg(WHITE)}${BOLD} nesh ${RESET}`)
    segments.push(`${fg(31)}${bg(166)}${sep.right}${RESET}`)

    // Directory - orange bg
    const folderIcon = getIcon('folder', mode)
    segments.push(`${bg(166)}${fg(WHITE)}${BOLD} ${folderIcon}${folderIcon ? ' ' : ''}${display} ${RESET}`)

    if (branch) {
      segments.push(`${fg(166)}${bg(70)}${sep.right}${RESET}`)
      const branchIcon = getIcon('branch', mode)
      let branchText = `${bg(70)}${fg(WHITE)} ${branchIcon}${branchIcon ? ' ' : ''}${branch}`
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
      segments.push(`${fg(70)}${sep.right}${RESET}`)
    } else {
      segments.push(`${fg(166)}${sep.right}${RESET}`)
    }

    return `${segments.join('')} ${fg(31)}\u276F${RESET} `
  },

  lean(cwd: string, homedir: string): string {
    const config = loadConfig()
    const mode: IconMode = config.prompt_icon_mode ?? 'unicode'
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const gitStatus = getGitStatus()
    const clock = getClock()
    const nodeVer = getNodeVersion()
    const venv = getPythonVenv()

    // Line 1: left = dir + git, right = info segments
    const leftParts: string[] = []
    leftParts.push(`${fg(75)}${display}${RESET}`)

    if (branch) {
      const branchIcon = getIcon('branch', mode)
      let gitPart = `${fg(114)}${branchIcon}${branchIcon ? ' ' : ''}${branch}`
      if (gitStatus) {
        const parts: string[] = []
        if (gitStatus.dirty) parts.push(`${fg(203)}~${gitStatus.dirty}`)
        if (gitStatus.staged) parts.push(`${fg(114)}+${gitStatus.staged}`)
        if (gitStatus.untracked) parts.push(`${fg(227)}?${gitStatus.untracked}`)
        if (parts.length > 0) gitPart += ` ${parts.join(' ')}`
      }
      gitPart += RESET
      leftParts.push(gitPart)
    }

    const rightParts: string[] = []
    if (venv) rightParts.push(`${fg(221)}${getIcon('python', mode)} ${venv}${RESET}`)
    rightParts.push(`${fg(114)}${getIcon('node', mode)} ${nodeVer}${RESET}`)
    const clockIcon = getIcon('clock', mode)
    rightParts.push(`${fg(245)}${clockIcon}${clockIcon ? ' ' : ''}${clock}${RESET}`)

    const line1 = `${leftParts.join(' ')}  ${rightParts.join('  ')}`

    // Line 2: prompt character
    return `${line1}\n${fg(75)}\u276F${RESET} `
  },

  'classic-p10k'(cwd: string, homedir: string): string {
    const config = loadConfig()
    const mode: IconMode = config.prompt_icon_mode ?? 'unicode'
    const sep = getSeparator(mode)
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const gitStatus = getGitStatus()
    const segments: string[] = []

    // Shell name - dark bg 236
    segments.push(`${bg(236)}${fg(250)}${BOLD} nesh ${RESET}`)
    segments.push(`${fg(236)}${bg(238)}${sep.right}${RESET}`)

    // Directory - dark bg 238
    const folderIcon = getIcon('folder', mode)
    segments.push(`${bg(238)}${fg(75)}${BOLD} ${folderIcon}${folderIcon ? ' ' : ''}${display} ${RESET}`)

    if (branch) {
      segments.push(`${fg(238)}${bg(240)}${sep.right}${RESET}`)
      const branchIcon = getIcon('branch', mode)
      let branchText = `${bg(240)}${fg(114)} ${branchIcon}${branchIcon ? ' ' : ''}${branch}`
      if (gitStatus) {
        const parts: string[] = []
        if (gitStatus.dirty) parts.push(`${fg(203)}~${gitStatus.dirty}`)
        if (gitStatus.staged) parts.push(`${fg(114)}+${gitStatus.staged}`)
        if (gitStatus.untracked) parts.push(`${fg(227)}?${gitStatus.untracked}`)
        if (parts.length > 0) branchText += ` ${parts.join(' ')}`
      }
      branchText += ` ${RESET}`
      segments.push(branchText)
      segments.push(`${fg(240)}${sep.right}${RESET}`)
    } else {
      segments.push(`${fg(238)}${sep.right}${RESET}`)
    }

    return `${segments.join('')} ${fg(75)}\u276F${RESET} `
  },

  pure(cwd: string, homedir: string): string {
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const gitStatus = getGitStatus()

    let line = `${fg(75)}${display}${RESET}`

    if (branch) {
      let gitPart = `${fg(245)}${branch}`
      if (gitStatus && gitStatus.dirty > 0) {
        gitPart += `${fg(203)}*`
      }
      gitPart += RESET
      line += ` ${gitPart}`
    }

    return `${line}\n${fg(141)}\u276F${RESET} `
  },
}

export const TEMPLATES: readonly PromptTemplate[] = [
  { name: 'minimal', label: 'Minimal', description: 'Clean and simple, no special characters', requiresNerdFont: false },
  { name: 'classic', label: 'Classic', description: 'Box-drawing characters with cyan accents', requiresNerdFont: false },
  { name: 'powerline', label: 'Powerline', description: 'Orange segments with arrow separators (requires Nerd Font)', requiresNerdFont: true },
  { name: 'hacker', label: 'Hacker', description: 'Green-on-black two-line terminal aesthetic', requiresNerdFont: false },
  { name: 'pastel', label: 'Pastel', description: 'Soft colored sections with Unicode separators', requiresNerdFont: false },
  { name: 'rainbow', label: 'Rainbow', description: 'P10k multi-colored segments with powerline arrows', requiresNerdFont: true },
  { name: 'lean', label: 'Lean', description: 'P10k two-line with colored text, no backgrounds', requiresNerdFont: false },
  { name: 'classic-p10k', label: 'Classic P10k', description: 'P10k dark background segments with powerline arrows', requiresNerdFont: true },
  { name: 'pure', label: 'Pure', description: 'Ultra-minimal two-line, dim git info inspired by sindresorhus/pure', requiresNerdFont: false },
]

export const DEFAULT_TEMPLATE_NAME = 'minimal'

export function getTemplateByName(name: string): PromptTemplate | undefined {
  return TEMPLATES.find((t) => t.name === name)
}

export function buildPromptFromTemplate(template: PromptTemplate, cwd: string, homedir: string): string {
  const builder = builders[template.name]
  if (!builder) {
    return builders.minimal(cwd, homedir)
  }
  return builder(cwd, homedir)
}
