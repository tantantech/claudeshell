import type { PluginManifest } from '../types.js'

export const plugin: PluginManifest = {
  name: 'dirhistory',
  version: '1.0.0',
  description: 'Directory stack navigation',
  platform: 'all',
  aliases: {
    d: 'dirs -v',
  },
}
