import type { PluginManifest } from '../types.js'

// Note: True bracketed-paste mode requires terminal raw mode access
// which is beyond the current plugin hook system. This plugin is a
// placeholder that documents the limitation. A future terminal-mode
// plugin API could enable full safe-paste behavior.

export const plugin: PluginManifest = {
  name: 'safe-paste',
  version: '1.0.0',
  description: 'Prevent execution of pasted multi-line commands (limited: requires terminal raw mode)',
}
