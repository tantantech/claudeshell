import type { PluginManifest } from '../types.js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

function parseDotenv(content: string): Readonly<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const raw = trimmed.slice(eqIndex + 1).trim()
    const value = raw.replace(/^["']|["']$/g, '')
    result[key] = value
  }
  return result
}

export const plugin: PluginManifest = {
  name: 'dotenv',
  version: '1.0.0',
  description: 'Auto-source .env files on cd',
  hooks: {
    onCd(context) {
      try {
        const envPath = join(context.cwd, '.env')
        if (!existsSync(envPath)) return
        const content = readFileSync(envPath, 'utf-8')
        const vars = parseDotenv(content)
        for (const [key, value] of Object.entries(vars)) {
          process.env[key] = value
        }
      } catch {
        // .env read failed — skip silently
      }
    },
  },
}
