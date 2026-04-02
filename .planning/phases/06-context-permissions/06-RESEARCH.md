# Phase 6: Context & Permissions - Research

**Researched:** 2026-03-31
**Domain:** Project context detection, SDK permission control, per-project configuration
**Confidence:** HIGH

## Summary

Phase 6 adds three distinct but interconnected capabilities to ClaudeShell: (1) automatic project context detection that enriches AI system prompts with project type, name, and key dependencies; (2) configurable permission modes that control whether AI tool use is auto-approved, prompted, or denied; and (3) per-project `.claudeshell.json` config files that override global settings.

All three features require ZERO new dependencies. Project detection uses `node:fs` to scan for marker files. Permission control uses the Claude Agent SDK's built-in `permissionMode` and `canUseTool` callback. Per-project config reuses the existing `loadConfig()` pattern with JSON merge. The main integration challenge is wiring these into the existing `executeAI()` call and triggering re-detection on `cd`.

**Primary recommendation:** Implement as three independent modules (`src/context.ts` for detection, extended `src/config.ts` for project config, permission logic in `src/ai.ts`) with a shared trigger point in `executeCd()` for re-detection.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Create `src/context.ts` module that scans cwd for project marker files
- D-02: Marker files: `package.json` (Node.js), `Cargo.toml` (Rust), `go.mod` (Go), `pyproject.toml`/`requirements.txt` (Python), `Gemfile` (Ruby), `pom.xml`/`build.gradle` (Java), `Makefile`, `docker-compose.yml`
- D-03: Extract key info from detected markers: project name, language, framework hints
- D-04: For `package.json`: read name, scripts keys, main dependencies (first 10)
- D-05: For other markers: just detect presence and language -- do not parse complex formats
- D-06: Build a `ProjectContext` object: `{ type: string, name?: string, markers: string[], summary: string }`
- D-07: Include project context in AI system prompt: "You are in a [type] project called [name]. Key deps: [list]."
- D-08: Re-detect on `cd` (project context may change when navigating directories)
- D-09: Cache detection result per directory -- do not re-scan every `a` command
- D-10: Three permission modes: `"auto"` (approve all -- current behavior), `"ask"` (prompt per action), `"deny"` (block all file/command actions)
- D-11: Default mode: `"auto"` (matches current v1 behavior with `acceptEdits`)
- D-12: Config field: `"permissions": "auto"` in global and per-project config
- D-13: In "ask" mode, use SDK `permissionMode: "default"` which triggers `canUseTool` callback
- D-14: Display format: `Claude wants to [action] [target]. Allow? (y/n) ` -- inline, single line
- D-15: For file edits: show `edit src/types.ts`. For commands: show `run npm test`
- D-16: User types `y`/`n`/`yes`/`no` -- anything else repeats the question
- D-17: In "deny" mode, use SDK `permissionMode: "plan"` -- AI can suggest but not execute
- D-18: Permission mode stored in ShellState, changeable via `/permissions <mode>` in chat mode
- D-19: Check for `.claudeshell.json` in current working directory
- D-20: Per-project config merges over global: `{ ...globalConfig, ...projectConfig }`
- D-21: Supported overrides: `model`, `prefix`, `permissions`, `api_key`
- D-22: Re-load per-project config on `cd` (same trigger as project context re-detection)
- D-23: Per-project config is optional -- shell works without it
- D-24: Invalid JSON in `.claudeshell.json`: warn to stderr, use global config only
- D-25: Create `loadProjectConfig()` in `src/config.ts` -- returns partial config or null

