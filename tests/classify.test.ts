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

  describe('builtin: plugin', () => {
    it('classifies plugin list as builtin', () => {
      expect(classifyInput('plugin list')).toEqual({ type: 'builtin', name: 'plugin', args: 'list' })
    })

    it('classifies plugin with no args as builtin', () => {
      expect(classifyInput('plugin')).toEqual({ type: 'builtin', name: 'plugin', args: '' })
    })

    it('classifies plugin enable git as builtin', () => {
      expect(classifyInput('plugin enable git')).toEqual({ type: 'builtin', name: 'plugin', args: 'enable git' })
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

  describe('model flag parsing', () => {
    it('parses --haiku flag and returns model', () => {
      expect(classifyInput('a --haiku what is rust')).toEqual({
        type: 'ai',
        prompt: 'what is rust',
        model: 'claude-haiku-4-5-20251001',
      })
    })

    it('parses --sonnet flag and returns model', () => {
      expect(classifyInput('a --sonnet explain this')).toEqual({
        type: 'ai',
        prompt: 'explain this',
        model: 'claude-sonnet-4-5-20250514',
      })
    })

    it('parses --opus flag and returns model', () => {
      expect(classifyInput('a --opus analyze')).toEqual({
        type: 'ai',
        prompt: 'analyze',
        model: 'claude-opus-4-6-20250414',
      })
    })

    it('parses --haiku with no prompt', () => {
      expect(classifyInput('a --haiku')).toEqual({
        type: 'ai',
        prompt: '',
        model: 'claude-haiku-4-5-20251001',
      })
    })

    it('returns no model field for plain ai command', () => {
      const result = classifyInput('a hello world')
      expect(result).toEqual({ type: 'ai', prompt: 'hello world' })
      expect(result).not.toHaveProperty('model')
    })

    it('returns no model field for bare "a"', () => {
      const result = classifyInput('a')
      expect(result).toEqual({ type: 'ai', prompt: '' })
      expect(result).not.toHaveProperty('model')
    })
  })

  describe('custom prefix', () => {
    it('classifies "ai hello" with prefix "ai" as ai command', () => {
      expect(classifyInput('ai hello', 'ai')).toEqual({ type: 'ai', prompt: 'hello' })
    })

    it('classifies bare "ai" with prefix "ai" as ai with empty prompt (chat mode)', () => {
      expect(classifyInput('ai', 'ai')).toEqual({ type: 'ai', prompt: '' })
    })

    it('parses model flag with custom prefix', () => {
      expect(classifyInput('ai --haiku test', 'ai')).toEqual({
        type: 'ai',
        prompt: 'test',
        model: 'claude-haiku-4-5-20251001',
      })
    })

    it('classifies "claude explain" with prefix "claude" as ai command', () => {
      expect(classifyInput('claude explain', 'claude')).toEqual({ type: 'ai', prompt: 'explain' })
    })

    it('does not confuse "apt install" as ai when prefix is "ai"', () => {
      expect(classifyInput('apt install', 'ai')).toEqual({ type: 'passthrough', command: 'apt install' })
    })

    it('defaults to prefix "a" when no second argument given', () => {
      expect(classifyInput('a hello')).toEqual({ type: 'ai', prompt: 'hello' })
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
