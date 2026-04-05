import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { CompletionGenerator, CompletionSpec } from '../../completions/types.js'
import type { PluginManifest } from '../types.js'

export const sshHostGenerator: CompletionGenerator = async () => {
  const hosts = new Set<string>()
  try {
    const knownHostsPath = join(homedir(), '.ssh', 'known_hosts')
    const raw = await readFile(knownHostsPath, 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.length === 0 || trimmed.startsWith('#') || trimmed.startsWith('|')) continue
      const hostPart = trimmed.split(/\s/)[0] ?? ''
      for (const h of hostPart.split(',')) {
        const clean = h.replace(/^\[/, '').replace(/\]:\d+$/, '').trim()
        if (clean.length > 0) hosts.add(clean)
      }
    }
  } catch {
    // known_hosts may not exist
  }
  try {
    const configPath = join(homedir(), '.ssh', 'config')
    const raw = await readFile(configPath, 'utf-8')
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*Host\s+(.+)/i)
      if (match) {
        for (const h of match[1].split(/\s+/)) {
          if (!h.includes('*') && !h.includes('?') && h.length > 0) {
            hosts.add(h)
          }
        }
      }
    }
  } catch {
    // config may not exist
  }
  return [...hosts]
}

const hostArg = { name: 'host', generators: [sshHostGenerator] } as const

const sshSpec: CompletionSpec = {
  name: 'ssh',
  args: [hostArg],
  options: [
    { name: '-p', description: 'Port', args: [{ name: 'port' }] },
    { name: '-i', description: 'Identity file', args: [{ name: 'file', template: 'filepaths' }] },
    { name: '-L', description: 'Local port forward', args: [{ name: 'forward' }] },
    { name: '-R', description: 'Remote port forward', args: [{ name: 'forward' }] },
    { name: '-D', description: 'Dynamic port forward', args: [{ name: 'port' }] },
    { name: '-A', description: 'Enable agent forwarding' },
    { name: '-v', description: 'Verbose mode' },
    { name: '-N', description: 'No remote command' },
    { name: '-T', description: 'Disable PTY' },
  ],
}

const systemctlSpec: CompletionSpec = {
  name: 'systemctl',
  subcommands: {
    start: { name: 'start', args: [{ name: 'unit' }] },
    stop: { name: 'stop', args: [{ name: 'unit' }] },
    restart: { name: 'restart', args: [{ name: 'unit' }] },
    status: { name: 'status', args: [{ name: 'unit' }] },
    enable: { name: 'enable', args: [{ name: 'unit' }] },
    disable: { name: 'disable', args: [{ name: 'unit' }] },
    reload: { name: 'reload', args: [{ name: 'unit' }] },
    'daemon-reload': { name: 'daemon-reload' },
    'list-units': { name: 'list-units' },
    'list-unit-files': { name: 'list-unit-files' },
    'is-active': { name: 'is-active', args: [{ name: 'unit' }] },
    'is-enabled': { name: 'is-enabled', args: [{ name: 'unit' }] },
  },
}

const brewSpec: CompletionSpec = {
  name: 'brew',
  subcommands: {
    install: { name: 'install', args: [{ name: 'formula' }] },
    uninstall: { name: 'uninstall', args: [{ name: 'formula' }] },
    update: { name: 'update' },
    upgrade: { name: 'upgrade', args: [{ name: 'formula' }] },
    search: { name: 'search', args: [{ name: 'text' }] },
    list: { name: 'list' },
    info: { name: 'info', args: [{ name: 'formula' }] },
    doctor: { name: 'doctor' },
    cleanup: { name: 'cleanup', options: [{ name: '-n', description: 'Dry run' }] },
    services: {
      name: 'services',
      subcommands: {
        start: { name: 'start', args: [{ name: 'formula' }] },
        stop: { name: 'stop', args: [{ name: 'formula' }] },
        restart: { name: 'restart', args: [{ name: 'formula' }] },
        list: { name: 'list' },
      },
    },
    tap: { name: 'tap', args: [{ name: 'tap' }] },
    untap: { name: 'untap', args: [{ name: 'tap' }] },
  },
}

const aptSpec: CompletionSpec = {
  name: 'apt',
  subcommands: {
    install: { name: 'install', args: [{ name: 'package' }] },
    remove: { name: 'remove', args: [{ name: 'package' }] },
    update: { name: 'update' },
    upgrade: { name: 'upgrade' },
    search: { name: 'search', args: [{ name: 'pattern' }] },
    autoremove: { name: 'autoremove' },
    purge: { name: 'purge', args: [{ name: 'package' }] },
    show: { name: 'show', args: [{ name: 'package' }] },
    list: {
      name: 'list',
      options: [
        { name: '--installed', description: 'Show installed' },
        { name: '--upgradable', description: 'Show upgradable' },
      ],
    },
  },
}

