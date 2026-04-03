import pc from 'picocolors'
import * as readline from 'node:readline/promises'
import { executeTheme } from './builtins.js'
import { executeModelSwitcher } from './model-switcher.js'
import { executeKeyManager } from './key-manager.js'
import { loadConfig, saveConfig } from './config.js'

export interface SettingsResult {
  readonly templateName?: string
  readonly model?: string
  readonly prefix?: string
  readonly permissions?: 'auto' | 'ask' | 'deny'
  readonly historySize?: number
}

const PERMISSIONS_OPTIONS = ['auto', 'ask', 'deny'] as const

export async function executeSettings(
  rl: readline.Interface,
  currentModel: string | undefined,
): Promise<SettingsResult> {
  process.stdout.write(`\n${pc.bold('Nesh Settings')}\n\n`)
  process.stdout.write('  [1] Theme\n')
  process.stdout.write('  [2] Model\n')
  process.stdout.write('  [3] API Keys\n')
  process.stdout.write('  [4] Prefix\n')
  process.stdout.write('  [5] Permissions\n')
  process.stdout.write('  [6] History Size\n\n')

  const answer = await rl.question('Select (1-6): ')
  const choice = parseInt(answer.trim(), 10)

  switch (choice) {
    case 1: {
      const templateName = await executeTheme(rl)
      return templateName ? { templateName } : {}
    }
    case 2: {
      const model = await executeModelSwitcher(rl, currentModel)
      return model ? { model } : {}
    }
    case 3: {
      await executeKeyManager(rl)
      return {}
    }
    case 4:
      return editPrefix(rl)
    case 5:
      return editPermissions(rl)
    case 6:
      return editHistorySize(rl)
    default:
      process.stdout.write('Selection cancelled.\n')
      return {}
  }
}

async function editPrefix(rl: readline.Interface): Promise<SettingsResult> {
  const config = loadConfig()
  const current = config.prefix ?? 'a'
  process.stdout.write(`\nCurrent prefix: ${pc.bold(current)}\n`)

  const answer = await rl.question('New prefix (no spaces): ')
  const trimmed = answer.trim()

  if (!trimmed || /\s/.test(trimmed)) {
    process.stdout.write('Invalid prefix (must be non-empty with no whitespace). Cancelled.\n')
    return {}
  }

  saveConfig({ ...config, prefix: trimmed })
  process.stdout.write(`Prefix set to: ${pc.bold(trimmed)}\n`)
  return { prefix: trimmed }
}

async function editPermissions(rl: readline.Interface): Promise<SettingsResult> {
  const config = loadConfig()
  const current = config.permissions ?? 'auto'

  process.stdout.write('\nPermission mode:\n\n')
  for (let i = 0; i < PERMISSIONS_OPTIONS.length; i++) {
    const opt = PERMISSIONS_OPTIONS[i]
    const marker = opt === current ? pc.green(' *') : '  '
    process.stdout.write(`  [${i + 1}] ${opt}${marker}\n`)
  }
  process.stdout.write('\n')

  const answer = await rl.question(`Select (1-${PERMISSIONS_OPTIONS.length}): `)
  const num = parseInt(answer.trim(), 10)

  if (isNaN(num) || num < 1 || num > PERMISSIONS_OPTIONS.length) {
    process.stdout.write('Selection cancelled.\n')
    return {}
  }

  const selected = PERMISSIONS_OPTIONS[num - 1]
  saveConfig({ ...config, permissions: selected })
  process.stdout.write(`Permissions set to: ${pc.bold(selected)}\n`)
  return { permissions: selected }
}

async function editHistorySize(rl: readline.Interface): Promise<SettingsResult> {
  const config = loadConfig()
  const current = config.history_size ?? 1000

  process.stdout.write(`\nCurrent history size: ${pc.bold(String(current))}\n`)

  const answer = await rl.question('New history size (minimum 100): ')
  const num = parseInt(answer.trim(), 10)

  if (isNaN(num) || num < 100) {
    process.stdout.write('Invalid value (must be an integer >= 100). Cancelled.\n')
    return {}
  }

  saveConfig({ ...config, history_size: num })
  process.stdout.write(`History size set to: ${pc.bold(String(num))}\n`)
  return { historySize: num }
}
