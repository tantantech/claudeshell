import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function resolveApiKey(): string | undefined {
  const envKey = process.env.ANTHROPIC_API_KEY
  if (envKey) return envKey

  try {
    const configPath = path.join(os.homedir(), '.claudeshell', 'config')
    const raw = fs.readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(raw) as { api_key?: string }
    return parsed.api_key ?? undefined
  } catch {
    return undefined
  }
}
