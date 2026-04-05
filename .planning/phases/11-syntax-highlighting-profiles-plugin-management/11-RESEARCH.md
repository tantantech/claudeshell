# Phase 11: Syntax Highlighting, Profiles & Plugin Management - Research

**Researched:** 2026-04-05
**Domain:** Node.js readline ANSI rendering, shell tokenization, dynamic ESM import, git subprocess, interactive CLI menus
**Confidence:** HIGH

## Summary

This phase adds three distinct capabilities to Nesh: (1) real-time syntax coloring of the input line using the same output-only rendering pattern already established for auto-suggestions, (2) curated plugin profiles for first-run onboarding, and (3) a full `plugin` builtin CLI with git-based install and hot-reload.

All three capabilities have well-understood implementation paths because the codebase already contains every prerequisite pattern: the `suggestions/` module proves the ANSI overwrite approach works on Node.js 22 readline, `builtins.ts` + `settings.ts` prove the interactive menu pattern, and `loader.ts` + `registry.ts` prove the hot-reload rebuild approach. The unknowns are narrow and low-risk: exact ANSI cursor arithmetic for highlighting (separate from ghost text), `file://` dynamic import for external plugins, and the `compgen -c` subprocess for command validity.

The biggest integration risk is the two-handler coexistence: both highlighting and suggestions attach keypress listeners to `process.stdin`. The suggestions handler calls `clearGhost()` as its first operation each keypress. The highlighting handler must call its own clear+redraw sequence BEFORE the suggestions handler renders ghost text, or the two will overwrite each other. Ordering is controlled by listener registration order in `shell.ts`.

**Primary recommendation:** Implement in four waves — tokenizer (pure function, no I/O), highlighting renderer + keypress attachment, profile system, plugin management CLI + hot-reload.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Syntax Highlighting**
- D-01: Output-only rendering — `rl.line` ALWAYS stays plain text
- D-02: Tokenizer splits input into: command, flags, strings, paths, pipes/operators, arguments
- D-03: Colors — valid commands: green, invalid: red, strings: yellow, flags: cyan, paths: blue, pipes/operators: magenta, arguments: default
- D-04: Command validity from cached `compgen -c` set (startup + refresh every 60s) plus registry aliases
- D-05: Highlighting fires on same keypress event as auto-suggestions
- D-06: 16ms frame budget — skip color update on frame overrun, fall back to plain text
- D-07: New module `src/highlighting/tokenizer.ts` — pure function
- D-08: New module `src/highlighting/renderer.ts` — ANSI colors + stdout write
- D-09: Config field `"highlighting": { "enabled": true }` — default enabled
- D-10: Highlighting renders typed portion; suggestions render ghost suffix after cursor

**Profile System**
- D-11: Five profiles in `src/plugins/profiles.ts` as readonly data
- D-12: Profiles: core, developer, devops, cloud, ai-engineer (additive/cumulative)
- D-13: Additive — devops includes developer which includes core
- D-14: First-run detection: config file missing OR `plugins.enabled` absent
- D-15: Profile selection writes expanded plugin list to `config.plugins.enabled`
- D-16: `plugin profile` re-shows profile selector

**Plugin Management CLI**
- D-17: `plugin` builtin with subcommands: list, enable, disable, install, update, remove, search, doctor, times, profile
- D-18: New module `src/plugin-manager.ts`
- D-19–D-27: Full subcommand behaviors (see CONTEXT.md for details)

**Hot-Reload**
- D-28: Rebuild entire registry via `loadPluginsPhase1`, replace `pluginRegistry` and `hookBus` in shell.ts
- D-29: Install → add to available pool → enable triggers full rebuild
- D-30: No live-patching — always rebuild entire registry
- D-31: `pluginRegistry` and `hookBus` are already `let` variables

**Git Plugin Installation**
- D-32: External plugins in `~/.nesh/plugins/<plugin-name>/`
- D-33: `git clone --depth 1 <repo-url> ~/.nesh/plugins/<name>`
- D-34: Plugin exports `PluginManifest` from `index.ts` or `manifest.ts`
- D-35: Dynamic loading via `import()` with absolute `file://` URL
- D-36: Security: warn before install, show metadata, confirm enable

**Platform Annotations**
- D-37: `PluginManifest.platform` field already exists
- D-38: Loader checks `process.platform` vs manifest `platform` — silent skip on mismatch
- D-39: `plugin list` shows `[macos]`, `[linux]`, `[all]` annotations
- D-40: Platform mismatch is a silent skip

