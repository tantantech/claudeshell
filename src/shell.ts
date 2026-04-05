import pc from 'picocolors'
import * as readline from 'node:readline/promises'
import * as os from 'node:os'
import process from 'node:process'
import { buildPrompt } from './prompt.js'
import { classifyInput } from './classify.js'
import { executeCd, executeExport, executeTheme, executeAliases } from './builtins.js'
import { executeModelSwitcher } from './model-switcher.js'
import { executeKeyManager } from './key-manager.js'
import { executeSettings } from './settings.js'
import { executeCommand } from './passthrough.js'
import { executeAI, buildFixPrompt, parseFixResponse } from './ai.js'
import { createRenderer, renderCostFooter } from './renderer.js'
import { createSessionId } from './session.js'
import { EMPTY_ACCUMULATOR, accumulate } from './cost.js'
import { runChatMode } from './chat.js'
import { loadHistory, saveHistory, shouldSaveToHistory, HISTORY_PATH } from './history.js'
import { isInteractiveCommand, executeInteractive } from './interactive.js'
import { loadConfig, loadProjectConfig, mergeConfigs, saveConfig, resolveApiKey } from './config.js'
import { detectProject } from './context.js'
import { expandAlias } from './alias.js'
import { loadPluginsPhase1, loadPluginsPhase2 } from './plugins/loader.js'
import { dispatchHook, buildHookBus } from './plugins/hooks.js'
import { BUNDLED_PLUGINS } from './plugins/index.js'
import { createEmptyRegistry } from './plugins/registry.js'
import { createCompletionEngine } from './completions/engine.js'
import { setupAutoSuggestions } from './suggestions/index.js'
import { renderHighlighted } from './highlighting/renderer.js'
import { refreshCommandCache, isKnownCommand, addKnownCommands } from './highlighting/commands.js'
import { executePlugin } from './plugin-manager.js'
import { CONFIG_PATH } from './config.js'
import fs from 'node:fs'
import type { NeshConfig } from './config.js'
import type { ProjectContext } from './context.js'
import type { PluginRegistry } from './plugins/registry.js'
import type { HookBus } from './plugins/hooks.js'
import { getTemplateByName, buildPromptFromTemplate, DEFAULT_TEMPLATE_NAME } from './templates.js'
import type { ShellState } from './types.js'

function refreshProjectState(
  globalConfig: NeshConfig,
  cwd: string
): { readonly projectContext: ProjectContext | null; readonly mergedConfig: NeshConfig } {
  const projectContext = detectProject(cwd)
  const projectConfig = loadProjectConfig(cwd)
  const mergedConfig = mergeConfigs(globalConfig, projectConfig)
  return { projectContext, mergedConfig }
}