### Claude's Discretion
- Exact system prompt template for project context
- Whether to show "Detected: Node.js project" on shell startup
- How verbose the permission prompt should be (show full file path vs relative)
- Whether to support `.claudeshell.json` in parent directories (walking up)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTX-01 | Shell detects project type from markers and includes project context in AI system prompt | SDK `systemPrompt` option verified (string or object); `node:fs.existsSync` for marker detection; `ProjectContext` type design documented |
| CTX-02 | User can place `.claudeshell.json` in any directory for per-project config overrides | `loadProjectConfig()` pattern documented; JSON merge with spread operator; re-load on `cd` via `executeCd` hook |
| PERM-01 | User can configure permission mode (auto-approve, ask-each-time, deny-all) | SDK `PermissionMode` type verified: `'acceptEdits'` for auto, `'default'` for ask, `'plan'` for deny |
| PERM-02 | When permission mode is "ask", user sees what Claude wants to do and can approve/deny inline | SDK `canUseTool` callback signature verified with `title`, `displayName`, `description` fields |
| PERM-03 | Permission mode configurable globally and per-project | Config merge pattern (global + project) supports `permissions` field; `/permissions` slash command for runtime change |
| CFG-02 | Per-project `.claudeshell.json` overrides global config when present | Spread merge `{ ...globalConfig, ...projectConfig }` pattern; same validation as `loadConfig()` |
</phase_requirements>

## Standard Stack

### Core (no additions needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/claude-agent-sdk | ^0.2.90 | Permission modes, canUseTool callback, systemPrompt | All permission/context features are SDK-native |
| node:fs | built-in | Project marker file detection | existsSync + readFileSync for marker scanning |
| node:path | built-in | Path resolution for project config | resolve, join for .claudeshell.json lookup |
| picocolors | ^1.1.1 | Permission prompt styling | Already a dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual fs.existsSync | cosmiconfig | Overkill -- we check known filenames, not arbitrary config formats |
| JSON.parse for package.json | @npmcli/package-json | Extra dependency for reading 3 fields (name, scripts, deps) |
| Manual config merge | deepmerge | Spread operator is sufficient for flat config; no nested merge needed |

## Architecture Patterns

### Recommended Project Structure
```
src/
  context.ts          # NEW: Project detection (detectProject, ProjectContext)
  config.ts           # EXTENDED: loadProjectConfig(), permissions field
  ai.ts               # MODIFIED: permissionMode mapping, canUseTool, system prompt
  shell.ts            # MODIFIED: init context on startup, refresh on cd
  builtins.ts         # MODIFIED: executeCd triggers re-detection
  chat.ts             # MODIFIED: /permissions slash command
  types.ts            # MODIFIED: ShellState gets projectContext, permissionMode
```

### Pattern 1: Project Context Detection (src/context.ts)
**What:** New module that scans cwd for project marker files and builds a `ProjectContext` object.
**When to use:** On shell startup and after every `cd`.
**Implementation:**

```typescript
// Source: Verified against SDK sdk.d.ts lines 1353-1365
export interface ProjectContext {
  readonly type: string        // "Node.js", "Rust", "Go", etc.
  readonly name?: string       // from package.json name, etc.
  readonly markers: readonly string[]  // files found
  readonly summary: string     // human-readable for system prompt
}

// Marker detection map
const MARKERS: ReadonlyArray<{ readonly file: string; readonly type: string }> = [
  { file: 'package.json', type: 'Node.js' },
  { file: 'Cargo.toml', type: 'Rust' },
  { file: 'go.mod', type: 'Go' },
  { file: 'pyproject.toml', type: 'Python' },
  { file: 'requirements.txt', type: 'Python' },
  { file: 'Gemfile', type: 'Ruby' },
  { file: 'pom.xml', type: 'Java' },
  { file: 'build.gradle', type: 'Java' },
  { file: 'Makefile', type: 'C/C++' },
  { file: 'docker-compose.yml', type: 'Docker' },
]

// Cache: Map<dirPath, ProjectContext | null>
const contextCache = new Map<string, ProjectContext | null>()

export function detectProject(cwd: string): ProjectContext | null {
  const cached = contextCache.get(cwd)
  if (cached !== undefined) return cached
  // ... scan markers, build context, cache result
}

export function clearContextCache(): void {
  contextCache.clear()
}
```

### Pattern 2: Permission Mode Mapping
**What:** Map ClaudeShell's three user-facing modes to SDK's five permission modes.
**Implementation:**

```typescript
// ClaudeShell user-facing modes -> SDK PermissionMode
// "auto"  -> 'acceptEdits'   (current v1 behavior)
// "ask"   -> 'default'       (triggers canUseTool callback)
// "deny"  -> 'plan'          (AI suggests, no execution)

type ClaudeShellPermission = 'auto' | 'ask' | 'deny'

function toSDKPermissionMode(mode: ClaudeShellPermission): PermissionMode {
  switch (mode) {
    case 'auto': return 'acceptEdits'
    case 'ask':  return 'default'
    case 'deny': return 'plan'
  }
}
```

