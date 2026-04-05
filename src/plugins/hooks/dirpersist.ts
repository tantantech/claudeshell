import type { PluginManifest } from '../types.js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

const DIRSTACK_FILE = join(homedir(), '.nesh', 'dirstack')
const MAX_ENTRIES = 50

let dirStack: readonly string[] = []

export const plugin: PluginManifest = {
  name: 'dirpersist',
  version: '1.0.0',
  description: 'Save and restore directory stack',
  async init() {
    try {
      const content = readFileSync(DIRSTACK_FILE, 'utf-8').trim()
      if (content) {
        dirStack = Object.freeze(content.split('\n').slice(0, MAX_ENTRIES))
      }
    } catch {
      // no saved stack — start fresh
    }
  },
  hooks: {
    onCd(context) {
      try {
        dirStack = Object.freeze([...dirStack.slice(-(MAX_ENTRIES - 1)), context.cwd])
        mkdirSync(dirname(DIRSTACK_FILE), { recursive: true })
        writeFileSync(DIRSTACK_FILE, dirStack.join('\n'), 'utf-8')
      } catch {
        // write failed — non-critical
      }
    },
  },
}
