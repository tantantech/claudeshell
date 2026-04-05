import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import pc from 'picocolors'
import { PLUGIN_CATALOG } from '../plugins/catalog.js'

export interface MigrationStatus {
  readonly omzName: string
  readonly neshEquivalent: string | null
  readonly status: 'available' | 'partial' | 'missing'
}

export function detectOMZ(): boolean {
  const omzDir = path.join(os.homedir(), '.oh-my-zsh')
  if (!fs.existsSync(omzDir)) return false

  // Also verify .zshrc has plugins= line (pitfall 7)
  try {
    const zshrc = fs.readFileSync(path.join(os.homedir(), '.zshrc'), 'utf-8')
    return /^plugins=\(/m.test(zshrc)
  } catch {
    return false
  }
}

export function parseZshrcPlugins(content: string): readonly string[] {
  const match = content.match(/^plugins=\(\s*([\s\S]*?)\s*\)/m)
  if (!match || !match[1]) return []

  const inner = match[1]
  return inner
    .split('\n')
    .flatMap(line => {
      // Strip inline comments
      const stripped = line.replace(/#.*$/, '')
      return stripped.trim().split(/\s+/)
    })
    .filter(token => token.length > 0)
}

export function parseZshrcFile(): readonly string[] {
  try {
    const content = fs.readFileSync(path.join(os.homedir(), '.zshrc'), 'utf-8')
    return parseZshrcPlugins(content)
  } catch {
    return []
  }
}

export function generateMigrationReport(
  omzPlugins: readonly string[],
): readonly MigrationStatus[] {
  return omzPlugins.map(omzName => {
    const entry = PLUGIN_CATALOG.find(e => e.omzName === omzName)

    if (!entry || entry.status === 'no-equivalent') {
      return { omzName, neshEquivalent: null, status: 'missing' as const }
    }

    return {
      omzName,
      neshEquivalent: entry.name,
      status: entry.status === 'full' ? 'available' as const : 'partial' as const,
    }
  })
}

export function formatMigrationReport(report: readonly MigrationStatus[]): string {
  if (report.length === 0) return 'No OMZ plugins found to migrate.'

  const available = report.filter(r => r.status === 'available')
  const partial = report.filter(r => r.status === 'partial')
  const missing = report.filter(r => r.status === 'missing')

  const lines: string[] = [
    pc.bold('OMZ Migration Report'),
    '',
  ]

  if (available.length > 0) {
    lines.push(pc.green(`  ${available.length} available:`))
    for (const r of available) {
      lines.push(pc.green(`    ${r.omzName} -> ${r.neshEquivalent}`))
    }
  }

  if (partial.length > 0) {
    lines.push(pc.yellow(`  ${partial.length} partial:`))
    for (const r of partial) {
      lines.push(pc.yellow(`    ${r.omzName} -> ${r.neshEquivalent} (partial support)`))
    }
  }

  if (missing.length > 0) {
    lines.push(pc.red(`  ${missing.length} missing:`))
    for (const r of missing) {
      lines.push(pc.red(`    ${r.omzName} (no Nesh equivalent)`))
    }
  }

  lines.push('')
  lines.push(`Total: ${report.length} plugins | ${available.length} available | ${partial.length} partial | ${missing.length} missing`)

  return lines.join('\n')
}
