import type { PluginManifest } from '../types.js'
import { execFile } from 'node:child_process'

const DEFAULT_THRESHOLD_MS = 10000

let commandStartTime: number | null = null
let currentCommand: string | null = null

function notify(title: string, message: string): void {
  try {
    if (process.platform === 'darwin') {
      execFile('osascript', [
        '-e',
        `display notification "${message}" with title "${title}"`,
      ])
    } else if (process.platform === 'linux') {
      execFile('notify-send', [title, message])
    }
  } catch {
    // notification failed — non-critical
  }
}

export const plugin: PluginManifest = {
  name: 'bgnotify',
  version: '1.0.0',
  description: 'Desktop notification for long commands',
  hooks: {
    preCommand(context) {
      commandStartTime = Date.now()
      currentCommand = context.command ?? ''
    },
    postCommand(context) {
      if (commandStartTime === null) return

      const elapsed = Date.now() - commandStartTime
      const cmd = currentCommand ?? ''
      commandStartTime = null
      currentCommand = null

      if (elapsed >= DEFAULT_THRESHOLD_MS) {
        const seconds = (elapsed / 1000).toFixed(1)
        const exitCode = context.exitCode ?? 0
        const status = exitCode === 0 ? 'completed' : `failed (${exitCode})`
        notify(`Command ${status}`, `"${cmd}" took ${seconds}s`)
      }
    },
  },
}
