import type { CompletionResult } from './types.js'
import { parseCompletionContext } from './types.js'
import { createCompletionCache } from './cache.js'
import { compgenComplete } from './compgen.js'
import { resolveFromSpec } from './spec-parser.js'
import type { PluginRegistry } from '../plugins/registry.js'

const PROVIDER_TIMEOUT_MS = 1000
const CACHE_TTL_MS = 30_000

export interface CompletionEngine {
  complete(line: string): Promise<[string[], string]>
}

export function createCompletionEngine(registry: PluginRegistry): CompletionEngine {
  const cache = createCompletionCache<CompletionResult>()

  async function complete(line: string): Promise<[string[], string]> {
    if (line.length === 0) {
      return [[], '']
    }

    const context = parseCompletionContext(line)
    const cacheKey = `${context.commandName}:${context.currentWord}`

    const cached = cache.get(cacheKey)
    if (cached) {
      return [[...cached.items], cached.prefix ?? context.currentWord]
    }

    let result: CompletionResult

    try {
      // Priority 1: Plugin completion provider
      const provider = registry.getCompletionProvider(context.commandName)
      if (provider) {
        const timeout = new Promise<CompletionResult>((resolve) => {
          setTimeout(() => resolve({ items: [] }), PROVIDER_TIMEOUT_MS)
        })
        result = await Promise.race([provider(context), timeout])
      }
      // Priority 2: Fig-style completion spec
      else {
        const specs = registry.getCompletionSpecs(context.commandName)
        if (specs && specs.length > 0) {
          const spec = specs[0]
          const tokens = context.words.slice(1).filter((w) => w !== context.currentWord)
          result = await resolveFromSpec(spec, tokens, context.currentWord, context)
        }
        // Priority 3: compgen fallback
        else {
          const isFirstWord = context.words.length <= 1 && context.currentWord === context.commandName
          const type = isFirstWord ? 'command' : 'file'
          const items = await compgenComplete(type, context.currentWord)
          result = { items, prefix: context.currentWord }
        }
      }
    } catch {
      result = { items: [], prefix: context.currentWord }
    }

    if (result.items.length > 0) {
      cache.set(cacheKey, result, CACHE_TTL_MS)
    }

    return [[...result.items], result.prefix ?? context.currentWord]
  }

  return { complete }
}
