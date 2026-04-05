# Phase 9: Completion Engine & Utility Plugins - Research

**Researched:** 2026-04-05
**Domain:** Node.js readline Tab completion, async completion providers, Fig-style spec parsing, cross-platform utility plugins
**Confidence:** HIGH

## Summary

This phase builds a Tab completion framework on top of Node.js readline's native `completer` callback, adds a Fig-style declarative spec system for command grammars, implements compgen fallback for unrecognized commands, and ports ~40 utility plugins to TypeScript. The existing plugin architecture from Phase 8 (manifest, registry, two-phase loader, hook dispatch) provides solid foundations -- completion providers and specs are new fields on `PluginManifest`, and the registry gets a new lookup map indexed by command name.

The critical technical finding is that `readline/promises` (used by `shell.ts`) fully supports both callback-style `completer(line, callback)` and async `completer(line): Promise<[string[], string]>` on Node.js 22+. This was verified empirically. The completion engine can therefore be a straightforward async function that dispatches to providers with `Promise.race` for the 1-second timeout.

**Primary recommendation:** Build the completion engine as a new `src/completions/` module directory with 5 files (types, engine, spec-parser, compgen, cache). Wire it into `shell.ts` via readline's `completer` option. Completion plugins are bundled manifests with `completionSpecs` fields containing static data objects.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Extend `PluginManifest` with optional `completions?: CompletionProvider` field
- D-02: `CompletionProvider` is a function: `(context: CompletionContext) => Promise<CompletionResult>`
- D-03: `CompletionContext` includes: `line`, `cursor`, `words`, `currentWord`, `commandName`, `cwd`
- D-04: `CompletionResult` is: `{ items: readonly string[], prefix?: string }`
- D-05: Each completion provider runs with a 1-second timeout via `Promise.race`
- D-06: Results cached per `(commandName, currentWord)` key with 30-second TTL
- D-07: Use readline's built-in `completer` callback: `readline.createInterface({ completer })`
- D-08: The completer function is async (readline supports `(line, callback)` async pattern)
- D-09: New module `src/completions/engine.ts` -- the central completion dispatcher
- D-10: Completion engine checks: (1) plugin completion, (2) Fig-style spec, (3) compgen fallback
- D-11: Multiple plugins for same command -- first match wins, no merging
- D-12: Own TypeScript types for completion specs -- do NOT depend on Fig's package
- D-13: `CompletionSpec` interface: `{ name, subcommands?, options?, args? }`
- D-14: `CompletionOption`: `{ name: string | string[], description?, args? }` -- supports short/long aliases
- D-15: `CompletionArg`: `{ name, template?: 'filepaths' | 'folders', generators? }`
- D-16: `CompletionGenerator`: async function producing dynamic completions
- D-17: Plugins register specs via `completionSpecs?: readonly CompletionSpec[]` on manifest
- D-18: Spec parser `src/completions/spec-parser.ts` walks spec tree based on input tokens
- D-19: Compgen fallback: `bash -c "compgen -W '$(compgen -c)' -- '${currentWord}'"` for commands
- D-20: File path completion via `compgen -f -- '${currentWord}'`
- D-21: Compgen fallback has 500ms timeout (shorter than plugin timeout)
- D-22: New module `src/completions/compgen.ts`
- D-23: Top 20: git, docker, npm, yarn, pnpm, kubectl, ssh, aws, gcloud, az, terraform, helm, cargo, pip, python, node, make, systemctl, brew, apt
- D-24: Each uses Fig-style specs -- static data + dynamic generators where needed
- D-25: Completions are bundled plugins in `src/plugins/completions/`
- D-26: Git completions include: subcommands, branch names via generator, remotes, file paths
- D-27: Utility plugins use `init()` to register functionality
- D-28: Plugin API context extended with `registerKeybinding(key, handler)`, `registerCommand(name, handler)`
- D-29: `extract` plugin: detects archive type, runs appropriate tool
- D-30: `sudo` plugin: keybinding toggles `sudo` prefix on current line
- D-31: `copypath` plugin: copies cwd to clipboard (pbcopy/xclip)
- D-32: Cross-platform: check `process.platform` for platform-appropriate tools
- D-33: ~40 utility plugins in `src/plugins/utilities/`
- D-34: Module structure: engine.ts, types.ts, spec-parser.ts, compgen.ts, cache.ts
- D-35: Cache is simple Map with TTL -- no external dependencies
- D-36: Engine initialized in shell.ts alongside plugin loader

