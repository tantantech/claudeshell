import type { PluginManifest } from '../types.js'

export const EXTRACTORS: Readonly<Record<string, readonly string[]>> = {
  '.tar.gz': ['tar', 'xzf'],
  '.tgz': ['tar', 'xzf'],
  '.tar.bz2': ['tar', 'xjf'],
  '.tar.xz': ['tar', 'xJf'],
  '.tar': ['tar', 'xf'],
  '.zip': ['unzip'],
  '.gz': ['gunzip'],
  '.bz2': ['bunzip2'],
  '.xz': ['unxz'],
  '.7z': ['7z', 'x'],
  '.rar': ['unrar', 'x'],
}

// Note: The actual `extract` command registration requires the plugin command API
// from Phase 11 (D-28). For now, the 'x' alias provides a convenience shortcut.
export const plugin: PluginManifest = {
  name: 'extract',
  version: '1.0.0',
  description: 'Archive extraction with auto-detection of archive type',
  platform: 'all',
  aliases: {
    x: 'extract',
  },
}
