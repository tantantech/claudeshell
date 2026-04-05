import { spawn } from 'node:child_process'
import type { SpawnOptions } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { Interface as ReadlineInterface } from 'node:readline'
import { CONFIG_DIR, loadConfig, saveConfig } from './config.js'
import { loadExternalPlugin } from './plugins/external.js'
import type { PluginManifest } from './plugins/types.js'

const PLUGINS_DIR = path.join(CONFIG_DIR, 'plugins')

interface SpawnResult {
  readonly code: number
  readonly stderr: string
}

function spawnAsync(
  cmd: string,
  args: readonly string[],
  opts?: SpawnOptions,
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args as string[], opts ?? {})
    let stderr = ''

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      resolve({ code: code ?? 1, stderr })
    })

    child.on('error', () => {
      resolve({ code: 1, stderr: stderr || 'Failed to spawn process' })
    })
  })
}

async function isGitAvailable(): Promise<boolean> {
  const result = await spawnAsync('git', ['--version'])
  return result.code === 0
}

function parseRepoRef(repoRef: string): { url: string; name: string } {
  if (repoRef.startsWith('http://') || repoRef.startsWith('https://') || repoRef.startsWith('git@')) {
    // Full URL: extract name from last path segment
    const name = path.basename(repoRef, '.git')
    return { url: repoRef, name }
  }

  // user/repo format -> GitHub URL
  const parts = repoRef.split('/')
  if (parts.length === 2) {
    const name = parts[1]
    return { url: `https://github.com/${repoRef}.git`, name }
  }

  return { url: repoRef, name: path.basename(repoRef, '.git') }
}

function askConfirmation(
  rl: ReadlineInterface,
  prompt: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

export async function installPlugin(
  repoRef: string,
  rl: ReadlineInterface,
): Promise<PluginManifest | null> {
  // Check git availability
  const gitOk = await isGitAvailable()
  if (!gitOk) {
    process.stderr.write('[nesh] git is not available. Please install git first.\n')
    return null
  }

  const { url, name } = parseRepoRef(repoRef)
  const pluginDir = path.join(PLUGINS_DIR, name)

  // Check if already installed
  if (fs.existsSync(pluginDir)) {
    process.stderr.write(`[nesh] plugin "${name}" is already installed at ${pluginDir}\n`)
    return null
  }

  // Security warning
  process.stderr.write(
    `\n[nesh] Installing external plugin from ${url}\n` +
    '[nesh] External plugins run with full system access.\n',
  )

  const confirmed = await askConfirmation(rl, 'Continue? (y/N): ')
  if (!confirmed) {
    process.stderr.write('[nesh] Installation cancelled.\n')
    return null
  }

  // Ensure plugins directory exists
  fs.mkdirSync(PLUGINS_DIR, { recursive: true })

  // Clone the repository
  const cloneResult = await spawnAsync('git', [
    'clone',
    '--depth',
    '1',
    url,
    pluginDir,
  ])

  if (cloneResult.code !== 0) {
    process.stderr.write(`[nesh] git clone failed: ${cloneResult.stderr}\n`)
    fs.rmSync(pluginDir, { recursive: true, force: true })
    return null
  }

  // Validate manifest
  const manifest = await loadExternalPlugin(pluginDir)
  if (!manifest) {
    process.stderr.write(`[nesh] plugin "${name}" has no valid manifest. Removing.\n`)
    fs.rmSync(pluginDir, { recursive: true, force: true })
    return null
  }

  process.stderr.write(
    `[nesh] Installed "${manifest.name}" v${manifest.version}: ${manifest.description}\n`,
  )

  return manifest
}

export async function updatePlugin(name: string): Promise<string | null> {
  const pluginDir = path.join(PLUGINS_DIR, name)

  if (!fs.existsSync(pluginDir)) {
    return `Plugin "${name}" is not installed.`
  }

  const result = await spawnAsync('git', ['-C', pluginDir, 'pull', '--ff-only'])

  if (result.code !== 0) {
    return `Failed to update "${name}": ${result.stderr}`
  }

  return null
}

export async function removePlugin(name: string): Promise<void> {
  const pluginDir = path.join(PLUGINS_DIR, name)

  // Remove directory
  fs.rmSync(pluginDir, { recursive: true, force: true })

  // Update config: remove from enabled list
  const config = loadConfig()
  const enabled = config.plugins?.enabled ?? []
  const newEnabled = (enabled as string[]).filter((p) => p !== name)

  saveConfig({
    ...config,
    plugins: {
      ...config.plugins,
      enabled: newEnabled,
    },
  })
}
