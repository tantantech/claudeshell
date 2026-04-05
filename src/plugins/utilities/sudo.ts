import type { PluginManifest } from '../types.js'

// Note: The Escape+Escape keybinding to toggle sudo prefix requires the
// registerKeybinding API from D-28. For now, 'please' is a convenience alias.
export const plugin: PluginManifest = {
  name: 'sudo',
  version: '1.0.0',
  description: 'Toggle sudo prefix on current line',
  platform: 'all',
  aliases: {
    please: 'sudo',
  },
}
