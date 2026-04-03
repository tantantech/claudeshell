import pc from 'picocolors'
import * as readline from 'node:readline/promises'
import { listModels, getProviderForModel, PROVIDER_DISPLAY_NAMES } from './providers/index.js'

export async function executeModelSwitcher(
  rl: readline.Interface,
  currentModel: string | undefined,
): Promise<string | undefined> {
  const models = listModels()

  process.stdout.write('\nAvailable models:\n\n')

  let currentProvider = ''
  let index = 0
  const indexToShorthand: string[] = []

  for (const { shorthand, entry } of models) {
    if (entry.provider !== currentProvider) {
      currentProvider = entry.provider
      const providerLabel = PROVIDER_DISPLAY_NAMES[entry.provider] ?? entry.provider
      process.stdout.write(`  ${pc.bold(providerLabel)}\n`)
    }

    index++
    indexToShorthand.push(shorthand)
    const isCurrent = currentModel === entry.model || currentModel === shorthand
    const marker = isCurrent ? pc.green(' *') : '  '
    process.stdout.write(`    [${index}] ${entry.displayName}${marker}\n`)
  }

  process.stdout.write('\n')

  const answer = await rl.question(`Select model (1-${index}): `)
  const num = parseInt(answer.trim(), 10)

  if (isNaN(num) || num < 1 || num > index) {
    process.stdout.write('Selection cancelled.\n')
    return undefined
  }

  const selectedShorthand = indexToShorthand[num - 1]
  const resolved = getProviderForModel(selectedShorthand)
  if (!resolved) return undefined

  process.stderr.write(pc.dim(`Model set to ${resolved.displayName}\n`))
  return resolved.modelId
}

export function getModelDisplayName(modelId: string | undefined): string {
  if (!modelId) return 'Claude Sonnet 4.5'
  const resolved = getProviderForModel(modelId)
  return resolved?.displayName ?? modelId
}
