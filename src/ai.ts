import * as readline from 'node:readline'
import pc from 'picocolors'
import { loadConfig, resolveApiKey, resolveProviderKey } from './config.js'
import { buildResumeOptions, extractSessionId } from './session.js'
import { extractUsage } from './cost.js'
import { getProviderForModel, getProvider } from './providers/index.js'
import type { LastError, AIResult, UsageInfo, NeshPermission } from './types.js'
import type { ProjectContext } from './context.js'

export interface AICallbacks {
  readonly onText: (text: string) => void
  readonly onToolStart: (toolName: string) => void
  readonly onToolEnd: (toolName: string, result?: string) => void
  readonly onError: (message: string) => void
}

interface StreamEvent {
  readonly type: string
  readonly content_block?: {
    readonly type: string
    readonly name?: string
  }
  readonly delta?: {
    readonly type: string
    readonly text?: string
  }
}

interface SDKMessage {
  readonly type: string
  readonly event?: StreamEvent
  readonly error?: string
  readonly is_error?: boolean
  readonly parent_tool_use_id?: string | null
}

function classifyError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('api key') || msg.includes('authentication')) {
      return 'Invalid API key -- check ANTHROPIC_API_KEY'
    }
    if (msg.includes('rate limit')) {
      return 'Rate limited -- wait a moment and try again'
    }
    if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('enotfound')) {
      return 'Network error -- check your connection'
    }
    if (msg.includes('billing')) {
      return 'Billing error -- check your Anthropic account'
    }
    return `AI error: ${error.message}`
  }
  return `AI error: ${String(error)}`
}

function mapSDKError(errorType: string): string {
  switch (errorType) {
    case 'authentication_failed':
      return 'Invalid API key -- check ANTHROPIC_API_KEY'
    case 'rate_limit':
      return 'Rate limited -- wait a moment and try again'
    case 'billing_error':
      return 'Billing error -- check your Anthropic account'
    case 'server_error':
      return 'Server error -- try again in a moment'
    case 'max_output_tokens':
      return 'Response too long -- try a more specific prompt'
    default:
      return `AI error: ${errorType}`
  }
}

export function buildExplainPrompt(lastError: LastError): string {
  return [
    'The following command failed:',
    `\`${lastError.command}\``,
    `Exit code: ${lastError.exitCode}`,
    'Stderr:',
    lastError.stderr,
    '',
    'Explain what went wrong and how to fix it.'
  ].join('\n')
}

export function buildFixPrompt(lastError: LastError): string {
  return [
    'The following command failed:',
    `\`${lastError.command}\``,
    `Exit code: ${lastError.exitCode}`,
    'Stderr:',
    lastError.stderr,
    '',
    'Suggest a single shell command to fix this error.',
    'Reply with ONLY the command on the first line.',
    'On subsequent lines, briefly explain why.',
    'If no fix is possible, reply with exactly: NO_FIX',
  ].join('\n')
}

export function parseFixResponse(text: string): string | undefined {
  const firstLine = text.split('\n')[0]?.trim() ?? ''
  if (firstLine === '' || firstLine.startsWith('NO_FIX')) return undefined
  const stripped = firstLine
    .replace(/^`+/, '')
    .replace(/`+$/, '')
    .replace(/^\$\s*/, '')
    .trim()
  if (stripped === '') return undefined
  return stripped
}

export function toSDKPermissionMode(mode: NeshPermission): string {
  switch (mode) {
    case 'auto': return 'acceptEdits'
    case 'ask': return 'default'
    case 'deny': return 'plan'
  }
}

export function buildSystemPrompt(cwd: string, projectContext?: ProjectContext | null): string {
  const lines = [
    'You are Nesh, an AI assistant running inside a terminal shell.',
    `Current directory: ${cwd}`,
    `OS: ${process.platform}`,
    `Node: ${process.version}`,
  ]
  if (projectContext) {
    lines.push(`Project: ${projectContext.summary}`)
  }
  return lines.join('\n')
}

