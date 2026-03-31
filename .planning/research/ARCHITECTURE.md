# Architecture Patterns

**Domain:** AI-powered interactive terminal shell
**Researched:** 2026-03-31

## Recommended Architecture

ClaudeShell follows a **four-layer architecture** inspired by the OpenDev terminal agent pattern (arXiv 2603.05344), adapted for a shell-replacement use case. The key insight: the shell is NOT a chat UI -- it is a command dispatcher that routes input to either a system shell or the Claude Agent SDK.

```
                    +----------------------------------+
                    |          cli.ts (entry)           |
                    |   Parse args, bootstrap shell     |
                    +-----------------+----------------+
                                      |
                    +-----------------v----------------+
                    |         shell.ts (REPL)           |
                    |   readline loop, input routing    |
                    +--+---------------------------+---+
                       |                           |
          +------------v-----------+   +-----------v-----------+
          |   passthrough.ts       |   |      ai.ts            |
          |   System commands      |   |   Claude Agent SDK    |
          |   spawn, pipe, cd      |   |   query, stream       |
          +------------------------+   +-----------+-----------+
                                                    |
                                       +------------v----------+
                                       |    renderer.ts        |
                                       |  Stream text deltas,  |
                                       |  tool indicators,     |
                                       |  markdown, colors     |
                                       +-----------------------+

    Cross-cutting:
    +--------------+  +--------------+  +--------------+  +--------------+
    |  config.ts   |  |  history.ts  |  |  session.ts  |  |   types.ts   |
    |  Load/save   |  |  Persist     |  |  SDK sessions|  |  Interfaces  |
    +--------------+  +--------------+  +--------------+  +--------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `cli.ts` | Entry point, arg parsing, shebang support, bootstrap | `config.ts`, `shell.ts` |
| `shell.ts` | REPL loop, input classification, readline management, signal handling | `ai.ts`, `passthrough.ts`, `history.ts`, `config.ts` |
| `ai.ts` | Claude Agent SDK wrapper, query lifecycle, abort handling, session resume | `renderer.ts`, `config.ts`, `session.ts` |
| `passthrough.ts` | System command execution, cd/export handling, env management | `shell.ts` (reports exit codes) |
| `renderer.ts` | Streaming text delta display, tool-use indicators, markdown formatting, colors | None (pure output to stdout) |
| `config.ts` | Load/save config, resolve API keys, XDG-compliant paths | None (pure data) |
| `history.ts` | Persist/load unified command history, dedup, max size | None (pure data) |
| `session.ts` | Track SDK session IDs, list/resume past sessions | `ai.ts` |
| `types.ts` | Shared TypeScript interfaces and types | None (imported by all) |

### Data Flow

#### Standard Shell Command (`git status`)

```
User types "git status"
  -> shell.ts classifies as pass-through (no "a" prefix)
  -> passthrough.ts spawns `bash -c "git status"` with inherited stdio
  -> Output goes directly to terminal (no processing)
  -> Exit code returned to shell.ts
  -> shell.ts shows next prompt
```

#### AI Command (`a find all TODO comments`)

```
User types "a find all TODO comments"
  -> shell.ts strips "a " prefix, extracts prompt
  -> ai.ts calls query({ prompt, options: { includePartialMessages: true } })
  -> SDK streams SDKMessage objects via async generator
  -> For each message:
     - stream_event (text_delta) -> renderer.ts writes text to stdout immediately
     - stream_event (tool_use start) -> renderer.ts shows [Using Read...]
     - stream_event (tool_use stop) -> renderer.ts shows [done]
     - result -> renderer.ts shows completion
  -> shell.ts shows next prompt
```

#### Ctrl+C During AI Query

```
User presses Ctrl+C
  -> REPL SIGINT handler fires
  -> ai.ts calls query.interrupt() on the active Query object
  -> SDK cancels in-flight request gracefully
  -> shell.ts shows interrupted message
  -> shell.ts shows next prompt (does NOT exit)
```

#### Session Resume (`/resume`)

```
User types "/resume"
  -> shell.ts classifies as slash command
  -> session.ts calls SDK listSessions() to show recent sessions
  -> User selects session
  -> ai.ts calls query({ prompt, options: { resume: sessionId } })
  -> Full context from previous session is restored
