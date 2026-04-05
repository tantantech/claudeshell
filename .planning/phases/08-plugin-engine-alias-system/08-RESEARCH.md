# Phase 8: Plugin Engine & Alias System - Research

**Researched:** 2026-04-05
**Domain:** TypeScript plugin framework with alias expansion for AI-native terminal shell
**Confidence:** HIGH

## Summary

Phase 8 builds the core plugin infrastructure for Nesh: a plugin loader with two-phase startup, an immutable alias registry with O(1) lookups, a hook dispatch system, error boundaries around all plugin lifecycle calls, and safe mode for recovery. The git plugin (200+ aliases from oh-my-zsh) serves as the proof-of-concept.

The existing codebase is clean and well-structured for this integration. The REPL loop in `shell.ts` has clear insertion points: alias expansion before `classifyInput()`, plugin init after config load, hook dispatch around command execution. The immutable `ShellState` pattern, lazy SDK loading pattern in `ai.ts`, and config validation pattern in `config.ts` all serve as templates for the new plugin modules.

**Primary recommendation:** Build bottom-up: types first, then registry (Map-based alias store), then alias expansion module, then plugin loader with error boundaries, then hooks, then wire into shell.ts. The git plugin is a pure data object -- no init/destroy needed -- making it the ideal first test case.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 through D-05:** Plugins export TypeScript objects conforming to `PluginManifest` interface. Required: name, version, description, aliases. Optional: dependencies, platform, permissions, hooks, init, destroy. Alias-only plugins need no init/destroy.
- **D-06 through D-09:** Bundled plugins in `src/plugins/`, one file per simple plugin, directory per complex. Plugin index re-exports all as array. External plugins go in `~/.nesh/plugins/` (Phase 11, but convention set now).
- **D-10 through D-15:** Alias expansion runs BEFORE `classifyInput()`. New `src/alias.ts` module. Expand-once rule. User aliases override plugin aliases. Last-loaded plugin wins with collision warning. Only first word expanded.
- **D-16 through D-20:** New `src/plugin-loader.ts` and `src/plugin-registry.ts`. Two-phase loading: sync alias data <50ms, async init deferred. Registry is immutable. Topological sort with cycle detection.
- **D-21 through D-23:** Every init/destroy/hook wrapped in try/catch. Crashing plugin logged as warning and marked failed. Failed plugins tracked in registry.
- **D-24 through D-27:** Hook types: preCommand, postCommand, prePrompt, onCd. Async dispatch via Promise.allSettled. Fire-and-forget for prePrompt; await for preCommand/postCommand. Read-only context object.
- **D-28 through D-29:** `nesh --safe` starts with zero plugins. CLI flag check in cli.ts skips loader.
- **D-30 through D-34:** Config schema: `plugins.enabled` array, `plugins.aliases` user overrides, per-plugin `disabled_aliases` array.
- **D-35 through D-36:** New `aliases` builtin command listing all aliases grouped by source plugin.

### Claude's Discretion
- Exact typing for PluginManifest and AliasRegistry interfaces (guided by decisions above)
- How to structure the hook context object fields beyond the basics listed
- Whether to show a startup summary of loaded plugins
- Internal naming of types and helper functions

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLUG-01 | Two-phase loading: sync alias <50ms, async init deferred | Architecture pattern documented; `setImmediate` for Phase 2 deferral after first prompt |
| PLUG-02 | Registry O(1) lookup for aliases, completions, hooks, commands | Map-based registry design; completions/commands are future fields, structure them now |
| PLUG-03 | Error boundaries on init/destroy -- crashing plugin never crashes shell | sandboxCall pattern with try/catch; mark failed plugins in registry |
| PLUG-04 | Plugin manifest declares metadata | PluginManifest interface with required + optional fields per D-01 through D-05 |
| PLUG-05 | Dependency resolution with topological sort and cycle detection | Kahn's algorithm for topological sort; cycle detection via in-degree tracking |
| PLUG-06 | 30+ plugins startup under 300ms | Two-phase loading; alias-only plugins are pure data objects (no I/O) |
| PLUG-07 | Safe mode `nesh --safe` with zero plugins | CLI flag in cli.ts passed to runShell; skip plugin loader entirely |
| PLUG-08 | Hook system: preCommand, postCommand, prePrompt, onCd | HookBus pattern with Promise.allSettled dispatch; error boundaries per hook |
| ALIAS-01 | Plugins register aliases expanding before passthrough | alias.ts module; expansion step before classifyInput in shell.ts REPL loop |
| ALIAS-02 | Expand-once rule with depth limit | Single Map lookup on first word; no recursive expansion; depth=1 by design |
| ALIAS-03 | User aliases always override plugin aliases | Lookup order: user aliases Map checked first, then plugin aliases Map |
| ALIAS-04 | Collision detection warns on duplicate aliases across plugins | During registration, check existing entries; emit stderr warning with both plugin names |
| ALIAS-05 | Per-plugin alias disable in config | Config `plugins.<name>.disabled_aliases` array; filter during registration |
| ALIAS-06 | `nesh aliases` command lists all with source | New builtin; iterate registry grouped by plugin name; dim coloring |
| PORT-02 | ~120 alias-only plugins ported as pure data objects | Git plugin as template; ~200 aliases from OMZ git plugin; pure data, no init |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 22.12.0 | Runtime | Already in use; ESM + top-level await |
| TypeScript | 6.0.2 | Language | Already in use; strict mode |
| Vitest | 4.1.2 | Testing | Already in use; fast, ESM-native |
| picocolors | 1.1.1 | Terminal colors | Already in use; zero-dep, fast |

