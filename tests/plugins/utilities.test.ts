import { describe, expect, it } from 'vitest'
import { plugin as extractPlugin, EXTRACTORS } from '../../src/plugins/utilities/extract.js'
import { plugin as sudoPlugin } from '../../src/plugins/utilities/sudo.js'
import { plugin as copypathPlugin } from '../../src/plugins/utilities/copypath.js'
import { plugin as encode64Plugin } from '../../src/plugins/utilities/encode64.js'
import { plugin as urltoolsPlugin } from '../../src/plugins/utilities/urltools.js'
import { plugin as jsontoolsPlugin } from '../../src/plugins/utilities/jsontools.js'
import { plugin as webSearchPlugin } from '../../src/plugins/utilities/web-search.js'
import { plugin as dirhistoryPlugin } from '../../src/plugins/utilities/dirhistory.js'
import { BUNDLED_PLUGINS } from '../../src/plugins/index.js'

const allUtilityPlugins = [
  extractPlugin,
  sudoPlugin,
  copypathPlugin,
  encode64Plugin,
  urltoolsPlugin,
  jsontoolsPlugin,
  webSearchPlugin,
  dirhistoryPlugin,
]

describe('utility plugins', () => {
  it.each(allUtilityPlugins)('$name has valid name and version', (plugin) => {
    expect(plugin.name).toBeTruthy()
    expect(plugin.version).toBe('1.0.0')
    expect(plugin.description).toBeTruthy()
  })

  it('extract plugin has EXTRACTORS covering common formats', () => {
    expect(EXTRACTORS['.tar.gz']).toEqual(['tar', 'xzf'])
    expect(EXTRACTORS['.zip']).toEqual(['unzip'])
    expect(EXTRACTORS['.gz']).toEqual(['gunzip'])
    expect(EXTRACTORS['.tar.bz2']).toEqual(['tar', 'xjf'])
    expect(EXTRACTORS['.7z']).toEqual(['7z', 'x'])
    expect(EXTRACTORS['.rar']).toEqual(['unrar', 'x'])
  })

  it('extract plugin has x alias', () => {
    expect(extractPlugin.aliases).toBeDefined()
    expect(extractPlugin.aliases!['x']).toBe('extract')
  })

  it('copypath aliases use platform-specific clipboard command', () => {
    expect(copypathPlugin.aliases).toBeDefined()
    const cmd = copypathPlugin.aliases!['copypath']
    expect(cmd).toBeTruthy()
    // Should contain either pbcopy (macOS) or xclip (Linux)
    expect(cmd.includes('pbcopy') || cmd.includes('xclip')).toBe(true)
  })

  it('web-search aliases contain URL patterns', () => {
    expect(webSearchPlugin.aliases).toBeDefined()
    const aliases = webSearchPlugin.aliases!
    expect(aliases['google']).toContain('google.com/search')
    expect(aliases['github']).toContain('github.com/search')
    expect(aliases['stackoverflow']).toContain('stackoverflow.com/search')
  })

  it('encode64 has e64 and d64 aliases', () => {
    expect(encode64Plugin.aliases).toBeDefined()
    expect(encode64Plugin.aliases!['e64']).toBe('base64')
    expect(encode64Plugin.aliases!['d64']).toBe('base64 --decode')
  })

  it('urltools has urlencode and urldecode aliases', () => {
    expect(urltoolsPlugin.aliases).toBeDefined()
    expect(urltoolsPlugin.aliases!['urlencode']).toContain('urllib.parse.quote')
    expect(urltoolsPlugin.aliases!['urldecode']).toContain('urllib.parse.unquote')
  })

  it('jsontools has pp_json and is_json aliases', () => {
    expect(jsontoolsPlugin.aliases).toBeDefined()
    expect(jsontoolsPlugin.aliases!['pp_json']).toContain('json.tool')
    expect(jsontoolsPlugin.aliases!['is_json']).toContain('json.load')
  })

  it('dirhistory has d alias', () => {
    expect(dirhistoryPlugin.aliases).toBeDefined()
    expect(dirhistoryPlugin.aliases!['d']).toBe('dirs -v')
  })

  it('sudo has please alias', () => {
    expect(sudoPlugin.aliases).toBeDefined()
    expect(sudoPlugin.aliases!['please']).toBe('sudo')
  })
})

describe('BUNDLED_PLUGINS', () => {
  it('has 16 plugins total', () => {
    expect(BUNDLED_PLUGINS.length).toBe(16)
  })

  it('includes all utility plugins', () => {
    const names = BUNDLED_PLUGINS.map((p) => p.name)
    expect(names).toContain('extract')
    expect(names).toContain('sudo')
    expect(names).toContain('copypath')
    expect(names).toContain('encode64')
    expect(names).toContain('urltools')
    expect(names).toContain('jsontools')
    expect(names).toContain('web-search')
    expect(names).toContain('dirhistory')
  })

  it('includes all completion plugins', () => {
    const names = BUNDLED_PLUGINS.map((p) => p.name)
    expect(names).toContain('git-completions')
    expect(names).toContain('docker-completions')
    expect(names).toContain('npm-completions')
    expect(names).toContain('kubectl-completions')
    expect(names).toContain('cloud-completions')
    expect(names).toContain('devtools-completions')
    expect(names).toContain('sysadmin-completions')
  })

  it('includes git alias plugin', () => {
    const names = BUNDLED_PLUGINS.map((p) => p.name)
    expect(names).toContain('git')
  })
})
