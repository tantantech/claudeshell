import type { PluginManifest } from '../types.js'

const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open'

export const plugin: PluginManifest = {
  name: 'web-search',
  version: '1.0.0',
  description: 'Open web searches from the terminal',
  platform: 'all',
  aliases: {
    google: `${openCmd} "https://www.google.com/search?q="`,
    github: `${openCmd} "https://github.com/search?q="`,
    stackoverflow: `${openCmd} "https://stackoverflow.com/search?q="`,
  },
}