### Supporting
No new dependencies required. The plugin engine is pure TypeScript with no external libraries. The alias registry uses native `Map`, the topological sort is a ~30-line Kahn's algorithm, and error boundaries are try/catch wrappers. This keeps the dependency footprint zero for this phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled topo sort | graphlib, toposort npm | Extra dependency for ~30 lines of code; not worth it |
| Custom hook bus | EventEmitter | EventEmitter lacks Promise.allSettled semantics and error isolation per handler |
| Zod for config validation | Manual type guards | Project already uses manual type guards in config.ts; stay consistent |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  plugins/
    types.ts          # PluginManifest, AliasRegistry, HookContext interfaces
    registry.ts       # Immutable Map-based registry (aliases, hooks, metadata)
    loader.ts         # Two-phase plugin loader with error boundaries
    hooks.ts          # Hook bus: dispatch preCommand/postCommand/prePrompt/onCd
    resolver.ts       # Topological sort + cycle detection
    index.ts          # Re-exports all bundled plugins as array
    git.ts            # Git alias plugin (~200 aliases, pure data)
  alias.ts            # expandAlias(input, registry): string
```

### Modified Existing Modules
| Module | Change | Lines Affected |
|--------|--------|---------------|
| `src/types.ts` | Add `'aliases'` to BuiltinName union; add plugin fields to ShellState | ~5 lines |
| `src/classify.ts` | Add `'aliases'` to BUILTINS set | 1 line |
| `src/builtins.ts` | Add aliases command handler | ~20 lines |
| `src/config.ts` | Extend NeshConfig with `plugins` field; validation | ~30 lines |
| `src/cli.ts` | Add `--safe` flag detection, pass to runShell | ~5 lines |
| `src/shell.ts` | Plugin init after config, alias expansion before classify, hook dispatch | ~30 lines |

### Pattern 1: Alias-Only Plugin (Pure Data Object)
**What:** A plugin that is just a name + aliases record. No init, no destroy, no hooks.
**When to use:** Porting OMZ alias-only plugins (~120 of 300).
```typescript
// src/plugins/git.ts
import type { PluginManifest } from './types.js'

export const plugin: PluginManifest = {
  name: 'git',
  version: '1.0.0',
  description: 'Git aliases (ported from oh-my-zsh)',
  aliases: {
    g: 'git',
    ga: 'git add',
    gaa: 'git add --all',
    gapa: 'git add --patch',
    gb: 'git branch',
    gba: 'git branch --all',
    gbd: 'git branch --delete',
    gc: 'git commit --verbose',
    'gc!': 'git commit --verbose --amend',
    gcm: 'git commit --message',
    gco: 'git checkout',
    gcb: 'git checkout -b',
    gd: 'git diff',
    gds: 'git diff --staged',
    gf: 'git fetch',
    gfa: 'git fetch --all --prune',
    gl: 'git pull',
    glog: 'git log --oneline --decorate --graph',
    gm: 'git merge',
    gp: 'git push',
    gpf: 'git push --force-with-lease',
    grb: 'git rebase',
    grbi: 'git rebase --interactive',
    gst: 'git status',
    gss: 'git status --short',
    gsw: 'git switch',
    gswc: 'git switch --create',
    gsta: 'git stash push',
    gstp: 'git stash pop',
    // ... ~170 more aliases
  },
}
```

### Pattern 2: Expand-Once Alias Resolution
**What:** Look up first word in alias Map. If found, replace first word with expansion. Never re-check.
**When to use:** Every command input in the REPL loop.
```typescript
// src/alias.ts
export interface AliasRegistry {
  readonly resolve: (firstWord: string) => string | undefined
  readonly getAll: () => ReadonlyMap<string, { readonly expansion: string; readonly source: string }>
}

