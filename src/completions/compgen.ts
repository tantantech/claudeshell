import { execFile } from 'node:child_process'

const UNSAFE_CHARS = /[;&|`$(){}'"\\<>!#~]/

const COMPGEN_FLAGS: Readonly<Record<string, string>> = {
  command: '-c',
  file: '-f',
}

export async function compgenComplete(
  type: 'command' | 'file',
  currentWord: string,
): Promise<readonly string[]> {
  if (UNSAFE_CHARS.test(currentWord)) {
    return []
  }

  const flag = COMPGEN_FLAGS[type]

  return new Promise((resolve) => {
    execFile(
      'bash',
      ['-c', `compgen ${flag} -- "${currentWord}"`],
      { timeout: 500 },
      (err, stdout) => {
        if (err) {
          resolve([])
          return
        }
        const lines = stdout
          .split('\n')
          .filter((line) => line.length > 0)
        resolve(lines)
      },
    )
  })
}