export async function runShell(options?: { readonly safeMode?: boolean }): Promise<void> {
  const safeMode = options?.safeMode ?? false
  const globalConfig = loadConfig()
  const initialState = refreshProjectState(globalConfig, process.cwd())
  const config = initialState.mergedConfig
  let prefix = config.prefix ?? 'a'
  let currentTemplate = config.prompt_template ?? DEFAULT_TEMPLATE_NAME

  // Plugin Phase 1: synchronous alias registration (<50ms)
  const pluginConfig = config.plugins ?? {}
  let pluginRegistry: PluginRegistry
  let hookBus: HookBus
  let enabledPlugins: readonly import('./plugins/types.js').PluginManifest[] = []

  if (safeMode) {
    pluginRegistry = createEmptyRegistry()
    hookBus = { preCommand: [], postCommand: [], prePrompt: [], onCd: [] }
  } else {
    const phase1 = loadPluginsPhase1(pluginConfig, BUNDLED_PLUGINS)
    pluginRegistry = phase1.registry
    enabledPlugins = phase1.enabledPlugins
    hookBus = buildHookBus(enabledPlugins)
  }

  const completionEngine = createCompletionEngine(pluginRegistry)

  const historyLines = loadHistory(HISTORY_PATH)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    history: [...historyLines] as string[],
    historySize: config.history_size ?? 10_000,
    terminal: true,
    completer: async (line: string): Promise<[string[], string]> => {
      try {
        return await completionEngine.complete(line)
      } catch {
        return [[], line]
      }
    },
  })

  // Highlighting: refresh command cache and register plugin aliases
  refreshCommandCache().catch(() => {})
  addKnownCommands(pluginRegistry.getAll().keys())

  // Highlighting keypress handler -- must register BEFORE suggestions (Pattern 4)
  let highlightingCleanup: (() => void) | undefined
  if (config.highlighting?.enabled !== false) {
    const highlightHandler = (_str: string | undefined, _key: object | undefined) => {
      renderHighlighted(rl, (cmd) => isKnownCommand(cmd) || pluginRegistry.resolve(cmd) !== undefined)
    }
    process.stdin.on('keypress', highlightHandler)
    highlightingCleanup = () => { process.stdin.removeListener('keypress', highlightHandler) }
  }

  // Suggestions registered after highlighting for correct keypress order
  const suggestionsCleanup = setupAutoSuggestions(rl, config)

  let state: ShellState = {
    cdState: { previousDir: undefined },
    running: true,
    lastError: undefined,
    aiStreaming: false,
    interactiveRunning: false,
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
    highlightingCleanup?.()
    suggestionsCleanup()
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
    if (state.interactiveRunning) {
      return  // Let child process handle Ctrl+C
    }
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

  // Plugin Phase 2: async init deferred after first prompt
  if (!safeMode && enabledPlugins.length > 0) {
    setImmediate(async () => {
      await loadPluginsPhase2(enabledPlugins, { cwd: process.cwd() })
    })
  }

  // First-run profile detection (D-14): show profile selector when no plugins configured
  if (!safeMode) {
    const hasPluginConfig = (() => {
      try {
        fs.accessSync(CONFIG_PATH)
        return !!(loadConfig().plugins?.enabled?.length)
      } catch {
        return false
      }
    })()
    if (!hasPluginConfig) {
      await executePlugin('profile', {
        pluginRegistry,
        rl,
        onHotReload: (r) => {
          pluginRegistry = r.registry
          hookBus = r.hookBus
          enabledPlugins = r.enabled
          addKnownCommands(pluginRegistry.getAll().keys())
        },
      })
    }
  }

  while (state.running) {
    try {
      const template = getTemplateByName(currentTemplate) ?? getTemplateByName(DEFAULT_TEMPLATE_NAME)!
      const prompt = buildPromptFromTemplate(template, process.cwd(), os.homedir())
      // Fire-and-forget: prePrompt hook (per D-26 -- no await)
      dispatchHook('prePrompt', hookBus.prePrompt, { cwd: process.cwd() })
      const line = await rl.question(prompt)
      const expandedLine = expandAlias(line, pluginRegistry)
      const action = classifyInput(expandedLine, prefix)

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
                const currentDir = process.cwd()
                const refreshed = refreshProjectState(globalConfig, currentDir)
                prefix = refreshed.mergedConfig.prefix ?? prefix
                state = {
                  ...state,
                  projectContext: refreshed.projectContext,
                  permissionMode: refreshed.mergedConfig.permissions ?? state.permissionMode,
                  currentModel: refreshed.mergedConfig.model ?? state.currentModel,
                }
                await dispatchHook('onCd', hookBus.onCd, { cwd: currentDir, previousDir: result.newState.previousDir })
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
              const themeResult = await executeTheme(rl)
              if (themeResult.templateName) {
                currentTemplate = themeResult.templateName
              }
              break
            }
            case 'model': {
              const selectedModel = await executeModelSwitcher(rl, state.currentModel)
              if (selectedModel) {
                state = { ...state, currentModel: selectedModel }
              }
              break
            }
            case 'keys': {
              await executeKeyManager(rl)
              break
            }
            case 'settings': {
              const settingsResult = await executeSettings(rl, state.currentModel)
              if (settingsResult.templateName) {
                currentTemplate = settingsResult.templateName
                saveConfig({ ...loadConfig(), prompt_template: settingsResult.templateName })
                process.stdout.write(`Theme set to: ${settingsResult.templateName}\n`)
              }
              if (settingsResult.model) {
                state = { ...state, currentModel: settingsResult.model }
              }
              if (settingsResult.prefix) {
                prefix = settingsResult.prefix
              }
              if (settingsResult.permissions) {
                state = { ...state, permissionMode: settingsResult.permissions }
              }
              break
            }
            case 'aliases': {
              executeAliases(pluginRegistry)
              break
            }
            case 'plugin': {
              await executePlugin(action.args, {
                pluginRegistry,
                rl,
                onHotReload: (r) => {
                  pluginRegistry = r.registry
                  hookBus = r.hookBus
                  enabledPlugins = r.enabled
                  addKnownCommands(pluginRegistry.getAll().keys())
                },
              })
              break
            }
            case 'exit':
            case 'quit':
              state = { ...state, running: false }
              break
          }
          break

        case 'passthrough': {
          const interactiveList = config.interactive_commands ?? []
          if (isInteractiveCommand(action.command, interactiveList)) {
            // Per D-05, D-12: Pause readline to release stdin ownership
            rl.pause()
            state = { ...state, interactiveRunning: true }

            const interactiveResult = await executeInteractive(action.command)

            // Per D-16: Reset ANSI attributes
            process.stdout.write('\x1b[0m')
            // Per D-17: Ensure fresh line
            process.stdout.write('\n')
            // Per D-06, D-13: Resume readline
            state = { ...state, interactiveRunning: false }
            rl.resume()

            if (interactiveResult.exitCode !== 0) {
              process.stderr.write(`[exit: ${interactiveResult.exitCode}]\n`)
              state = { ...state, lastError: { command: action.command, stderr: '', exitCode: interactiveResult.exitCode }, lastSuggestedFix: undefined }
            } else {
              state = { ...state, lastError: undefined, lastSuggestedFix: undefined }
            }
            break
          }
          await dispatchHook('preCommand', hookBus.preCommand, { cwd: process.cwd(), command: action.command })
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
          await dispatchHook('postCommand', hookBus.postCommand, { cwd: process.cwd(), command: action.command, exitCode: result.exitCode })
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
