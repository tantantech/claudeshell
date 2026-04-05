import type { PluginManifest } from '../types.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { homedir } from 'node:os'

function nvmDir(): string {
  return process.env.NVM_DIR ?? join(homedir(), '.nvm')
}

function nvmInstalled(): boolean {
  return existsSync(join(nvmDir(), 'nvm.sh'))
}

export const plugin: PluginManifest = {
  name: 'nvm-auto',
  version: '1.0.0',
  description: 'Auto-switch Node version via .nvmrc',
  hooks: {
    onCd(context) {
      try {
        const nvmrcPath = join(context.cwd, '.nvmrc')
        if (!existsSync(nvmrcPath)) return
        if (!nvmInstalled()) return

        const version = readFileSync(nvmrcPath, 'utf-8').trim()
        if (!version) return

        // Source nvm and run nvm use in a subshell
        const nvmPath = join(nvmDir(), 'nvm.sh')
        execFile('bash', ['-c', `source "${nvmPath}" && nvm use ${version}`], {
          timeout: 10000,
        }, (error) => {
          if (error) {
            process.stderr.write(`[nvm-auto] failed to switch to node ${version}\n`)
          }
        })
      } catch {
        // nvm switch failed — non-critical
      }
    },
  },
}