function formatToolAction(toolName: string, input: Record<string, unknown>): string {
  const file = typeof input.file_path === 'string'
    ? input.file_path
    : typeof input.path === 'string'
      ? input.path
      : undefined

  if (toolName === 'Bash' && typeof input.command === 'string') {
    return `run ${input.command}`
  }
  if (file) {
    const verb = toolName.toLowerCase()
    return `${verb} ${file}`
  }
  return `use ${toolName}`
}

export function createCanUseTool(): (
  toolName: string,
  input: Record<string, unknown>,
  options: { signal: AbortSignal; title?: string; displayName?: string; description?: string; toolUseID: string }
) => Promise<{ behavior: 'allow'; updatedInput?: Record<string, unknown> } | { behavior: 'deny'; message: string }> {
  return async (toolName, input, options) => {
    const action = options.title ?? `Claude wants to ${formatToolAction(toolName, input)}`
    const prompt = `${action}. Allow? (y/n) `

    const askOnce = (): Promise<string> => {
      return new Promise((resolve) => {
        process.stderr.write(prompt)
        const rl = readline.createInterface({ input: process.stdin, terminal: false })
        rl.once('line', (line) => {
          rl.close()
          resolve(line.trim().toLowerCase())
        })
      })
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const answer = await askOnce()
      if (answer === 'y' || answer === 'yes') {
        return { behavior: 'allow' as const }
      }
      if (answer === 'n' || answer === 'no') {
        return { behavior: 'deny' as const, message: 'User denied permission' }
      }
      // Re-prompt on invalid input
    }
  }
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (error instanceof Error && error.name === 'AbortError') return true
  return false
}

export async function executeAI(
  prompt: string,
  options: {
    readonly cwd: string
    readonly lastError: LastError | undefined
    readonly abortController: AbortController
    readonly callbacks: AICallbacks
    readonly sessionId?: string
    readonly model?: string
    readonly permissionMode?: NeshPermission
    readonly projectContext?: ProjectContext | null
  }
): Promise<AIResult> {
  const { cwd, lastError, abortController, callbacks } = options
  const emptyResult: AIResult = { sessionId: undefined, usage: undefined }

  // Route non-Claude models through the provider system
  const modelInfo = options.model ? getProviderForModel(options.model) : undefined
  if (modelInfo && modelInfo.providerName !== 'claude') {
    return executeProviderAI(prompt, options, modelInfo)
  }

  // If model string is set but not recognized, check if it matches a provider name
  // (e.g., user set "minimax" in config instead of "minimax-m2.7")
  if (options.model && !modelInfo) {
    const { PROVIDER_CONFIGS } = await import('./providers/registry.js')
    if (PROVIDER_CONFIGS[options.model] && options.model !== 'claude') {
      // Find the first model for this provider
      const { MODEL_REGISTRY } = await import('./providers/registry.js')
      const firstMatch = Object.values(MODEL_REGISTRY).find(e => e.provider === options.model)
      if (firstMatch) {
        return executeProviderAI(prompt, options, {
          providerName: options.model,
          modelId: firstMatch.model,
          displayName: firstMatch.displayName,
        })
      }
    }
  }

  const config = loadConfig()
  const apiKey = resolveApiKey(config)
  if (!apiKey) {
    callbacks.onError(
      'Set ANTHROPIC_API_KEY to use AI commands. Example: export ANTHROPIC_API_KEY=sk-ant-...'
    )
    return emptyResult
  }

  let firstText = true
  let capturedSessionId: string | undefined
  let capturedUsage: UsageInfo | undefined

  try {
    process.stderr.write(pc.dim('Thinking...\r'))

    const sdk = await import('@anthropic-ai/claude-agent-sdk')

    const isExplain = prompt === 'explain' || prompt === 'why'
    const fullPrompt = isExplain && lastError
      ? buildExplainPrompt(lastError)
      : prompt

    const requestedMode = options.permissionMode ?? 'auto'
    // Non-TTY cannot prompt interactively -- force ask to auto (Pitfall 5)
    const effectiveMode: NeshPermission = (requestedMode === 'ask' && !process.stdin.isTTY)
      ? 'auto'
      : requestedMode

    const systemPrompt = buildSystemPrompt(cwd, options.projectContext)

    const stream = sdk.query({
      prompt: fullPrompt,
      options: {
        abortController,
        includePartialMessages: true,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        permissionMode: toSDKPermissionMode(effectiveMode) as 'acceptEdits' | 'default' | 'plan',
        cwd,
        systemPrompt,
        ...buildResumeOptions(options.sessionId),
        ...(options.model ? { model: options.model } : {}),
        ...(effectiveMode === 'ask' ? { canUseTool: createCanUseTool() } : {}),
      }
    })

    for await (const message of stream) {
      const msg = message as SDKMessage

      if (msg.type === 'stream_event' && msg.event) {
        const event = msg.event

        if (
          event.type === 'content_block_start' &&
          event.content_block?.type === 'tool_use' &&
          event.content_block.name
        ) {
          callbacks.onToolStart(event.content_block.name)
        } else if (
          event.type === 'content_block_delta' &&
          event.delta?.type === 'text_delta' &&
          event.delta.text
        ) {
          if (firstText) {
            process.stderr.write('             \r')
            firstText = false
          }
          callbacks.onText(event.delta.text)
        } else if (event.type === 'content_block_stop') {
          callbacks.onToolEnd('')
        }
      } else if (msg.type === 'assistant' && msg.error) {
        callbacks.onError(mapSDKError(msg.error))
      } else if (msg.type === 'result' && !msg.is_error) {
        const resultMsg = msg as unknown as Record<string, unknown>
        try {
          if (typeof resultMsg.session_id === 'string') {
            capturedSessionId = extractSessionId(resultMsg as { readonly session_id: string })
          }
          if (resultMsg.usage && typeof resultMsg.total_cost_usd === 'number' && typeof resultMsg.duration_ms === 'number') {
            capturedUsage = extractUsage(resultMsg as {
              readonly usage: { readonly input_tokens: number; readonly output_tokens: number }
              readonly total_cost_usd: number
              readonly duration_ms: number
            })
          }
        } catch {
          // Usage extraction failed -- non-fatal, continue
        }
      } else if (msg.type === 'result' && msg.is_error) {
        callbacks.onError('AI request failed')
      }
    }
  } catch (error: unknown) {
    if (isAbortError(error) || abortController.signal.aborted) {
      return emptyResult
    }
    callbacks.onError(classifyError(error))
    return emptyResult
  }

  return { sessionId: capturedSessionId, usage: capturedUsage }
}

