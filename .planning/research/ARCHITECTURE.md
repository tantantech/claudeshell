# Architecture Patterns

**Domain:** TypeScript plugin framework for AI-native terminal shell (oh-my-zsh port)
**Researched:** 2026-04-03

## Recommended Architecture

### High-Level Integration with Existing Nesh Architecture

```
cli.ts --> shell.ts --> PluginManager.init() at startup
                     |
                 REPL loop:
                     |
                 buildPrompt() <-- PluginHooks.promptRender()
                     |
                 rl.question() with completer <-- PluginCompleter.complete()
                     |
                 [keypress events] <-- SyntaxHighlighter.highlight() (raw mode layer)
                     |
                 classifyInput() <-- PluginAliasResolver.expand() (pre-classification)
                     |
                 PluginHooks.preCommand(action)
                     |
                 route to: builtins / passthrough / ai / plugin-command
                     |
                 PluginHooks.postCommand(action, result)
                     |
                 loop
```

### New Module Map

| New Module | Responsibility | Integrates With |
|------------|---------------|-----------------|
| `src/plugins/types.ts` | Plugin interface, hook types, manifest types | All plugin modules |
| `src/plugins/manager.ts` | Lifecycle: load, enable, disable, unload | `shell.ts` (init + shutdown) |
| `src/plugins/loader.ts` | Discover + import plugin modules from disk | `manager.ts`, `config.ts` |
| `src/plugins/registry.ts` | Store active plugins, aliases, completions, functions | `manager.ts`, `classify.ts` |
| `src/plugins/hooks.ts` | Hook bus: preCommand, postCommand, promptRender, chpwd | `shell.ts` REPL loop |
| `src/plugins/completer.ts` | Aggregate completions from plugins + system PATH | `shell.ts` readline completer |
| `src/plugins/highlighter.ts` | Real-time syntax coloring via keypress event layer | `shell.ts` (wraps readline) |
| `src/plugins/suggester.ts` | Fish-like auto-suggestions from history + plugin data | `shell.ts` (wraps readline) |
| `src/plugins/resolver.ts` | Dependency resolution + topological sort | `manager.ts` |
| `src/plugins/sandbox.ts` | Error boundaries, timeout enforcement | `manager.ts`, `hooks.ts` |
| `src/plugins/profiles.ts` | Curated plugin sets (core, developer, devops, cloud, ai) | `config.ts`, `manager.ts` |
| `src/plugins/cli.ts` | `nesh plugin list/enable/disable/install` commands | `classify.ts` (new builtin) |

### Modified Existing Modules

| Existing Module | Modification | Why |
|-----------------|-------------|-----|
| `src/types.ts` | Add `enabledPlugins` and `pluginState` to `ShellState` | Plugin state flows through immutable state |
| `src/shell.ts` | Init PluginManager before REPL; wrap readline with completer; inject hook calls into loop | Central integration point |
| `src/classify.ts` | Call alias expansion before classification; add `plugin-command` action type | Plugins register aliases and commands |
| `src/config.ts` | Add `plugins`, `profile`, `plugin_config` fields to `NeshConfig` | User configuration of plugins |
| `src/prompt.ts` | Export hook point for plugin prompt segments | Plugins can add git status, venv info, kube context |
| `src/builtins.ts` | Add `plugin` as a builtin name routing to plugin CLI | `nesh plugin list` etc. |
| `src/history.ts` | Export read-only history access for suggestion engine | Suggester needs history data |

## Component Boundaries

### Plugin Interface Contract

