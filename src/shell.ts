import pc from 'picocolors'
import * as readline from 'node:readline/promises'
import * as os from 'node:os'
import process from 'node:process'
import { buildPrompt } from './prompt.js'
import { classifyInput } from './classify.js'
import { executeCd, executeExport, executeTheme } from './builtins.js'
import { executeCommand } from './passthrough.js'
import { executeAI, buildFixPrompt, parseFixResponse } from './ai.js'
import { createRenderer, renderCostFooter } from './renderer.js'
import { createSessionId } from './session.js'
import { EMPTY_ACCUMULATOR, accumulate } from './cost.js'
import { runChatMode } from './chat.js'
import { loadHistory, saveHistory, shouldSaveToHistory, HISTORY_PATH } from './history.js'
import { loadConfig, loadProjectConfig, mergeConfigs, saveConfig, resolveApiKey } from './config.js'
import { detectProject } from './context.js'
import type { ClaudeShellConfig } from './config.js'
import type { ProjectContext } from './context.js'
import { getTemplateByName, buildPromptFromTemplate, DEFAULT_TEMPLATE_NAME } from './templates.js'
import type { ShellState } from './types.js'

function refreshProjectState(
  globalConfig: ClaudeShellConfig,
  cwd: string
): { readonly projectContext: ProjectContext | null; readonly mergedConfig: ClaudeShellConfig } {
  const projectContext = detectProject(cwd)
  const projectConfig = loadProjectConfig(cwd)
  const mergedConfig = mergeConfigs(globalConfig, projectConfig)
  return { projectContext, mergedConfig }
}