### Claude's Discretion
- Exact `compgen -c` caching mechanism
- Whether to use a worker thread for tokenization (likely unnecessary)
- Plugin doctor output formatting details
- Git clone error handling specifics

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HLGT-01 | Real-time input coloring for commands, strings, flags, paths | Tokenizer + ANSI renderer pattern documented below |
| HLGT-02 | Output-only rendering — rl.line always plain text | Proven by existing suggestions/renderer.ts pattern |
| HLGT-03 | Debounced rendering with 16ms frame budget | `performance.now()` budget check pattern documented |
| HLGT-04 | Highlighting independently disablable in config | SuggestionsConfig pattern in config.ts to replicate |
| MGMT-01 | `plugin` builtin with list/enable/disable/install/update/remove/search/doctor/times | Builtin + settings dispatcher pattern documented |
| MGMT-02 | Install from git repos, stored in ~/.nesh/plugins/ | `git clone --depth 1` + `file://` dynamic import pattern |
| MGMT-03 | Plugin search across bundled catalog | Filter BUNDLED_PLUGINS by name/description |
| MGMT-04 | `plugin doctor` shows failed plugins, load times, recommendations | Registry `getPlugins()` provides PluginEntry[] with status |
| MGMT-05 | Interactive selection menus (like theme/model builtins) | settings.ts + builtins.ts patterns directly reusable |
| MGMT-06 | Hot-reload after enable/disable/install — no shell restart | loadPluginsPhase1 rebuild pattern documented |
| PROF-01 | Curated profiles: core, developer, devops, cloud, ai-engineer | Readonly data objects in profiles.ts |
| PROF-02 | Interactive profile selector at first run or `plugin profile` | rl.question numbered choice pattern from settings.ts |
| PROF-03 | Profiles are additive | Compile expanded list at definition time |
| PROF-04 | Users can customize after selection (add/remove plugins) | enable/disable subcommands after profile sets initial list |
| PORT-06 | Platform annotations in manifest for platform-specific plugins | platform field already in PluginManifest — loader filter needed |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:readline` (built-in) | Node 22 | Keypress events, cursor movement, rl.line | Already used throughout |
| `node:readline.moveCursor` | Node 22 | Cursor repositioning after ANSI write | Used in suggestions/renderer.ts |
| `picocolors` | 1.1.1 | ANSI color codes for highlighting | Already used for prompt/builtins |
| `node:child_process.spawn` | Node 22 | `compgen -c` subprocess for command list | Already used in passthrough.ts |
| `node:fs` | Node 22 | `~/.nesh/plugins/` directory management | Already used in config.ts |
| `node:path` | Node 22 | Plugin path resolution | Already used |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `performance.now()` | Node 22 built-in | 16ms frame budget measurement | Inside highlighting handler before rendering |
| Dynamic `import()` | ESM native | Load external plugin manifests | `plugin install` — loading from `~/.nesh/plugins/` |
| `git clone --depth 1` | System git (2.53.0 verified) | Shallow clone for plugin install | `plugin install <user/repo>` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `compgen -c` subprocess | `PATH` directory scan in JS | compgen is instant and includes aliases/functions; PATH scan misses those |
| `git clone` subprocess | `isomorphic-git` npm package | git subprocess is simpler, no new dependency, already present on target systems |
| `picocolors` ANSI | Raw `\x1b[32m` sequences | picocolors is already a dependency; raw sequences are more flexible for 256-color but unnecessary here |

**Installation:** No new dependencies required. All functionality uses Node.js built-ins and existing project dependencies.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── highlighting/
│   ├── tokenizer.ts      # Pure: tokenize(line) → Token[]
│   └── renderer.ts       # ANSI write + cursor restore (parallel to suggestions/renderer.ts)
├── plugins/
│   ├── profiles.ts       # Readonly profile definitions + expand()
│   └── external.ts       # Dynamic import() for ~/.nesh/plugins/ manifests
├── plugin-manager.ts     # All plugin subcommand implementations
src/builtins.ts           # Add executePlugin dispatcher
src/classify.ts           # Add 'plugin' to BUILTINS set
src/config.ts             # Add HighlightingConfig interface + field
src/shell.ts              # Wire highlighting keypress, first-run detection, plugin builtin case
```

### Pattern 1: Output-Only ANSI Line Rewrite (Highlighting)

**What:** Write colored version of `rl.line` to stdout, then move cursor back to correct position. `rl.line` is never touched.

**When to use:** Any time the visible input line needs color applied without affecting readline's internal state.

**How readline rendering works (Node.js 22, verified by reading suggestions/renderer.ts):**
After readline draws the prompt + current line, the terminal cursor sits at `column = promptWidth + rl.cursor`. To overwrite the visible typed portion:
1. Move cursor left by `rl.cursor` columns to return to start of typed content
2. Write the colored string (same characters, with ANSI escapes)
3. Move cursor right by `rl.cursor` columns to restore position

```typescript
// Source: derived from suggestions/renderer.ts pattern + readline internals
import { moveCursor } from 'node:readline'

export function renderHighlighted(coloredLine: string, cursorPos: number): void {
  if (!process.stdout.isTTY) return
  // Step back to start of typed content
  moveCursor(process.stdout, -cursorPos, 0)
  // Write colored line (same visible length as original)
  process.stdout.write(coloredLine)
  // Return cursor to where readline thinks it is
  moveCursor(process.stdout, -(coloredLine.replace(/\x1b\[[^m]*m/g, '').length - cursorPos), 0)
}
```

**CRITICAL:** The ANSI escape sequences add byte length but zero visible columns. The moveCursor arguments must use visible character counts, not byte lengths. Strip ANSI before measuring.

### Pattern 2: Tokenizer (Pure Function)

**What:** Takes `rl.line` string, returns typed `Token[]`. No side effects, no I/O.

**Token types:**
```typescript
type TokenType = 'command' | 'command-invalid' | 'flag' | 'string' | 'path' | 'operator' | 'argument'

interface Token {
  readonly type: TokenType
  readonly value: string
  readonly start: number  // byte offset in original line
}
```

**Tokenization algorithm:**
1. Split on shell operators (`|`, `&&`, `||`, `;`) — these become `operator` tokens
2. In each segment, first word = command token (check against known-commands set for valid/invalid)
3. Remaining words: starts with `-` → flag, quoted → string, contains `/` → path, else → argument
4. Quoted strings: scan for matching `"` or `'`, treat everything inside as one `string` token

**Shell operator regex:** `/(\|{1,2}|&&|;)/`

**Quote handling:** Simple scanner — walk character by character, track open/close. Do NOT try to handle `$()` or `\`` — this is display-only, correctness on edge cases is acceptable.

### Pattern 3: Command Validity Cache

**What:** Background-populated `Set<string>` of known commands used by the tokenizer to decide green vs red.

```typescript
// src/highlighting/commands.ts
let knownCommands: Set<string> = new Set()
let lastRefresh = 0
const REFRESH_INTERVAL_MS = 60_000

export async function refreshCommandCache(): Promise<void> {
  const { spawn } = await import('node:child_process')
  return new Promise((resolve) => {
    const proc = spawn('bash', ['-c', 'compgen -c'], { stdio: ['ignore', 'pipe', 'ignore'] })
    const chunks: Buffer[] = []
    proc.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk))
    proc.on('close', () => {
      const lines = Buffer.concat(chunks).toString().split('\n').filter(Boolean)
      knownCommands = new Set(lines)
      lastRefresh = Date.now()
      resolve()
    })
    proc.on('error', () => resolve())  // Silent failure — tokenizer falls back to 'command' type
  })
}

export function isKnownCommand(name: string): boolean {
  if (Date.now() - lastRefresh > REFRESH_INTERVAL_MS) {
    // Non-blocking refresh — result available next keypress
    refreshCommandCache().catch(() => {})
  }
  return knownCommands.has(name)
}
```

**Startup:** Call `refreshCommandCache()` once in `runShell()` before the REPL loop (non-blocking with `setImmediate` or fire-and-forget).

### Pattern 4: Two-Handler Keypress Coexistence

**What:** Both highlighting and suggestions use `process.stdin.on('keypress', handler)`. Multiple listeners on Node.js EventEmitter fire in registration order.

**Ordering requirement:** Highlighting must fire BEFORE suggestions on each keypress.

**Registration order in shell.ts:**
```typescript
// Register highlighting FIRST
const highlightingCleanup = setupHighlighting(rl, config, pluginRegistry)
// Register suggestions SECOND (already returns cleanup)
const suggestionsCleanup = setupAutoSuggestions(rl, config)
```

**Why this matters:** The suggestions handler calls `clearGhost()` (wipes the ghost text suffix) as its first operation. If highlighting ran after and redrew the line without the ghost text context, cursor positioning would be off. Firing highlighting first means: highlight the typed portion → suggestions then clears previous ghost → suggestions re-renders ghost.

**The sequence per keypress:**
1. Highlighting handler: check 16ms budget, tokenize `rl.line`, write colored line, restore cursor
2. Suggestions handler: `clearGhost()`, check for right-arrow acceptance, schedule debounced ghost render

**Important:** readline fires keypress events AFTER updating `rl.line` and `rl.cursor` (verified for Node.js 22 by the existing suggestions tests which rely on this ordering).

### Pattern 5: Dynamic Import for External Plugins

**What:** Load `PluginManifest` from an external TypeScript/JavaScript file in `~/.nesh/plugins/`.

**The problem:** External plugins are TypeScript source. They need to be pre-compiled or the user's system needs `tsx`/`ts-node`. Since Nesh bundles to a single `dist/cli.js`, external plugins cannot be TypeScript — they must be JavaScript.

**Decision:** External plugins ship as JavaScript (`index.js` or `manifest.js`). The install step warns users. For plugins installed from git, the repo should include a built `index.js`.

```typescript
// src/plugins/external.ts
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { PluginManifest } from './types.js'

export async function loadExternalPlugin(pluginDir: string): Promise<PluginManifest | null> {
  const candidates = ['index.js', 'manifest.js']
  for (const filename of candidates) {
    const fullPath = path.join(pluginDir, filename)
    try {
      const fileUrl = pathToFileURL(fullPath).href
      const mod = await import(fileUrl)  // Dynamic ESM import with file:// URL
      const manifest = mod.default ?? mod.plugin ?? mod.manifest
      if (isValidManifest(manifest)) return manifest
    } catch {
      continue
    }
  }
  return null
}
```

**`pathToFileURL`** (from `node:url`) handles path-to-URL conversion correctly on all platforms, including Windows paths with drive letters (though Windows is out of scope for v3.0).

**Cache busting:** Node.js module cache caches dynamic imports by URL. For hot-reload after `plugin update`, append `?v=${Date.now()}` to force re-import:
```typescript
const fileUrl = pathToFileURL(fullPath).href + `?v=${Date.now()}`
```

### Pattern 6: Hot-Reload Sequence

**What:** Rebuild entire registry from scratch after enable/disable/install. Shell.ts `let` variables get new values.

**Current shell.ts variables (verified):**
```typescript
let pluginRegistry: PluginRegistry  // line 55
let hookBus: HookBus                // line 56
let enabledPlugins: readonly PluginManifest[]  // line 57
```

**Hot-reload function (lives in plugin-manager.ts, called with references to shell vars):**
```typescript
export async function hotReload(
  config: NeshConfig,
  allPlugins: readonly PluginManifest[],  // BUNDLED + external
): Promise<{ registry: PluginRegistry; hookBus: HookBus; enabled: readonly PluginManifest[] }> {
  const freshConfig = loadConfig()  // Re-read config (enable/disable already saved it)
  const phase1 = loadPluginsPhase1(freshConfig.plugins ?? {}, allPlugins)
  const newRegistry = phase1.registry
  const newEnabled = phase1.enabledPlugins
  const newHookBus = buildHookBus(newEnabled)
  // Phase 2 async init for newly-enabled plugins
  setImmediate(async () => {
    await loadPluginsPhase2(newEnabled, { cwd: process.cwd() })
  })
  return { registry: newRegistry, hookBus: newHookBus, enabled: newEnabled }
}
```

**Shell.ts hot-reload integration:** The `executePlugin` case in the builtin switch calls `hotReload`, then reassigns:
```typescript
case 'plugin': {
  const result = await executePlugin(action.args, rl, {
    pluginRegistry, hookBus, enabledPlugins, safeMode,
    onHotReload: (r) => {
      pluginRegistry = r.registry
      hookBus = r.hookBus
      enabledPlugins = r.enabled
    }
  })
  break
}
```

### Pattern 7: First-Run Profile Detection

**What:** Detect first run and show profile selector before entering the REPL loop.

**Detection logic (D-14):**
```typescript
function isFirstRun(config: NeshConfig): boolean {
  // No config file: CONFIG_PATH doesn't exist
  // OR config file exists but plugins.enabled is absent/empty
  try {
    fs.accessSync(CONFIG_PATH)
    return !config.plugins?.enabled || config.plugins.enabled.length === 0
  } catch {
    return true  // ENOENT: config file doesn't exist
  }
}
```

**In shell.ts, before the REPL while loop:**
```typescript
if (!safeMode && isFirstRun(config)) {
  await executeProfileSelector(rl)
  // Reload config after profile selection
  // (profile selector writes to config.plugins.enabled)
}
```

### Pattern 8: Interactive Plugin Menu

**What:** Standard numbered-choice menu pattern from `settings.ts` / `builtins.ts`. Identical structure throughout.

```typescript
// From settings.ts — the exact pattern to replicate
process.stdout.write('\nProfile:\n\n')
for (let i = 0; i < PROFILES.length; i++) {
  const p = PROFILES[i]
  process.stdout.write(`  [${i + 1}] ${p.name}  — ${p.description}\n`)
  process.stdout.write(`      Plugins: ${p.plugins.join(', ')}\n\n`)
}
const answer = await rl.question(`Select (1-${PROFILES.length}): `)
const num = parseInt(answer.trim(), 10)
```

### Anti-Patterns to Avoid

- **Mutating rl.line for color:** `rl.line` must remain plain text at all times. Any color must be written to stdout separately.
- **Measuring byte length instead of visible length for cursor math:** ANSI escapes have zero visible width. Always strip ANSI (`/\x1b\[[^m]*m/g`) before passing length to `moveCursor`.
- **Registering suggestions before highlighting:** Listener order matters — highlighting must fire first.
- **TypeScript external plugins:** External plugins at `~/.nesh/plugins/` must be JavaScript. Document this clearly in `plugin install` output.
- **Awaiting compgen in the keypress handler:** Command cache refresh must be non-blocking fire-and-forget. The keypress handler runs synchronously against the in-memory Set.
- **Skipping `--depth 1` on git clone:** Full clone of a plugin repo could be hundreds of MB. Always shallow clone.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ANSI strip for length | Custom regex | `/\x1b\[[^m]*m/g` inline | Simple, correct for standard ANSI SGR sequences |
| File URL construction | String concat `"file://"` | `pathToFileURL()` from `node:url` | Handles spaces, special chars, platform differences |
| Command list | Manual PATH scan | `compgen -c` subprocess | Includes shell builtins, functions, aliases — PATH scan misses these |
| Shell tokenization | Full POSIX parser | Simple token scanner | Display-only — 100% correctness not required, simple is correct enough |
| Module cache busting | Custom module registry | `?v=${Date.now()}` query param on `file://` URL | Node.js module cache is keyed by URL including query string |

**Key insight:** The hardest parts (ANSI rendering, registry rebuild, interactive menus) are all already implemented in the codebase. This phase extends, not invents.

## Common Pitfalls

### Pitfall 1: Cursor Position After Colored Line Write

**What goes wrong:** After writing a colored string (which has extra bytes for ANSI escapes), `moveCursor` is called with the wrong offset, placing the cursor at the wrong column.

**Why it happens:** ANSI escape sequences like `\x1b[32m` are 5 bytes but 0 visible columns. If you pass the byte length to `moveCursor`, the cursor ends up N positions to the right of where readline thinks it is. Next keypress will draw characters at the wrong position.

**How to avoid:** Always compute visible length by stripping ANSI before measuring:
```typescript
function visibleLength(s: string): number {
  return s.replace(/\x1b\[[^m]*m/g, '').length
}
// moveCursor uses visible length, not s.length
moveCursor(process.stdout, -(visibleLength(coloredLine) - cursorPos), 0)
```

**Warning signs:** Characters appear duplicated or at wrong position; line seems to "shift" on keypresses.

### Pitfall 2: rl.line Timing (Read AFTER keypress fires)

**What goes wrong:** `rl.line` is read before readline updates it for the current keypress, giving stale content.

**Why it happens:** In some Node.js versions, the keypress event fires before `rl.line` is updated.

**How to avoid:** This is already proven safe in the suggestions handler — the suggestions tests mock `rl.line` and the handler reads `rl.line` inside the debounced callback (not in the synchronous handler body), which runs after readline has settled. For highlighting, reading `rl.line` synchronously at the top of the keypress handler is what the suggestions handler does (`clearGhost` then immediately reads `rl.line`). This works on Node.js 22 (verified by existing tests).

**Warning signs:** Highlighted word is always one character behind what's visible.

### Pitfall 3: Ghost Text and Highlighting Cursor Arithmetic Conflict

**What goes wrong:** When both handlers fire, their cursor movements stack. If suggestions `clearGhost()` moves cursor right (to erase ghost), and highlighting then moves cursor left to rewrite the line, the cursor ends up at an unpredictable column.

**Why it happens:** `clearGhost()` writes `\x1b[K` (erase to end of line) — this does NOT move the cursor. It's safe. The only cursor-moving operations are in `renderGhost` (`moveCursor(stdout, -suffix.length, 0)` to move back after ghost) and the highlighting renderer. Since clearGhost doesn't move the cursor, the two don't interact via cursor position.

**How to avoid:** Highlighting fires first, redraws colored line, restores cursor to `rl.cursor` column after prompt. Suggestions fires second, calls `clearGhost()` (cursor stays), then schedules ghost render debounced. The only conflict would be if highlighting ran AFTER ghost was drawn (cursor would be at wrong position). Registration order prevents this.

### Pitfall 4: Dynamic Import Cache for External Plugins

**What goes wrong:** After `plugin update`, the old cached module is returned by `import()` — the updated plugin code is never loaded.

**Why it happens:** Node.js caches ESM modules by URL. The same `file:///Users/.../.nesh/plugins/foo/index.js` URL always returns the cached module.

**How to avoid:** Append a cache-busting query string:
```typescript
const url = pathToFileURL(fullPath).href + `?t=${Date.now()}`
const mod = await import(url)
```

**Warning signs:** `plugin update foo` succeeds but old behavior persists; `plugin doctor` still shows old version.

### Pitfall 5: Platform Check in Loader (PORT-06)

**What goes wrong:** Plugins with `platform: 'macos'` load on Linux, causing failures or unexpected behavior.

**Why it happens:** The current `loadPluginsPhase1` in `loader.ts` does not filter by platform — it only filters by `config.enabled`.

**How to avoid:** Add platform check in `loadPluginsPhase1` before building registry:
```typescript
const platformOk = (p: PluginManifest) =>
  !p.platform || p.platform === 'all' ||
  (p.platform === 'macos' && process.platform === 'darwin') ||
  (p.platform === 'linux' && process.platform === 'linux')

const enabled = bundled.filter(p => enabledNames.has(p.name) && platformOk(p))
```

This is a one-liner addition to the existing filter in `loader.ts` line 16.

**Warning signs:** `brew`-based plugins fail on Linux; `apt`-based plugins fail on macOS.

### Pitfall 6: Shell.ts BuiltinName Type and BUILTINS Set

**What goes wrong:** Adding `'plugin'` as a new builtin but forgetting to update both `BuiltinName` type in `types.ts` AND the `BUILTINS` set in `classify.ts`.

**Why it happens:** Two separate places define what counts as a builtin — the type union and the runtime set. Missing either one causes either a type error or a runtime miss where `plugin` falls through to passthrough.

**How to avoid:** Both must be updated:
- `src/types.ts`: `BuiltinName` union — add `'plugin'`
- `src/classify.ts`: `BUILTINS` set — add `'plugin'`

## Code Examples

### Verified: How suggestions/renderer.ts writes ANSI without touching rl.line

```typescript
// Source: src/suggestions/renderer.ts (lines 17-22)
export function renderGhost(suffix: string): void {
  if (!suffix || !process.stdout.isTTY) return
  process.stdout.write(`\x1b[2m${suffix}\x1b[0m`)
  moveCursor(process.stdout, -suffix.length, 0)
  ghostLength = suffix.length
}
```

The highlighting renderer follows the same pattern: write colored content, use `moveCursor` to restore cursor position.

### Verified: How setupAutoSuggestions attaches keypress handler

```typescript
// Source: src/suggestions/index.ts (lines 48-50)
const handler = createKeypressHandler(rl, history, filters, debounceMs)
process.stdin.on('keypress', handler)
return () => { process.stdin.removeListener('keypress', handler) }
```

The highlighting setup follows exactly this pattern. Returns cleanup function. Registered before suggestions in shell.ts.

### Verified: How shell.ts rebuilds from loadPluginsPhase1 (hot-reload model)

```typescript
// Source: src/shell.ts (lines 62-67)
const phase1 = loadPluginsPhase1(pluginConfig, BUNDLED_PLUGINS)
pluginRegistry = phase1.registry
enabledPlugins = phase1.enabledPlugins
hookBus = buildHookBus(enabledPlugins)
```

Hot-reload calls this same sequence with updated config and expanded plugin pool (BUNDLED + external).

### Verified: How config.ts adds a new feature config field

```typescript
// Source: src/config.ts (lines 38-42) — SuggestionsConfig pattern to replicate for HighlightingConfig
export interface SuggestionsConfig {
  readonly enabled?: boolean
  readonly debounce_ms?: number
  readonly sensitive_patterns?: readonly string[]
}
```

HighlightingConfig:
```typescript
export interface HighlightingConfig {
  readonly enabled?: boolean
}
```

Then add to `NeshConfig`:
```typescript
readonly highlighting?: HighlightingConfig
```

And add parse in `loadConfig()` using same `validateSuggestionsConfig` structural pattern.

### Verified: BuiltinName must be updated in two places

```typescript
// Source: src/types.ts (line 1)
export type BuiltinName = 'cd' | 'exit' | 'quit' | 'clear' | 'export' | 'theme' | 'model' | 'keys' | 'settings' | 'aliases'
// ADD: | 'plugin'

// Source: src/classify.ts (line 4)
const BUILTINS: ReadonlySet<string> = new Set(['cd', 'exit', 'quit', 'clear', 'export', 'theme', 'model', 'keys', 'settings', 'aliases'])
// ADD: 'plugin'
```

### Verified: Interactive menu pattern from settings.ts

```typescript
// Source: src/settings.ts (lines 80-90) — exact pattern to replicate
process.stdout.write('\nPermission mode:\n\n')
for (let i = 0; i < PERMISSIONS_OPTIONS.length; i++) {
  const opt = PERMISSIONS_OPTIONS[i]
  const marker = opt === current ? pc.green(' *') : '  '
  process.stdout.write(`  [${i + 1}] ${opt}${marker}\n`)
}
const answer = await rl.question(`Select (1-${PERMISSIONS_OPTIONS.length}): `)
const num = parseInt(answer.trim(), 10)
```

### External Plugin Load with Cache-Busting

```typescript
// src/plugins/external.ts — pattern for dynamic ESM import
import { pathToFileURL } from 'node:url'
import path from 'node:path'

export async function loadExternalPlugin(pluginDir: string): Promise<PluginManifest | null> {
  const candidates = ['index.js', 'manifest.js']
  for (const filename of candidates) {
    const fullPath = path.join(pluginDir, filename)
    try {
      const url = pathToFileURL(fullPath).href + `?t=${Date.now()}`
      const mod = await import(url)
      const manifest: unknown = mod.default ?? mod.plugin ?? mod.manifest
      if (isValidManifest(manifest)) return manifest as PluginManifest
    } catch {
      continue
    }
  }
  return null
}
```

### Manifest Validation Type Guard

```typescript
// Simple type guard — prevents loading malformed external plugins
function isValidManifest(v: unknown): v is PluginManifest {
  if (typeof v !== 'object' || v === null) return false
  const m = v as Record<string, unknown>
  return typeof m.name === 'string' &&
         typeof m.version === 'string' &&
         typeof m.description === 'string'
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Shell syntax highlighting via zsh widget | Node.js readline ANSI overwrite | This phase | No zsh dependency; output-only is the correct pattern for readline |
| Plugin management via `.zshrc` manual edits | Interactive `plugin` builtin | This phase | UX parity with oh-my-zsh but without shell restart |
| `require()` for dynamic plugin load | `import()` with `file://` URL | ESM era (Node 12+) | Required for `"type": "module"` projects like Nesh |

## Open Questions

1. **Highlighting and rl.line multi-line input**
   - What we know: `rl.line` contains only the current line; readline handles multi-line via continuation
   - What's unclear: Does highlighting need to handle multi-line? (Probably not for v3.0 — shell commands are single-line)
   - Recommendation: Treat `rl.line` as single-line only; skip highlighting if `rl.line` contains embedded newlines

2. **compgen availability on non-bash systems**
   - What we know: `compgen` is a bash built-in; most macOS/Linux systems have `/bin/bash`
   - What's unclear: Edge case where bash is not at `/bin/bash`
   - Recommendation: Use `bash -c 'compgen -c'` explicitly; catch spawn error and fall back to empty set (all commands get neutral color, not red)

3. **External plugin TypeScript compilation**
   - What we know: Nesh bundles to single `dist/cli.js`; external plugins must be JS
   - What's unclear: Whether plugin authors will accept JS-only requirement
   - Recommendation: Document clearly in `plugin install` output; in Phase 12, revisit if community requests TypeScript support via `tsx` transpilation at install time

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22 | All features | ✓ | v22.12.0 | — |
| git | `plugin install`, `plugin update` | ✓ | 2.53.0 | Warn user, skip install subcommand |
| bash | `compgen -c` for command cache | ✓ (macOS/Linux standard) | System | Fall back to empty command set (no green/red — all neutral) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- git not present: `plugin install` and `plugin update` display "git is required" message and return early; all other plugin subcommands still work.

## Project Constraints (from CLAUDE.md)

| Directive | Source | Impact on Phase 11 |
|-----------|--------|-------------------|
| `"type": "module"` — ESM only | CLAUDE.md tech stack | External plugins must be `.js` ESM modules; use `import()` not `require()` |
| TypeScript strict mode | CLAUDE.md tech stack | All new modules need explicit types; no `any` without cast |
| Immutable state: never mutate, use spread | CLAUDE.md key patterns | `ShellState` updates in shell.ts via spread; plugin-manager returns new objects |
| `picocolors` for colors | CLAUDE.md tech stack | Use `pc.green`, `pc.cyan`, etc. for highlighting colors — no raw ANSI in new code |
| Vitest for tests | CLAUDE.md commands | Test files in `tests/` directories; mock pattern from `tests/suggestions/keypress.test.ts` |
| No `console.log` in production | Global CLAUDE.md | Use `process.stdout.write` / `process.stderr.write` |
| Functions < 50 lines, files < 800 lines | Global CLAUDE.md | Split plugin-manager.ts into subcommand modules if it grows beyond 800 lines |
| `tsdown` build — single `dist/cli.js` | CLAUDE.md build | No dynamic `require` of TypeScript; external plugins must be pre-built JS |
| Error boundaries on all plugin lifecycle | Accumulated context (Phase 8) | `loadExternalPlugin` must be wrapped in try/catch — never propagate external plugin errors |

## Sources

### Primary (HIGH confidence)
- Source code: `src/suggestions/renderer.ts` — ANSI overwrite pattern, `moveCursor` usage
- Source code: `src/suggestions/keypress.ts` — keypress handler pattern, debounce, listener registration
- Source code: `src/suggestions/index.ts` — `process.stdin.on('keypress', handler)` listener pattern
- Source code: `src/shell.ts` — `let pluginRegistry`, `let hookBus` (reassignable for hot-reload)
- Source code: `src/plugins/loader.ts` — `loadPluginsPhase1` rebuild entry point
- Source code: `src/plugins/registry.ts` — `buildRegistry` immutable construction
- Source code: `src/plugins/hooks.ts` — `buildHookBus` for hot-reload
- Source code: `src/config.ts` — `SuggestionsConfig` pattern to replicate for `HighlightingConfig`
- Source code: `src/settings.ts` — numbered menu pattern to replicate for plugin subcommands
- Source code: `src/classify.ts` — `BUILTINS` set; `src/types.ts` — `BuiltinName` type
- Node.js docs: `node:readline` `moveCursor`, keypress events — Node 22 LTS
- Node.js docs: `pathToFileURL` from `node:url` — standard file URL construction

### Secondary (MEDIUM confidence)
- Node.js ESM docs: Dynamic `import()` with `file://` URLs — module cache behavior and query-string cache busting
- POSIX: `compgen -c` enumerates all commands (builtins + PATH + aliases + functions) in bash

### Tertiary (LOW confidence)
- Cache-busting via query string on `file://` URL: documented behavior in Node.js module cache; needs empirical verification that Nesh's build (tsdown/Rolldown bundler) doesn't interfere

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already in project, no new packages
- Architecture patterns: HIGH — directly derived from existing codebase patterns
- ANSI cursor math: HIGH — `moveCursor` behavior is well-documented; pitfall documented with fix
- Dynamic import cache-busting: MEDIUM — standard pattern but not tested in this codebase yet
- Pitfalls: HIGH — derived from code reading; all have concrete fixes

**Research date:** 2026-04-05
**Valid until:** 2026-07-05 (stable Node.js APIs, no fast-moving dependencies)
