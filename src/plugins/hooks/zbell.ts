import type { PluginManifest } from '../types.js'

const DEFAULT_THRESHOLD_MS = 15000

let commandStartTime: number | null = null

export const plugin: PluginManifest = {
  name: 'zbell',
  version: '1.0.0',
  description: 'Terminal bell for long commands',
  hooks: {
    preCommand() {
      commandStartTime = Date.now()
    },
    postCommand() {
      if (commandStartTime === null) return

      const elapsed = Date.now() - commandStartTime
      commandStartTime = null

      if (elapsed >= DEFAULT_THRESHOLD_MS) {
        process.stderr.write('\x07')
      }
    },
  },
}
