import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

export const HISTORY_PATH = path.join(os.homedir(), '.claudeshell_history')
export const MAX_HISTORY = 10_000

export function loadHistory(filePath: string = HISTORY_PATH): readonly string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return content.split('\n').filter(Boolean).slice(-MAX_HISTORY)
  } catch {
    return []
  }
}

export function saveHistory(
  history: readonly string[],
  filePath: string = HISTORY_PATH
): void {
  try {
    const dir = path.dirname(filePath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filePath, history.join('\n') + '\n', 'utf-8')
  } catch (err) {
    process.stderr.write(
      `Warning: could not save history: ${(err as Error).message}\n`
    )
  }
}

export function shouldSaveToHistory(
  line: string,
  previousLine: string | undefined
): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (line.startsWith(' ')) return false
  if (trimmed === previousLine?.trim()) return false
  return true
}
