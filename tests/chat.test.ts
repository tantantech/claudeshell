import { describe, it, expect } from 'vitest'
import { parseSlashCommand, MODEL_SHORTHANDS } from '../src/chat.js'

describe('MODEL_SHORTHANDS', () => {
  it('maps haiku to full model string', () => {
    expect(MODEL_SHORTHANDS.haiku).toBe('claude-haiku-4-5-20251001')
  })

  it('maps sonnet to full model string', () => {
    expect(MODEL_SHORTHANDS.sonnet).toBe('claude-sonnet-4-5-20250514')
  })

  it('maps opus to full model string', () => {
    expect(MODEL_SHORTHANDS.opus).toBe('claude-opus-4-6-20250414')
  })
})

describe('parseSlashCommand', () => {
  it('parses /exit as exit command', () => {
    expect(parseSlashCommand('/exit')).toEqual({ type: 'exit' })
  })

  it('parses /shell as exit command', () => {
    expect(parseSlashCommand('/shell')).toEqual({ type: 'exit' })
  })

  it('parses /new as new command', () => {
    expect(parseSlashCommand('/new')).toEqual({ type: 'new' })
  })

  it('parses /model haiku with shorthand resolution', () => {
    expect(parseSlashCommand('/model haiku')).toEqual({
      type: 'model',
      model: 'claude-haiku-4-5-20251001',
    })
  })

  it('parses /model sonnet with shorthand resolution', () => {
    expect(parseSlashCommand('/model sonnet')).toEqual({
      type: 'model',
      model: 'claude-sonnet-4-5-20250514',
    })
  })

  it('parses /model opus with shorthand resolution', () => {
    expect(parseSlashCommand('/model opus')).toEqual({
      type: 'model',
      model: 'claude-opus-4-6-20250414',
    })
  })

  it('parses /model with full model string passthrough', () => {
    expect(parseSlashCommand('/model claude-sonnet-4-5-20250514')).toEqual({
      type: 'model',
      model: 'claude-sonnet-4-5-20250514',
    })
  })

  it('returns unknown for /model with no argument', () => {
    expect(parseSlashCommand('/model')).toEqual({
      type: 'unknown',
      input: '/model',
    })
  })

  it('returns unknown for unrecognized slash commands', () => {
    expect(parseSlashCommand('/unknown')).toEqual({
      type: 'unknown',
      input: '/unknown',
    })
  })

  it('returns unknown for /help', () => {
    expect(parseSlashCommand('/help')).toEqual({
      type: 'unknown',
      input: '/help',
    })
  })

  it('trims whitespace from input', () => {
    expect(parseSlashCommand('  /exit  ')).toEqual({ type: 'exit' })
  })

  it('handles /model with extra whitespace around argument', () => {
    expect(parseSlashCommand('/model   haiku  ')).toEqual({
      type: 'model',
      model: 'claude-haiku-4-5-20251001',
    })
  })
})
