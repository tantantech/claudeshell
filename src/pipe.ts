import { createRenderer, renderCostFooter } from './renderer.js'
import { executeAI } from './ai.js'

const MAX_STDIN_BYTES = 1_048_576
const WARN_STDIN_BYTES = 102_400

export async function collectStdin(
  stream: NodeJS.ReadableStream = process.stdin
): Promise<string> {
  const chunks: Buffer[] = []
  let totalBytes = 0

  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)
    totalBytes += buf.length
    if (totalBytes > MAX_STDIN_BYTES) {
      throw new Error(
        `Input exceeds maximum size (${MAX_STDIN_BYTES} bytes). Pipe smaller input or use a file reference.`
      )
    }
    chunks.push(buf)
  }

  const content = Buffer.concat(chunks).toString('utf-8')

  if (content.includes('\0')) {
    throw new Error('Binary input not supported')
  }

  if (totalBytes > WARN_STDIN_BYTES) {
    process.stderr.write(
      `Warning: Large input (${totalBytes} bytes). Processing may be slow.\n`
    )
  }

  return content
}

export async function runPipe(
  cliPrompt: string,
  stream: NodeJS.ReadableStream = process.stdin
): Promise<void> {
  let stdinContent: string
  try {
    stdinContent = await collectStdin(stream)
  } catch (err) {
    process.stderr.write(`ClaudeShell error: ${(err as Error).message}\n`)
    process.exit(1)
    return
  }

  const prompt = cliPrompt.trim().length > 0
    ? `${cliPrompt}\n\n---\n\n${stdinContent}`
    : stdinContent

  if (prompt.trim().length === 0) {
    process.stderr.write('No input provided.\n')
    process.exit(1)
    return
  }

  const renderer = createRenderer({ isTTY: false })
  const abortController = new AbortController()

  const result = await executeAI(prompt, {
    cwd: process.cwd(),
    lastError: undefined,
    abortController,
    callbacks: {
      onText: renderer.onText,
      onToolStart: renderer.onToolStart,
      onToolEnd: renderer.onToolEnd,
      onError: (msg: string) => {
        process.stderr.write(`${msg}\n`)
      },
    },
  })

  renderer.finish()

  if (result.usage) {
    renderCostFooter(result.usage)
  }

  process.exit(0)
}
