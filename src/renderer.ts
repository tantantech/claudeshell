import pc from 'picocolors'

export interface Renderer {
  readonly onText: (text: string) => void
  readonly onToolStart: (toolName: string) => void
  readonly onToolEnd: (toolName: string, result?: string) => void
  readonly finish: () => void
}

export function createRenderer(options: { readonly isTTY: boolean }): Renderer {
  const { isTTY } = options

  const onText = (text: string): void => {
    process.stdout.write(text)
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
    process.stdout.write('\n')
  }

  return { onText, onToolStart, onToolEnd, finish }
}
