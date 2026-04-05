import type { PluginManifest } from '../types.js'

export const plugin: PluginManifest = {
  name: 'encode64',
  version: '1.0.0',
  description: 'Base64 encode/decode convenience aliases',
  platform: 'all',
  aliases: {
    e64: 'base64',
    d64: 'base64 --decode',
  },
}
