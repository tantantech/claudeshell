import type { PluginManifest } from '../types.js'

const LESS_TERMCAP: Readonly<Record<string, string>> = {
  LESS_TERMCAP_mb: '\x1b[1;31m',    // begin blink (bold red)
  LESS_TERMCAP_md: '\x1b[1;36m',    // begin bold (bold cyan)
  LESS_TERMCAP_me: '\x1b[0m',       // end mode
  LESS_TERMCAP_so: '\x1b[01;44;33m', // begin standout (yellow on blue)
  LESS_TERMCAP_se: '\x1b[0m',       // end standout
  LESS_TERMCAP_us: '\x1b[1;32m',    // begin underline (bold green)
  LESS_TERMCAP_ue: '\x1b[0m',       // end underline
}

export const plugin: PluginManifest = {
  name: 'colored-man-pages',
  version: '1.0.0',
  description: 'Colorize man page output',
  async init() {
    for (const [key, value] of Object.entries(LESS_TERMCAP)) {
      process.env[key] = value
    }
  },
  async destroy() {
    for (const key of Object.keys(LESS_TERMCAP)) {
      delete process.env[key]
    }
  },
}