### Pattern 3: canUseTool Callback (for "ask" mode)
**What:** SDK callback that prompts the user inline for permission.
**SDK signature (verified from sdk.d.ts lines 146-188):**

```typescript
type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  options: {
    signal: AbortSignal
    suggestions?: PermissionUpdate[]
    blockedPath?: string
    decisionReason?: string
    title?: string        // e.g. "Claude wants to read foo.txt"
    displayName?: string  // e.g. "Read file"
    description?: string  // human-readable subtitle
    toolUseID: string
    agentID?: string
  }
) => Promise<PermissionResult>

// PermissionResult is a discriminated union:
type PermissionResult =
  | { behavior: 'allow'; updatedInput?: Record<string, unknown>; updatedPermissions?: PermissionUpdate[] }
  | { behavior: 'deny'; message: string; interrupt?: boolean }
```

**Implementation approach:** Use the SDK-provided `title` field when available (it renders the full prompt sentence). Fall back to constructing from `toolName` + `input`. Read y/n from readline.

### Pattern 4: Per-Project Config Loading
**What:** Read `.claudeshell.json` from cwd, merge over global config.
**Implementation:**

```typescript
export function loadProjectConfig(cwd: string): Partial<ClaudeShellConfig> | null {
  const configPath = path.join(cwd, '.claudeshell.json')
  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    // Validate same fields as loadConfig()
    return validatedPartial
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'ENOENT') return null
    process.stderr.write(`Warning: invalid .claudeshell.json: ${error.message}\n`)
    return null
  }
}

export function mergeConfigs(
  global: ClaudeShellConfig,
  project: Partial<ClaudeShellConfig> | null
): ClaudeShellConfig {
  if (!project) return global
  return { ...global, ...project }
}
```

### Pattern 5: System Prompt Enrichment
**What:** Append project context to the existing system prompt in `buildSystemPrompt()`.
**Implementation:**

```typescript
function buildSystemPrompt(cwd: string, projectContext: ProjectContext | null): string {
  const lines = [
    'You are ClaudeShell, an AI assistant running inside a terminal shell.',
    `Current directory: ${cwd}`,
    `OS: ${process.platform}`,
    `Node: ${process.version}`,
  ]
  if (projectContext) {
    lines.push(`Project: ${projectContext.summary}`)
  }
  return lines.join('\n')
}
```

### Anti-Patterns to Avoid
- **Parsing complex config files:** D-05 says only detect presence for non-package.json markers. Do NOT parse TOML, YAML, or XML.
- **Mutating ShellState:** Always use spread: `state = { ...state, projectContext: newContext }`
- **Re-scanning on every AI call:** D-09 requires caching per directory. Only invalidate on `cd`.
- **Blocking readline for permission prompts:** The `canUseTool` callback is async, but must not deadlock readline. Use a separate question mechanism or direct stdin read.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Permission prompting | Custom tool interception | SDK `canUseTool` callback | SDK provides `title`, `displayName`, `description`; handles edge cases like subagent permissions |
| Permission modes | Custom allow/deny logic | SDK `permissionMode` option | SDK enforces modes at the tool execution layer; custom logic would be bypassed |
| Tool deny lists | Custom tool filtering | SDK `disallowedTools` option | SDK removes tools from model context entirely |
| Session permission state | Custom session metadata | Store in ShellState + reapply on resume | Simple state field, not worth a separate persistence layer |

**Key insight:** The SDK's permission system is comprehensive (5 modes + callback + allow/deny lists). ClaudeShell only needs to map its 3 user-facing modes to SDK options and implement the `canUseTool` prompt UI for "ask" mode.

## Common Pitfalls