### Claude's Discretion
- Exact set of subcommands/options for each of the top 20 command completions
- How to display completion candidates (readline default vs custom)
- Whether to show completion source alongside candidates
- Internal naming of helper functions and utility types
- Exact keybinding for sudo toggle (Escape+Escape is OMZ default)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-01 | Context-aware Tab completion dispatches to plugin-provided completion providers | Completion engine architecture (D-09, D-10), CompletionProvider interface (D-02), registry extension for command-indexed lookup |
| COMP-02 | Completion providers are async with 1-second timeout and caching | Promise.race timeout pattern (D-05), TTL cache (D-06, D-35), verified readline/promises supports async completer |
| COMP-03 | Fig-style declarative completion specs supported | Own TypeScript types (D-12-D-16), spec parser tree walker (D-18), plugins register via completionSpecs field (D-17) |
| COMP-04 | Fallback to bash/zsh compgen when no native completion available | compgen.ts module (D-22), command/file patterns (D-19-D-20), 500ms timeout (D-21), verified compgen works on target system |
| COMP-05 | Top 20 commands have hand-crafted completions | Bundled completion plugins (D-23-D-26), Fig-style specs with generators for dynamic data |
| PORT-03 | Completion-dependent plugins (~100) ported using Fig-style specs | CompletionSpec types enable declarative specs, spec-parser resolves completions at runtime |
| PORT-04 | Environment/utility plugins (~40) ported with cross-platform TypeScript | Plugin API extension (D-28), extract/sudo/copypath patterns (D-29-D-32), platform detection |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:readline/promises | Node 22+ built-in | Tab completer callback | Already used in shell.ts; supports async completer natively |
| node:child_process | Node 22+ built-in | compgen subprocess, git branch listing | Standard for spawning shell commands |
| node:os | Node 22+ built-in | Platform detection for cross-platform plugins | Already used in shell.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| picocolors | 1.1.1 | Dim text for completion source labels | Already a dependency, use for any terminal coloring |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Own Fig-style types | @withfig/autocomplete-types | Adds dependency, types may not match our needs, STATE.md explicitly says no |
| Own TTL cache | lru-cache | Overkill for simple (key, value, TTL) map; no external deps needed |
| compgen fallback | Node.js fs.readdir for file completion | compgen handles more cases (commands, builtins, files) in one call |

**Installation:**
```bash
# No new dependencies needed -- all Node.js built-ins + existing picocolors
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  completions/
    types.ts          # CompletionContext, CompletionResult, CompletionSpec, etc.
    engine.ts         # Central dispatcher: plugin -> spec -> compgen
    spec-parser.ts    # Walks CompletionSpec tree to find matches
    compgen.ts        # bash compgen subprocess fallback
    cache.ts          # Simple Map<string, {value, expiry}> with TTL
  plugins/
    completions/
      git-completions.ts       # Git subcommands, branches, remotes
      docker-completions.ts    # Docker subcommands, containers, images
      npm-completions.ts       # npm/yarn/pnpm subcommands
      kubectl-completions.ts   # Kubernetes resources, namespaces
      cloud-completions.ts     # aws, gcloud, az combined
      devtools-completions.ts  # cargo, pip, python, node, make
      sysadmin-completions.ts  # ssh, systemctl, brew, apt, terraform, helm
    utilities/
      extract.ts       # Archive extraction
      sudo.ts          # sudo toggle keybinding
      copypath.ts      # Copy cwd to clipboard
      ... (~37 more utility plugins)
```

