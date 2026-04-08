import pc from 'picocolors'
import type { Interface as ReadlineInterface } from 'node:readline/promises'

export type MenuChoice =
  | { readonly type: 'quit' }
  | { readonly type: 'selection'; readonly index: number }
  | { readonly type: 'invalid' }

export function parseMenuChoice(input: string, maxOption: number): MenuChoice {
  const trimmed = input.trim().toLowerCase()
  if (trimmed === 'q') return { type: 'quit' }
  const num = parseInt(trimmed, 10)
  if (isNaN(num) || num < 1 || num > maxOption) return { type: 'invalid' }
  return { type: 'selection', index: num }
}

export interface MenuItem {
  readonly label: string
  readonly description?: string
}

export function renderMenu(title: string, items: readonly MenuItem[]): void {
  process.stdout.write(`\n${pc.bold(title)}\n\n`)
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const desc = item.description ? pc.dim(` — ${item.description}`) : ''
    process.stdout.write(`  [${i + 1}] ${item.label}${desc}\n`)
  }
  process.stdout.write('\n')
}

export async function promptMenu(
  rl: ReadlineInterface,
  title: string,
  items: readonly MenuItem[],
): Promise<MenuChoice> {
  renderMenu(title, items)
  const answer = await rl.question(`Select (1-${items.length}) or q: `)
  return parseMenuChoice(answer, items.length)
}
