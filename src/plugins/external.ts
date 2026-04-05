import { pathToFileURL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { CONFIG_DIR } from '../config.js'
import type { PluginManifest } from './types.js'

const PLUGINS_DIR = path.join(CONFIG_DIR, 'plugins')

function isValidManifest(v: unknown): v is PluginManifest {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  return (
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    typeof obj.description === 'string'
  )
}

export async function loadExternalPlugin(
  pluginDir: string,
): Promise<PluginManifest | null> {
  const candidates = ['index.js', 'manifest.js']

  for (const file of candidates) {
    const fullPath = path.join(pluginDir, file)
    try {
      if (!fs.existsSync(fullPath)) continue

      const url = pathToFileURL(fullPath).href + '?t=' + Date.now()
      const mod = (await import(url)) as Record<string, unknown>
      const manifest = mod.default ?? mod.plugin ?? mod

      if (isValidManifest(manifest)) {
        return manifest
      }
    } catch {
      // Error boundary: skip broken plugins silently
    }
  }

  return null
}

export async function discoverExternalPlugins(): Promise<
  readonly PluginManifest[]
> {
  try {
    if (!fs.existsSync(PLUGINS_DIR)) return []

    const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    const dirs = entries.filter((e) => e.isDirectory())

    const results = await Promise.all(
      dirs.map((d) => loadExternalPlugin(path.join(PLUGINS_DIR, d.name))),
    )

    return results.filter((m): m is PluginManifest => m !== null)
  } catch {
    return []
  }
}
