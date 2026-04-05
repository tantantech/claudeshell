import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:readline', () => ({
  moveCursor: vi.fn(),
}))

import { moveCursor } from 'node:readline'
import { renderGhost, clearGhost, hasGhost } from '../../src/suggestions/renderer.js'

const mockMoveCursor = vi.mocked(moveCursor)

describe('renderGhost', () => {
  beforeEach(() => {
    mockMoveCursor.mockClear()
    const tempSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    clearGhost()
    tempSpy.mockClear()
  })

  it('writes dim ANSI sequence for suffix', () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    renderGhost('eckout')
    expect(process.stdout.write).toHaveBeenCalledWith('\x1b[2meckout\x1b[0m')
  })

  it('moves cursor back by suffix length', () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    renderGhost('eckout')
    expect(mockMoveCursor).toHaveBeenCalledWith(process.stdout, -6, 0)
  })

  it('does nothing for empty suffix', () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    renderGhost('')
    expect(process.stdout.write).not.toHaveBeenCalled()
  })

  it('does nothing when not TTY', () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true })
    renderGhost('eckout')
    expect(process.stdout.write).not.toHaveBeenCalled()
  })

  it('sets hasGhost to true after render', () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    expect(hasGhost()).toBe(false)
    renderGhost('test')
    expect(hasGhost()).toBe(true)
  })
})

describe('clearGhost', () => {
  beforeEach(() => {
    mockMoveCursor.mockClear()
    // Ensure clean state before setting up spy
    const tempSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    clearGhost()
    tempSpy.mockClear()
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
  })

  it('writes clear-to-end-of-line when ghost is active', () => {
    renderGhost('test')
    vi.mocked(process.stdout.write).mockClear()
    clearGhost()
    expect(process.stdout.write).toHaveBeenCalledWith('\x1b[K')
  })

  it('is idempotent -- does nothing when ghostLength is 0', () => {
    clearGhost()
    expect(process.stdout.write).not.toHaveBeenCalled()
  })

  it('resets hasGhost to false', () => {
    renderGhost('test')
    expect(hasGhost()).toBe(true)
    clearGhost()
    expect(hasGhost()).toBe(false)
  })
})