### Pattern 1: Async Completer with Timeout
**What:** The completion engine wraps each provider call in `Promise.race` against a timeout
**When to use:** Every completion dispatch
**Example:**
```typescript
// Source: Verified against Node.js 22 readline/promises
async function complete(
  line: string,
  registry: PluginRegistry,
  cache: CompletionCache,
): Promise<[string[], string]> {
  const context = parseCompletionContext(line)

  // Check cache first
  const cacheKey = `${context.commandName}:${context.currentWord}`
  const cached = cache.get(cacheKey)
  if (cached !== undefined) {
    return [cached.items as string[], cached.prefix ?? context.currentWord]
  }

  // Try plugin provider -> spec -> compgen (D-10 order)
  const result = await resolveCompletion(context, registry)

  // Cache result with 30s TTL (D-06)
  if (result.items.length > 0) cache.set(cacheKey, result, 30_000)

  return [result.items as string[], result.prefix ?? context.currentWord]
}
```

### Pattern 2: Fig-Style Spec Tree Walker
**What:** Recursively walk a CompletionSpec tree based on parsed input tokens to find matching subcommands/options/args
**When to use:** When a command has a registered CompletionSpec
**Example:**
```typescript
function walkSpec(
  spec: CompletionSpec,
  tokens: readonly string[],
  tokenIndex: number,
): CompletionSpec | undefined {
  if (tokenIndex >= tokens.length) return spec

  const token = tokens[tokenIndex]
  const sub = spec.subcommands?.[token]
  if (sub !== undefined) return walkSpec(sub, tokens, tokenIndex + 1)

  // No more subcommands match -- current spec handles remaining tokens
  return spec
}
```

### Pattern 3: Plugin API Context Extension (for Utility Plugins)
**What:** Extend the HookContext passed to `init()` with registration methods for keybindings and commands
**When to use:** Utility plugins that need to register keybindings (sudo toggle) or commands (extract, copypath)
**Example:**
```typescript
interface PluginApiContext extends HookContext {
  readonly registerKeybinding: (key: string, handler: () => void) => void
  readonly registerCommand: (
    name: string,
    handler: (args: string) => Promise<void>,
  ) => void
}
```

### Anti-Patterns to Avoid
- **Mutating rl.line directly:** Never modify readline's internal line buffer. For sudo toggle, use `rl.write()` after clearing.
- **Synchronous subprocess in completer:** Never use `execSync` in the completion path. Always use async child_process with timeout.
- **Unbounded cache:** Always enforce TTL and max size on the completion cache to prevent memory leaks.
- **Shell injection in compgen:** Never interpolate user input directly into shell commands. Sanitize `currentWord` before passing to `bash -c`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shell command completion fallback | Custom PATH scanning + fs.readdir | `compgen -c` via bash subprocess | compgen handles builtins, functions, aliases, PATH executables |
| File path completion | Custom glob/readdir walker | `compgen -f` via bash subprocess | Handles tilde expansion, dotfiles, escaping |
| Clipboard access | Direct file descriptor manipulation | `pbcopy` (macOS) / `xclip -selection clipboard` (Linux) | Platform-tested, handles encoding |
| Archive type detection | File magic number parsing | Check file extension + `file --mime-type` fallback | Covers 99% of cases with zero complexity |
| Git branch listing | Parse `.git/refs/` directory | `git branch --list --format='%(refname:short)'` | Handles packed refs, worktrees, bare repos |

**Key insight:** The completion engine is an orchestrator, not a reimplementation. It delegates to existing tools (compgen, git, docker) for dynamic data and only adds the dispatch/cache/timeout layer.

## Common Pitfalls

