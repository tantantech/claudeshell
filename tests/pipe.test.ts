import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Readable } from 'node:stream'

// Mock dependencies before importing
vi.mock('../src/ai.js', () => ({
  executeAI: vi.fn().mockResolvedValue({ sessionId: undefined, usage: undefined }),
}))

vi.mock('../src/renderer.js', () => ({
  createRenderer: vi.fn().mockReturnValue({
    onText: vi.fn(),
    onToolStart: vi.fn(),
    onToolEnd: vi.fn(),
    finish: vi.fn(),
  }),
  renderCostFooter: vi.fn(),
}))

vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({}),
  resolveApiKey: vi.fn().mockReturnValue('sk-ant-test'),
}))

describe('collectStdin', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('collects UTF-8 string from stdin chunks', async () => {
    const { collectStdin } = await import('../src/pipe.js')
    const readable = Readable.from([Buffer.from('hello '), Buffer.from('world')])
    const result = await collectStdin(readable as unknown as NodeJS.ReadableStream)
    expect(result).toBe('hello world')
  })

  it('throws Error when content contains null bytes (binary)', async () => {
    const { collectStdin } = await import('../src/pipe.js')
    const readable = Readable.from([Buffer.from('binary\0content')])
    await expect(collectStdin(readable as unknown as NodeJS.ReadableStream))
      .rejects.toThrow('Binary input not supported')
  })

  it('throws Error when total bytes exceed 1MB', async () => {
    const { collectStdin } = await import('../src/pipe.js')
    const bigChunk = Buffer.alloc(1_048_577, 'a')
    const readable = Readable.from([bigChunk])
    await expect(collectStdin(readable as unknown as NodeJS.ReadableStream))
      .rejects.toThrow(/exceeds maximum/i)
  })

  it('writes warning to stderr when total bytes exceed 100KB', async () => {
    const { collectStdin } = await import('../src/pipe.js')
    const chunk = Buffer.alloc(102_401, 'a')
    const readable = Readable.from([chunk])
    await collectStdin(readable as unknown as NodeJS.ReadableStream)
    const written = stderrSpy.mock.calls.map(c => c[0] as string).join('')
    expect(written).toContain('Warning')
  })
})

describe('runPipe', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as never)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('combines CLI prompt with stdin content using separator (D-05)', async () => {
    const { executeAI } = await import('../src/ai.js')
    const mockExecuteAI = vi.mocked(executeAI)
    mockExecuteAI.mockResolvedValue({ sessionId: undefined, usage: undefined })

    const { runPipe } = await import('../src/pipe.js')
    const readable = Readable.from([Buffer.from('hello world')])

    try {
      await runPipe('summarize', readable as unknown as NodeJS.ReadableStream)
    } catch {
      // process.exit mock throws
    }

    expect(mockExecuteAI).toHaveBeenCalled()
    const prompt = mockExecuteAI.mock.calls[0]?.[0]
    expect(prompt).toBe('summarize\n\n---\n\nhello world')
  })

  it('uses stdin as prompt directly when CLI prompt is empty (D-06)', async () => {
    const { executeAI } = await import('../src/ai.js')
    const mockExecuteAI = vi.mocked(executeAI)
    mockExecuteAI.mockResolvedValue({ sessionId: undefined, usage: undefined })

    const { runPipe } = await import('../src/pipe.js')
    const readable = Readable.from([Buffer.from('explain this')])

    try {
      await runPipe('', readable as unknown as NodeJS.ReadableStream)
    } catch {
      // process.exit mock throws
    }

    expect(mockExecuteAI).toHaveBeenCalled()
    const prompt = mockExecuteAI.mock.calls[0]?.[0]
    expect(prompt).toBe('explain this')
  })

  it('writes error and exits 1 when no input provided', async () => {
    const { runPipe } = await import('../src/pipe.js')
    const readable = Readable.from([Buffer.from('')])

    try {
      await runPipe('', readable as unknown as NodeJS.ReadableStream)
    } catch {
      // process.exit mock throws
    }

    expect(exitSpy).toHaveBeenCalledWith(1)
    const written = stderrSpy.mock.calls.map(c => c[0] as string).join('')
    expect(written).toContain('No input provided')
  })

  it('creates renderer with isTTY: false', async () => {
    const { createRenderer } = await import('../src/renderer.js')
    const { executeAI } = await import('../src/ai.js')
    vi.mocked(executeAI).mockResolvedValue({ sessionId: undefined, usage: undefined })

    const { runPipe } = await import('../src/pipe.js')
    const readable = Readable.from([Buffer.from('test input')])

    try {
      await runPipe('test', readable as unknown as NodeJS.ReadableStream)
    } catch {
      // process.exit mock throws
    }

    expect(createRenderer).toHaveBeenCalledWith({ isTTY: false })
  })

  it('calls renderCostFooter when usage is present', async () => {
    const { executeAI } = await import('../src/ai.js')
    const { renderCostFooter } = await import('../src/renderer.js')
    const usage = { inputTokens: 10, outputTokens: 20, costUsd: 0.001, durationMs: 500 }
    vi.mocked(executeAI).mockResolvedValue({ sessionId: 'sess-1', usage })

    const { runPipe } = await import('../src/pipe.js')
    const readable = Readable.from([Buffer.from('test')])

    try {
      await runPipe('prompt', readable as unknown as NodeJS.ReadableStream)
    } catch {
      // process.exit mock throws
    }

    expect(renderCostFooter).toHaveBeenCalledWith(usage)
  })

  it('exits with code 0 on success', async () => {
    const { executeAI } = await import('../src/ai.js')
    vi.mocked(executeAI).mockResolvedValue({ sessionId: undefined, usage: undefined })

    const { runPipe } = await import('../src/pipe.js')
    const readable = Readable.from([Buffer.from('test')])

    try {
      await runPipe('prompt', readable as unknown as NodeJS.ReadableStream)
    } catch {
      // process.exit mock throws
    }

    expect(exitSpy).toHaveBeenCalledWith(0)
  })
})