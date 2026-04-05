import type { PluginManifest } from '../types.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

export const plugin: PluginManifest = {
  name: 'poetry-env',
  version: '1.0.0',
  description: 'Auto-activate Poetry virtualenv',
  hooks: {
    onCd(context) {
      try {
        const pyprojectPath = join(context.cwd, 'pyproject.toml')
        if (!existsSync(pyprojectPath)) return

        const venvPath = execFileSync('poetry', ['env', 'info', '--path'], {
          cwd: context.cwd,
          encoding: 'utf-8',
          timeout: 5000,
        }).trim()

        if (venvPath && existsSync(venvPath)) {
          process.env.VIRTUAL_ENV = venvPath
          process.env.PATH = `${join(venvPath, 'bin')}:${process.env.PATH}`
        }
      } catch {
        // poetry not installed or no venv — skip
      }
    },
  },
}
