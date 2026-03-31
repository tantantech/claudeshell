import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRenderer } from '../src/renderer.js'

describe('createRenderer', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TTY mode', () => {
    it('onText writes text to stdout immediately', () => {
      const renderer = createRenderer({ isTTY: true })
      renderer.onText('hello')
      expect(stdoutSpy).toHaveBeenCalledWith('hello')
    })

    it('onToolStart writes dim tool indicator to stderr', () => {
      const renderer = createRenderer({ isTTY: true })
      renderer.onToolStart('Read')
      expect(stderrSpy).toHaveBeenCalled()
      const written = stderrSpy.mock.calls[0]?.[0] as string
      expect(written).toContain('Read')
    })

    it('onToolEnd writes done to stderr', () => {
      const renderer = createRenderer({ isTTY: true })
      renderer.onToolStart('Read')
      stderrSpy.mockClear()
      renderer.onToolEnd('Read')
      expect(stderrSpy).toHaveBeenCalled()
      const written = stderrSpy.mock.calls[0]?.[0] as string
      expect(written).toContain('done')
    })

    it('onToolEnd includes result when provided', () => {
      const renderer = createRenderer({ isTTY: true })
      renderer.onToolStart('Bash')
      stderrSpy.mockClear()
      renderer.onToolEnd('Bash', 'exit code 0')
      const allWrites = stderrSpy.mock.calls.map(c => c[0] as string).join('')
      expect(allWrites).toContain('exit code 0')
    })

    it('finish writes trailing newline', () => {
      const renderer = createRenderer({ isTTY: true })
      renderer.onText('some output')
      stdoutSpy.mockClear()
      renderer.finish()
      expect(stdoutSpy).toHaveBeenCalledWith('\n')
    })
  })

  describe('non-TTY mode', () => {
    it('onText writes plain text to stdout', () => {
      const renderer = createRenderer({ isTTY: false })
      renderer.onText('hello')
      expect(stdoutSpy).toHaveBeenCalledWith('hello')
    })

    it('onToolStart writes nothing when not TTY', () => {
      const renderer = createRenderer({ isTTY: false })
      renderer.onToolStart('Read')
      expect(stderrSpy).not.toHaveBeenCalled()
    })

    it('finish writes trailing newline', () => {
      const renderer = createRenderer({ isTTY: false })
      renderer.onText('output')
      stdoutSpy.mockClear()
      renderer.finish()
      expect(stdoutSpy).toHaveBeenCalledWith('\n')
    })
  })
})
