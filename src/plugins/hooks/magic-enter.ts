import type { PluginManifest } from '../types.js'
import { spawnSync } from 'node:child_process'

export const plugin: PluginManifest = {
  name: 'magic-enter',
  version: '1.0.0',
  description: 'Run git status + ls on empty enter',
  hooks: {
    preCommand(context) {
      const cmd = (context.command ?? '').trim()
      if (cmd !== '') return

      try {
        const gitResult = spawnSync('git', ['status', '--short', '--branch'], {
          cwd: context.cwd,
          encoding: 'utf-8',
          timeout: 3000,
        })
        if (gitResult.status === 0 && gitResult.stdout) {
          process.stdout.write(gitResult.stdout)
        }
      } catch {
        // not a git repo or git not installed — skip
      }

      try {
        const lsResult = spawnSync('ls', ['-F'], {
          cwd: context.cwd,
          encoding: 'utf-8',
          timeout: 3000,
        })
        if (lsResult.status === 0 && lsResult.stdout) {
          process.stdout.write(lsResult.stdout)
        }
      } catch {
        // ls failed — skip
      }
    },
  },
}
