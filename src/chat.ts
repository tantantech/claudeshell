import * as readline from 'node:readline/promises'
import pc from 'picocolors'
import { executeAI } from './ai.js'
import { createRenderer, renderCostFooter } from './renderer.js'
import { createSessionId } from './session.js'
import { EMPTY_ACCUMULATOR, accumulate } from './cost.js'
import type { ShellState, UsageInfo } from './types.js'
import type { ClaudeShellConfig } from './config.js'

export const MODEL_SHORTHANDS: Readonly<Record<string, string>> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-5-20250514',
  opus: 'claude-opus-4-6-20250414',
}

export type SlashCommandResult =
  | { readonly type: 'exit' }
  | { readonly type: 'new' }
  | { readonly type: 'model'; readonly model: string }
  | { readonly type: 'permissions_show' }
  | { readonly type: 'permissions_set'; readonly mode: 'auto' | 'ask' | 'deny' }
  | { readonly type: 'unknown'; readonly input: string }

export function parseSlashCommand(raw: string): SlashCommandResult {
  const input = raw.trim()

  if (input === '/exit' || input === '/shell') {
    return { type: 'exit' }
  }

  if (input === '/new') {
    return { type: 'new' }
  }

  if (input.startsWith('/model')) {
    const arg = input.slice('/model'.length).trim()
    if (!arg) {
      return { type: 'unknown', input }
    }
    const resolved = MODEL_SHORTHANDS[arg] ?? arg
    return { type: 'model', model: resolved }
  }

  if (input.startsWith('/permissions')) {
    const arg = input.slice('/permissions'.length).trim()
    if (!arg) {
      return { type: 'permissions_show' }
    }
    if (arg === 'auto' || arg === 'ask' || arg === 'deny') {
      return { type: 'permissions_set', mode: arg }
    }
    return { type: 'unknown', input }
  }

  return { type: 'unknown', input }
}

export async function runChatMode(params: {
  readonly rl: readline.Interface
  readonly state: ShellState
  readonly config: ClaudeShellConfig
}): Promise<ShellState> {
  const { rl, config } = params
  let state = params.state
  const chatPrompt = pc.cyan('ai > ')

  process.stderr.write(pc.dim('Chat mode -- type /exit to return to shell, /new for fresh context, /model <name> to switch model, /permissions <mode> to set permissions\n'))

  // Save shell history and swap in chat history
  const rlInternal = rl as unknown as { history: string[] }
  const shellHistory = [...(rlInternal.history ?? [])]
  rlInternal.history = []

  while (state.running) {
    let line: string
    try {
      line = await rl.question(chatPrompt)
    } catch (err) {
      // Ctrl+D closes readline -- return to shell
      if ((err as NodeJS.ErrnoException)?.code === 'ERR_USE_AFTER_CLOSE') {
        break
      }
      throw err
    }

    const trimmed = line.trim()
    if (!trimmed) continue

    // Handle slash commands
    if (trimmed.startsWith('/')) {
      const cmd = parseSlashCommand(trimmed)

      switch (cmd.type) {
        case 'exit':
          // Restore shell history
          rlInternal.history = shellHistory
          return { ...state, chatMode: false }

        case 'new': {
          const newSessionId = createSessionId()
          state = { ...state, sessionId: newSessionId, sessionCost: EMPTY_ACCUMULATOR }
          process.stderr.write(pc.dim('Fresh context started\n'))
          continue
        }

        case 'model':
          state = { ...state, currentModel: cmd.model }
          process.stderr.write(pc.dim(`Model set to ${cmd.model}\n`))
          continue

        case 'permissions_show':
          process.stderr.write(`Permission mode: ${state.permissionMode}\n`)
          continue

        case 'permissions_set':
          state = { ...state, permissionMode: cmd.mode }
          process.stderr.write(pc.dim(`Permission mode set to ${cmd.mode}\n`))
          continue

        case 'unknown':
          process.stderr.write('Unknown command. Available: /exit, /new, /model <name>, /permissions <mode>\n')
          continue
      }
    }

    // Send message to AI
    const abortController = new AbortController()
    state = { ...state, aiStreaming: true }

    const renderer = createRenderer({ isTTY: process.stdout.isTTY ?? false })

    // Set up SIGINT handler for this message
    const sigintHandler = () => {
      abortController.abort()
      process.stderr.write('\n[cancelled]\n')
      state = { ...state, aiStreaming: false }
    }
    rl.once('SIGINT', sigintHandler)

    try {
      const result = await executeAI(trimmed, {
        cwd: process.cwd(),
        lastError: state.lastError,
        abortController,
        callbacks: {
          onText: renderer.onText,
          onToolStart: renderer.onToolStart,
          onToolEnd: renderer.onToolEnd,
          onError: (msg) => {
            process.stderr.write(msg + '\n')
          },
        },
        sessionId: state.sessionId,
        model: state.currentModel,
        permissionMode: state.permissionMode,
        projectContext: state.projectContext,
      })

      renderer.finish()

      // Update session ID from first response if needed
      if (result.sessionId) {
        state = { ...state, sessionId: result.sessionId }
      }

      // Accumulate cost and display footer
      if (result.usage) {
        const newCost = accumulate(state.sessionCost, result.usage)
        state = { ...state, sessionCost: newCost }
        renderCostFooter(result.usage, newCost)
      }
    } finally {
      rl.removeListener('SIGINT', sigintHandler)
      state = { ...state, aiStreaming: false }
    }
  }

  // Restore shell history on non-/exit exit (Ctrl+D, etc.)
  rlInternal.history = shellHistory
  return { ...state, chatMode: false }
}