### Pitfall 1: Shell Injection in compgen
**What goes wrong:** User types `; rm -rf /` and it gets interpolated into `bash -c "compgen -f -- ${currentWord}"`
**Why it happens:** currentWord comes from user input and is passed to a shell
**How to avoid:** Sanitize currentWord: reject strings containing `;`, `|`, `&`, backticks, `$`, `(`, `)`, `{`, `}`. Use `execFile('bash', ['-c', ...])` with careful quoting. Better yet, use the project's `execFileNoThrow` utility from `src/utils/execFileNoThrow.ts` where applicable.
**Warning signs:** Any string concatenation building a shell command

### Pitfall 2: readline completer Blocks Event Loop
**What goes wrong:** A slow completion provider (e.g., network call to Docker API) makes the shell unresponsive
**Why it happens:** Even with async completer, if the Promise never resolves, readline waits indefinitely
**How to avoid:** Always use `Promise.race` with a hard timeout. The 1-second timeout (D-05) and 500ms compgen timeout (D-21) are safety nets. Return empty array on timeout, never throw.
**Warning signs:** Tab key causes visible pause

### Pitfall 3: Cache Key Collision
**What goes wrong:** `git checkout` and `git commit` both cache under the same key if only `commandName` is used
**Why it happens:** The cache key doesn't account for the full command context
**How to avoid:** Use `commandName + ":" + currentWord` as the minimum cache key. For subcommand-aware completion, include the full token path: `git:checkout:currentWord`
**Warning signs:** Tab after `git checkout` shows commit options

### Pitfall 4: readline completer Return Format
**What goes wrong:** Completions don't appear or appear garbled
**Why it happens:** readline expects exactly `[completions: string[], line: string]` where `line` is the substring being completed (used for filtering/highlighting)
**How to avoid:** Always return `[arrayOfMatches, substringBeingCompleted]`. The second element must be the prefix that readline uses to determine what to replace.
**Warning signs:** Double-Tab shows nothing, or shows but doesn't insert on Tab

### Pitfall 5: sudo Toggle Modifying rl.line Directly
**What goes wrong:** Cursor position gets corrupted, prompt re-renders incorrectly
**Why it happens:** `rl.line` is an internal property; direct mutation skips readline's internal bookkeeping
**How to avoid:** To toggle sudo prefix: (1) save current line, (2) clear line with `rl.write(null, { ctrl: true, name: 'u' })`, (3) write new line with `rl.write(newLine)`. This goes through readline's proper channels.
**Warning signs:** Cursor jumps to wrong position after toggle

### Pitfall 6: compgen Not Available on All Systems
**What goes wrong:** `compgen` is a bash builtin -- it fails if the user's default shell is not bash or if bash is not installed
**Why it happens:** compgen only exists inside bash, not as a standalone command
**How to avoid:** Always invoke via `bash -c "compgen ..."`. If bash is not found, silently return empty completions. The exec call already specifies bash explicitly (D-19).
**Warning signs:** "bash: command not found" errors on exotic systems

## Code Examples

### readline/promises Completer Wiring (shell.ts Integration)
```typescript
// Source: Verified empirically on Node.js 22.12.0
// readline/promises supports async completer returning Promise<[string[], string]>
import { createCompletionEngine } from './completions/engine.js'

// In runShell():
const completionEngine = createCompletionEngine(pluginRegistry)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  history: [...historyLines] as string[],
  historySize: config.history_size ?? 10_000,
  terminal: true,
  completer: (
    line: string,
    callback: (err: Error | null, result: [string[], string]) => void,
  ) => {
    completionEngine
      .complete(line)
      .then((result) => callback(null, result))
      .catch(() => callback(null, [[], line]))
  },
})
```

### TTL Cache Implementation
```typescript
// Source: Standard pattern, no external library needed
interface CacheEntry<T> {
  readonly value: T
  readonly expiresAt: number
}

export function createCompletionCache<T>(maxSize: number = 500) {
  const store = new Map<string, CacheEntry<T>>()

  return {
    get(key: string): T | undefined {
      const entry = store.get(key)
      if (entry === undefined) return undefined
      if (Date.now() > entry.expiresAt) {
        store.delete(key)
        return undefined
      }
      return entry.value
    },

    set(key: string, value: T, ttlMs: number): void {
      if (store.size >= maxSize) {
        const firstKey = store.keys().next().value
        if (firstKey !== undefined) store.delete(firstKey)
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
    },

    clear(): void {
      store.clear()
    },
  }
}
```

