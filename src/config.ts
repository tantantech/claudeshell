import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface ClaudeShellConfig {
  readonly api_key?: string
  readonly model?: string
  readonly history_size?: number
  readonly prompt_template?: string
  readonly prefix?: string
}

function validatePrefix(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed === '' || /\s/.test(trimmed)) return undefined
  return trimmed
}

export const CONFIG_DIR = path.join(os.homedir(), '.claudeshell')
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

const DEFAULTS: ClaudeShellConfig = { history_size: 1000 }

export function loadConfig(): ClaudeShellConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULTS }
    }

    const obj = parsed as Record<string, unknown>
    const config: ClaudeShellConfig = {
      ...DEFAULTS,
      ...(typeof obj.api_key === 'string' ? { api_key: obj.api_key } : {}),
      ...(typeof obj.model === 'string' ? { model: obj.model } : {}),
      ...(typeof obj.history_size === 'number' ? { history_size: obj.history_size } : {}),
      ...(typeof obj.prompt_template === 'string' ? { prompt_template: obj.prompt_template } : {}),
      ...(validatePrefix(obj.prefix) !== undefined ? { prefix: validatePrefix(obj.prefix) } : {}),
    }

    return config
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'ENOENT') {
      return { ...DEFAULTS }
    }
    process.stderr.write(
      `Warning: could not parse ~/.claudeshell/config.json: ${error.message}\n`
    )
    return { ...DEFAULTS }
  }
}

export function resolveApiKey(config?: ClaudeShellConfig): string | undefined {
  const envKey = process.env.ANTHROPIC_API_KEY
  if (envKey) return envKey
  return config?.api_key ?? undefined
}

export function ensureConfigDir(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
}

export function saveConfig(config: ClaudeShellConfig): void {
  ensureConfigDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8')
}