```typescript
// src/plugins/types.ts

export interface NeshPlugin {
  readonly name: string
  readonly version: string
  readonly description?: string
  readonly dependencies?: readonly string[]

  // Lifecycle (optional -- most alias-only plugins skip these)
  readonly init?: (ctx: PluginContext) => Promise<void> | void
  readonly destroy?: () => Promise<void> | void

  // Registrations (declarative, evaluated at load time)
  readonly aliases?: Readonly<Record<string, string>>
  readonly completions?: PluginCompletionProvider
  readonly commands?: Readonly<Record<string, PluginCommandHandler>>
  readonly functions?: Readonly<Record<string, PluginFunction>>

  // Hooks (optional, called during REPL lifecycle)
  readonly hooks?: PluginHookSet
}

export interface PluginContext {
  readonly cwd: () => string
  readonly env: () => Readonly<Record<string, string | undefined>>
  readonly config: () => Readonly<Record<string, unknown>>
  readonly state: () => Readonly<ShellState>
  readonly log: (msg: string) => void
  readonly registerCompletion: (provider: PluginCompletionProvider) => void
}

export interface PluginHookSet {
  readonly preCommand?: (action: InputAction) => InputAction | void
  readonly postCommand?: (action: InputAction, result: CommandOutcome) => void
  readonly promptRender?: (segments: PromptSegment[]) => PromptSegment[]
  readonly chpwd?: (oldDir: string, newDir: string) => void
  readonly preExec?: (command: string) => string | void
  readonly envChange?: (key: string, value: string | undefined) => void
}

export interface PluginCompletionProvider {
  readonly triggers?: readonly string[]  // command prefixes this completes
  readonly complete: (context: CompletionContext) => CompletionResult
}

export interface CompletionContext {
  readonly line: string
  readonly cursor: number
  readonly words: readonly string[]
  readonly wordIndex: number
}

export type CompletionResult =
  | readonly string[]
  | Promise<readonly string[]>

export interface PluginManifest {
  readonly name: string
  readonly version: string
  readonly description: string
  readonly category: PluginCategory
  readonly dependencies?: readonly string[]
  readonly platforms?: readonly ('darwin' | 'linux' | 'win32')[]
  readonly requiredBinaries?: readonly string[]
}

export type PluginCategory =
  | 'git' | 'docker' | 'cloud' | 'node' | 'python' | 'ruby'
  | 'navigation' | 'productivity' | 'system' | 'completion'
  | 'ai' | 'devops' | 'editor' | 'misc'
```

### Plugin Manager Lifecycle

```typescript
// src/plugins/manager.ts -- simplified interface

export interface PluginManager {
  // Startup: called once in shell.ts before REPL loop
  readonly init: (config: NeshConfig) => Promise<void>

  // Runtime: enable/disable without restart
  readonly enable: (name: string) => Promise<void>
  readonly disable: (name: string) => void

  // Install from git
  readonly install: (url: string) => Promise<void>
  readonly uninstall: (name: string) => void

  // Query
  readonly list: () => readonly PluginInfo[]
  readonly get: (name: string) => NeshPlugin | undefined
  readonly isEnabled: (name: string) => boolean

  // Shutdown: called on shell exit
  readonly destroy: () => Promise<void>

  // Accessors for integration points
  readonly getRegistry: () => PluginRegistry
  readonly getHookBus: () => HookBus
}
```

### Registry (fast lookups at runtime)

```typescript
// src/plugins/registry.ts

export interface PluginRegistry {
  // Alias resolution: O(1) lookup
  readonly resolveAlias: (word: string) => string | undefined

  // Command lookup: plugin-provided commands
  readonly resolveCommand: (name: string) => PluginCommandHandler | undefined

  // Completion providers for a given command prefix
  readonly getCompleters: (command: string) => readonly PluginCompletionProvider[]

  // All registered aliases (for display)
  readonly getAllAliases: () => ReadonlyMap<string, { alias: string; expansion: string; plugin: string }>

  // Functions available as shell commands
  readonly getAllFunctions: () => ReadonlyMap<string, PluginFunction>
}
```

## Data Flow

### Startup Flow

