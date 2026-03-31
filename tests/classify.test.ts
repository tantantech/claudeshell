import { describe, it, expect } from 'vitest'
import { classifyInput } from '../src/classify.js'

describe('classifyInput', () => {
  describe('empty input', () => {
    it('returns empty for empty string', () => {
      expect(classifyInput('')).toEqual({ type: 'empty' })
    })

    it('returns empty for whitespace-only string', () => {
      expect(classifyInput('   ')).toEqual({ type: 'empty' })
    })
  })

  describe('builtin: cd', () => {
    it('classifies cd with path argument', () => {
      expect(classifyInput('cd /tmp')).toEqual({ type: 'builtin', name: 'cd', args: '/tmp' })
    })

    it('classifies cd with no arguments', () => {
      expect(classifyInput('cd')).toEqual({ type: 'builtin', name: 'cd', args: '' })
    })
  })

  describe('builtin: exit and quit', () => {
    it('classifies exit', () => {
      expect(classifyInput('exit')).toEqual({ type: 'builtin', name: 'exit', args: '' })
    })

    it('classifies quit', () => {
      expect(classifyInput('quit')).toEqual({ type: 'builtin', name: 'quit', args: '' })
    })
  })

  describe('builtin: clear', () => {
    it('classifies clear', () => {
      expect(classifyInput('clear')).toEqual({ type: 'builtin', name: 'clear', args: '' })
    })
  })

  describe('builtin: export', () => {
    it('classifies export with KEY=VALUE', () => {
      expect(classifyInput('export FOO=bar')).toEqual({ type: 'builtin', name: 'export', args: 'FOO=bar' })
    })
  })

  describe('passthrough commands', () => {
    it('classifies ls -la as passthrough', () => {
      expect(classifyInput('ls -la')).toEqual({ type: 'passthrough', command: 'ls -la' })
    })

    it('classifies git status as passthrough', () => {
      expect(classifyInput('git status')).toEqual({ type: 'passthrough', command: 'git status' })
    })

    it('classifies apt install foo as passthrough (starts with a but not "a " prefix)', () => {
      expect(classifyInput('apt install foo')).toEqual({ type: 'passthrough', command: 'apt install foo' })
    })
  })

  describe('ai commands', () => {
    it('classifies "a explain this" as ai', () => {
      expect(classifyInput('a explain this')).toEqual({ type: 'ai', prompt: 'explain this' })
    })

    it('classifies bare "a" as ai with empty prompt', () => {
      expect(classifyInput('a')).toEqual({ type: 'ai', prompt: '' })
    })

    it('classifies "a hello world" as ai with prompt', () => {
      expect(classifyInput('a hello world')).toEqual({ type: 'ai', prompt: 'hello world' })
    })

    it('does not classify "apt update" as ai', () => {
      expect(classifyInput('apt update')).toEqual({ type: 'passthrough', command: 'apt update' })
    })
  })

  describe('edge cases', () => {
    it('trims leading and trailing whitespace before classifying', () => {
      expect(classifyInput('  cd /tmp  ')).toEqual({ type: 'builtin', name: 'cd', args: '/tmp' })
    })

    it('does not treat "a" inside a word as ai prefix', () => {
      expect(classifyInput('apt install foo')).toEqual({ type: 'passthrough', command: 'apt install foo' })
    })

    it('handles single-word passthrough commands', () => {
      expect(classifyInput('ls')).toEqual({ type: 'passthrough', command: 'ls' })
    })
  })
})
