import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AICallbacks } from '../src/ai.js'
import type { LastError } from '../src/types.js'

// Mock the config module
vi.mock('../src/config.js', () => ({
  resolveApiKey: vi.fn()
}))

// Mock the SDK module
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn()
}))

describe('executeAI', () => {
  let mockResolveApiKey: ReturnType<typeof vi.fn>
  let mockQuery: ReturnType<typeof vi.fn>
  let callbacks: AICallbacks

  beforeEach(async () => {
    vi.resetModules()

    const configMod = await import('../src/config.js')
    mockResolveApiKey = configMod.resolveApiKey as unknown as ReturnType<typeof vi.fn>

    const sdkMod = await import('@anthropic-ai/claude-agent-sdk')
    mockQuery = sdkMod.query as unknown as ReturnType<typeof vi.fn>

    callbacks = {
      onText: vi.fn(),
      onToolStart: vi.fn(),
      onToolEnd: vi.fn(),
      onError: vi.fn()
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls onError with API key message when no key found', async () => {
    mockResolveApiKey.mockReturnValue(undefined)

    const { executeAI } = await import('../src/ai.js')
    await executeAI('hello', {
      cwd: '/tmp',
      lastError: undefined,
      abortController: new AbortController(),
      callbacks
    })

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.stringContaining('ANTHROPIC_API_KEY')
    )
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('calls dynamic import and invokes query when key exists', async () => {
    mockResolveApiKey.mockReturnValue('sk-ant-test')

    async function* emptyGenerator() {
      // yields nothing
    }
    mockQuery.mockReturnValue(emptyGenerator())

    const { executeAI } = await import('../src/ai.js')
    await executeAI('hello', {
      cwd: '/tmp',
      lastError: undefined,
      abortController: new AbortController(),
      callbacks
    })

    expect(mockQuery).toHaveBeenCalled()
  })

  it('maps authentication errors to user-friendly message', async () => {
    mockResolveApiKey.mockReturnValue('sk-ant-test')

    async function* errorGenerator() {
      yield {
        type: 'assistant' as const,
        error: 'authentication_failed' as const,
        message: {},
        parent_tool_use_id: null,
        uuid: 'test',
        session_id: 'test'
      }
    }
    mockQuery.mockReturnValue(errorGenerator())

    const { executeAI } = await import('../src/ai.js')
    await executeAI('hello', {
      cwd: '/tmp',
      lastError: undefined,
      abortController: new AbortController(),
      callbacks
    })

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.stringContaining('Invalid API key')
    )
  })

  it('maps rate limit errors to user-friendly message', async () => {
    mockResolveApiKey.mockReturnValue('sk-ant-test')

    async function* errorGenerator() {
      yield {
        type: 'assistant' as const,
        error: 'rate_limit' as const,
        message: {},
        parent_tool_use_id: null,
        uuid: 'test',
        session_id: 'test'
      }
    }
    mockQuery.mockReturnValue(errorGenerator())

    const { executeAI } = await import('../src/ai.js')
    await executeAI('hello', {
      cwd: '/tmp',
      lastError: undefined,
      abortController: new AbortController(),
      callbacks
    })

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.stringContaining('Rate limited')
    )
  })

  it('maps network errors to user-friendly message', async () => {
    mockResolveApiKey.mockReturnValue('sk-ant-test')

    mockQuery.mockImplementation(() => {
      throw new Error('ECONNREFUSED connection refused')
    })

    const { executeAI } = await import('../src/ai.js')
    await executeAI('hello', {
      cwd: '/tmp',
      lastError: undefined,
      abortController: new AbortController(),
      callbacks
    })

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.stringContaining('Network error')
    )
  })

  it('builds explain prompt with last error context', async () => {
    mockResolveApiKey.mockReturnValue('sk-ant-test')

    async function* emptyGenerator() {
      // yields nothing
    }
    mockQuery.mockReturnValue(emptyGenerator())

    const lastError: LastError = {
      command: 'npm run build',
      stderr: 'TypeError: cannot read property of undefined',
      exitCode: 1
    }

    const { executeAI } = await import('../src/ai.js')
    await executeAI('explain', {
      cwd: '/tmp',
      lastError,
      abortController: new AbortController(),
      callbacks
    })

    const queryCall = mockQuery.mock.calls[0]?.[0]
    expect(queryCall.prompt).toContain('npm run build')
    expect(queryCall.prompt).toContain('TypeError')
    expect(queryCall.prompt).toContain('Exit code: 1')
  })

  it('does not call onError when aborted', async () => {
    mockResolveApiKey.mockReturnValue('sk-ant-test')

    const abortController = new AbortController()
    mockQuery.mockImplementation(() => {
      abortController.abort()
      const err = new DOMException('The operation was aborted', 'AbortError')
      throw err
    })

    const { executeAI } = await import('../src/ai.js')
    await executeAI('hello', {
      cwd: '/tmp',
      lastError: undefined,
      abortController,
      callbacks
    })

    expect(callbacks.onError).not.toHaveBeenCalled()
  })

  it('processes stream text_delta events via onText callback', async () => {
    mockResolveApiKey.mockReturnValue('sk-ant-test')

    async function* textGenerator() {
      yield {
        type: 'stream_event' as const,
        event: {
          type: 'content_block_delta' as const,
          index: 0,
          delta: { type: 'text_delta' as const, text: 'Hello world' }
        },
        parent_tool_use_id: null,
        uuid: 'test',
        session_id: 'test'
      }
    }
    mockQuery.mockReturnValue(textGenerator())

    const { executeAI } = await import('../src/ai.js')
    await executeAI('hello', {
      cwd: '/tmp',
      lastError: undefined,
      abortController: new AbortController(),
      callbacks
    })

    expect(callbacks.onText).toHaveBeenCalledWith('Hello world')
  })

  it('processes tool_use events via onToolStart callback', async () => {
    mockResolveApiKey.mockReturnValue('sk-ant-test')

    async function* toolGenerator() {
      yield {
        type: 'stream_event' as const,
        event: {
          type: 'content_block_start' as const,
          index: 0,
          content_block: { type: 'tool_use' as const, id: 't1', name: 'Read', input: {} }
        },
        parent_tool_use_id: null,
        uuid: 'test',
        session_id: 'test'
      }
    }
    mockQuery.mockReturnValue(toolGenerator())

    const { executeAI } = await import('../src/ai.js')
    await executeAI('hello', {
      cwd: '/tmp',
      lastError: undefined,
      abortController: new AbortController(),
      callbacks
    })

    expect(callbacks.onToolStart).toHaveBeenCalledWith('Read')
  })
})
