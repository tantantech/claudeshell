import type { PluginManifest } from '../types.js'

const clipboardCmd =
  process.platform === 'darwin' ? 'pwd | pbcopy' : 'pwd | xclip -selection clipboard'

export const plugin: PluginManifest = {
  name: 'copypath',
  version: '1.0.0',
  description: 'Copy current directory path to clipboard',
  platform: 'all',
  aliases: {
    copypath: clipboardCmd,
  },
}
