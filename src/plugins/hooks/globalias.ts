import type { PluginManifest } from '../types.js'

// Note: Full global alias expansion requires integration with the
// command classification pipeline. This hook logs a warning when a
// global alias is detected. The actual expansion happens at the
// shell level via the aliases property.

export const plugin: PluginManifest = {
  name: 'globalias',
  version: '1.0.0',
  description: 'Expand aliases before execution',
  hooks: {
    preCommand(context) {
      // Placeholder: actual alias expansion is handled by the shell's
      // alias resolution in shell.ts. This hook exists for future
      // integration with a more advanced alias pipeline.
      void context
    },
  },
}
