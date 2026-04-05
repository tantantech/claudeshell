import type { PluginManifest } from '../types.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

export const plugin: PluginManifest = {
  name: 'pipenv-env',
  version: '1.0.0',
  description: 'Auto-activate Pipenv shell',
  hooks: {
    onCd(context) {
      try {
        const pipfilePath = join(context.cwd, 'Pipfile')
        if (!existsSync(pipfilePath)) return

        const venvPath = execFileSync('pipenv', ['--venv'], {
          cwd: context.cwd,
          encoding: 'utf-8',
          timeout: 5000,
        }).trim()

        if (venvPath && existsSync(venvPath)) {
          process.env.VIRTUAL_ENV = venvPath
          process.env.PATH = `${join(venvPath, 'bin')}:${process.env.PATH}`
        }
      } catch {
        // pipenv not installed or no venv — skip
      }
    },
  },
}
