import { spawn } from 'node:child_process'

export function executeCommand(command: string, cwd?: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', command], {
      stdio: 'inherit',
      cwd: cwd ?? process.cwd(),
      env: process.env,
    })

    child.on('close', (code) => {
      resolve(code ?? 1)
    })

    child.on('error', (err) => {
      process.stderr.write(`Failed to execute: ${err.message}\n`)
      resolve(127)
    })
  })
}