```

## Component Details

### 1. REPL Loop (`shell.ts`)

Use Node.js built-in `readline/promises` (not the callback-based `readline`). The promises API is cleaner for async/await patterns.

**Responsibilities:**
- Display customizable prompt (show cwd, git branch, AI session indicator)
- Capture input lines via `rl.question()`
- Forward to Command Router (input classifier)
- Handle Ctrl+C (interrupt active operation) and Ctrl+D (exit shell)
- Tab completion for file paths and commands

**Why not Ink/blessed:** These are TUI frameworks for building widget UIs. ClaudeShell is a shell, not a TUI app. `readline` is the right abstraction -- it handles line editing, history navigation (up/down arrow), and tab completion natively.

**Why not node-pty for the REPL itself:** node-pty is for spawning child processes in a PTY. The REPL loop is the parent process -- it uses readline for its own input and delegates to passthrough.ts for child processes.

### 2. Command Router (inside `shell.ts`)

Pure function: takes an input string, returns a dispatch instruction.

```typescript
type InputAction =
  | { type: 'ai'; prompt: string }
  | { type: 'passthrough'; command: string }
  | { type: 'builtin'; name: 'cd' | 'exit' | 'export' | 'unset'; args: string[] }
  | { type: 'slash'; command: string; args: string[] }
  | { type: 'empty' }

function classifyInput(line: string): InputAction {
  const trimmed = line.trim()
  if (!trimmed) return { type: 'empty' }
  if (trimmed.startsWith('a ')) return { type: 'ai', prompt: trimmed.slice(2) }
  if (trimmed === 'a') return { type: 'ai', prompt: '' }
  if (trimmed.startsWith('/')) return parseSlashCommand(trimmed)
  if (isBuiltin(trimmed)) return parseBuiltin(trimmed)
  return { type: 'passthrough', command: trimmed }
}
```

**Slash commands (built-in):**
- `/help` - Show available commands
- `/history` - Browse command history
- `/session` or `/resume` - List/resume AI sessions
- `/config` - View/set configuration
- `/model` - Switch Claude model
- `/clear` - Clear screen

### 3. Shell Engine (`passthrough.ts`)

Executes non-AI commands. Two strategies for different command types:

**Strategy A: Passthrough via `child_process.spawn`**
For most commands. Uses `spawn('bash', ['-c', command], { stdio: 'inherit' })`. The system shell handles all parsing of pipes, redirects, globs, and subshells. This is critical -- never try to parse shell syntax yourself.

**Strategy B: PTY passthrough via `node-pty` (Phase 4)**
For interactive commands (vim, less, top, ssh) that need a real terminal with raw mode. Detect via a known-interactive-commands list. Deferred to Phase 4 because it adds a native compilation dependency.

**Critical: `cd` handling**
`cd` cannot be delegated to a child process (it changes the child's cwd, not the parent's). Must be intercepted and handled via `process.chdir()`. Same for `export`/`unset` for environment variables.

**Built-in shell commands to intercept:**
- `cd` - Change directory via `process.chdir()`
- `export` - Set env var via `process.env[key] = value`
- `unset` - Remove env var via `delete process.env[key]`
- `exit` / `quit` - Exit shell via `process.exit()`

### 4. AI Engine (`ai.ts`)

Wraps the Claude Agent SDK `query()` function. This is the core differentiator.

```typescript
interface AIEngine {
  execute(prompt: string, onStream: StreamCallback): Promise<AIResult>
  resume(sessionId: string, prompt: string, onStream: StreamCallback): Promise<AIResult>
  interrupt(): void
}
```

**SDK integration -- key API surface from official docs:**

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk'

const q = query({
  prompt: "find all TODO comments",
  options: {
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    includePartialMessages: true,     // enables StreamEvent messages
    permissionMode: 'acceptEdits',    // configurable per user
    cwd: process.cwd(),              // anchor to user's working directory
    // resume: sessionId,            // for session resume
    // model: 'claude-sonnet-4-...',  // model override
    // systemPrompt: '...',          // custom system prompt
  }
})

// q is AsyncGenerator<SDKMessage> with extra methods:
// q.interrupt() - cancel in-flight request
// q.initializationResult() - get session info after init
```

**SDK message types to handle:**
- `system` (subtype `init`) - Capture `session_id` for later resume
- `stream_event` - Real-time streaming (text_delta, tool_use blocks)
- `assistant` - Complete assistant message (emitted after stream completes)
- `result` - Final result with `result` text
- `compact_boundary` - Session history was compacted (informational)

**Key SDK features to leverage:**
- `includePartialMessages: true` for real-time streaming to terminal
- `resume: sessionId` for session continuity across commands
- `allowedTools` for controlling what Claude can do
- `hooks` (PreToolUse, PostToolUse) for logging or custom behavior
- `cwd` to anchor the agent in the user's working directory
- `q.interrupt()` to cancel in-flight requests on Ctrl+C

