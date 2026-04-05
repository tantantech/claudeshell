import type { PluginManifest } from '../types.js'

const DEFAULT_THRESHOLD_MS = 5000

let commandStartTime: number | null = null

export const plugin: PluginManifest = {
  name: 'timer',
  version: '1.0.0',
  description: 'Show command execution time',
  hooks: {
    preCommand() {
      commandStartTime = Date.now()
    },
    postCommand() {
      if (commandStartTime === null) return

      const elapsed = Date.now() - commandStartTime
      commandStartTime = null

      if (elapsed >= DEFAULT_THRESHOLD_MS) {
        const seconds = (elapsed / 1000).toFixed(2)
        process.stderr.write(`\x1b[2m[timer] ${seconds}s\x1b[0m\n`)
      }
    },
  },
}
