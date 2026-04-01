import { abbreviatePath, getGitBranch } from './prompt.js'

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
    return `${DIM}claudeshell${RESET} ${display}${branchPart} > `
  },

  classic(cwd: string, homedir: string): string {
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const branchPart = branch ? ` ${fg(6)}(${branch})${RESET}` : ''
    return `${fg(6)}[${RESET}claudeshell${fg(6)}]${RESET} \u2500 ${display}${branchPart} \u2500\u25B8 `
  },

  powerline(cwd: string, homedir: string): string {
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()

    const seg1 = `${bg(ORANGE)}${fg(WHITE)}${BOLD}  claudeshell ${RESET}`
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
    return `${g}\u250C\u2500[${RESET}claudeshell${g}]\u2500[${RESET}${display}${g}]${branchPart}${RESET}\n${g}\u2514\u2500\u2500\u257C${RESET} `
  },

  pastel(cwd: string, homedir: string): string {
    const display = abbreviatePath(cwd, homedir)
    const branch = getGitBranch()
    const PURPLE = 141
    const BLUE = 111
    const PINK = 218
    const branchPart = branch ? ` ${fg(PURPLE)}\u2502${RESET} ${fg(PINK)}${branch}${RESET}` : ''
    return `${fg(PURPLE)}\u25CF${RESET} claudeshell ${fg(PURPLE)}\u2502${RESET} ${fg(BLUE)}${display}${RESET}${branchPart} ${fg(PURPLE)}\u276F${RESET} `
  },
}

export const TEMPLATES: readonly PromptTemplate[] = [
  { name: 'minimal', label: 'Minimal', description: 'Clean and simple, no special characters', requiresNerdFont: false },
  { name: 'classic', label: 'Classic', description: 'Box-drawing characters with cyan accents', requiresNerdFont: false },
  { name: 'powerline', label: 'Powerline', description: 'Orange segments with arrow separators (requires Nerd Font)', requiresNerdFont: true },
  { name: 'hacker', label: 'Hacker', description: 'Green-on-black two-line terminal aesthetic', requiresNerdFont: false },
  { name: 'pastel', label: 'Pastel', description: 'Soft colored sections with Unicode separators', requiresNerdFont: false },
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
