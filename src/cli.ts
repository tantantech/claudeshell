#!/usr/bin/env node
import { createRequire } from 'node:module'
import { runShell } from './shell.js'
import { runPipe } from './pipe.js'

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const require = createRequire(import.meta.url)
  const pkg = require('../package.json') as { version: string }
  process.stdout.write(`nesh v${pkg.version}\n`)
  process.exit(0)
}

const forceInteractive = process.argv.includes('--interactive')
const safeMode = process.argv.includes('--safe')

if (!process.stdin.isTTY && !forceInteractive) {
  const prompt = process.argv.filter(a => a !== '--interactive').slice(2).join(' ')
  runPipe(prompt).catch((err) => {
    process.stderr.write(`Nesh error: ${(err as Error).message}\n`)
    process.exit(1)
  })
} else {
  runShell({ safeMode }).catch((err) => {
    process.stderr.write(`Nesh fatal error: ${(err as Error).message}\n`)
    process.exit(1)
  })
}