async function executeProviderAI(
  prompt: string,
  options: {
    readonly cwd: string
    readonly lastError: LastError | undefined
    readonly abortController: AbortController
    readonly callbacks: AICallbacks
    readonly sessionId?: string
    readonly model?: string
    readonly permissionMode?: NeshPermission
    readonly projectContext?: ProjectContext | null
  },
  modelInfo: { readonly providerName: string; readonly modelId: string; readonly displayName: string },
): Promise<AIResult> {
  const { abortController, callbacks } = options
  const emptyResult: AIResult = { sessionId: undefined, usage: undefined }

  try {
    process.stderr.write(pc.dim('Thinking...\r'))

    const provider = await getProvider(modelInfo.providerName)
    const systemPrompt = buildSystemPrompt(options.cwd, options.projectContext)

    let firstText = true
    let capturedUsage: UsageInfo | undefined

    const stream = provider.query(prompt, {
      model: modelInfo.modelId,
      sessionId: options.sessionId,
      abortController,
      systemPrompt,
      permissionMode: options.permissionMode,
      cwd: options.cwd,
      lastError: options.lastError,
      projectContext: options.projectContext,
    })

    for await (const event of stream) {
      switch (event.type) {
        case 'text':
          if (firstText) {
            process.stderr.write('             \r')
            firstText = false
          }
          callbacks.onText(event.content)
          break
        case 'tool_start':
          callbacks.onToolStart(event.name)
          break
        case 'tool_end':
          callbacks.onToolEnd(event.name, event.result)
          break
        case 'done':
          if (event.usage) {
            capturedUsage = event.usage
          }
          break
      }
    }

    return { sessionId: undefined, usage: capturedUsage }
  } catch (error: unknown) {
    if (isAbortError(error) || abortController.signal.aborted) {
      return emptyResult
    }
    callbacks.onError(classifyError(error))
    return emptyResult
  }
}