export function expandAlias(input: string, registry: AliasRegistry): string {
  const trimmed = input.trim()
  if (!trimmed) return input

  const spaceIndex = trimmed.indexOf(' ')
  const firstWord = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex)
  const rest = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex)

  const expansion = registry.resolve(firstWord)
  if (expansion === undefined) return input

  return expansion + rest
}
```

### Pattern 3: Two-Phase Plugin Loading
**What:** Phase 1 (sync, <50ms) builds alias Maps from pure data. Phase 2 (async, deferred) calls init() on complex plugins.
**When to use:** Shell startup in plugin-loader.ts.
```typescript
// Phase 1: synchronous -- runs before first prompt
function loadPhase1(plugins: readonly PluginManifest[], config: PluginConfig): PluginRegistry {
  const aliasMap = new Map<string, { expansion: string; source: string }>()
  // User aliases first (highest priority)
  for (const [alias, expansion] of Object.entries(config.aliases ?? {})) {
    aliasMap.set(alias, { expansion, source: 'user' })
  }
  // Plugin aliases (skip user overrides, skip disabled)
  for (const plugin of plugins) {
    const disabled = new Set(config[plugin.name]?.disabled_aliases ?? [])
    for (const [alias, expansion] of Object.entries(plugin.aliases ?? {})) {
      if (aliasMap.has(alias)) {
        const existing = aliasMap.get(alias)!
        if (existing.source !== 'user') {
          process.stderr.write(`[nesh] alias collision: "${alias}" defined by ${existing.source} and ${plugin.name}\n`)
        }
        continue // user aliases and earlier plugins win
      }
      if (disabled.has(alias)) continue
      aliasMap.set(alias, { expansion, source: plugin.name })
    }
  }
  return buildRegistry(aliasMap, plugins)
}

// Phase 2: async -- runs after first prompt via setImmediate
async function loadPhase2(plugins: readonly PluginManifest[], context: HookContext): Promise<void> {
  for (const plugin of plugins) {
    if (plugin.init) {
      try {
        await plugin.init(context)
      } catch (err) {
        process.stderr.write(`[nesh] plugin "${plugin.name}" failed to initialize: ${(err as Error).message}\n`)
      }
    }
  }
}
```

### Pattern 4: Error Boundary Wrapper
**What:** Every plugin call wrapped in try/catch. Failed plugins marked, never crash shell.
```typescript
export function safeCatch<T>(pluginName: string, fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch (err) {
    process.stderr.write(`[nesh] plugin "${pluginName}" error: ${(err as Error).message}\n`)
    return fallback
  }
}

