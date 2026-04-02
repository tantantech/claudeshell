import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toSDKPermissionMode, buildSystemPrompt, executeAI } from '../src/ai.js'
import { resolveApiKey } from '../src/config.js'
import { query } from '@anthropic-ai/claude-agent-sdk'

// Mock the config module
vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn(() => ({})),
  resolveApiKey: vi.fn()
}))

// Mock the SDK module
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn()
}))

const mockResolveApiKey = resolveApiKey as unknown as ReturnType<typeof vi.fn>
const mockQuery = query as unknown as ReturnType<typeof vi.fn>

describe('toSDKPermissionMode', () => {
  it('maps auto to acceptEdits', () => {
    expect(toSDKPermissionMode('auto')).toBe('acceptEdits')
  })

  it('maps ask to default', () => {
    expect(toSDKPermissionMode('ask')).toBe('default')
  })

  it('maps deny to plan', () => {
    expect(toSDKPermissionMode('deny')).toBe('plan')
  })
})

describe('buildSystemPrompt', () => {
  it('returns base prompt without project line when projectContext is null', () => {
    const result = buildSystemPrompt('/tmp', null)
    expect(result).toContain('Nesh')
    expect(result).toContain('/tmp')
    expect(result).not.toContain('Project:')
  })

  it('includes Project line when projectContext is provided', () => {
    const ctx = {
      type: 'Node.js',
      name: 'my-app',
      markers: ['package.json'] as readonly string[],
      summary: 'You are in a Node.js project called my-app. Key deps: express, lodash.'
    }
    const result = buildSystemPrompt('/tmp', ctx)
    expect(result).toContain('Project: You are in a Node.js project called my-app')
    expect(result).toContain('express, lodash')
  })

  it('returns base prompt without project line when projectContext is undefined', () => {
    const result = buildSystemPrompt('/tmp')
    expect(result).not.toContain('Project:')
  })
})

describe('executeAI with permissions', () => {
  function makeCallbacks() {
    return { onText: vi.fn(), onToolStart: vi.fn(), onToolEnd: vi.fn(), onError: vi.fn() }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveApiKey.mockReturnValue('sk-ant-test')
    async function* emptyGen() { /* yields nothing */ }
    mockQuery.mockReturnValue(emptyGen())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes permissionMode acceptEdits for auto mode', async () => {
    await executeAI('hello', {
      cwd: '/tmp',
      lastError: undefined,
      abortController: new AbortController(),
      callbacks: makeCallbacks(),
      permissionMode: 'auto',
    })

    const opts = mockQuery.mock.calls[0]?.[0]?.options
    expect(opts.permissionMode).toBe('acceptEdits')
  })

  it('passes permissionMode plan for deny mode', async () => {
    await executeAI('hello', {
      cwd: '/tmp',
      lastError: undefined,
      abortController: new AbortController(),
      callbacks: makeCallbacks(),
      permissionMode: 'deny',
    })

    const opts = mockQuery.mock.calls[0]?.[0]?.options
    expect(opts.permissionMode).toBe('plan')
  })

  it('includes projectContext summary in system prompt', async () => {
    await executeAI('hello', {
      cwd: '/tmp',
      lastError: undefined,
      abortController: new AbortController(),
      callbacks: makeCallbacks(),
      projectContext: {
        type: 'Node.js',
        name: 'test-proj',
        markers: ['package.json'] as readonly string[],
        summary: 'You are in a Node.js project called test-proj.'
      },
    })

    const opts = mockQuery.mock.calls[0]?.[0]?.options
    expect(opts.systemPrompt).toContain('Project: You are in a Node.js project called test-proj.')
  })

  it('defaults permissionMode to auto when not provided', async () => {
    await executeAI('hello', {
      cwd: '/tmp',
      lastError: undefined,
      abortController: new AbortController(),
      callbacks: makeCallbacks(),
    })

    const opts = mockQuery.mock.calls[0]?.[0]?.options
    expect(opts.permissionMode).toBe('acceptEdits')
  })

  it('attaches canUseTool callback in ask mode with TTY', async () => {
    const origIsTTY = process.stdin.isTTY
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })

    try {
      await executeAI('hello', {
        cwd: '/tmp',
        lastError: undefined,
        abortController: new AbortController(),
        callbacks: makeCallbacks(),
        permissionMode: 'ask',
      })

      const opts = mockQuery.mock.calls[0]?.[0]?.options
      expect(opts.permissionMode).toBe('default')
      expect(typeof opts.canUseTool).toBe('function')
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true })
    }
  })

  it('forces ask mode to auto when stdin is not TTY', async () => {
    const origIsTTY = process.stdin.isTTY
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true })

    try {
      await executeAI('hello', {
        cwd: '/tmp',
        lastError: undefined,
        abortController: new AbortController(),
        callbacks: makeCallbacks(),
        permissionMode: 'ask',
      })

      const opts = mockQuery.mock.calls[0]?.[0]?.options
      expect(opts.permissionMode).toBe('acceptEdits')
      expect(opts.canUseTool).toBeUndefined()
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true })
    }
  })
})
