import pc from 'picocolors'
import * as readline from 'node:readline/promises'
import { loadConfig, saveConfig, maskKey, resolveProviderKey } from './config.js'
import { PROVIDER_ENV_VARS, PROVIDER_DISPLAY_NAMES } from './providers/index.js'

const PROVIDER_NAMES = ['anthropic', 'openai', 'google'] as const

export async function executeKeyManager(rl: readline.Interface): Promise<void> {
  process.stdout.write('\nAPI Key Management\n\n')
  process.stdout.write('  [1] View configured keys\n')
  process.stdout.write('  [2] Add / update a key\n')
  process.stdout.write('  [3] Remove a key\n\n')

  const choice = await rl.question('Select action (1-3): ')
  const num = parseInt(choice.trim(), 10)

  switch (num) {
    case 1:
      viewKeys()
      break
    case 2:
      await addKey(rl)
      break
    case 3:
      await removeKey(rl)
      break
    default:
      process.stdout.write('Cancelled.\n')
  }
}

function viewKeys(): void {
  process.stdout.write('\nConfigured API Keys:\n\n')

  for (const provider of PROVIDER_NAMES) {
    const displayName = PROVIDER_DISPLAY_NAMES[provider] ?? provider
    const key = resolveProviderKey(provider)
    const envVar = PROVIDER_ENV_VARS[provider] ?? ''
    const envSet = envVar ? Boolean(process.env[envVar]) : false

    if (key) {
      const source = envSet ? '(env)' : '(config)'
      process.stdout.write(`  ${pc.bold(displayName)}: ${maskKey(key)} ${pc.dim(source)}\n`)
    } else {
      process.stdout.write(`  ${pc.bold(displayName)}: ${pc.dim('not configured')}\n`)
    }
  }
  process.stdout.write('\n')
}

async function addKey(rl: readline.Interface): Promise<void> {
  process.stdout.write('\nSelect provider:\n\n')
  for (let i = 0; i < PROVIDER_NAMES.length; i++) {
    const displayName = PROVIDER_DISPLAY_NAMES[PROVIDER_NAMES[i]] ?? PROVIDER_NAMES[i]
    process.stdout.write(`  [${i + 1}] ${displayName}\n`)
  }
  process.stdout.write('\n')

  const providerChoice = await rl.question(`Select provider (1-${PROVIDER_NAMES.length}): `)
  const providerNum = parseInt(providerChoice.trim(), 10)

  if (isNaN(providerNum) || providerNum < 1 || providerNum > PROVIDER_NAMES.length) {
    process.stdout.write('Cancelled.\n')
    return
  }

  const providerName = PROVIDER_NAMES[providerNum - 1]
  const displayName = PROVIDER_DISPLAY_NAMES[providerName] ?? providerName

  const keyValue = await rl.question(`Enter ${displayName} API key: `)
  const trimmedKey = keyValue.trim()

  if (!trimmedKey) {
    process.stdout.write('No key entered. Cancelled.\n')
    return
  }

  const config = loadConfig()
  const updatedKeys = { ...config.keys, [providerName]: trimmedKey }
  saveConfig({ ...config, keys: updatedKeys })

  process.stdout.write(`${displayName} key saved: ${maskKey(trimmedKey)}\n`)
}

async function removeKey(rl: readline.Interface): Promise<void> {
  const config = loadConfig()
  const configuredProviders = PROVIDER_NAMES.filter(p => config.keys?.[p])

  if (configuredProviders.length === 0) {
    process.stdout.write('\nNo keys configured in config file.\n')
    process.stdout.write(pc.dim('Note: Keys set via environment variables cannot be removed here.\n\n'))
    return
  }

  process.stdout.write('\nConfigured keys:\n\n')
  for (let i = 0; i < configuredProviders.length; i++) {
    const provider = configuredProviders[i]
    const displayName = PROVIDER_DISPLAY_NAMES[provider] ?? provider
    const key = config.keys?.[provider]
    process.stdout.write(`  [${i + 1}] ${displayName}: ${key ? maskKey(key) : ''}\n`)
  }
  process.stdout.write('\n')

  const choice = await rl.question(`Select key to remove (1-${configuredProviders.length}): `)
  const num = parseInt(choice.trim(), 10)

  if (isNaN(num) || num < 1 || num > configuredProviders.length) {
    process.stdout.write('Cancelled.\n')
    return
  }

  const providerToRemove = configuredProviders[num - 1]
  const displayName = PROVIDER_DISPLAY_NAMES[providerToRemove] ?? providerToRemove

  const updatedKeys = { ...config.keys }
  delete (updatedKeys as Record<string, string | undefined>)[providerToRemove]
  saveConfig({ ...config, keys: updatedKeys })

  process.stdout.write(`${displayName} key removed.\n`)
}
