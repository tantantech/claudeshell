import type { PluginManifest } from '../types.js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

const LWD_FILE = join(homedir(), '.nesh', 'last-working-dir')

export const plugin: PluginManifest = {
  name: 'last-working-dir',
  version: '1.0.0',
  description: 'Remember last working directory',
  async init() {
    try {
      const saved = readFileSync(LWD_FILE, 'utf-8').trim()
      if (saved) {
        process.chdir(saved)
      }
    } catch {
      // no saved directory or permission error — skip
    }
  },
  hooks: {
    onCd(context) {
      try {
        mkdirSync(dirname(LWD_FILE), { recursive: true })
        writeFileSync(LWD_FILE, context.cwd, 'utf-8')
      } catch {
        // write failed — non-critical
      }
    },
  },
}
