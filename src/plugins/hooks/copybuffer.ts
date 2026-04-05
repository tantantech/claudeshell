import type { PluginManifest } from '../types.js'

function clipboardCommand(): string {
  if (process.platform === 'darwin') return 'pbcopy'
  return 'xclip -selection clipboard'
}

export const plugin: PluginManifest = {
  name: 'copybuffer',
  version: '1.0.0',
  description: 'Copy current buffer to clipboard',
  platform: process.platform === 'darwin' ? 'macos' : 'linux',
  aliases: {
    'copy-buffer': `echo -n "$BUFFER" | ${clipboardCommand()}`,
  },
}
