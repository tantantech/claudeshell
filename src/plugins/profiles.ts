export interface ProfileDefinition {
  readonly name: string
  readonly description: string
  readonly extends?: string
  readonly plugins: readonly string[]
}

const PROFILE_MAP: Readonly<Record<string, ProfileDefinition>> = {
  core: {
    name: 'core',
    description: 'Essential git aliases and shortcuts',
    plugins: ['git'],
  },
  developer: {
    name: 'developer',
    description: 'Full development environment with completions and utilities',
    extends: 'core',
    plugins: [
      'npm-completions',
      'docker-completions',
      'git-completions',
      'extract',
      'copypath',
      'jsontools',
    ],
  },
  devops: {
    name: 'devops',
    description: 'Infrastructure and cloud operations tooling',
    extends: 'developer',
    plugins: [
      'kubectl-completions',
      'cloud-completions',
      'sysadmin-completions',
    ],
  },
  cloud: {
    name: 'cloud',
    description: 'Cloud platform development and deployment',
    extends: 'developer',
    plugins: ['cloud-completions'],
  },
  'ai-engineer': {
    name: 'ai-engineer',
    description: 'AI/ML development with encoding and data utilities',
    extends: 'developer',
    plugins: ['encode64'],
  },
}

export const PROFILES: readonly ProfileDefinition[] = Object.values(PROFILE_MAP)

export function expandProfile(name: string): readonly string[] {
  const profile = PROFILE_MAP[name]
  if (!profile) return []

  const seen = new Set<string>()
  const result: string[] = []

  const collect = (profileName: string): void => {
    const p = PROFILE_MAP[profileName]
    if (!p) return

    // Resolve parent first (depth-first)
    if (p.extends) {
      collect(p.extends)
    }

    for (const plugin of p.plugins) {
      if (!seen.has(plugin)) {
        seen.add(plugin)
        result.push(plugin)
      }
    }
  }

  collect(name)
  return result
}
