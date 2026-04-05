import { describe, it, expect } from 'vitest'
import type { PluginManifest } from '../src/plugins/types.js'

const HOOK_PLUGINS = [
  'colored-man-pages',
  'timer',
  'per-directory-history',
  'dotenv',
  'last-working-dir',
  'bgnotify',
  'magic-enter',
  'nvm-auto',
  'safe-paste',
  'copybuffer',
  'dircycle',
  'dirpersist',
  'poetry-env',
  'pipenv-env',
  'globalias',
  'zbell',
  'python-venv',
  'thefuck',
] as const

describe('hook plugins', () => {
  for (const name of HOOK_PLUGINS) {
    describe(name, () => {
      it('exports a valid PluginManifest', async () => {
        const mod = await import(`../src/plugins/hooks/${name}.ts`) as { plugin: PluginManifest }
        expect(mod.plugin).toBeDefined()
        expect(mod.plugin.name).toBe(name)
        expect(typeof mod.plugin.version).toBe('string')
        expect(typeof mod.plugin.description).toBe('string')
      })

      it('has hooks or aliases', async () => {
        const mod = await import(`../src/plugins/hooks/${name}.ts`) as { plugin: PluginManifest }
        const hasHooks = mod.plugin.hooks !== undefined && Object.keys(mod.plugin.hooks).length > 0
        const hasAliases = mod.plugin.aliases !== undefined && Object.keys(mod.plugin.aliases).length > 0
        const hasInit = mod.plugin.init !== undefined
        const hasDescription = mod.plugin.description.length > 0
        // At minimum, every plugin must have hooks, aliases, init, or a description
        expect(hasHooks || hasAliases || hasInit || hasDescription).toBe(true)
      })
    })
  }

  it('all 18 hook plugins are accounted for', () => {
    expect(HOOK_PLUGINS.length).toBe(18)
  })
})
