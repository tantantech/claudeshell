import { execFileSync } from 'node:child_process'

// ANSI 256-color helpers
const ESC = '\x1b'
const RESET = `${ESC}[0m`
const BOLD = `${ESC}[1m`

// Orange (208) and white (15) palette
const fg = (n: number): string => `${ESC}[38;5;${n}m`
const bg = (n: number): string => `${ESC}[48;5;${n}m`

const ORANGE = 208
const DARK_ORANGE = 166
const WHITE = 15
const GRAY = 240

// Powerline separator characters
const RIGHT_SEP = '\uE0B0'  //

export function abbreviatePath(cwd: string, homedir: string): string {
  if (cwd === homedir) return '~'
  if (cwd.startsWith(homedir + '/')) return '~' + cwd.slice(homedir.length)
  return cwd
}

export function getGitBranch(): string {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf-8',
      timeout: 500,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return ''
  }
}

export function buildPrompt(cwd: string, homedir: string): string {
  const display = abbreviatePath(cwd, homedir)
  const branch = getGitBranch()

  // Segment 1: Shell name (orange bg, white text)
  const seg1 = `${bg(ORANGE)}${fg(WHITE)}${BOLD}  claudeshell ${RESET}`
  const sep1 = `${fg(ORANGE)}${bg(DARK_ORANGE)}${RIGHT_SEP}${RESET}`

  // Segment 2: Directory (dark orange bg, white text)
  const seg2 = `${bg(DARK_ORANGE)}${fg(WHITE)}${BOLD}  ${display} ${RESET}`

  // Build segments conditionally
  let prompt: string

  if (branch) {
    const sep2 = `${fg(DARK_ORANGE)}${bg(GRAY)}${RIGHT_SEP}${RESET}`
    // Segment 3: Git branch (gray bg, white text)
    const seg3 = `${bg(GRAY)}${fg(WHITE)}  ${branch} ${RESET}`
    const sep3 = `${fg(GRAY)}${RIGHT_SEP}${RESET}`
    prompt = `${seg1}${sep1}${seg2}${sep2}${seg3}${sep3}`
  } else {
    const sep2 = `${fg(DARK_ORANGE)}${RIGHT_SEP}${RESET}`
    prompt = `${seg1}${sep1}${seg2}${sep2}`
  }

  return `${prompt} ${fg(ORANGE)}❯${RESET} `
}
