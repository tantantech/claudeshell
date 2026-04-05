/**
 * Ghost text renderer for auto-suggestions.
 *
 * Renders suggestion suffixes as dim ANSI text after the cursor,
 * then moves the cursor back so the user's typing position is unchanged.
 * Never modifies rl.line -- output-only rendering.
 */

import { moveCursor } from 'node:readline'

let ghostLength = 0

/**
 * Render a ghost text suffix (dim) at the current cursor position.
 * Moves cursor back after writing so typing position is unchanged.
 */
export function renderGhost(suffix: string): void {
  if (!suffix || !process.stdout.isTTY) return
  process.stdout.write(`\x1b[2m${suffix}\x1b[0m`)
  moveCursor(process.stdout, -suffix.length, 0)
  ghostLength = suffix.length
}

/**
 * Clear any displayed ghost text. Idempotent -- safe to call when no ghost is active.
 */
export function clearGhost(): void {
  if (ghostLength === 0) return
  process.stdout.write('\x1b[K')
  ghostLength = 0
}

/**
 * Check whether ghost text is currently displayed.
 */
export function hasGhost(): boolean {
  return ghostLength > 0
}
