import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface ProviderKeys {
  readonly anthropic?: string
  readonly openai?: string
  readonly google?: string
  readonly [key: string]: string | undefined
}

export interface NeshConfig {
  readonly api_key?: string
  readonly model?: string
  readonly history_size?: number
  readonly prompt_template?: string
  readonly prefix?: string
  readonly permissions?: 'auto' | 'ask' | 'deny'
  readonly interactive_commands?: readonly string[]
  readonly keys?: ProviderKeys
}

const VALID_PERMISSIONS = ['auto', 'ask', 'deny'] as const

function validatePermissions(value: unknown): 'auto' | 'ask' | 'deny' | undefined {
  if (typeof value !== 'string') return undefined
  if ((VALID_PERMISSIONS as readonly string[]).includes(value)) {
    return value as 'auto' | 'ask' | 'deny'
  }
  return undefined
}

function validateKeys(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return Object.values(obj).every(v => typeof v === 'string')
}

function validatePrefix(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed === '' || /\s/.test(trimmed)) return undefined
  return trimmed
}

export const CONFIG_DIR = path.join(os.homedir(), '.nesh')
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

const DEFAULTS: NeshConfig = { history_size: 1000 }

export function loadConfig(): NeshConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULTS }
    }

    const obj = parsed as Record<string, unknown>
    const config: NeshConfig = {
      ...DEFAULTS,
      ...(typeof obj.api_key === 'string' ? { api_key: obj.api_key } : {}),
      ...(typeof obj.model === 'string' ? { model: obj.model } : {}),
      ...(typeof obj.history_size === 'number' ? { history_size: obj.history_size } : {}),
      ...(typeof obj.prompt_template === 'string' ? { prompt_template: obj.prompt_template } : {}),
      ...(validatePrefix(obj.prefix) !== undefined ? { prefix: validatePrefix(obj.prefix) } : {}),
      ...(validatePermissions(obj.permissions) !== undefined ? { permissions: validatePermissions(obj.permissions) } : {}),
      ...(Array.isArray(obj.interactive_commands) && obj.interactive_commands.every((x: unknown) => typeof x === 'string') ? { interactive_commands: obj.interactive_commands as readonly string[] } : {}),
      ...(validateKeys(obj.keys) ? { keys: obj.keys as ProviderKeys } : {}),
    }

    return config
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'ENOENT') {
      return { ...DEFAULTS }
    }
    process.stderr.write(
      `Warning: could not parse ~/.nesh/config.json: ${error.message}\n`
    )
    return { ...DEFAULTS }
  }
}

const PROVIDER_KEY_ENV_VARS: Readonly<Record<string, string>> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
}

export function resolveProviderKey(providerName: string, config?: NeshConfig): string | undefined {
  const cfg = config ?? loadConfig()
  // Check config keys first, then env var
  const configKey = cfg.keys?.[providerName]
  if (configKey) return configKey
  const envVar = PROVIDER_KEY_ENV_VARS[providerName]
  if (envVar) {
    const envKey = process.env[envVar]
    if (envKey) return envKey
  }
  return undefined
}

export function resolveApiKey(config?: NeshConfig): string | undefined {
  // Legacy: check env var first (backward compatible), then config api_key, then provider keys
  const envKey = process.env.ANTHROPIC_API_KEY
  if (envKey) return envKey
  if (config?.api_key) return config.api_key
  return config?.keys?.anthropic ?? undefined
}

export function maskKey(key: string): string {
  if (key.length <= 8) return '****'
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

export function ensureConfigDir(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
}

export function saveConfig(config: NeshConfig): void {
  ensureConfigDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8')
}

export function loadProjectConfig(cwd: string): Partial<NeshConfig> | null {
  try {
    const raw = fs.readFileSync(path.join(cwd, '.nesh.json'), 'utf-8')
    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed !== 'object' || parsed === null) return null

    const obj = parsed as Record<string, unknown>
    const result: Record<string, unknown> = {}

    if (typeof obj.api_key === 'string') result.api_key = obj.api_key
    if (typeof obj.model === 'string') result.model = obj.model
    const validatedPrefix = validatePrefix(obj.prefix)
    if (validatedPrefix !== undefined) result.prefix = validatedPrefix
    const validatedPerms = validatePermissions(obj.permissions)
    if (validatedPerms !== undefined) result.permissions = validatedPerms
    if (Array.isArray(obj.interactive_commands) && obj.interactive_commands.every((x: unknown) => typeof x === 'string')) {
      result.interactive_commands = obj.interactive_commands as readonly string[]
    }

    if (Object.keys(result).length === 0) return null

    return result as Partial<NeshConfig>
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'ENOENT') return null
    process.stderr.write(
      `Warning: could not parse .nesh.json: ${error.message}\n`
    )
    return null
  }
}

export function mergeConfigs(
  global: NeshConfig,
  project: Partial<NeshConfig> | null,
): NeshConfig {
  if (project === null) return global
  return { ...global, ...project }
}