### 5. Streaming Renderer (`renderer.ts`)

Handles the complexity of rendering Claude's streaming output in a terminal. This is a state machine.

**State machine:**

```
IDLE -> receiving text_delta -> STREAMING_TEXT
STREAMING_TEXT -> content_block_start (tool_use) -> TOOL_RUNNING
TOOL_RUNNING -> content_block_stop -> STREAMING_TEXT or IDLE
Any state -> message_stop -> IDLE
```

**Responsibilities:**
- Write `text_delta` chunks to stdout immediately via `process.stdout.write()` (no buffering)
- Show tool-use indicators: `[Using Read on src/index.ts...]`
- Show tool completion: `[done]`
- Manage newlines between tool output and text output
- Optionally colorize output using `chalk`

**Stream event processing:**

```typescript
function handleStreamEvent(event: RawMessageStreamEvent): void {
  switch (event.type) {
    case 'content_block_start':
      if (event.content_block.type === 'tool_use') {
        process.stdout.write(`\n[Using ${event.content_block.name}...]`)
        state = 'TOOL_RUNNING'
      }
      break
    case 'content_block_delta':
      if (event.delta.type === 'text_delta' && state !== 'TOOL_RUNNING') {
        process.stdout.write(event.delta.text)
      }
      break
    case 'content_block_stop':
      if (state === 'TOOL_RUNNING') {
        process.stdout.write(' done\n')
        state = 'STREAMING_TEXT'
      }
      break
  }
}
```

### 6. Persistence Layer

File-based, local-first. No database needed for v1.

| Store | Format | Location | Purpose |
|-------|--------|----------|---------|
| Config | JSON | `~/.claudeshell/config.json` | API key, model, permissions, prompt style |
| History | Line-delimited text | `~/.claudeshell/history` | Unified command history (shell + AI) |
| Sessions | Managed by SDK | SDK default location | Claude conversation state (resume) |

## Patterns to Follow

### Pattern 1: Input Classification as Pure Function
**What:** Classify each input line to determine routing. No side effects in the classifier.
**When:** Every line entered in the REPL.

```typescript
function classifyInput(line: string): InputAction {
  const trimmed = line.trim()
  if (!trimmed) return { type: 'empty' }
  if (trimmed.startsWith('a ')) return { type: 'ai', prompt: trimmed.slice(2) }
  // ... etc
}
```

### Pattern 2: Immutable Configuration
**What:** Config loaded once, updates return new objects.
**When:** Config loading and modification.

```typescript
interface ShellConfig {
  readonly apiKey: string | undefined
  readonly model: string
  readonly systemPrompt: string
  readonly historySize: number
  readonly permissionMode: 'acceptEdits' | 'default' | 'dontAsk'
}

function loadConfig(overrides?: Partial<ShellConfig>): ShellConfig {
  const defaults: ShellConfig = { /* ... */ }
  return { ...defaults, ...loadFromDisk(), ...overrides }
}
```

### Pattern 3: Event-Driven Stream Processing
**What:** Process SDK messages through callbacks, not by accumulating all messages.
**When:** Every AI query execution.

```typescript
type StreamCallback = (event: StreamEvent) => void

interface StreamEvent {
  type: 'text' | 'tool_start' | 'tool_end' | 'error' | 'complete'
  text?: string
  toolName?: string
}
```

### Pattern 4: Graceful Interrupt Chain
**What:** Ctrl+C propagates through layers appropriately based on current state.
**When:** User presses Ctrl+C during any operation.

