#!/usr/bin/env node
import { runShell } from './shell.js'

runShell().catch((err) => {
  process.stderr.write(`ClaudeShell fatal error: ${(err as Error).message}\n`)
  process.exit(1)
})
