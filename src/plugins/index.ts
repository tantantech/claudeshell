import { plugin as git } from './git.js'
import type { PluginManifest } from './types.js'

export const BUNDLED_PLUGINS: readonly PluginManifest[] = [git]