```
1. cli.ts calls runShell()
2. shell.ts loads config (existing)
3. shell.ts creates PluginManager
4. PluginManager.init():
   a. Resolve profile --> list of plugin names
   b. Discover built-in plugins from src/plugins/builtins/
   c. Discover user plugins from ~/.nesh/plugins/
   d. Resolve dependencies (topological sort)
   e. For each plugin in order:
      - Validate manifest (platform, required binaries)
      - Import module (dynamic import)
      - Call plugin.init(context) inside error boundary
      - Register aliases --> Registry
      - Register completions --> Registry
      - Register commands --> Registry
      - Register hooks --> HookBus
5. shell.ts creates readline with completer from PluginCompleter
6. REPL loop starts
```

### Command Flow (with plugins)

```
User types: "gst" [Enter]

1. shell.ts receives line "gst"
2. HookBus.preExec("gst") --> no transform
3. Registry.resolveAlias("gst") --> "git status"
4. classifyInput("git status", prefix) --> { type: 'passthrough', command: 'git status' }
5. HookBus.preCommand({ type: 'passthrough', command: 'git status' }) --> no override
6. executeCommand("git status") runs
7. HookBus.postCommand(action, { exitCode: 0, stderr: '' })
8. Loop continues
```

### Completion Flow

```
User types: "docker r" [Tab]

1. readline calls completer("docker r")
2. PluginCompleter.complete({ line: "docker r", cursor: 8 }):
   a. Parse words: ["docker", "r"], wordIndex: 1
   b. Registry.getCompleters("docker") --> [dockerPlugin.completions]
   c. Call each provider: dockerPlugin.complete(context) --> ["run", "rm", "restart"]
   d. Filter by prefix "r" --> ["run", "rm", "restart"]
   e. Merge with system PATH completions
   f. Return [["run", "rm", "restart"], "r"]
3. readline displays completion options
```

### Auto-Suggestion Flow

```
User types: "git c" (each keypress)

1. Keypress event fires for each character
2. Suggester receives current line "git c"
3. Suggester.suggest("git c"):
   a. Search history for entries starting with "git c"
   b. Best match: "git commit -m" (most recent)
   c. Ghost text: "ommit -m" (remainder after cursor)
4. Render ghost text in dim gray after cursor position on output stream
5. Right-arrow or End key --> accept suggestion into line buffer
```

### Syntax Highlighting Flow

```
User types: "git commit -m 'message'" (each keypress)

1. Keypress event fires
2. Highlighter receives current line buffer
3. Highlighter.highlight("git commit -m 'message'"):
   a. Tokenize: ["git", "commit", "-m", "'message'"]
   b. Classify: [command:valid, subcommand, flag, string]
   c. Map to ANSI colors: [green, cyan, yellow, magenta]
   d. Build ANSI-colored string
4. Clear current output line, rewrite with colors, restore cursor position
5. rl.line remains plain text (ANSI codes only on output stream)
```

### Alias Expansion Integration Point

The alias expansion step is the most critical integration between the plugin system and the existing classifier. It must happen BEFORE `classifyInput()` runs, because aliases can expand to commands that are builtins, passthroughs, or AI invocations.

```typescript
// In shell.ts REPL loop, before classifyInput:
const expandedLine = registry.resolveAlias(line.trim().split(/\s+/)[0])
  ? line.trim().replace(/^\S+/, registry.resolveAlias(line.trim().split(/\s+/)[0])!)
  : line

const action = classifyInput(expandedLine, prefix)
```

This approach keeps `classifyInput()` as a pure function -- it never needs to know about aliases. The registry lookup is O(1) via Map.

## Patterns to Follow

### Pattern 1: Lazy Plugin Loading (Two-Phase Startup)

**What:** Most of the ~300 OMZ plugins are pure alias collections. Load these synchronously as data. Defer plugins with `init()` functions to after the first prompt renders.

**When:** Shell startup -- the user should see a prompt in <200ms.

**Example:**
```typescript
// Phase 1: Synchronous data loading (<50ms)
for (const plugin of aliasOnlyPlugins) {
  registry.registerAliases(plugin.name, plugin.aliases)
}

// Phase 2: After first prompt (deferred, non-blocking)
setImmediate(async () => {
  for (const plugin of asyncPlugins) {
    await sandboxCall(plugin.name, () => plugin.init!(context), undefined)
    registry.registerPlugin(plugin)
  }
})
```

