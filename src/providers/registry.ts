import type { AIProvider } from './provider.js'

export interface ModelEntry {
  readonly provider: string
  readonly model: string
  readonly displayName: string
}

export interface ProviderConfig {
  readonly name: string
  readonly displayName: string
  readonly baseURL: string
  readonly apiKeyEnv: string
  readonly type: 'claude' | 'openai-compatible' | 'gemini'
}

// Full provider registry — Tier 1 (Big Tech), Tier 2 (Major AI), Tier 3 (Fast Inference), Tier 4 (Aggregators/Local)
export const PROVIDER_CONFIGS: Readonly<Record<string, ProviderConfig>> = {
  // Tier 1: Big Tech (dedicated SDKs)
  claude:     { name: 'claude',     displayName: 'Anthropic',       baseURL: '',                                        apiKeyEnv: 'ANTHROPIC_API_KEY',     type: 'claude' },
  openai:     { name: 'openai',     displayName: 'OpenAI',          baseURL: 'https://api.openai.com/v1',               apiKeyEnv: 'OPENAI_API_KEY',        type: 'openai-compatible' },
  google:     { name: 'google',     displayName: 'Google',          baseURL: '',                                        apiKeyEnv: 'GOOGLE_API_KEY',        type: 'gemini' },
  azure:      { name: 'azure',      displayName: 'Microsoft Azure', baseURL: '',                                        apiKeyEnv: 'AZURE_OPENAI_API_KEY',  type: 'openai-compatible' },
  // Tier 2: Major AI Companies (OpenAI-compatible API)
  xai:        { name: 'xai',        displayName: 'xAI (Grok)',      baseURL: 'https://api.x.ai/v1',                     apiKeyEnv: 'XAI_API_KEY',           type: 'openai-compatible' },
  deepseek:   { name: 'deepseek',   displayName: 'DeepSeek',        baseURL: 'https://api.deepseek.com',                apiKeyEnv: 'DEEPSEEK_API_KEY',      type: 'openai-compatible' },
  mistral:    { name: 'mistral',    displayName: 'Mistral',         baseURL: 'https://api.mistral.ai/v1',               apiKeyEnv: 'MISTRAL_API_KEY',       type: 'openai-compatible' },
  cohere:     { name: 'cohere',     displayName: 'Cohere',          baseURL: 'https://api.cohere.com/v2',               apiKeyEnv: 'COHERE_API_KEY',        type: 'openai-compatible' },
  minimax:    { name: 'minimax',    displayName: 'MiniMax',         baseURL: 'https://api.minimaxi.chat/v1',            apiKeyEnv: 'MINIMAX_API_KEY',       type: 'openai-compatible' },
  // Tier 3: Fast Inference / Open-Source Hosts
  groq:       { name: 'groq',       displayName: 'Groq',            baseURL: 'https://api.groq.com/openai/v1',          apiKeyEnv: 'GROQ_API_KEY',          type: 'openai-compatible' },
  together:   { name: 'together',   displayName: 'Together AI',     baseURL: 'https://api.together.xyz/v1',             apiKeyEnv: 'TOGETHER_API_KEY',      type: 'openai-compatible' },
  fireworks:  { name: 'fireworks',  displayName: 'Fireworks',       baseURL: 'https://api.fireworks.ai/inference/v1',    apiKeyEnv: 'FIREWORKS_API_KEY',     type: 'openai-compatible' },
  // Tier 4: Aggregators / Local
  openrouter: { name: 'openrouter', displayName: 'OpenRouter',      baseURL: 'https://openrouter.ai/api/v1',            apiKeyEnv: 'OPENROUTER_API_KEY',    type: 'openai-compatible' },
  ollama:     { name: 'ollama',     displayName: 'Ollama (Local)',   baseURL: 'http://localhost:11434/v1',               apiKeyEnv: '',                      type: 'openai-compatible' },
  perplexity: { name: 'perplexity', displayName: 'Perplexity',      baseURL: 'https://api.perplexity.ai',               apiKeyEnv: 'PERPLEXITY_API_KEY',    type: 'openai-compatible' },
}

