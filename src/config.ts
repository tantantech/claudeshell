import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface ProviderKeys {
  readonly anthropic?: string
  readonly openai?: string
  readonly google?: string
  readonly [key: string]: string | undefined
}

import type { PluginConfig } from './plugins/types.js'

export interface NeshConfig {
  readonly api_key?: string
  readonly model?: string
  readonly history_size?: number
  readonly prompt_template?: string
  readonly prefix?: string
  readonly permissions?: 'auto' | 'ask' | 'deny'
  readonly interactive_commands?: readonly string[]
  readonly keys?: ProviderKeys
  readonly plugins?: PluginConfig
  readonly prompt_segments?: readonly string[]
  readonly prompt_icon_mode?: 'nerd-font' | 'unicode' | 'ascii'
  readonly prompt_color_scheme?: string
  readonly prompt_separator_style?: 'angled' | 'vertical' | 'slanted' | 'round'
  readonly prompt_head_style?: 'sharp' | 'blurred' | 'slanted' | 'round'
  readonly prompt_height?: 'one-line' | 'two-line'
  readonly prompt_spacing?: 'compact' | 'sparse'
  readonly prompt_icon_density?: 'few' | 'many'
  readonly prompt_flow?: 'concise' | 'fluent'
  readonly prompt_transient?: boolean
  readonly prompt_time_format?: 'none' | '12h' | '24h'
  readonly suggestions?: SuggestionsConfig
  readonly highlighting?: HighlightingConfig
}

export interface SuggestionsConfig {
  readonly enabled?: boolean
  readonly debounce_ms?: number
  readonly sensitive_patterns?: readonly string[]
}

export interface HighlightingConfig {
  readonly enabled?: boolean
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

export function validatePluginConfig(obj: Record<string, unknown>): PluginConfig {
  const result: Record<string, unknown> = {}
  if (Array.isArray(obj.enabled) && obj.enabled.every((x: unknown) => typeof x === 'string')) {
    result.enabled = obj.enabled as readonly string[]
  }
  if (typeof obj.aliases === 'object' && obj.aliases !== null) {
    const aliases = obj.aliases as Record<string, unknown>
    const valid: Record<string, string> = {}
    for (const [k, v] of Object.entries(aliases)) {
      if (typeof v === 'string') valid[k] = v
    }
    if (Object.keys(valid).length > 0) result.aliases = valid
  }
  // Pass through per-plugin config objects (e.g., { "git": { "disabled_aliases": [...] } })
  for (const [key, value] of Object.entries(obj)) {
    if (key !== 'enabled' && key !== 'aliases' && typeof value === 'object' && value !== null) {
      result[key] = value
    }
  }
  return result as PluginConfig
}

export function validateSuggestionsConfig(obj: Record<string, unknown>): SuggestionsConfig {
  return {
    ...(typeof obj.enabled === 'boolean' ? { enabled: obj.enabled } : {}),
    ...(typeof obj.debounce_ms === 'number' ? { debounce_ms: obj.debounce_ms } : {}),
    ...(Array.isArray(obj.sensitive_patterns) && obj.sensitive_patterns.every((x: unknown) => typeof x === 'string')
      ? { sensitive_patterns: obj.sensitive_patterns as readonly string[] }
      : {}),
  }
}

export function validateHighlightingConfig(obj: Record<string, unknown>): HighlightingConfig {
  return {
    ...(typeof obj.enabled === 'boolean' ? { enabled: obj.enabled } : {}),
  }
}

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
      ...(typeof obj.plugins === 'object' && obj.plugins !== null ? { plugins: validatePluginConfig(obj.plugins as Record<string, unknown>) } : {}),
      ...(Array.isArray(obj.prompt_segments) && obj.prompt_segments.every((x: unknown) => typeof x === 'string') ? { prompt_segments: obj.prompt_segments as readonly string[] } : {}),
      ...(typeof obj.prompt_icon_mode === 'string' && ['nerd-font', 'unicode', 'ascii'].includes(obj.prompt_icon_mode) ? { prompt_icon_mode: obj.prompt_icon_mode as 'nerd-font' | 'unicode' | 'ascii' } : {}),
      ...(typeof obj.prompt_color_scheme === 'string' ? { prompt_color_scheme: obj.prompt_color_scheme } : {}),
      ...(typeof obj.prompt_separator_style === 'string' && ['angled', 'vertical', 'slanted', 'round'].includes(obj.prompt_separator_style) ? { prompt_separator_style: obj.prompt_separator_style as 'angled' | 'vertical' | 'slanted' | 'round' } : {}),
      ...(typeof obj.prompt_head_style === 'string' && ['sharp', 'blurred', 'slanted', 'round'].includes(obj.prompt_head_style) ? { prompt_head_style: obj.prompt_head_style as 'sharp' | 'blurred' | 'slanted' | 'round' } : {}),
      ...(typeof obj.prompt_height === 'string' && ['one-line', 'two-line'].includes(obj.prompt_height) ? { prompt_height: obj.prompt_height as 'one-line' | 'two-line' } : {}),
      ...(typeof obj.prompt_spacing === 'string' && ['compact', 'sparse'].includes(obj.prompt_spacing) ? { prompt_spacing: obj.prompt_spacing as 'compact' | 'sparse' } : {}),
      ...(typeof obj.prompt_icon_density === 'string' && ['few', 'many'].includes(obj.prompt_icon_density) ? { prompt_icon_density: obj.prompt_icon_density as 'few' | 'many' } : {}),
      ...(typeof obj.prompt_flow === 'string' && ['concise', 'fluent'].includes(obj.prompt_flow) ? { prompt_flow: obj.prompt_flow as 'concise' | 'fluent' } : {}),
      ...(typeof obj.prompt_transient === 'boolean' ? { prompt_transient: obj.prompt_transient } : {}),
      ...(typeof obj.prompt_time_format === 'string' && ['none', '12h', '24h'].includes(obj.prompt_time_format) ? { prompt_time_format: obj.prompt_time_format as 'none' | '12h' | '24h' } : {}),
      ...(typeof obj.suggestions === 'object' && obj.suggestions !== null
        ? { suggestions: validateSuggestionsConfig(obj.suggestions as Record<string, unknown>) }
        : {}),
      ...(typeof obj.highlighting === 'object' && obj.highlighting !== null
        ? { highlighting: validateHighlightingConfig(obj.highlighting as Record<string, unknown>) }
        : {}),
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
  // Tier 1: Big Tech
  anthropic: 'ANTHROPIC_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  azure: 'AZURE_OPENAI_API_KEY',
  // Tier 2: Major AI Companies
  xai: 'XAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  cohere: 'COHERE_API_KEY',
  minimax: 'MINIMAX_API_KEY',
  // Tier 3: Fast Inference / Open-Source Hosts
  groq: 'GROQ_API_KEY',
  together: 'TOGETHER_API_KEY',
  fireworks: 'FIREWORKS_API_KEY',
  // Tier 4: Aggregators / Local
  openrouter: 'OPENROUTER_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  // ollama intentionally omitted — no key needed (local)
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
