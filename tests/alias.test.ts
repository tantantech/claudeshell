import { describe, it, expect } from 'vitest'
import { expandAlias } from '../src/alias.js'
import { buildRegistry, createEmptyRegistry } from '../src/plugins/registry.js'
import type { PluginManifest, PluginConfig } from '../src/plugins/types.js'

function makeRegistry(aliases: Record<string, string>) {
  const plugin: PluginManifest = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'test',
    aliases,
  }
  const config: PluginConfig = {}
  return buildRegistry([plugin], config)
}

describe('expandAlias', () => {
  it('expands alias to full command', () => {
    const registry = makeRegistry({ gst: 'git status' })
    expect(expandAlias('gst', registry)).toBe('git status')
  })

  it('expands first word only, preserves rest', () => {
    const registry = makeRegistry({ gst: 'git status' })
    expect(expandAlias('gst --short', registry)).toBe('git status --short')
  })

  it('returns input unchanged when no alias match', () => {
    const registry = makeRegistry({ gst: 'git status' })
    expect(expandAlias('echo hello', registry)).toBe('echo hello')
  })

  it('returns empty string for empty input', () => {
    const registry = makeRegistry({ gst: 'git status' })
    expect(expandAlias('', registry)).toBe('')
  })

  it('trims whitespace before lookup', () => {
    const registry = makeRegistry({ gst: 'git status' })
    expect(expandAlias('  gst  ', registry)).toBe('git status')
  })

  it('does not re-expand the result (expand-once rule)', () => {
    // 'g' expands to 'git', and 'git' also has an alias to 'git --verbose'
    // expand-once means 'g' -> 'git' and stops, does NOT become 'git --verbose'
    const registry = makeRegistry({ g: 'git', git: 'git --verbose' })
    expect(expandAlias('g', registry)).toBe('git')
  })

  it('returns original input with empty registry', () => {
    const registry = createEmptyRegistry()
    expect(expandAlias('gst', registry)).toBe('gst')
  })
})
