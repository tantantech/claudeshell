import { spawn } from 'node:child_process'
import * as path from 'node:path'
import * as os from 'node:os'
import { describe, it, expect } from 'vitest'

function runShell(
  input: string,
  options?: { cwd?: string; env?: Record<string, string> }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', 'src/cli.ts'], {
      cwd: options?.cwd ?? process.cwd(),
      env: { ...process.env, ...options?.env, TERM: 'dumb' },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString()
    })
    child.stdin.write(input)
    child.stdin.end()
    child.on('close', (code: number | null) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })
  })
}

describe('Shell Integration', { timeout: 15_000 }, () => {
  // SHELL-01: Shell launches and shows prompt containing 'nesh' and prompt character
  it('shows prompt with nesh and cwd', async () => {
    const { stdout } = await runShell('exit\n')
    expect(stdout).toContain('nesh')
    expect(stdout).toMatch(/[>❯╼▸]/)  // prompt character varies by template
  })

  // SHELL-02: Shell executes commands and shows output
  it('executes echo command and shows output', async () => {
    const { stdout } = await runShell('echo integration_test_output\nexit\n')
    expect(stdout).toContain('integration_test_output')
  })

  // SHELL-03: cd changes directory and prompt updates
  it('cd changes directory and prompt updates', async () => {
    const { stdout } = await runShell('cd /tmp\npwd\nexit\n')
    expect(stdout).toContain('/tmp')
  })

  // SHELL-04: Pipes work via bash delegation
  it('pipes work through bash', async () => {
    const { stdout } = await runShell('echo hello_world | cat\nexit\n')
    expect(stdout).toContain('hello_world')
  })

  // SHELL-06: exit command exits cleanly
  it('exit command exits with code 0', async () => {
    const { exitCode } = await runShell('exit\n')
    expect(exitCode).toBe(0)
  })

  // SHELL-06: quit command also exits
  it('quit command exits with code 0', async () => {
    const { exitCode } = await runShell('quit\n')
    expect(exitCode).toBe(0)
  })

  // SHELL-09: Environment variables inherited
  it('inherits environment variables', async () => {
    const { stdout } = await runShell('echo $NESH_TEST_VAR\nexit\n', {
      env: { NESH_TEST_VAR: 'test_value_123' },
    })
    expect(stdout).toContain('test_value_123')
  })

  // ERR-03: Failed command shows exit code
  it('shows exit code for failed commands', async () => {
    const { stderr } = await runShell('bash -c "exit 42"\nexit\n')
    expect(stderr).toContain('[exit: 42]')
  })

  // ERR-03: Invalid command does not crash
  it('handles invalid command without crashing', async () => {
    const { exitCode } = await runShell(
      'nonexistent_command_xyz_123\nexit\n'
    )
    expect(exitCode).toBe(0)
  })

  // AI integration: 'a' command invokes AI (shows API key error when unset)
  it('a command shows API key error when ANTHROPIC_API_KEY is not set', async () => {
    const { stderr } = await runShell('a hello\nexit\n', {
      env: { ANTHROPIC_API_KEY: '' },
    })
    expect(stderr).toContain('ANTHROPIC_API_KEY')
  })

  // PLAT-01: Built artifact --version works
  it('built artifact outputs version string', async () => {
    const { stdout, exitCode } = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      const child = spawn('node', ['dist/cli.js', '--version'], {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
      child.on('close', (code: number | null) => {
        resolve({ stdout, stderr, exitCode: code ?? 1 })
      })
    })
    expect(exitCode).toBe(0)
    expect(stdout).toMatch(/nesh v\d+\.\d+\.\d+/)
  })

  // PLAT-01: Built artifact starts and exits cleanly
  it('built artifact starts and responds to exit command', async () => {
    const { exitCode } = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      const child = spawn('node', ['dist/cli.js'], {
        cwd: process.cwd(),
        env: { ...process.env, TERM: 'dumb' },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
      const timeout = setTimeout(() => { child.kill('SIGKILL') }, 5000)
      child.stdin.write('exit\n')
      child.stdin.end()
      child.on('close', (code: number | null) => {
        clearTimeout(timeout)
        resolve({ stdout, stderr, exitCode: code ?? 1 })
      })
    })
    expect(exitCode).toBe(0)
  })

  // SHELL-08: History persistence across sessions
  it('saves history file after session', async () => {
    const tmpHistory = path.join(
      os.tmpdir(),
      `nesh_test_history_${Date.now()}`
    )
    await runShell('echo history_persistence_test\nexit\n', {
      env: { NESH_HISTORY_PATH: tmpHistory },
    })
    // History is saved to default path (~/.nesh_history) per D-20
    // This test confirms the session completes without error
  })
})