### Pattern 2: Error-Boundary Sandbox

**What:** Every plugin hook invocation runs inside a try-catch with optional timeout. A failing plugin never crashes the shell.

**When:** Always. Every hook call, every init, every completion provider.

**Example:**
```typescript
export function sandboxCall<T>(
  pluginName: string,
  fn: () => T | Promise<T>,
  fallback: T,
  timeoutMs: number = 1000,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      process.stderr.write(
        `[nesh] Plugin "${pluginName}" timed out, skipping\n`
      )
      resolve(fallback)
    }, timeoutMs)

    Promise.resolve()
      .then(() => fn())
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((err) => {
        clearTimeout(timer)
        process.stderr.write(
          `[nesh] Plugin "${pluginName}" error: ${(err as Error).message}\n`
        )
        resolve(fallback)
      })
  })
}
```

### Pattern 3: Immutable State Integration

**What:** Plugin state integrates with Nesh's existing immutable `ShellState` pattern. Plugins never mutate shared state directly.

**When:** Any plugin needs to track state across commands.

**Example:**
```typescript
// In types.ts, extend ShellState:
export interface ShellState {
  // ...existing fields...
  readonly pluginState: Readonly<Record<string, unknown>>
}

// Plugins read through PluginContext:
const ctx: PluginContext = {
  state: () => currentState,
  // Plugin state changes flow through manager,
  // which produces a new ShellState via immutable update
}
```

### Pattern 4: Declarative Alias-Only Plugins

**What:** Most oh-my-zsh plugins (~150 of ~300) are just alias collections. These should be pure data with no lifecycle code, enabling instant loading.

**When:** Porting the majority of OMZ plugins.

**Example:**
```typescript
// src/plugins/builtins/git.ts
import type { NeshPlugin } from '../types.js'

export const plugin: NeshPlugin = {
  name: 'git',
  version: '1.0.0',
  description: 'Git aliases and shortcuts',
  aliases: {
    g: 'git',
    ga: 'git add',
    gaa: 'git add --all',
    gb: 'git branch',
    gc: 'git commit',
    gcm: 'git commit -m',
    gco: 'git checkout',
    gd: 'git diff',
    gf: 'git fetch',
    gl: 'git pull',
    glog: 'git log --oneline --decorate --graph',
    gp: 'git push',
    grb: 'git rebase',
    gst: 'git status',
    gsw: 'git switch',
  },
}
```

### Pattern 5: Keypress Event Layer for Input Enhancement

**What:** Auto-suggestions and syntax highlighting need to process each keypress after readline handles it. Use the public `readline.emitKeypressEvents()` API and `setImmediate` to avoid fighting with readline internals.

**When:** Implementing the suggester and highlighter modules.

