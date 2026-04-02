# Architecture Patterns

**Domain:** AI-native shell -- v2 feature integration with existing architecture
**Researched:** 2026-03-31

## Current Architecture Summary

ClaudeShell v1 is 13 TypeScript modules with clear single-responsibility boundaries:

```
cli.ts          Entry point, --version flag, launches runShell()
shell.ts        REPL loop, state machine, readline, dispatch
classify.ts     Input classification: empty | builtin | passthrough | ai
builtins.ts     cd, export, clear, theme, exit/quit
passthrough.ts  System shell command execution via spawn('bash')
ai.ts           Claude Code SDK integration (lazy-loaded), streaming
renderer.ts     Markdown rendering (TTY) vs raw text (pipe) output
config.ts       ~/.claudeshell/config.json load/save + API key resolution
history.ts      ~/.claudeshell_history persistence
prompt.ts       Powerline prompt builder (ANSI, git branch)
templates.ts    5 prompt themes with builders
types.ts        ShellState, InputAction, LastError, BuiltinName
marked-terminal.d.ts  Type declarations for marked-terminal
```

**Key architectural properties:**
- Immutable `ShellState` updated via spread in the REPL loop
- Single `executeAI()` call per `a` command -- no session continuity
- Renderer switches behavior based on `isTTY` (markdown vs raw)
- SDK loaded lazily via dynamic `import()` on first AI call
- No conversation memory between `a` commands
- `classify.ts` is a pure function -- no side effects
- `shell.ts` REPL loop is 175 lines, clean dispatcher pattern

## Recommended Architecture for v2

### Design Principle: Extend ShellState, Not Shell.ts

The REPL loop in `shell.ts` is well-structured. v2 features integrate by:
1. Expanding `ShellState` and `InputAction` types in `types.ts`
2. Adding new modules that `shell.ts` orchestrates
3. Keeping `shell.ts` as a thin dispatcher with minimal feature logic

Do NOT refactor `shell.ts` into a class or embed feature logic directly into the REPL loop.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `session.ts` (NEW) | Session lifecycle: create, resume, list, clear | ai.ts, config.ts, shell.ts |
| `model.ts` (NEW) | Model selection, alias resolution, per-query override | ai.ts, config.ts, shell.ts |
| `permissions.ts` (NEW) | Permission policy, canUseTool callback factory | ai.ts, config.ts |
| `context.ts` (NEW) | Project detection, context building for system prompt | ai.ts, shell.ts |
| `pipe.ts` (NEW) | Stdin pipe detection, content framing for AI | cli.ts, ai.ts, shell.ts |
| `cost.ts` (NEW) | Token/cost tracking from SDK stream messages | ai.ts, renderer.ts |
| `types.ts` (EXTEND) | New state fields, new InputAction variants | all modules |
| `classify.ts` (EXTEND) | Slash commands, model prefix parsing | shell.ts |
| `ai.ts` (EXTEND) | Session-aware queries, model passing, permissions | session.ts, model.ts, permissions.ts |
| `config.ts` (EXTEND) | Per-project config, new fields | context.ts |
| `renderer.ts` (EXTEND) | Cost display after responses | cost.ts |
| `passthrough.ts` (EXTEND) | Interactive command detection, stdio: 'inherit' path | shell.ts |
| `shell.ts` (MINOR) | Wire new modules, new builtin/slash dispatch | all new modules |

### Data Flow

```
User Input
    |
    v
classify.ts  -->  Detect: slash command? model prefix? standard 'a' prefix?
    |
    v
shell.ts     -->  Dispatch to appropriate handler
    |
    +--> builtin  --> builtins.ts (cd, export, clear, theme, exit/quit)
    +--> slash    --> shell.ts handles: /session, /model, /permissions, /context
    +--> passthrough --> passthrough.ts (stdio:'inherit' for interactive detection)
    +--> ai       --> pipe.ts (prepend stdin if piped) --> ai.ts
                                                            |
                                                            +--> session.ts (resolve sessionId)
                                                            +--> model.ts (resolve model for query)
                                                            +--> permissions.ts (resolve permissionMode)
                                                            +--> context.ts (build system prompt)
                                                            |
                                                            v
                                                          SDK query()
                                                            |
                                                            v
                                                          Stream events
                                                            |
                                                            +--> renderer.ts (text, tool events)
                                                            +--> cost.ts (extract usage from result)
```

## Feature Integration Plans

### 1. Session Management (session.ts)