### CompletionSpec Example (Git)
```typescript
// Source: Fig-style spec pattern adapted to own types (D-12)
import type {
  CompletionSpec,
  CompletionGenerator,
} from '../completions/types.js'
import { promisify } from 'node:util'
import { execFile as execFileCb } from 'node:child_process'

const execFileAsync = promisify(execFileCb)

const gitBranchGenerator: CompletionGenerator = async () => {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['branch', '--list', "--format=%(refname:short)"],
      { timeout: 1000 },
    )
    return stdout.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

export const gitSpec: CompletionSpec = {
  name: 'git',
  subcommands: {
    checkout: {
      name: 'checkout',
      args: [{ name: 'branch', generators: [gitBranchGenerator] }],
      options: [
        { name: ['-b', '--branch'], args: [{ name: 'new-branch' }] },
        { name: ['-f', '--force'] },
      ],
    },
    branch: {
      name: 'branch',
      args: [{ name: 'branch', generators: [gitBranchGenerator] }],
      options: [
        {
          name: ['-d', '--delete'],
          args: [{ name: 'branch', generators: [gitBranchGenerator] }],
        },
        { name: ['-a', '--all'] },
        { name: ['-r', '--remotes'] },
      ],
    },
    // ... more subcommands
  },
}
```

### Compgen Fallback with Sanitization
```typescript
// Source: Standard pattern for safe shell subprocess
import { promisify } from 'node:util'
import { execFile as execFileCb } from 'node:child_process'

const execFileAsync = promisify(execFileCb)

const UNSAFE_CHARS = /[;&|`$(){}'"\\<>!#~]/

export async function compgenComplete(
  currentWord: string,
  type: 'command' | 'file',
): Promise<readonly string[]> {
  // Reject unsafe input (shell injection prevention)
  if (UNSAFE_CHARS.test(currentWord)) return []

  const flag = type === 'command' ? '-c' : '-f'
  const script = `compgen ${flag} -- "${currentWord}"`

  try {
    const { stdout } = await execFileAsync('bash', ['-c', script], {
      timeout: 500,
    })
    return stdout.trim().split('\n').filter(Boolean)
  } catch {
    return [] // Timeout or bash not found -- silent fallback
  }
}
```

### Utility Plugin Pattern (extract)
```typescript
import type { PluginManifest } from '../types.js'

const EXTRACTORS: Readonly<Record<string, readonly string[]>> = {
  '.tar.gz': ['tar', 'xzf'],
  '.tgz': ['tar', 'xzf'],
  '.tar.bz2': ['tar', 'xjf'],
  '.tar.xz': ['tar', 'xJf'],
  '.tar': ['tar', 'xf'],
  '.zip': ['unzip'],
  '.gz': ['gunzip'],
  '.bz2': ['bunzip2'],
  '.xz': ['unxz'],
  '.7z': ['7z', 'x'],
}