const terraformSpec: CompletionSpec = {
  name: 'terraform',
  subcommands: {
    init: {
      name: 'init',
      options: [
        { name: '-upgrade', description: 'Upgrade providers' },
        { name: '-backend=false', description: 'Skip backend init' },
      ],
    },
    plan: {
      name: 'plan',
      options: [
        { name: '-out', description: 'Save plan', args: [{ name: 'file' }] },
        { name: '-var', description: 'Set variable', args: [{ name: 'var=value' }] },
        { name: '-var-file', description: 'Variable file', args: [{ name: 'file', template: 'filepaths' }] },
      ],
    },
    apply: {
      name: 'apply',
      options: [
        { name: '-auto-approve', description: 'Skip approval' },
        { name: '-var', description: 'Set variable', args: [{ name: 'var=value' }] },
        { name: '-var-file', description: 'Variable file', args: [{ name: 'file', template: 'filepaths' }] },
      ],
    },
    destroy: {
      name: 'destroy',
      options: [
        { name: '-auto-approve', description: 'Skip approval' },
      ],
    },
    validate: { name: 'validate' },
    fmt: {
      name: 'fmt',
      options: [
        { name: '-check', description: 'Check only' },
        { name: '-diff', description: 'Show diff' },
      ],
    },
    state: {
      name: 'state',
      subcommands: {
        list: { name: 'list' },
        show: { name: 'show', args: [{ name: 'address' }] },
        rm: { name: 'rm', args: [{ name: 'address' }] },
        mv: { name: 'mv', args: [{ name: 'source' }] },
        pull: { name: 'pull' },
        push: { name: 'push' },
      },
    },
    output: { name: 'output' },
    import: { name: 'import' },
    workspace: {
      name: 'workspace',
      subcommands: {
        list: { name: 'list' },
        select: { name: 'select', args: [{ name: 'name' }] },
        new: { name: 'new', args: [{ name: 'name' }] },
        delete: { name: 'delete', args: [{ name: 'name' }] },
      },
    },
  },
}

const helmSpec: CompletionSpec = {
  name: 'helm',
  subcommands: {
    install: {
      name: 'install',
      args: [{ name: 'release' }],
      options: [
        { name: '-f', description: 'Values file', args: [{ name: 'file', template: 'filepaths' }] },
        { name: '--set', description: 'Set value', args: [{ name: 'key=value' }] },
        { name: ['-n', '--namespace'], description: 'Namespace', args: [{ name: 'namespace' }] },
        { name: '--create-namespace', description: 'Create namespace' },
      ],
    },
    upgrade: {
      name: 'upgrade',
      args: [{ name: 'release' }],
      options: [
        { name: '-f', description: 'Values file', args: [{ name: 'file', template: 'filepaths' }] },
        { name: '--set', description: 'Set value', args: [{ name: 'key=value' }] },
        { name: '--install', description: 'Install if not present' },
        { name: ['-n', '--namespace'], description: 'Namespace', args: [{ name: 'namespace' }] },
      ],
    },
    uninstall: {
      name: 'uninstall',
      args: [{ name: 'release' }],
      options: [
        { name: ['-n', '--namespace'], description: 'Namespace', args: [{ name: 'namespace' }] },
      ],
    },
    list: {
      name: 'list',
      options: [
        { name: ['-A', '--all-namespaces'], description: 'All namespaces' },
        { name: ['-n', '--namespace'], description: 'Namespace', args: [{ name: 'namespace' }] },
      ],
    },
    repo: {
      name: 'repo',
      subcommands: {
        add: { name: 'add', args: [{ name: 'name' }] },
        remove: { name: 'remove', args: [{ name: 'name' }] },
        update: { name: 'update' },
        list: { name: 'list' },
      },
    },
    search: {
      name: 'search',
      subcommands: {
        repo: { name: 'repo', args: [{ name: 'keyword' }] },
        hub: { name: 'hub', args: [{ name: 'keyword' }] },
      },
    },
    status: {
      name: 'status',
      args: [{ name: 'release' }],
      options: [
        { name: ['-n', '--namespace'], description: 'Namespace', args: [{ name: 'namespace' }] },
      ],
    },
    template: {
      name: 'template',
      args: [{ name: 'release' }],
      options: [
        { name: '-f', description: 'Values file', args: [{ name: 'file', template: 'filepaths' }] },
      ],
    },
  },
}

export const plugin: PluginManifest = {
  name: 'sysadmin-completions',
  version: '1.0.0',
  description: 'SSH/systemctl/brew/apt/terraform/helm Tab completions',
  completionSpecs: [sshSpec, systemctlSpec, brewSpec, aptSpec, terraformSpec, helmSpec],
}
