import { getProviderForModel } from './providers/index.js'
import type { InputAction, BuiltinName } from './types.js'

const BUILTINS: ReadonlySet<string> = new Set(['cd', 'exit', 'quit', 'clear', 'export', 'theme', 'model', 'keys', 'settings', 'aliases', 'plugin'])

const MODEL_FLAGS: Readonly<Record<string, string>> = {
  '--haiku': 'claude-haiku-4-5-20251001',
  '--sonnet': 'claude-sonnet-4-5-20250514',
  '--opus': 'claude-opus-4-6-20250414',
}

function extractModelFlag(prompt: string): { readonly model?: string; readonly cleanPrompt: string } {
  const tokens = prompt.split(/\s+/)
  const firstToken = tokens[0] ?? ''

  // Handle --model <name> flag (two tokens)
  if (firstToken === '--model' && tokens.length >= 2) {
    const modelName = tokens[1]
    const rest = tokens.slice(2).join(' ').trim()
    // Resolve through provider registry
    const resolved = getProviderForModel(modelName)
    return { model: resolved?.modelId ?? modelName, cleanPrompt: rest }
  }

  // Handle shorthand flags like --haiku, --sonnet, --opus
  const mapped = MODEL_FLAGS[firstToken]
  if (mapped) {
    const rest = tokens.slice(1).join(' ').trim()
    return { model: mapped, cleanPrompt: rest }
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