export const plugin: PluginManifest = {
  name: 'extract',
  version: '1.0.0',
  description: 'Extract archives with a single command',
  platform: 'all',
  // init registers the 'extract' command via plugin API context
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| zsh compdef functions | Fig-style declarative specs | 2022+ | Specs are data, not code -- easier to write, share, and validate |
| Sync completion blocking shell | Async completion with timeout | Node 22+ readline improvements | Users never experience blocked typing |
| compctl (zsh legacy) | compdef/compadd (zsh modern) | zsh 4.0+ | Nesh skips both -- uses own spec system + compgen fallback |
| Fish completions (Lua-based) | Fish completions (still Lua) | Ongoing | Nesh uses TypeScript specs -- more type-safe, same declarative philosophy |

**Deprecated/outdated:**
- Fig (the company) shut down in 2023, acquired by AWS. The spec format lives on in the community `@withfig/autocomplete` repo but is no longer actively maintained. Using own types per D-12 is the right call.

## Open Questions

1. **readline completer called during paste**
   - What we know: When pasting multi-line text, readline may trigger the completer for intermediate states
   - What's unclear: Whether this causes visible flickering or performance issues
   - Recommendation: Test empirically. If problematic, debounce the completer by 50ms.

2. **Utility plugin count -- is ~40 realistic for this phase?**
   - What we know: OMZ has ~40 "environment/utility" plugins (extract, sudo, copypath, encode64, urltools, etc.)
   - What's unclear: Exact list and which ones are worth porting vs. trivial
   - Recommendation: Start with the 5-10 most popular (extract, sudo, copypath, encode64, urltools, jsontools, web-search, dirhistory). Remaining can be batched.

3. **Keybinding registration for sudo toggle**
   - What we know: readline supports keypress events via `process.stdin.on('keypress')`
   - What's unclear: Whether Escape+Escape detection works reliably (timing-dependent double-press)
   - Recommendation: Start with a simpler keybinding if Escape+Escape proves unreliable. Test empirically.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| bash | compgen fallback | Yes | built-in on macOS/Linux | Return empty completions |
| git | git branch generator | Yes | available | Skip git completions |
| pbcopy | copypath (macOS) | Yes | macOS built-in | -- |
| xclip | copypath (Linux) | N/A (macOS dev) | -- | xsel, wl-copy |
| tar | extract plugin | Yes | available | -- |
| unzip | extract plugin | Yes | available | -- |
| gunzip | extract plugin | Yes | available | -- |
| 7z | extract plugin | No | -- | Skip .7z support, warn user |

**Missing dependencies with no fallback:**
- None -- all critical paths have fallbacks

**Missing dependencies with fallback:**
- 7z not installed -- extract plugin will report "7z not found" for .7z files (non-blocking)

## Project Constraints (from CLAUDE.md)

- **Immutable state**: All registries frozen with `Object.freeze`. ShellState updated via spread, never mutated.
- **Module-per-concern**: New `src/completions/` directory follows existing pattern
- **Error boundaries**: Every async plugin/completion call wrapped in try/catch
- **Two-phase loading**: Completion specs register in Phase 1 (sync data). Generators run lazily on Tab press.
- **No console.log**: Use `process.stderr.write` for debug output
- **ESM only**: `"type": "module"`, use `.js` extensions in imports
- **TypeScript strict mode**: All new types must be readonly
- **Functions < 50 lines, files < 800 lines**: Completion engine decomposed across 5 files
- **No external dependencies**: Cache, spec parser, compgen wrapper are all zero-dependency

## Sources

### Primary (HIGH confidence)
- Node.js 22.12.0 `readline/promises` -- empirically verified async completer support (both callback and Promise patterns)
- Existing codebase: `src/plugins/types.ts`, `src/plugins/registry.ts`, `src/plugins/loader.ts`, `src/plugins/hooks.ts` -- Phase 8 patterns
- Existing codebase: `src/shell.ts` -- readline integration point
- `compgen` -- empirically verified on macOS (command completion: 13 results for "git", file completion works)

### Secondary (MEDIUM confidence)
- Fig-style completion spec format -- based on the public `@withfig/autocomplete` repo conventions, adapted to own types
- OMZ utility plugin list -- based on oh-my-zsh plugin directory structure

### Tertiary (LOW confidence)
- Exact readline behavior during paste operations -- needs empirical testing
- Escape+Escape keybinding reliability for sudo toggle -- timing-dependent, needs testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all Node.js built-ins, empirically verified
- Architecture: HIGH -- extends proven Phase 8 patterns, decisions are locked and detailed
- Pitfalls: HIGH -- readline completer format, shell injection, cache keys are well-understood problems
- Utility plugins: MEDIUM -- exact plugin list and keybinding patterns need empirical validation

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- Node.js readline API unlikely to change)