export async function runShell(): Promise<void> {
  const globalConfig = loadConfig()
  const initialState = refreshProjectState(globalConfig, process.cwd())
  const config = initialState.mergedConfig
  let prefix = config.prefix ?? 'a'
  let currentTemplate = config.prompt_template ?? DEFAULT_TEMPLATE_NAME
  const historyLines = loadHistory(HISTORY_PATH)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    history: [...historyLines] as string[],
    historySize: config.history_size ?? 10_000,
    terminal: true,
  })

  let state: ShellState = {
    cdState: { previousDir: undefined },
    running: true,
    lastError: undefined,
    aiStreaming: false,
    sessionId: createSessionId(),
    chatMode: false,
    currentModel: config.model,
    sessionCost: EMPTY_ACCUMULATOR,
    lastSuggestedFix: undefined,
    projectContext: initialState.projectContext,
    permissionMode: config.permissions ?? 'auto',
  }

  let currentAbortController: AbortController | undefined
  let lastHistoryLine: string | undefined

  const cleanup = () => {
    try { rl.close() } catch { /* already closed */ }
  }

  process.on('exit', cleanup)
  process.on('uncaughtException', (err) => {
    process.stderr.write(`Fatal: ${err.message}\n`)
    cleanup()
    process.exit(1)
  })
  process.on('unhandledRejection', (err) => {
    process.stderr.write(`Fatal: ${(err as Error)?.message ?? String(err)}\n`)
    cleanup()
    process.exit(1)
  })

  rl.on('SIGINT', () => {
    if (state.aiStreaming && currentAbortController) {
      currentAbortController.abort()
      process.stderr.write('\n[cancelled]\n')
      state = { ...state, aiStreaming: false }
    }
    // When not streaming, readline handles SIGINT normally (clears line)
  })

  rl.on('close', () => {
    state = { ...state, running: false }
  })

  while (state.running) {
    try {
      const template = getTemplateByName(currentTemplate) ?? getTemplateByName(DEFAULT_TEMPLATE_NAME)!
      const prompt = buildPromptFromTemplate(template, process.cwd(), os.homedir())
      const line = await rl.question(prompt)
      const action = classifyInput(line, prefix)

      switch (action.type) {
        case 'empty':
          break

        case 'builtin':
          switch (action.name) {
            case 'cd': {
              const result = executeCd(action.args, state.cdState)
              state = { ...state, cdState: result.newState }
              if (result.output) process.stdout.write(result.output + '\n')
              if (result.error) {
                process.stderr.write(result.error + '\n')
              } else {
                const refreshed = refreshProjectState(globalConfig, process.cwd())
                prefix = refreshed.mergedConfig.prefix ?? prefix
                state = {
                  ...state,
                  projectContext: refreshed.projectContext,
                  permissionMode: refreshed.mergedConfig.permissions ?? state.permissionMode,
                  currentModel: refreshed.mergedConfig.model ?? state.currentModel,
                }
              }
              break
            }
            case 'export': {
              const err = executeExport(action.args)
              if (err) process.stderr.write(err + '\n')
              break
            }
            case 'clear':
              process.stdout.write('\x1Bc')
              break
            case 'theme': {
              const selected = await executeTheme(rl)
              if (selected) {
                currentTemplate = selected
                saveConfig({ ...config, prompt_template: selected })
                process.stdout.write(`Theme set to: ${selected}\n`)
              }
              break
            }
            case 'exit':
            case 'quit':
              state = { ...state, running: false }
              break
          }
          break

        case 'passthrough': {
          const result = await executeCommand(action.command)
          if (result.exitCode !== 0) {
            process.stderr.write(`[exit: ${result.exitCode}]\n`)
            const lastError = {
              command: action.command,
              stderr: result.stderr,
              exitCode: result.exitCode,
            } as const
            state = { ...state, lastError, lastSuggestedFix: undefined }

            // Auto-suggest fix via AI (skip if no API key)
            try {
              const fixConfig = loadConfig()
              const hasApiKey = Boolean(resolveApiKey(fixConfig))
              if (!hasApiKey) break
              process.stderr.write(pc.dim('Analyzing error...\r'))
              const fixAbortController = new AbortController()
              let fixResponseText = ''
              await executeAI(buildFixPrompt(lastError), {
                cwd: process.cwd(),
                lastError: undefined,
                abortController: fixAbortController,
                callbacks: {
                  onText: (text) => { fixResponseText += text },
                  onToolStart: () => {},
                  onToolEnd: () => {},
                  onError: (msg) => { process.stderr.write(msg + '\n') },
                },
                sessionId: state.sessionId,
                model: state.currentModel,
                permissionMode: 'auto',
                projectContext: state.projectContext,
              })
              const fixCmd = parseFixResponse(fixResponseText)
              if (fixCmd) {
                process.stderr.write(`Suggested fix: ${fixCmd}. Type '${prefix} fix' to run it.\n`)
                state = { ...state, lastSuggestedFix: fixCmd }
              } else {
                process.stderr.write('Could not determine a fix for this error.\n')
              }
            } catch {
              process.stderr.write('Could not determine a fix for this error.\n')
            }
          } else {
            state = { ...state, lastError: undefined, lastSuggestedFix: undefined }
          }
          break
        }

        case 'ai': {
          // Handle 'a fix' command -- execute last suggested fix
          if (action.prompt === 'fix' && state.lastSuggestedFix) {
            const fixResult = await executeCommand(state.lastSuggestedFix)
            if (fixResult.exitCode !== 0) {
              process.stderr.write(`[exit: ${fixResult.exitCode}]\n`)
              state = {
                ...state,
                lastError: {
                  command: state.lastSuggestedFix,
                  stderr: fixResult.stderr,
                  exitCode: fixResult.exitCode,
                },
                lastSuggestedFix: undefined,
              }
            } else {
              state = { ...state, lastError: undefined, lastSuggestedFix: undefined }
            }
            break
          }
          if (action.prompt === 'fix' && !state.lastSuggestedFix) {
            process.stderr.write('No fix available. Run a command first.\n')
            break
          }

          // Empty prompt means enter chat mode
          if (!action.prompt) {
            state = { ...state, chatMode: true }
            state = await runChatMode({ rl, state, config })
            break
          }

          const abortController = new AbortController()
          currentAbortController = abortController
          state = { ...state, aiStreaming: true }

          const model = action.model ?? state.currentModel
          const renderer = createRenderer({ isTTY: process.stdout.isTTY ?? false })

          const result = await executeAI(action.prompt, {
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
            model,
            permissionMode: state.permissionMode,
            projectContext: state.projectContext,
          })

          renderer.finish()

          // Update session ID from first response
          if (result.sessionId) {
            state = { ...state, sessionId: result.sessionId }
          }

          // Display cost footer and accumulate session cost
          if (result.usage) {
            renderCostFooter(result.usage)
            state = { ...state, sessionCost: accumulate(state.sessionCost, result.usage) }
          }

          state = { ...state, aiStreaming: false }
          currentAbortController = undefined
          break
        }
      }

      // History management
      if (shouldSaveToHistory(line, lastHistoryLine)) {
        lastHistoryLine = line.trim()
      }

    } catch (err) {
      // readline question() rejects on close (Ctrl+D)
      if ((err as NodeJS.ErrnoException)?.code === 'ERR_USE_AFTER_CLOSE') break
      // Never crash from unexpected errors
      process.stderr.write(`Error: ${(err as Error).message}\n`)
    }
  }

  // Save history on exit
  const historyToSave = (rl as unknown as { history: string[] }).history ?? []
  saveHistory([...historyToSave].reverse())
  rl.close()
}