### Pitfall 1: Permission Escalation Through Session Resume
**What goes wrong:** A session created with "deny" mode is resumed with "auto" mode. The AI now has tool access it did not have before.
**Why it happens:** The SDK applies the *current query's* permission options, not the original session's. Session resume restores conversation but not permission context.
**How to avoid:** Store the permission mode in ShellState alongside the session ID. When resuming, restore the same permission mode. For this phase, the simple approach is sufficient: permission mode is a runtime setting, and the user controls it explicitly.
**Warning signs:** AI executes tools in a resumed session when the original session denied them.

### Pitfall 2: canUseTool Blocks readline
**What goes wrong:** In "ask" mode, the `canUseTool` callback needs to prompt the user for y/n. But readline is already in use by the shell/chat prompt. Two concurrent readline questions deadlock or corrupt input.
**Why it happens:** `canUseTool` is called during `executeAI()` while the stream is active. The readline interface might be paused but is still the active input handler.
**How to avoid:** Use `process.stdin` directly (not readline) for the permission prompt. Write the prompt to stderr, read a single line from stdin. Alternatively, since readline is paused during AI streaming (the `for await` loop), it may be safe to use `rl.question()` -- but test this carefully.
**Warning signs:** Shell hangs when AI tries to use a tool in "ask" mode.

### Pitfall 3: Stale Context Cache After External cd
**What goes wrong:** The user runs a shell command that changes directories (e.g., a script that calls `cd`), but the context cache still has the old directory's project info.
**Why it happens:** ClaudeShell only tracks `cd` through its builtin handler. External processes run via `executeCommand()` cannot change the shell's `process.cwd()`. This is actually NOT a problem -- child processes get their own cwd. But if a user does `a "change to src directory"` and the AI runs `cd src` via Bash tool, the shell's cwd does not change.
**How to avoid:** Only invalidate cache on the builtin `cd` command. Document that AI-executed `cd` does not change the shell's working directory (this is already the v1 behavior and is correct).
**Warning signs:** None -- this is expected Unix behavior.

### Pitfall 4: package.json Read Errors
**What goes wrong:** package.json exists but is malformed, very large, or has unexpected structure. Reading it throws or returns nonsensical data.
**Why it happens:** Real-world package.json files can be invalid (merge conflicts, manual edits). Some monorepo root package.jsons have thousands of dependencies.
**How to avoid:** Wrap JSON.parse in try/catch. Limit dependency extraction to first 10 (D-04). If parse fails, still detect as "Node.js project" but without name/deps detail.
**Warning signs:** Shell startup is slow or crashes when entering a directory with malformed package.json.

### Pitfall 5: Permission Prompt During Non-TTY Mode
**What goes wrong:** In piped mode (`cat file | claudeshell "analyze"`), the "ask" permission mode tries to prompt for y/n but there is no TTY for user input.
**Why it happens:** Pipe mode (Phase 5) sets up non-interactive execution. The `canUseTool` callback tries to read from stdin, which is a pipe, not a terminal.
**How to avoid:** When `!process.stdin.isTTY`, force permission mode to either "auto" or "deny" regardless of config. Do not attempt interactive prompts in non-TTY mode.
**Warning signs:** Shell hangs when piped input triggers tool use in "ask" mode.

## Code Examples

### Project Context Detection
```typescript
// Source: Verified pattern from codebase config.ts
import fs from 'node:fs'
import path from 'node:path'

interface PackageJsonInfo {
  readonly name?: string
  readonly scripts?: readonly string[]
  readonly deps?: readonly string[]
}

function readPackageJson(cwd: string): PackageJsonInfo | null {
  try {
    const raw = fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const obj = parsed as Record<string, unknown>
    return {
      name: typeof obj.name === 'string' ? obj.name : undefined,
      scripts: obj.scripts && typeof obj.scripts === 'object'
        ? Object.keys(obj.scripts as object).slice(0, 10)
        : undefined,
      deps: obj.dependencies && typeof obj.dependencies === 'object'
        ? Object.keys(obj.dependencies as object).slice(0, 10)
        : undefined,
    }
  } catch {
    return null
  }
}
```

