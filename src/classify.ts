import type { InputAction, BuiltinName } from './types.js'

const BUILTINS: ReadonlySet<string> = new Set(['cd', 'exit', 'quit', 'clear', 'export', 'theme'])

const MODEL_FLAGS: Readonly<Record<string, string>> = {
  '--haiku': 'claude-haiku-4-5-20251001',
  '--sonnet': 'claude-sonnet-4-5-20250514',
  '--opus': 'claude-opus-4-6-20250414',
}

function extractModelFlag(prompt: string): { readonly model?: string; readonly cleanPrompt: string } {
  const spaceIdx = prompt.indexOf(' ')
  const firstToken = spaceIdx === -1 ? prompt : prompt.slice(0, spaceIdx)
  const mapped = MODEL_FLAGS[firstToken]
  if (mapped) {
    return { model: mapped, cleanPrompt: spaceIdx === -1 ? '' : prompt.slice(spaceIdx + 1).trim() }
  }
  return { cleanPrompt: prompt }
}

export function classifyInput(line: string, prefix: string = 'a'): InputAction {
  const trimmed = line.trim()
  if (!trimmed) return { type: 'empty' }

  // Configured prefix routes to AI processing
  if (trimmed === prefix || trimmed.startsWith(prefix + ' ')) {
    const rawPrompt = trimmed.slice(prefix.length).trim()
    const { model, cleanPrompt } = extractModelFlag(rawPrompt)
    if (model) {
      return { type: 'ai', prompt: cleanPrompt, model }
    }
    return { type: 'ai', prompt: cleanPrompt }
  }

  const spaceIndex = trimmed.indexOf(' ')
  const firstWord = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex)
  const args = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1).trim()

  if (BUILTINS.has(firstWord)) {
    return { type: 'builtin', name: firstWord as BuiltinName, args }
  }

  return { type: 'passthrough', command: trimmed }
}