**SDK Support (HIGH confidence -- official docs):** The SDK natively supports sessions via:
- `resume: sessionId` -- continue a previous session
- `sessionId: uuid` -- use a specific UUID for a new session
- `continue: true` -- continue the most recent conversation
- `persistSession: boolean` -- control disk persistence
- `listSessions()` -- discover past sessions with metadata
- `getSessionMessages()` -- retrieve messages from a session
- `getSessionInfo()` -- metadata for a single session
- `renameSession()` / `tagSession()` -- mutate session metadata

**Architecture:**

```typescript
// session.ts -- pure functions, no classes
function createSessionId(): string              // crypto.randomUUID()
function getResumeOptions(sessionId: string | undefined): { resume?: string }
async function listProjectSessions(cwd: string, limit?: number): Promise<SDKSessionInfo[]>
async function clearSession(): string           // Returns new session ID
```

**Integration with ai.ts:**
- `executeAI()` receives `sessionId` from ShellState and passes to SDK as `options.resume`
- On first `a` command in a shell session: auto-create session ID, store in ShellState
- Subsequent `a` commands: pass same session ID via `resume` for context continuity
- `/session new` slash command: clear session ID, next `a` starts fresh
- `/session list` slash command: call SDK `listSessions()` and display
- `/session resume <id>` slash command: set session ID in state

**ShellState extension:**
```typescript
interface ShellState {
  // existing fields unchanged
  readonly cdState: CdState
  readonly running: boolean
  readonly lastError: LastError | undefined
  readonly aiStreaming: boolean
  // v2 additions:
  readonly sessionId: string | undefined
  readonly currentModel: string | undefined
  readonly permissionLevel: PermissionLevel
}
```

**Why this works:** The SDK handles ALL conversation history storage internally. ClaudeShell only needs to track and pass the session ID. No custom message storage, no context window management, no compaction logic.

### 2. Pipe-Friendly AI (pipe.ts)

**Problem:** `cat log.txt | a summarize` must detect piped stdin and prepend content to the AI prompt.

**Architecture:**

```typescript
// pipe.ts -- stateless utilities
function isPiped(): boolean                     // !process.stdin.isTTY
async function readPipedInput(): Promise<string> // Read all stdin to string
function framePipedPrompt(stdinContent: string, userPrompt: string): string
```

**Integration -- two modes:**

**Mode A: Single-command pipe** (`echo "data" | claudeshell a summarize`)
- Detected in `cli.ts` before `runShell()` launches
- If stdin is not TTY AND argv contains prompt: read stdin, execute single AI call, output raw text, exit
- Renderer already handles non-TTY output (raw text, no markdown) -- no changes needed

**Mode B: REPL with prior pipe** (not supported)
- If stdin is not TTY, REPL cannot read interactive input
- This is standard shell behavior -- no special handling needed

**cli.ts change:**
```typescript
// cli.ts
if (!process.stdin.isTTY && process.argv.length > 2) {
  // Pipe mode: single AI call, then exit
  const prompt = process.argv.slice(2).join(' ')
  const stdinContent = await readPipedInput()
  const fullPrompt = framePipedPrompt(stdinContent, prompt)
  await executeSingleAI(fullPrompt)
  process.exit(0)
}
// Otherwise: normal REPL
runShell()
```

**Renderer already handles this:** `createRenderer({ isTTY: false })` writes raw text without markdown formatting. Zero renderer changes needed.

### 3. PTY / Interactive Command Support (passthrough.ts extension)

**Problem:** Interactive commands (vim, ssh, less, htop) fail because `passthrough.ts` uses `spawn()` with piped stderr.

**Recommended approach -- extend passthrough.ts, no new module:**

```typescript
// passthrough.ts -- add interactive execution path
const INTERACTIVE_COMMANDS = new Set([
  'vim', 'nvim', 'vi', 'nano', 'emacs',
  'less', 'more', 'man',
  'top', 'htop', 'btop',
  'ssh', 'telnet',
  'python', 'node', 'irb',  // REPLs
])

function isInteractiveCommand(command: string): boolean {
  const firstWord = command.split(/\s/)[0]
  return INTERACTIVE_COMMANDS.has(firstWord)
}

function executeInteractive(command: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', command], {
      stdio: 'inherit',  // Full terminal control to child
      env: process.env,
    })
    child.on('close', (code) => resolve({ exitCode: code ?? 1, stderr: '' }))
    child.on('error', (err) => resolve({ exitCode: 127, stderr: err.message }))
  })
}
```

**Why NOT node-pty:** node-pty requires native compilation (node-gyp, Python, C++ build tools). This would break `npm install -g claudeshell` on many systems. `stdio: 'inherit'` works for the vast majority of interactive programs without any new dependencies.

