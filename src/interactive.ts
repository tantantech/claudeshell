import { spawn } from 'node:child_process'
import type { CommandResult } from './passthrough.js'

const DEFAULT_INTERACTIVE: ReadonlySet<string> = new Set([
  'vim', 'vi', 'nvim', 'nano', 'emacs',
  'less', 'more', 'man',
  'top', 'htop', 'btop',
  'ssh', 'telnet',
  'tmux', 'screen',
  'fzf',
])

export function isInteractiveCommand(
  command: string,
  userList: readonly string[] = [],
): boolean {
  const trimmed = command.trim()
  if (trimmed === '') return false
  if (trimmed.includes('|')) return false

  const firstWord = trimmed.split(/\s/)[0]
  if (DEFAULT_INTERACTIVE.has(firstWord)) return true
  if (userList.includes(firstWord)) return true

  return false
}

export function executeInteractive(
  command: string,
  cwd?: string,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', command], {
      stdio: 'inherit',
      cwd: cwd ?? process.cwd(),
      env: process.env,
    })

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stderr: '',
      })
    })

    child.on('error', (err) => {
      resolve({
        exitCode: 127,
        stderr: err.message,
      })
    })
  })
}
