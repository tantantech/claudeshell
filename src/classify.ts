import type { InputAction, BuiltinName } from './types.js'

const BUILTINS: ReadonlySet<string> = new Set(['cd', 'exit', 'quit', 'clear', 'export'])

export function classifyInput(line: string): InputAction {
  const trimmed = line.trim()
  if (!trimmed) return { type: 'empty' }

  // 'a' prefix routes to AI processing
  if (trimmed === 'a' || trimmed.startsWith('a ')) {
    return { type: 'ai', prompt: trimmed.slice(2).trim() }
  }

  const spaceIndex = trimmed.indexOf(' ')
  const firstWord = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex)
  const args = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1).trim()

  if (BUILTINS.has(firstWord)) {
    return { type: 'builtin', name: firstWord as BuiltinName, args }
  }

  return { type: 'passthrough', command: trimmed }
}