**shell.ts integration:** Before calling `executeCommand()`, check `isInteractiveCommand()`. If true, call `executeInteractive()` instead. During interactive execution, readline is naturally paused (awaiting the promise).

**Fallback:** If a non-interactive command turns out to need a terminal, users can prefix with `!` or we detect the failure and suggest retrying interactively.

### 4. Permission Control (permissions.ts)

**SDK Support (HIGH confidence):** The SDK provides:
- `permissionMode`: `'default'` | `'acceptEdits'` | `'bypassPermissions'` | `'plan'` | `'dontAsk'`
- `canUseTool` callback: fine-grained per-tool permission control
- `Query.setPermissionMode()`: runtime permission changes during streaming sessions
- `allowedTools` / `disallowedTools`: tool allow/deny lists

**Architecture:**

```typescript
// permissions.ts -- pure mapping functions
type PermissionLevel = 'strict' | 'normal' | 'permissive' | 'plan'

function resolvePermissionMode(level: PermissionLevel): string {
  const map: Record<PermissionLevel, string> = {
    strict: 'dontAsk',
    normal: 'default',
    permissive: 'acceptEdits',
    plan: 'plan',
  }
  return map[level]
}

function describePermissionLevel(level: PermissionLevel): string
```

**Mapping rationale:**

| ClaudeShell Level | SDK Mode | Behavior |
|---|---|---|
| `strict` | `dontAsk` | Deny anything not pre-approved. Best for untrusted codebases |
| `normal` | `default` | Standard permission prompts. Default for most users |
| `permissive` | `acceptEdits` | Auto-accept file edits. Current v1 behavior |
| `plan` | `plan` | Planning only, no execution. Great for exploration |

**Integration:**
- Config field: `permission_level` in config.json (default: `'permissive'` to match v1 behavior)
- Slash command: `/permissions [level]` to change at runtime
- Passed to `executeAI()` which forwards to SDK `options.permissionMode`

### 5. Project Context (context.ts)

**Problem:** AI should know about the project without the user explaining each time.

**Architecture:**

```typescript
// context.ts -- project detection with caching
interface ProjectContext {
  readonly type: 'node' | 'python' | 'rust' | 'go' | 'unknown'
  readonly name: string | undefined
  readonly framework: string | undefined
  readonly contextSnippet: string  // One-paragraph summary for system prompt
}

function detectProject(cwd: string): ProjectContext  // Sync, reads marker files
```

**Detection logic:** Check for marker files in cwd (no parent traversal needed for v2):
- `package.json` -> Node.js, extract name + deps for framework detection (Next.js, React, Express, etc.)
- `Cargo.toml` -> Rust, extract package name
- `pyproject.toml` / `requirements.txt` -> Python
- `go.mod` -> Go, extract module name

**SDK integration -- use settingSources for CLAUDE.md:**

```typescript
// In ai.ts, when building query options:
const options = {
  systemPrompt: {
    type: 'preset' as const,
    preset: 'claude_code' as const,
    append: projectContext.contextSnippet,
  },
  settingSources: ['project'] as const,  // Loads CLAUDE.md automatically
}
```

This leverages the SDK's built-in CLAUDE.md loading. ClaudeShell adds lightweight project detection on top.

**Caching:** Cache `ProjectContext` per cwd. Invalidate only when `cd` command changes directory. This avoids re-reading package.json on every AI call.

### 6. Model Selection (model.ts)

**SDK Support (HIGH confidence):** `options.model` accepts model strings. The Query object provides `setModel()` for runtime changes and `supportedModels()` to list available models.

**Architecture:**

```typescript
// model.ts -- alias resolution
type ModelAlias = 'haiku' | 'sonnet' | 'opus'

function resolveModel(alias: string | undefined): string | undefined
function parseModelPrefix(input: string): { model: string | undefined; cleanPrompt: string }
function isModelAlias(s: string): s is ModelAlias
```

**UX patterns:**
- Session default: `config.model` field (already exists in ClaudeShellConfig but unused by SDK)
- Per-query override: `a @haiku explain this error` -- parse `@alias` prefix from prompt
- Slash command: `/model [haiku|sonnet|opus]` to change session default
- Display: show current model in prompt template (optional, future)

**classify.ts integration:**
```typescript
// In classifyInput, when type is 'ai':
// Extract @model prefix before returning
if (trimmed.startsWith('a @')) {
  const { model, cleanPrompt } = parseModelPrefix(trimmed.slice(2))
  return { type: 'ai', prompt: cleanPrompt, model }
}
```

