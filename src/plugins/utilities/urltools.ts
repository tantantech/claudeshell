import type { PluginManifest } from '../types.js'

export const plugin: PluginManifest = {
  name: 'urltools',
  version: '1.0.0',
  description: 'URL encode/decode utilities',
  platform: 'all',
  aliases: {
    urlencode:
      'python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))"',
    urldecode:
      'python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))"',
  },
}
