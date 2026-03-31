import * as readline from 'node:readline/promises'
import * as os from 'node:os'
import process from 'node:process'
import { buildPrompt } from './prompt.js'
import { classifyInput } from './classify.js'
import { executeCd, executeExport } from './builtins.js'
import { executeCommand } from './passthrough.js'
import { loadHistory, saveHistory, shouldSaveToHistory, HISTORY_PATH } from './history.js'
import type { ShellState } from './types.js'

export async function runShell(): Promise<void> {
  const historyLines = loadHistory(HISTORY_PATH)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    history: [...historyLines] as string[],
    historySize: 10_000,
    terminal: true,
  })

  let state: ShellState = {
    cdState: { previousDir: undefined },
    running: true,
  }
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
    // Clear current line, show fresh prompt
    // readline handles this when using question() -- SIGINT makes question() reject
    // We just need to make sure we don't exit
  })

  rl.on('close', () => {
    state = { ...state, running: false }
  })

  while (state.running) {
    try {
      const prompt = buildPrompt(process.cwd(), os.homedir())
      const line = await rl.question(prompt)
      const action = classifyInput(line)

      switch (action.type) {
        case 'empty':
          break

        case 'builtin':
          switch (action.name) {
            case 'cd': {
              const result = executeCd(action.args, state.cdState)
              state = { ...state, cdState: result.newState }
              if (result.output) process.stdout.write(result.output + '\n')
              if (result.error) process.stderr.write(result.error + '\n')
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
            case 'exit':
            case 'quit':
              state = { ...state, running: false }
              break
          }
          break

        case 'passthrough': {
          const exitCode = await executeCommand(action.command)
          if (exitCode !== 0) {
            process.stderr.write(`[exit: ${exitCode}]\n`)
          }
          break
        }

        case 'ai_placeholder':
          process.stdout.write('AI commands will be available in a future update.\n')
          break
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