```
If AI query active:  call query.interrupt() -> show interrupted -> new prompt
If shell cmd active: SIGINT propagates to child naturally (inherited stdio)
If idle at prompt:   show blank new prompt line (do NOT exit)
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Parsing Shell Syntax
**What:** Trying to parse bash syntax (pipes, redirects, subshells) in JavaScript.
**Why bad:** Shell syntax is enormously complex. Bash has decades of edge cases. You will get it wrong.
**Instead:** Pass the entire command string to `spawn('bash', ['-c', cmd])` and let bash handle it.

### Anti-Pattern 2: Blocking on AI Responses
**What:** Awaiting the full AI response before displaying anything.
**Why bad:** AI responses take 5-30 seconds. User sees nothing.
**Instead:** Stream with `includePartialMessages: true` and render text_deltas immediately via `process.stdout.write()`.

### Anti-Pattern 3: Global Mutable State
**What:** Storing config, env vars, history in module-level mutable variables.
**Why bad:** Makes testing impossible, creates hidden coupling, race conditions with async operations.
**Instead:** Pass config as immutable objects through function parameters.

### Anti-Pattern 4: Synchronous I/O in the REPL Loop
**What:** Using `fs.readFileSync()`, `child_process.execSync()`, etc.
**Why bad:** Blocks the event loop. Prevents Ctrl+C handling. Makes the shell feel frozen.
**Instead:** Always use async variants. The readline `question()` API is already promise-based.

### Anti-Pattern 5: PTY for Everything
**What:** Using node-pty for all shell commands.
**Why bad:** PTY adds a native compilation dependency (node-pty requires node-gyp), complexity, and can cause issues with piping. Most commands work fine with simple spawn.
**Instead:** Use `child_process.spawn` for non-interactive commands. Only use node-pty for commands that require a real terminal (vim, less, ssh).

### Anti-Pattern 6: Catching All Signals Globally
**What:** `process.on('SIGINT', ...)` at the top level that always fires.
**Why bad:** During pass-through commands, the child process should receive SIGINT, not your handler.
**Instead:** Only intercept SIGINT during AI queries. During pass-through with inherited stdio, signals flow to child process naturally.

### Anti-Pattern 7: Custom Streaming Implementation
**What:** Building your own token streaming/buffering on top of the SDK.
**Why bad:** The SDK already handles streaming via async generators. Re-implementing adds bugs.
**Instead:** Consume the SDK's async generator directly. Extract `text_delta` from `stream_event` messages.

## Suggested Build Order

Based on component dependencies:

```
Phase 1: Core REPL + Shell Passthrough
  +-- config.ts (needed by everything)
  +-- types.ts (shared interfaces)
  +-- shell.ts (readline REPL, input classification)
  +-- passthrough.ts (spawn with inherited stdio, cd/export interception)
      Dependencies: Node.js stdlib only

Phase 2: AI Integration
  +-- ai.ts (Claude Agent SDK query, streaming, abort)
  +-- renderer.ts (text_delta display, tool-use indicators)
  +-- Wire ai.ts into shell.ts command router
      Dependencies: Phase 1 complete, @anthropic-ai/claude-agent-sdk

Phase 3: Session and History
  +-- history.ts (unified history, file persistence, search)
  +-- session.ts (SDK listSessions, resume support)
  +-- Slash commands (/history, /session, /resume, /help)
      Dependencies: Phase 2 complete

Phase 4: Polish
  +-- Interactive command support (node-pty, optional)
  +-- Tab completion (files, commands, slash commands)
  +-- Prompt customization (git branch, session indicator)
  +-- Markdown terminal rendering improvements
  +-- Error handling hardening
      Dependencies: Phase 3 complete
```

**Rationale for ordering:**
1. A shell that can run normal commands is useful on its own and validates the REPL architecture before adding complexity
2. AI integration is the core value prop -- add it second so you can test against a working shell
3. Sessions and history are quality-of-life features that depend on both engines working correctly
4. PTY support (node-pty) and polish are last because they add native compilation dependencies without core value

## Scalability Considerations

| Concern | At v1 (single user) | At v2 (power users) | Notes |
|---------|---------------------|---------------------|-------|
| Session history | File append | SQLite for search | SDK manages its own session storage |
| Config | Single JSON file | Per-project overrides | XDG-compliant paths |
| Context window | Single session | Session resume via SDK | SDK handles compaction automatically |
| Startup time | Must be < 500ms | Lazy-load SDK on first `a` command | Do not import SDK at startup |
| History size | In-memory array | Stream from file | Use readline on history file for large histories |

## Sources

- [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) -- HIGH confidence, official docs
- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- HIGH confidence, official docs
- [Claude Agent SDK Streaming Output](https://platform.claude.com/docs/en/agent-sdk/streaming-output) -- HIGH confidence, official docs
- [OpenDev Terminal Agent Architecture](https://arxiv.org/html/2603.05344v1) -- MEDIUM confidence, academic paper on four-layer AI terminal agent design
- [Terminal AI Agents: 2025 Landscape](https://wal.sh/research/2025-terminal-ai-agents.html) -- MEDIUM confidence, industry survey
- [Node.js readline/promises](https://nodejs.org/api/readline.html) -- HIGH confidence, Node.js stdlib
- [node-pty (Microsoft)](https://github.com/microsoft/node-pty) -- HIGH confidence, widely used PTY library
- [aichat (sigoden)](https://github.com/sigoden/aichat) -- MEDIUM confidence, reference architecture for CLI AI tools
