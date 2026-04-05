import type { PluginManifest } from '../types.js'

let dirStack: readonly string[] = []
let stackIndex = -1

function pushDir(dir: string): void {
  // Immutable update: add to stack, reset index
  if (dirStack.length === 0 || dirStack[dirStack.length - 1] !== dir) {
    dirStack = [...dirStack.slice(-49), dir]
  }
  stackIndex = dirStack.length - 1
}

export function getDirStack(): readonly string[] {
  return dirStack
}

export const plugin: PluginManifest = {
  name: 'dircycle',
  version: '1.0.0',
  description: 'Cycle directory history with Alt+arrows',
  hooks: {
    onCd(context) {
      try {
        pushDir(context.cwd)
      } catch {
        // stack update failed — non-critical
      }
    },
  },
  aliases: {
    'dircycle-prev': 'cd -',
    'dircycle-next': 'cd +',
  },
}
