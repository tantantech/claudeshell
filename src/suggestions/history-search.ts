/**
 * History-based auto-suggestion with sensitive pattern filtering.
 *
 * Searches command history for the most recent prefix match,
 * skipping entries that match sensitive data patterns.
 */

export const DEFAULT_SENSITIVE_PATTERNS: readonly RegExp[] = [
  /(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL)\s*[=:]\s*\S+/i,
  /\b(sk-|ghp_|gho_|github_pat_|xoxb-|xapp-|ya29\.|AIza)\S+/,
  /--password[= ]\S+/,
  /-p\s+\S{4,}/,
  /Bearer\s+\S{10,}/i,
]

/**
 * Merge default sensitive patterns with user-provided regex strings.
 * Invalid custom patterns are silently skipped (warning to stderr).
 */
export function buildSensitiveFilters(
  customPatterns: readonly string[]
): readonly RegExp[] {
  const custom: RegExp[] = []
  for (const pattern of customPatterns) {
    try {
      custom.push(new RegExp(pattern))
    } catch {
      process.stderr.write(
        `Warning: invalid sensitive pattern "${pattern}", skipping\n`
      )
    }
  }
  return [...DEFAULT_SENSITIVE_PATTERNS, ...custom]
}

/**
 * Find the most recent history entry matching the given prefix.
 *
 * - Returns null if prefix is empty
 * - Skips exact matches (no point suggesting what's already typed)
 * - Skips entries matching any sensitive filter
 * - History is expected newest-first; returns first match (early exit)
 */
export function findSuggestion(
  prefix: string,
  history: readonly string[],
  filters: readonly RegExp[]
): string | null {
  if (prefix.length === 0) return null

  for (const entry of history) {
    if (entry === prefix) continue
    if (!entry.startsWith(prefix)) continue
    if (filters.some((re) => re.test(entry))) continue
    return entry
  }

  return null
}