export const MODEL_REGISTRY: Readonly<Record<string, ModelEntry>> = {
  // Anthropic (Claude) models
  'claude-opus':    { provider: 'claude', model: 'claude-opus-4-6-20250414',    displayName: 'Claude Opus 4.6' },
  'claude-sonnet':  { provider: 'claude', model: 'claude-sonnet-4-5-20250514',  displayName: 'Claude Sonnet 4.5' },
  'claude-haiku':   { provider: 'claude', model: 'claude-haiku-4-5-20251001',   displayName: 'Claude Haiku 4.5' },
  // OpenAI models
  'gpt-4o':         { provider: 'openai', model: 'gpt-4o',           displayName: 'GPT-4o' },
  'gpt-4.5':        { provider: 'openai', model: 'gpt-4.5-preview',  displayName: 'GPT-4.5' },
  'o3':             { provider: 'openai', model: 'o3',               displayName: 'OpenAI o3' },
  'o4-mini':        { provider: 'openai', model: 'o4-mini',          displayName: 'OpenAI o4-mini' },
  'gpt-4o-mini':    { provider: 'openai', model: 'gpt-4o-mini',     displayName: 'GPT-4o Mini' },
  // Google models
  'gemini-pro':     { provider: 'google', model: 'gemini-2.5-pro',   displayName: 'Gemini 2.5 Pro' },
  'gemini-flash':   { provider: 'google', model: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
  // xAI (Grok) models
  'grok-4':         { provider: 'xai',      model: 'grok-4',                displayName: 'Grok 4' },
  'grok-3':         { provider: 'xai',      model: 'grok-3',                displayName: 'Grok 3' },
  // DeepSeek models
  'deepseek-chat':      { provider: 'deepseek',  model: 'deepseek-chat',      displayName: 'DeepSeek Chat' },
  'deepseek-reasoner':  { provider: 'deepseek',  model: 'deepseek-reasoner',  displayName: 'DeepSeek Reasoner' },
  // Mistral models
  'mistral-large':    { provider: 'mistral', model: 'mistral-large-latest',  displayName: 'Mistral Large' },
  'codestral':        { provider: 'mistral', model: 'codestral-latest',      displayName: 'Codestral' },
  'mistral-small':    { provider: 'mistral', model: 'mistral-small-latest',  displayName: 'Mistral Small' },
  // Cohere models
  'command-r-plus':   { provider: 'cohere', model: 'command-r-plus',   displayName: 'Command R+' },
  'command-r':        { provider: 'cohere', model: 'command-r',        displayName: 'Command R' },
  // MiniMax models
  'minimax-m2.5':     { provider: 'minimax', model: 'MiniMax-M2.5',   displayName: 'MiniMax M2.5' },
  'minimax-m2.7':     { provider: 'minimax', model: 'MiniMax-M2.7',   displayName: 'MiniMax M2.7' },
  // Groq models
  'llama-3.3-70b':    { provider: 'groq', model: 'llama-3.3-70b-versatile',  displayName: 'Llama 3.3 70B' },
  'mixtral-8x7b':     { provider: 'groq', model: 'mixtral-8x7b-32768',       displayName: 'Mixtral 8x7B' },
  'gemma2-9b':        { provider: 'groq', model: 'gemma2-9b-it',             displayName: 'Gemma 2 9B' },
  // Together AI models
  'together-llama-70b':  { provider: 'together', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',  displayName: 'Llama 3.3 70B (Together)' },
  'together-qwen-32b':   { provider: 'together', model: 'Qwen/Qwen2.5-Coder-32B-Instruct',         displayName: 'Qwen 2.5 Coder 32B' },
  // Fireworks models
  'fireworks-llama-70b':  { provider: 'fireworks', model: 'accounts/fireworks/models/llama-v3p3-70b-instruct', displayName: 'Llama 3.3 70B (Fireworks)' },
  // Perplexity models
  'sonar-pro':    { provider: 'perplexity', model: 'sonar-pro',  displayName: 'Sonar Pro' },
  'sonar':        { provider: 'perplexity', model: 'sonar',      displayName: 'Sonar' },
}

// Derived maps from PROVIDER_CONFIGS for backward compatibility
export const PROVIDER_ENV_VARS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(PROVIDER_CONFIGS)
    .filter(([, cfg]) => cfg.apiKeyEnv !== '')
    .map(([name, cfg]) => [name, cfg.apiKeyEnv])
)

export const PROVIDER_DISPLAY_NAMES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(PROVIDER_CONFIGS).map(([name, cfg]) => [name, cfg.displayName])
)

// Lazy-loaded provider instances
const providerCache: Map<string, AIProvider> = new Map()

export async function getProvider(providerName: string): Promise<AIProvider> {
  const cached = providerCache.get(providerName)
  if (cached) return cached

  const config = PROVIDER_CONFIGS[providerName]
  if (!config) {
    throw new Error(`Unknown provider: ${providerName}`)
  }

  let provider: AIProvider

  switch (config.type) {
    case 'claude': {
      const { createClaudeProvider } = await import('./claude.js')
      provider = createClaudeProvider()
      break
    }
    case 'gemini': {
      const { createGeminiProvider } = await import('./gemini.js')
      provider = createGeminiProvider()
      break
    }
    case 'openai-compatible': {
      const { createOpenAIProvider } = await import('./openai.js')
      provider = createOpenAIProvider({
        providerName: config.name,
        displayName: config.displayName,
        baseURL: config.baseURL,
      })
      break
    }
  }

  providerCache.set(providerName, provider)
  return provider
}

export function resolveModel(shorthand: string): ModelEntry | undefined {
  return MODEL_REGISTRY[shorthand]
}

export function listModels(): ReadonlyArray<{ readonly shorthand: string; readonly entry: ModelEntry }> {
  return Object.entries(MODEL_REGISTRY).map(([shorthand, entry]) => ({
    shorthand,
    entry,
  }))
}

export function getProviderForModel(modelId: string): { readonly providerName: string; readonly modelId: string; readonly displayName: string } | undefined {
  // Check if it's a shorthand
  const entry = MODEL_REGISTRY[modelId]
  if (entry) {
    return { providerName: entry.provider, modelId: entry.model, displayName: entry.displayName }
  }

  // Check if it's a full model ID (e.g., claude-opus-4-6-20250414)
  for (const [, e] of Object.entries(MODEL_REGISTRY)) {
    if (e.model === modelId) {
      return { providerName: e.provider, modelId: e.model, displayName: e.displayName }
    }
  }

  return undefined
}