### canUseTool Implementation
```typescript
// Source: Verified from SDK sdk.d.ts lines 146-188 and 1438-1450
import type { CanUseTool, PermissionResult } from '@anthropic-ai/claude-agent-sdk'

function createCanUseTool(rl: readline.Interface): CanUseTool {
  return async (toolName, input, options): Promise<PermissionResult> => {
    // Use SDK-provided title when available
    const prompt = options.title
      ?? `Claude wants to use ${toolName}`

    process.stderr.write(`${prompt}. Allow? (y/n) `)

    // Read response -- use rl.question since readline is paused during AI streaming
    const answer = await rl.question('')
    const normalized = answer.trim().toLowerCase()

    if (normalized === 'y' || normalized === 'yes') {
      return { behavior: 'allow' }
    }
    return { behavior: 'deny', message: 'User denied permission' }
  }
}
```

### Merged Config with Permission Mode
```typescript
// Source: Existing config.ts pattern extended
const globalConfig = loadConfig()
const projectConfig = loadProjectConfig(process.cwd())
const merged = mergeConfigs(globalConfig, projectConfig)

// Map to SDK options
const permissionMode = toSDKPermissionMode(merged.permissions ?? 'auto')
const canUseTool = permissionMode === 'default'
  ? createCanUseTool(rl)
  : undefined

// Pass to SDK
sdk.query({
  prompt,
  options: {
    permissionMode,
    ...(canUseTool ? { canUseTool } : {}),
    systemPrompt: buildSystemPrompt(cwd, projectContext),
    // ... other options
  }
})
```

### /permissions Slash Command
```typescript
// In chat.ts parseSlashCommand, add:
if (input.startsWith('/permissions')) {
  const arg = input.slice('/permissions'.length).trim()
  if (!arg) {
    // Show current mode
    return { type: 'permissions_show' }
  }
  if (['auto', 'ask', 'deny'].includes(arg)) {
    return { type: 'permissions_set', mode: arg }
  }
  return { type: 'unknown', input }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `permissionMode: 'acceptEdits'` | Configurable via config + `/permissions` | Phase 6 | Users can control AI safety level |
| No project awareness in system prompt | Auto-detected project context | Phase 6 | AI gives more relevant responses |
| Single global config only | Global + per-project `.claudeshell.json` | Phase 6 | Teams can share shell settings via git |

## Open Questions

1. **readline availability during canUseTool**
   - What we know: readline is paused during AI streaming (`for await` loop). The `canUseTool` callback fires during this loop.
   - What's unclear: Whether `rl.question()` works while readline is paused, or if we need raw stdin.
   - Recommendation: Try `rl.question()` first. If it deadlocks, fall back to direct `process.stdin.once('data')` read. Test early in implementation.

2. **Parent directory walking for .claudeshell.json**
   - What we know: D-19 says "check for `.claudeshell.json` in current working directory" (no mention of parents).
   - What's unclear: Whether this is intentional or oversight. Monorepo users might want config at repo root.
   - Recommendation: Do NOT walk up (keep it simple per D-19). This is listed as Claude's discretion, and simplicity wins. Users can always place the file in the specific directory.

## Sources

### Primary (HIGH confidence)
- SDK `sdk.d.ts` lines 146-188 -- `CanUseTool` type definition, verified from installed `@anthropic-ai/claude-agent-sdk@^0.2.90`
- SDK `sdk.d.ts` line 1416 -- `PermissionMode` type: `'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'dontAsk'`
- SDK `sdk.d.ts` lines 1438-1450 -- `PermissionResult` type (allow/deny discriminated union)
- SDK `sdk.d.ts` lines 1353-1365 -- `systemPrompt` option (string or object with sections)
- SDK `sdk.d.ts` lines 930-956 -- `allowedTools`, `disallowedTools`, `canUseTool` options on query
- Existing codebase: `src/config.ts`, `src/ai.ts`, `src/shell.ts`, `src/builtins.ts`, `src/types.ts`, `src/chat.ts`

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` Pitfall 4 -- Permission escalation via session resume
- `.planning/research/PITFALLS.md` Pitfall 7 -- Permission UX blocking flow
- `.planning/research/STACK.md` -- SDK permission modes documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all features use existing SDK + built-in Node.js; no new deps
- Architecture: HIGH -- clear module boundaries from CONTEXT.md decisions; existing patterns to follow
- Pitfalls: HIGH -- SDK types verified from installed package; permission escalation documented in research

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- SDK API is versioned, no fast-moving parts)
