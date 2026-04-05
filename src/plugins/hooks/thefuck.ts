import type { PluginManifest } from '../types.js'

export const plugin: PluginManifest = {
  name: 'thefuck',
  version: '1.0.0',
  description: 'Corrects previous console command',
  aliases: {
    fuck: 'thefuck $(fc -ln -1)',
  },
}
