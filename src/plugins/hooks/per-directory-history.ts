import type { PluginManifest } from '../types.js'
import { createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

function dirHash(dir: string): string {
  return createHash('sha256').update(dir).digest('hex').slice(0, 12)
}

function ensureHistoryDir(): string {
  const histDir = join(homedir(), '.nesh', 'history')
  try {
    mkdirSync(histDir, { recursive: true })
  } catch {
    // directory already exists or permission error — skip
  }
  return histDir
}

export const plugin: PluginManifest = {
  name: 'per-directory-history',
  version: '1.0.0',
  description: 'Per-directory command history',
  hooks: {
    onCd(context) {
      try {
        const histDir = ensureHistoryDir()
        const hash = dirHash(context.cwd)
        process.env.HISTFILE = join(histDir, hash)
      } catch {
        // non-critical — fall back to default history
      }
    },
  },
}
