import type { PluginManifest } from '../types.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const VENV_DIRS = ['venv', '.venv'] as const

export const plugin: PluginManifest = {
  name: 'python-venv',
  version: '1.0.0',
  description: 'Auto-activate Python virtualenv',
  hooks: {
    onCd(context) {
      try {
        for (const dir of VENV_DIRS) {
          const venvPath = join(context.cwd, dir)
          const activatePath = join(venvPath, 'bin', 'activate')
          if (existsSync(activatePath)) {
            process.env.VIRTUAL_ENV = venvPath
            process.env.PATH = `${join(venvPath, 'bin')}:${process.env.PATH}`
            return
          }
        }
      } catch {
        // venv detection failed — non-critical
      }
    },
  },
}