export async function safeAsync<T>(pluginName: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    process.stderr.write(`[nesh] plugin "${pluginName}" error: ${(err as Error).message}\n`)
    return fallback
  }
}
```

### Pattern 5: Hook Dispatch with Promise.allSettled
**What:** Hooks dispatched in parallel. Each handler isolated. Failed handlers logged and skipped.
```typescript
export async function dispatchHook(
  hookName: string,
  handlers: readonly HookHandler[],
  context: Readonly<HookContext>,
): Promise<void> {
  const results = await Promise.allSettled(
    handlers.map(h => Promise.resolve(h(context)))
  )
  for (const result of results) {
    if (result.status === 'rejected') {
      process.stderr.write(`[nesh] hook "${hookName}" handler failed: ${(result.reason as Error).message}\n`)
    }
  }
}
```

### Anti-Patterns to Avoid
- **Mutating the alias Map after construction:** Registry is built once, immutable. Follow existing ShellState pattern.
- **Recursive alias expansion:** Expand exactly once. `gst` -> `git status`, done. Never re-check `git` against aliases.
- **Plugin code importing ShellState directly:** Plugins receive a read-only context object. They never import from types.ts.
- **Embedding plugin logic in shell.ts:** Shell.ts calls clean interfaces (3-5 new lines per integration point). All logic in plugin modules.
- **Loading all plugins eagerly:** Even with only bundled plugins, the two-phase pattern must be followed from day one.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Topological sort | Full graph library | Kahn's algorithm (~30 lines) | Only need topo sort + cycle detection; standard CS algorithm |
| Event bus | Full pub/sub framework | Simple hook dispatch with Promise.allSettled | Only 4 hook types; array of handlers per type is sufficient |
| Config validation | Schema validation library | Manual type guards (existing pattern) | config.ts already uses this pattern; stay consistent |
| Terminal colors | ANSI escape sequences | picocolors (already installed) | Already the project standard |

**Key insight:** This phase is architecturally straightforward. The complexity is in getting the integration points right (alias expansion before classify, hooks at correct REPL loop positions) and in error boundaries being bulletproof. No new libraries needed.

## Common Pitfalls

### Pitfall 1: Alias Expansion Infinite Loop
**What goes wrong:** Aliases that chain or self-reference cause infinite expansion.
**Why it happens:** Naive implementations re-check expanded output against the alias registry.
**How to avoid:** Expand exactly once. Single Map.get() call on the first word. The expanded result is never re-checked. This is D-12.
**Warning signs:** Shell hangs after typing an aliased command.

### Pitfall 2: Plugin Error Crashes Shell Startup
**What goes wrong:** A plugin with a broken init() throws, propagating up through the REPL loop.
**Why it happens:** Missing try/catch around plugin lifecycle calls.
**How to avoid:** Every init/destroy call wrapped in try/catch per D-21. Failed plugins marked in registry. Safe mode (--safe) as escape hatch per D-28.
**Warning signs:** Shell crashes on startup with plugin-related stack trace.

### Pitfall 3: Startup Time Regression
**What goes wrong:** Adding plugins makes shell feel sluggish before first prompt appears.
**Why it happens:** Synchronous init() calls or dynamic import() of many files before prompt.
**How to avoid:** Phase 1 is pure data (object literals, Map construction). Phase 2 deferred via setImmediate after first prompt. Measure with process.hrtime.
**Warning signs:** First prompt takes >300ms with 30+ plugins.

### Pitfall 4: User Alias Override Not Working
**What goes wrong:** Plugin aliases shadow user-defined aliases in config.
**Why it happens:** Wrong insertion order in the alias Map.
**How to avoid:** Load user aliases FIRST into the Map. During plugin registration, skip if key already exists (D-13).
**Warning signs:** User types an alias they defined in config and gets plugin behavior instead.

### Pitfall 5: Collision Warnings Not Shown
**What goes wrong:** Two plugins define same alias; user has no idea which one wins.
**Why it happens:** No tracking of alias sources during registration.
**How to avoid:** Store source plugin name alongside each alias. On collision, emit stderr warning with both plugin names (D-14).
**Warning signs:** Unexpected alias behavior with no diagnostic output.

## Code Examples

### Integration Point: shell.ts REPL Loop
```typescript
// In shell.ts, after receiving line from rl.question():
const line = await rl.question(prompt)

// NEW: Alias expansion before classification
const expandedLine = expandAlias(line, pluginRegistry)

// EXISTING: Classification uses expanded line
const action = classifyInput(expandedLine, prefix)
```

### Integration Point: cli.ts Safe Mode
```typescript
// In cli.ts, before runShell():
const safeMode = process.argv.includes('--safe')

// Pass to runShell
runShell({ safeMode }).catch(...)
```

### Integration Point: shell.ts Plugin Init
```typescript
// In runShell(), after config loading, before REPL loop:
const pluginRegistry = safeMode
  ? createEmptyRegistry()
  : loadPlugins(config)

// After first prompt renders (deferred Phase 2):
if (!safeMode) {
  setImmediate(async () => {
    await initAsyncPlugins(enabledPlugins, hookContext)
  })
}
```

### Integration Point: Hook Dispatch in REPL
```typescript
// Before command execution:
await dispatchHook('preCommand', hookBus.preCommand, { cwd: process.cwd(), command: action })

// After command execution:
await dispatchHook('postCommand', hookBus.postCommand, { cwd: process.cwd(), command: action, exitCode })

