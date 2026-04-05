import type { PluginRegistry } from './plugins/registry.js'

export function expandAlias(input: string, registry: PluginRegistry): string {
  const trimmed = input.trim()
  if (!trimmed) return input

  const spaceIndex = trimmed.indexOf(' ')
  const firstWord = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex)
  const rest = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex)

  const expansion = registry.resolve(firstWord)
  if (expansion === undefined) return input

  return expansion + rest
}
