import { abbreviatePath, getGitBranch } from './prompt.js'
import { getGitStatus, getNodeVersion, getPythonVenv, getClock } from './segments.js'
import type { GitStatusInfo } from './segments.js'
import { homedir } from 'node:os'

export type SegmentFn = () => string

const registry = new Map<string, SegmentFn>()

export function registerSegment(name: string, fn: SegmentFn): void {
  registry.set(name, fn)
}

export function resolveSegment(name: string): string {
  const fn = registry.get(name)
  if (!fn) return ''
  try {
    return fn()
  } catch {
    return ''
  }
}

export function interpolateSegments(template: string): string {
  return template.replace(/\{segment:([^}]+)\}/g, (_, name: string) => resolveSegment(name))
}

// Format git status as compact string like "~2 +1 ?3"
function formatGitStatus(status: GitStatusInfo): string {
  const parts: string[] = []
  if (status.dirty) parts.push(`~${status.dirty}`)
  if (status.staged) parts.push(`+${status.staged}`)
  if (status.untracked) parts.push(`?${status.untracked}`)
  if (status.ahead) parts.push(`^${status.ahead}`)
  if (status.behind) parts.push(`v${status.behind}`)
  return parts.join(' ')
}

// Pre-register built-in segments
const home = homedir()

registerSegment('cwd', () => abbreviatePath(process.cwd(), home))
registerSegment('git_branch', () => getGitBranch() ?? '')
registerSegment('git_status', () => {
  const s = getGitStatus()
  return s ? formatGitStatus(s) : ''
})
registerSegment('node_version', () => getNodeVersion())
registerSegment('python_version', () => getPythonVenv() ?? '')
registerSegment('time', () => getClock('24h') ?? '')
registerSegment('exit_code', () => '')
