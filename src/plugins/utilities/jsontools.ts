import type { PluginManifest } from '../types.js'

export const plugin: PluginManifest = {
  name: 'jsontools',
  version: '1.0.0',
  description: 'JSON pretty-print and validation utilities',
  platform: 'all',
  aliases: {
    pp_json: 'python3 -m json.tool',
    is_json:
      'python3 -c "import json,sys; json.load(sys.stdin); print(\'Valid JSON\')"',
  },
}