**InputAction extension:**
```typescript
| { readonly type: 'ai'; readonly prompt: string; readonly model?: string }
```

### 7. Token/Cost Display (cost.ts)

**SDK Support:** SDK stream emits `result` messages that contain usage data. The exact shape depends on the SDK version but typically includes input/output token counts.

**Architecture:**

```typescript
// cost.ts -- extraction and formatting
interface UsageInfo {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly estimatedCostUsd: number
}

function extractUsage(resultMessage: SDKMessage): UsageInfo | undefined
function formatUsage(usage: UsageInfo): string  // e.g., "428 in / 156 out (~$0.002)"
```

**Integration with ai.ts and renderer.ts:**
- `ai.ts` watches for `result` type messages in the stream and extracts usage
- After stream completes, passes usage to renderer
- `renderer.finish(usage?)` appends a dim cost line after the response

**Confidence:** MEDIUM -- the exact usage fields in SDKMessage need verification against the installed SDK version. The `result` message structure may vary.

### 8. Configurable AI Prefix (classify.ts change)

**Current:** Hard-coded `a` prefix check in `classify.ts` line 10.

**Change:** Accept prefix from config.

```typescript
// classify.ts
export function classifyInput(line: string, aiPrefix: string = 'a'): InputAction {
  const trimmed = line.trim()
  if (!trimmed) return { type: 'empty' }
  if (trimmed === aiPrefix || trimmed.startsWith(aiPrefix + ' ')) {
    return { type: 'ai', prompt: trimmed.slice(aiPrefix.length + 1).trim() }
  }
  // ... rest unchanged
}
```

**Config extension:**
```typescript
interface ClaudeShellConfig {
  // existing fields...
  readonly ai_prefix?: string  // default: 'a'
}
```

**shell.ts change:** Pass `config.ai_prefix` to `classifyInput()`.

### 9. Per-Project Configuration (config.ts extension)

**Architecture:** Layer project config on top of global config.

```typescript
// config.ts extension
function loadProjectConfig(cwd: string): Partial<ClaudeShellConfig>
function mergeConfig(
  global: ClaudeShellConfig,
  project: Partial<ClaudeShellConfig>
): ClaudeShellConfig
```

**Location:** `.claudeshell.json` in project root (detected via git root or cwd).

**Precedence:** project config > global config > defaults. Mirrors the SDK's own `settingSources` precedence pattern.

### 10. Slash Commands (classify.ts + shell.ts)

**New InputAction variant:**
```typescript
| { readonly type: 'slash'; readonly command: string; readonly args: string }
```

**classify.ts extension:**
```typescript
if (trimmed.startsWith('/')) {
  const spaceIdx = trimmed.indexOf(' ')
  const command = spaceIdx === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIdx)
  const args = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim()
  return { type: 'slash', command, args }
}
```

**Supported slash commands:**
| Command | Handler | Description |
|---------|---------|-------------|
| `/session new` | session.ts | Start fresh AI session |
| `/session list` | session.ts | List recent sessions |
| `/session resume <id>` | session.ts | Resume a past session |
| `/model [alias]` | model.ts | Show/change model |
| `/permissions [level]` | permissions.ts | Show/change permission level |
| `/context` | context.ts | Show detected project context |
| `/cost` | cost.ts | Show cumulative session cost |
| `/help` | shell.ts | List available commands |

**shell.ts dispatch:** Add a `case 'slash':` branch to the main switch, dispatching to the appropriate module function.

## Patterns to Follow

### Pattern 1: State Extension via Spread
**What:** All new state fields added to `ShellState`, updated immutably via spread.
**When:** Any feature that needs to persist data across REPL iterations.
```typescript
state = { ...state, sessionId: newId }
```

### Pattern 2: Module as Capability
**What:** Each v2 feature is a separate module exporting pure functions. No classes, no singletons, no module-level mutable state.
**When:** Adding any new feature.
**Why:** Matches v1 pattern, keeps testing simple, avoids hidden state.

### Pattern 3: Classify-Then-Dispatch
**What:** Extend `InputAction` union type for new command patterns, dispatch in shell.ts switch.
**When:** Adding slash commands or new input patterns.