// On cd:
await dispatchHook('onCd', hookBus.onCd, { cwd: process.cwd(), previousDir: oldDir })
```

### Topological Sort (Kahn's Algorithm)
```typescript
export function topologicalSort(
  plugins: readonly PluginManifest[]
): { readonly sorted: readonly PluginManifest[]; readonly cycles: readonly string[] } {
  const nameMap = new Map(plugins.map(p => [p.name, p]))
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const p of plugins) {
    inDegree.set(p.name, 0)
    adjacency.set(p.name, [])
  }
  for (const p of plugins) {
    for (const dep of p.dependencies ?? []) {
      if (nameMap.has(dep)) {
        adjacency.get(dep)!.push(p.name)
        inDegree.set(p.name, (inDegree.get(p.name) ?? 0) + 1)
      }
    }
  }

  const queue: string[] = []
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name)
  }

  const sorted: PluginManifest[] = []
  while (queue.length > 0) {
    const current = queue.shift()!
    sorted.push(nameMap.get(current)!)
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  const cycles = plugins
    .filter(p => !sorted.includes(p))
    .map(p => p.name)

  return { sorted, cycles }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zsh subprocess for OMZ plugins | Native TypeScript reimplementation | Project decision (v3.0) | Cross-platform, fast startup, type safety |
| Eager plugin loading | Two-phase lazy loading | Learned from OMZ/Zinit/lazy.nvim | Sub-300ms startup with 30+ plugins |
| vm/vm2 sandboxing | Process-level isolation (future) | vm2 abandoned 2024-2026 | Bundled-only for Phase 8; security model for git plugins later |

**Deprecated/outdated:**
- vm2 for plugin sandboxing: abandoned, unfixable escapes
- node-color-readline: abandoned 9+ years ago, fundamentally broken approach

## Project Constraints (from CLAUDE.md)

- **Immutable state:** ShellState updated via spread. Plugin registry follows same pattern.
- **Lazy SDK loading:** AI SDK lazy-loaded on first `a` command. Plugin Phase 2 init follows same deferred pattern.
- **Module-per-concern:** Each new capability gets its own module (alias.ts, plugin-loader.ts, plugin-registry.ts).
- **Error resilience:** Shell never crashes from external failures. Plugin error boundaries follow this.
- **ESM only:** `"type": "module"` in package.json. All imports use `.js` extension.
- **No console.log:** Use process.stderr.write for warnings, process.stdout.write for output.
- **Files <800 lines:** Each plugin module should be small and focused.
- **Functions <50 lines:** Keep handlers and utilities compact.
- **No mutation:** All state updates via spread operators.
- **TypeScript strict mode:** All interfaces use `readonly` fields.
- **Vitest for testing:** All new modules need tests.
- **Build:** tsdown bundles to single dist/cli.js. Plugin files must be includable in bundle.
- **Commit after every change:** Per project workflow.

## Open Questions

1. **Git plugin alias count for PORT-02**
   - What we know: OMZ git plugin has 200+ aliases. PORT-02 requires ~120 alias-only plugins total (git is one of them).
   - What's unclear: Exact scope of PORT-02 within Phase 8 -- is it just the git plugin as proof-of-concept, or all 120?
   - Recommendation: Phase 8 ships the git plugin as proof-of-concept. The remaining ~119 alias-only plugins use the identical pattern and can be ported incrementally. The CONTEXT.md says "PORT-02 requires ~120 alias-only plugins ported" but the success criteria only mention git. Start with git + 2-3 others (docker, npm) as validation, defer bulk porting.

2. **Hook context object shape**
   - What we know: D-27 specifies `{ cwd, command, exitCode, state }` as the read-only context.
   - What's unclear: Whether `state` should be full ShellState or a curated subset.
   - Recommendation: Expose a curated subset (cwd, env, lastError, sessionId) -- not full ShellState. This maintains the boundary between plugin code and shell internals (per Pitfall 6 in research).

3. **Plugin config location in NeshConfig**
   - What we know: D-30 says `"plugins"` object in config.json with specific schema.
   - What's unclear: Whether to nest under `plugins` key or keep flat.
   - Recommendation: Use `plugins` key as D-30 specifies: `{ plugins: { enabled: [...], aliases: {...}, git: { disabled_aliases: [...] } } }`.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/shell.ts`, `src/classify.ts`, `src/config.ts`, `src/types.ts`, `src/cli.ts`, `src/builtins.ts` -- read and analyzed
- `.planning/research/ARCHITECTURE.md` -- comprehensive plugin architecture patterns
- `.planning/research/PITFALLS.md` -- 20 catalogued pitfalls with mitigations
- `08-CONTEXT.md` -- 36 locked decisions from user discussion

### Secondary (MEDIUM confidence)
- [OMZ git plugin README](https://github.com/ohmyzsh/ohmyzsh/blob/master/plugins/git/README.md) -- 200+ aliases documented
- [OMZ git plugin source](https://github.com/ohmyzsh/ohmyzsh/blob/master/plugins/git/git.plugin.zsh) -- canonical alias definitions

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, existing stack sufficient
- Architecture: HIGH -- 36 locked decisions, comprehensive prior research in ARCHITECTURE.md
- Pitfalls: HIGH -- 20 pitfalls already catalogued in PITFALLS.md, Phase 8 subset identified
- Integration points: HIGH -- read actual source files, identified exact line-level insertion points

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- no external dependencies that change rapidly)
