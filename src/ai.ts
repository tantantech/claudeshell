import pc from 'picocolors'
import { loadConfig, resolveApiKey } from './config.js'
import type { LastError } from './types.js'

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

function buildExplainPrompt(lastError: LastError): string {
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

function buildSystemPrompt(cwd: string): string {
  return [
    'You are ClaudeShell, an AI assistant running inside a terminal shell.',
    `Current directory: ${cwd}`,
    `OS: ${process.platform}`,
    `Node: ${process.version}`
  ].join('\n')
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
  }
): Promise<void> {
  const { cwd, lastError, abortController, callbacks } = options

  const config = loadConfig()
  const apiKey = resolveApiKey(config)
  if (!apiKey) {
    callbacks.onError(
      'Set ANTHROPIC_API_KEY to use AI commands. Example: export ANTHROPIC_API_KEY=sk-ant-...'
    )
    return
  }

  let firstText = true

  try {
    process.stderr.write(pc.dim('Thinking...\r'))

    const sdk = await import('@anthropic-ai/claude-agent-sdk')

    const isExplain = prompt === 'explain' || prompt === 'why'
    const fullPrompt = isExplain && lastError
      ? buildExplainPrompt(lastError)
      : prompt

    const systemPrompt = buildSystemPrompt(cwd)

    const stream = sdk.query({
      prompt: fullPrompt,
      options: {
        abortController,
        includePartialMessages: true,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        permissionMode: 'acceptEdits' as const,
        cwd,
        systemPrompt,
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
      } else if (msg.type === 'result' && msg.is_error) {
        callbacks.onError('AI request failed')
      }
    }
  } catch (error: unknown) {
    if (isAbortError(error) || abortController.signal.aborted) {
      return
    }
    callbacks.onError(classifyError(error))
  }
}