**Example:**
```typescript
// Conceptual approach for the input enhancement layer
import * as readline from 'node:readline'

export function attachInputEnhancements(
  rl: readline.Interface,
  suggester: Suggester,
  highlighter: Highlighter,
): void {
  // Enable keypress events on stdin
  readline.emitKeypressEvents(process.stdin)

  process.stdin.on('keypress', (_str, _key) => {
    // Process AFTER readline updates rl.line
    setImmediate(() => {
      const currentLine = (rl as any).line ?? ''
      const cursorPos = (rl as any).cursor ?? 0

      // Save cursor, move to start of input area
      const prompt = rl.getPrompt()
      process.stdout.write(`\r\x1b[${prompt.length}C`)

      // Render syntax highlighting over the current line
      highlighter.render(currentLine, cursorPos, process.stdout)

      // Render ghost text suggestion after cursor
      suggester.render(currentLine, cursorPos, process.stdout)
    })
  })
}
```

**Important constraint:** `rl.line` is always plain text. ANSI codes are written to `process.stdout` for display only. The line buffer must never contain escape sequences, or readline's cursor math breaks (this is a known Node.js issue documented in node-v0.x-archive#3860).

### Pattern 6: Completion Aggregation with Prefix Routing

**What:** Route Tab completion requests to the correct plugin based on the first word (command name). Fall back to PATH-based completion for unknown commands.

**When:** Implementing the completer module.

**Example:**
```typescript
// src/plugins/completer.ts
export function createPluginCompleter(
  registry: PluginRegistry,
): readline.Completer {
  return async (line: string): Promise<[string[], string]> => {
    const words = line.trimStart().split(/\s+/)
    const command = words[0] ?? ''

    // If typing the first word, complete from aliases + PATH
    if (words.length <= 1) {
      const aliasNames = [...registry.getAllAliases().keys()]
      const pathCommands = await getPathCommands()  // cached
      const all = [...new Set([...aliasNames, ...pathCommands])]
      const hits = all.filter(c => c.startsWith(command))
      return [hits, command]
    }

    // For subsequent words, delegate to plugin completers
    const completers = registry.getCompleters(command)
    if (completers.length === 0) return [[], '']

    const currentWord = words[words.length - 1] ?? ''
    const ctx: CompletionContext = {
      line,
      cursor: line.length,
      words,
      wordIndex: words.length - 1,
    }

    const results = await Promise.all(
      completers.map(c => sandboxCall(c.triggers?.[0] ?? 'unknown', () => c.complete(ctx), []))
    )

    const merged = [...new Set(results.flat())]
    const hits = merged.filter(c => c.startsWith(currentWord))
    return [hits, currentWord]
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Global Mutable Plugin State

**What:** Letting plugins store state in module-level variables that persist and leak between plugins.

**Why bad:** Violates Nesh's immutable state principle. Makes plugins untestable. State leaks cause subtle bugs across unrelated plugins.

**Instead:** All plugin state flows through `PluginContext.state()`, stored immutably in `ShellState.pluginState[pluginName]`. State changes go through the manager which produces a new state object.

### Anti-Pattern 2: Synchronous Loading of All 300 Plugins at Startup

**What:** Loading and initializing every enabled plugin synchronously before showing the first prompt.

**Why bad:** Shell startup becomes multi-second. Users feel lag before first prompt. This is why oh-my-zsh itself is criticized for slow startup.

**Instead:** Two-phase loading. Phase 1 (sync, <50ms): load manifests and pure-data plugins (aliases, static completions). Phase 2 (deferred via setImmediate): initialize plugins with async `init()` functions after the first prompt renders. Completion providers lazy-load on first Tab press.

### Anti-Pattern 3: Subprocess-Based OMZ Plugin Delegation

**What:** Running original `.plugin.zsh` files in a zsh subprocess and scraping output.

**Why bad:** Defeats the cross-platform goal. Adds 50-200ms per plugin per invocation. Two shell interpreters running simultaneously. Impossible to integrate with Node.js readline completions.

**Instead:** Native TypeScript reimplementation. The ~300 OMZ plugins break down to: ~150 alias-only (trivial port), ~80 completion-only (port to completer interface), ~50 with shell functions (port to PluginFunction), ~20 with complex logic (careful porting needed).

### Anti-Pattern 4: Monkey-Patching readline Internals

**What:** Overriding private readline methods like `_insertString`, `_ttyWrite`, or `_refreshLine` for syntax highlighting.

**Why bad:** Private APIs break between Node.js versions. Already caused issues in Node 20 to 22 migration. Tightly couples the plugin system to runtime internals.

**Instead:** Use the public keypress event layer. Write ANSI output to stdout after readline processes each keypress. Use `readline.clearLine()` and `readline.cursorTo()` for repositioning. The line buffer (`rl.line`) stays plain text; coloring is output-only.

### Anti-Pattern 5: Plugin-to-Plugin Direct Coupling

**What:** Plugin A directly imports and calls functions from Plugin B.

**Why bad:** Loading order becomes fragile. Disabling Plugin B breaks Plugin A silently. Circular dependencies emerge.

**Instead:** Plugins communicate only through the hook bus and registry. If Plugin A needs functionality from Plugin B, it declares B as a dependency and uses `PluginContext` to query registered completions/functions.

### Anti-Pattern 6: Embedding Plugin Logic in shell.ts

**What:** Adding plugin dispatch logic, alias resolution, and hook calls directly into the REPL loop switch cases.

**Why bad:** shell.ts is currently ~350 lines of clean dispatcher code. Embedding plugin logic would double its size and violate single responsibility.

**Instead:** shell.ts calls PluginManager/HookBus/Registry through clean interfaces. The integration points are: (1) alias expansion before classify, (2) hook calls before/after each case, (3) completer function passed to readline, (4) input enhancement attachment. Each is 1-3 lines in shell.ts, with all logic in the plugin modules.

## Plugin Directory Layout

```
~/.nesh/
  config.json              # Existing: add plugins[], profile fields
  plugins/                 # User-installed plugins (git clone target)
    my-custom-plugin/
      index.ts             # Default export: NeshPlugin
      package.json         # name, version, nesh engine compat

src/plugins/
  types.ts                 # Plugin interfaces and type definitions
  manager.ts               # Plugin lifecycle management
  loader.ts                # Plugin discovery and dynamic import
  registry.ts              # Runtime alias/completion/command registry
  hooks.ts                 # Hook bus for REPL lifecycle events
  completer.ts             # Completion aggregation for readline
  highlighter.ts           # Syntax highlighting engine
  suggester.ts             # Auto-suggestion engine
  resolver.ts              # Dependency resolution (topological sort)
  sandbox.ts               # Error boundaries and timeouts
  profiles.ts              # Curated plugin sets
  cli.ts                   # Plugin management commands

  builtins/                # Ships with nesh (~300 ported OMZ plugins)
    index.ts               # Plugin catalog: name --> lazy import
    git.ts                 # Alias-only: pure data
    docker.ts              # Aliases + completions
    node.ts                # Aliases + completions + nvm detection
    kubectl.ts             # Aliases + completions (lazy binary check)
    python.ts              # Aliases + virtualenv detection
    ...

  profiles/
    core.ts                # Essential: git, cd-enhancements, history-search
    developer.ts           # core + node, python, docker, editor
    devops.ts              # developer + kubectl, terraform, aws
    cloud.ts               # devops + gcloud, azure
    ai-engineer.ts         # developer + python-ml, jupyter, conda
```

## Integration Points Summary

| Nesh REPL Event | Hook Point | Plugin Capability |
|-----------------|-----------|-------------------|
| Shell startup | `PluginManager.init()` | Load plugins, register aliases/completions |
| Before prompt render | `hooks.promptRender` | Add segments (git status, venv, kube context) |
| After readline input received | Alias expansion pre-classify | Expand `gst` to `git status` |
| Before command execution | `hooks.preCommand` | Modify or block commands |
| After command execution | `hooks.postCommand` | Track command results, update state |
| Tab keypress | `completer` function | Plugin-provided completions |
| Each keypress | Keypress event handler | Syntax highlighting, auto-suggestions |
| Directory change (cd) | `hooks.chpwd` | Update venv, node version, kube context |
| Environment variable change | `hooks.envChange` | React to PATH, NODE_ENV changes |
| Shell exit | `PluginManager.destroy()` | Cleanup resources |

## Scalability Considerations

| Concern | 10 plugins | 50 plugins | 300 plugins |
|---------|------------|------------|-------------|
| Startup time | <50ms (all sync) | <100ms (two-phase) | <200ms (lazy + deferred) |
| Memory | ~2MB (base + plugins) | ~5MB | ~15MB (alias maps dominate) |
| Tab completion | Instant (few providers) | <50ms (filtered dispatch) | <100ms (prefix-based routing) |
| Alias resolution | O(1) Map lookup | O(1) Map lookup | O(1) Map lookup |
| Hook dispatch | <1ms (few hooks) | <5ms (linear scan) | <10ms (priority-sorted, bail-early) |

### Startup Optimization Strategy

```
Phase 0 (sync, <10ms):  Load config, resolve profile name
Phase 1 (sync, <50ms):  Import alias-only plugins (pure data, no I/O)
Phase 2 (sync, <20ms):  Register aliases + static completions in registry
                         Show first prompt -- user can start typing
Phase 3 (async, deferred): In background after first prompt:
                           - Initialize plugins with init() functions
                           - Validate required binaries exist (which, command -v)
                           - Pre-cache frequently used completions
```

## Build Order (respecting dependencies)

The plugin framework has clear internal dependencies that dictate build order:

```
Phase A: Foundation (no internal deps)
  1. src/plugins/types.ts       -- interfaces only, depends on nothing
  2. src/plugins/sandbox.ts     -- depends only on types

Phase B: Core Infrastructure (depends on A)
  3. src/plugins/registry.ts    -- depends on types
  4. src/plugins/hooks.ts       -- depends on types
  5. src/plugins/resolver.ts    -- depends on types (topological sort)

Phase C: Plugin Loading (depends on A + B)
  6. src/plugins/loader.ts      -- depends on types, sandbox
  7. src/plugins/manager.ts     -- depends on types, registry, hooks, resolver, loader, sandbox

Phase D: Input Enhancement (depends on B)
  8. src/plugins/completer.ts   -- depends on registry, sandbox
  9. src/plugins/suggester.ts   -- depends on registry (for alias-aware suggestions)
  10. src/plugins/highlighter.ts -- standalone, uses registry for command validation

Phase E: User-Facing (depends on C)
  11. src/plugins/profiles.ts   -- depends on types (data only)
  12. src/plugins/cli.ts        -- depends on manager

Phase F: Existing Module Integration (depends on C + D)
  13. Modify src/types.ts       -- add plugin fields to ShellState
  14. Modify src/config.ts      -- add plugin config fields
  15. Modify src/classify.ts    -- alias expansion pre-step
  16. Modify src/builtins.ts    -- add 'plugin' builtin name
  17. Modify src/shell.ts       -- wire manager, completer, hooks, input enhancements
  18. Modify src/history.ts     -- export read-only access for suggester

Phase G: Built-in Plugins (depends on A, can parallel with C-F)
  19. src/plugins/builtins/git.ts
  20. src/plugins/builtins/docker.ts
  21. ... (remaining ~298 plugins, highly parallelizable)
```

## Sources

- [Oh My Zsh Wiki - Plugins](https://github.com/ohmyzsh/ohmyzsh/wiki/plugins)
- [Oh My Zsh Wiki - Design](https://github.com/ohmyzsh/ohmyzsh/wiki/Design)
- [Oh My Zsh Wiki - Plugins Overview](https://github.com/ohmyzsh/ohmyzsh/wiki/Plugins-Overview)
- [Zsh Plugin Standard](https://wiki.zshell.dev/community/zsh_plugin_standard)
- [zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions)
- [zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting)
- [Node.js Readline API](https://nodejs.org/api/readline.html)
- [Node.js readline ANSI cursor issue](https://github.com/nodejs/node-v0.x-archive/issues/3860)
- [Designing a Plugin System in TypeScript](https://dev.to/hexshift/designing-a-plugin-system-in-typescript-for-modular-web-applications-4db5)
- [Node.js Plugin Manager Patterns](https://v-checha.medium.com/node-js-advanced-patterns-plugin-manager-44adb72aa6bb)
- [How to Build Plugin Architecture in Node.js (2026)](https://oneuptime.com/blog/post/2026-01-26-nodejs-plugin-architecture/view)
- [emphasize - ANSI syntax highlighting](https://github.com/wooorm/emphasize)