### Pattern 4: SDK Options Builder
**What:** Build SDK query options from multiple sources (session, model, permissions, context) in a single function in ai.ts.
**When:** Every AI call.
```typescript
function buildQueryOptions(params: {
  cwd: string
  sessionId?: string
  model?: string
  permissionLevel: PermissionLevel
  projectContext: ProjectContext
  abortController: AbortController
}): Record<string, unknown> {
  return {
    abortController: params.abortController,
    cwd: params.cwd,
    model: params.model ? resolveModel(params.model) : undefined,
    resume: params.sessionId,
    permissionMode: resolvePermissionMode(params.permissionLevel),
    systemPrompt: {
      type: 'preset',
      preset: 'claude_code',
      append: params.projectContext.contextSnippet,
    },
    settingSources: ['project'],
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    includePartialMessages: true,
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: God Module
**What:** Putting session, model, permission, and context logic directly into shell.ts or ai.ts.
**Why bad:** shell.ts is 175 lines of clean REPL orchestration. Adding feature logic makes it unmaintainable.
**Instead:** Each feature gets its own module. shell.ts only dispatches.

### Anti-Pattern 2: Class-Based State Management
**What:** Creating a `ShellSession` class that holds mutable internal state.
**Why bad:** Breaks the immutable state pattern that v1 uses successfully. Introduces hidden mutation and makes state changes hard to trace.
**Instead:** Keep `ShellState` as a readonly interface, update via spread.

### Anti-Pattern 3: Custom Session Storage
**What:** Building custom conversation history storage for session continuity.
**Why bad:** The SDK already handles session persistence via `resume` and `sessionId`. Duplicating this is unnecessary work and creates synchronization bugs.
**Instead:** Use SDK's native session management. Store only the session ID in ShellState.

### Anti-Pattern 4: Synchronous Project Detection on Every AI Call
**What:** Running `execFileSync('git', ...)` and reading package.json every time the user types `a`.
**Why bad:** Adds 50-200ms latency to every AI request.
**Instead:** Cache project context per cwd. Invalidate only on `cd` commands.

### Anti-Pattern 5: node-pty as Required Dependency
**What:** Making node-pty a required dependency for interactive command support.
**Why bad:** node-pty requires native compilation (node-gyp, Python, C++ toolchain). Breaks `npm install -g claudeshell` on many systems without build tools.
**Instead:** Use `stdio: 'inherit'` for interactive commands (zero dependencies). Only consider node-pty as optional if users report issues.

### Anti-Pattern 6: Monolithic executeAI Refactor
**What:** Turning `executeAI()` into a 200-line function that handles sessions, models, permissions, context, cost tracking, etc.
**Why bad:** Single-responsibility violation. Hard to test individual features.
**Instead:** Each feature module exports helpers. `executeAI()` composes them via the options builder pattern.

## Module Dependency Graph

```
cli.ts
  -> pipe.ts (NEW -- detect pipe mode before REPL)
  -> shell.ts
       -> classify.ts -> types.ts
       -> builtins.ts -> types.ts, templates.ts, prompt.ts
       -> passthrough.ts (EXTENDED -- interactive detection)
       -> ai.ts -> config.ts, types.ts
       |    -> session.ts (NEW)
       |    -> model.ts (NEW)
       |    -> permissions.ts (NEW)
       |    -> context.ts (NEW)
       |    -> cost.ts (NEW)
       -> renderer.ts -> cost.ts (NEW)
       -> config.ts (EXTENDED -- project config)
       -> history.ts
       -> prompt.ts
       -> templates.ts -> prompt.ts
       -> types.ts (EXTENDED)
```

**New module count:** 6 new files (session, model, permissions, context, pipe, cost)
**Modified modules:** 7 (types, classify, ai, config, renderer, passthrough, shell)
**Unchanged modules:** 5 (cli, builtins, history, prompt, templates)
**Total:** ~19 modules

## Scalability Considerations

| Concern | Current (v1) | v2 Target | Notes |
|---------|-------------|-----------|--------|
| Session storage | None | SDK manages on disk | No custom storage needed |
| Module count | 13 files | ~19 files | Stable, each small and focused |
| Config fields | 4 fields | ~8 fields | Per-project layering |
| Startup time | <100ms | <150ms (project detect) | Lazy-load SDK unchanged |
| AI latency | 2-3s cold start | Same + session resume benefit | SDK handles context restore |
| Runtime deps | 4 packages | 4 packages (no new deps) | Critical constraint |

## Sources

- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- HIGH confidence, official documentation, verified 2026-03-31
- [Claude Agent SDK npm package](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) -- v0.2.88 installed in project
- SDK type definitions: `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` -- HIGH confidence, source of truth for API shape
- Existing codebase: all 13 source files in `src/` -- HIGH confidence, direct analysis
- [Node.js readline/promises](https://nodejs.org/api/readline.html) -- HIGH confidence, stdlib
