import { describe, it, expect } from 'vitest'
import { executeCommand } from '../src/passthrough.js'

describe('executeCommand', () => {
  it('returns exit code 0 for successful command', async () => {
    const code = await executeCommand('echo hello')
    expect(code).toBe(0)
  })

  it('returns non-zero exit code for failing command', async () => {
    const code = await executeCommand('exit 42')
    expect(code).toBe(42)
  })

  it('returns 127 for nonexistent command', async () => {
    const code = await executeCommand('nonexistent_command_xyz_12345')
    expect(code).toBe(127)
  })

  it('handles pipes via bash', async () => {
    const code = await executeCommand('echo a | cat')
    expect(code).toBe(0)
  })

  it('uses provided cwd as working directory', async () => {
    const code = await executeCommand('test -d /tmp', '/tmp')
    expect(code).toBe(0)
  })
})
