import pc from 'picocolors'
import { Marked } from 'marked'
import { markedTerminal } from 'marked-terminal'
import { formatUsage, formatSessionCost } from './cost.js'
import type { UsageInfo, CostAccumulator } from './types.js'

export function renderCostFooter(usage: UsageInfo, accumulator?: CostAccumulator): void {
  let line = pc.dim(formatUsage(usage))
  if (accumulator && accumulator.messageCount > 0) {
    line += pc.dim(` | ${formatSessionCost(accumulator)}`)
  }
  process.stderr.write(`${line}\n`)
}

export interface Renderer {
  readonly onText: (text: string) => void
  readonly onToolStart: (toolName: string) => void
  readonly onToolEnd: (toolName: string, result?: string) => void
  readonly finish: () => void
}

export function createRenderer(options: { readonly isTTY: boolean }): Renderer {
  const { isTTY } = options
  let buffer = ''

  const onText = (text: string): void => {
    if (isTTY) {
      buffer += text
    } else {
      process.stdout.write(text)
    }
  }

  const onToolStart = (toolName: string): void => {
    if (!isTTY) return
    process.stderr.write(pc.dim(`\n  -> Using ${toolName}...`))
  }

  const onToolEnd = (toolName: string, result?: string): void => {
    if (!isTTY) return
    process.stderr.write(pc.dim(' done\n'))
    if (result) {
      process.stderr.write(pc.dim(`     ${result}\n`))
    }
  }

  const finish = (): void => {
    if (isTTY && buffer.length > 0) {
      const marked = new Marked()
      marked.use(markedTerminal())
      const rendered = marked.parse(buffer) as string
      process.stdout.write(rendered)
      buffer = ''
    } else {
      process.stdout.write('\n')
    }
  }

  return { onText, onToolStart, onToolEnd, finish }
}
