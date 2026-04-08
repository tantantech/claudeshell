import { describe, it, expect } from 'vitest'
import { parseMenuChoice } from '../src/menu.js'

describe('parseMenuChoice', () => {
  it('returns quit for q', () => {
    expect(parseMenuChoice('q', 5)).toEqual({ type: 'quit' })
  })

  it('returns quit for Q', () => {
    expect(parseMenuChoice('Q', 5)).toEqual({ type: 'quit' })
  })

  it('returns selection for valid number', () => {
    expect(parseMenuChoice('3', 5)).toEqual({ type: 'selection', index: 3 })
  })

  it('returns invalid for out of range', () => {
    expect(parseMenuChoice('6', 5)).toEqual({ type: 'invalid' })
  })

  it('returns invalid for 0', () => {
    expect(parseMenuChoice('0', 5)).toEqual({ type: 'invalid' })
  })

  it('returns invalid for non-numeric', () => {
    expect(parseMenuChoice('abc', 5)).toEqual({ type: 'invalid' })
  })

  it('returns invalid for empty string', () => {
    expect(parseMenuChoice('', 5)).toEqual({ type: 'invalid' })
  })
})
