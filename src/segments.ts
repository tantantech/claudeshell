import { execFileSync } from 'node:child_process'
import * as os from 'node:os'
import * as path from 'node:path'
import { segmentCache } from './segment-cache.js'

export type SegmentName =
  | 'shell-name'
  | 'dir'
  | 'git-branch'
  | 'git-status'
  | 'exec-time'
  | 'exit-code'
  | 'clock'
  | 'node-version'
  | 'python-venv'
  | 'user-host'

export interface SegmentData {
  readonly text: string
  readonly icon?: string
  readonly fgColor: number
  readonly bgColor: number
}

export interface GitStatusInfo {
  readonly dirty: number
  readonly staged: number
  readonly untracked: number
  readonly ahead: number
  readonly behind: number
  readonly stash: number
}

export function getGitStatus(): GitStatusInfo | null {
  const cacheKey = `git-status:${process.cwd()}`
  const cached = segmentCache.get(cacheKey) as GitStatusInfo | undefined
  if (cached) return cached

  try {
    const output = execFileSync('git', ['status', '--porcelain=v2', '--branch'], {
      encoding: 'utf-8',
      timeout: 500,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let dirty = 0
    let staged = 0
    let untracked = 0
    let ahead = 0
    let behind = 0
    const stash = 0

    const lines = output.split('\n')
    for (const line of lines) {
      if (line.startsWith('# branch.ab ')) {
        const match = line.match(/\+(\d+)\s+-(\d+)/)
        if (match) {
          ahead = parseInt(match[1], 10)
          behind = parseInt(match[2], 10)
        }
      } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
        // Format: "1 XY ..." where X=index, Y=worktree
        const xy = line.substring(2, 4)
        if (xy.length === 2) {
          const indexStatus = xy[0]
          const worktreeStatus = xy[1]
          if (worktreeStatus !== '.') dirty++
          if (indexStatus !== '.') staged++
        }
      } else if (line.startsWith('? ')) {
        untracked++
      }
    }

    const result: GitStatusInfo = { dirty, staged, untracked, ahead, behind, stash }
    segmentCache.set(cacheKey, result)
    return result
  } catch {
    return null
  }
}

export function getExecTime(startMs: number, thresholdMs = 1000): string | undefined {
  const elapsed = Date.now() - startMs
  if (elapsed < thresholdMs) return undefined

  const totalSeconds = Math.floor(elapsed / 1000)
  if (totalSeconds < 60) {
    const seconds = elapsed / 1000
    return `${seconds.toFixed(1)}s`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

export function getExitCode(code: number): string | undefined {
  if (code === 0) return undefined
  return String(code)
}

export function getClock(): string {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function getNodeVersion(): string {
  const full = process.version // e.g. "v22.1.0"
  const major = full.split('.')[0] // "v22"
  return major
}

export function getPythonVenv(): string | undefined {
  const venv = process.env.VIRTUAL_ENV
  if (!venv) return undefined
  return path.basename(venv)
}

export function getUserHost(): string {
  const user = os.userInfo().username
  const host = os.hostname()
  return `${user}@${host}`
}
