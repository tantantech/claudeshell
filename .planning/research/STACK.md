# Technology Stack

**Project:** ClaudeShell v2 -- Sessions & Power Features
**Researched:** 2026-03-31

## Current Stack (v1, validated)

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | ^6.0.2 | Language |
| Node.js | >=22.0.0 | Runtime |
| @anthropic-ai/claude-agent-sdk | ^0.2.88 | AI backbone |
| marked + marked-terminal | ^15 / ^7.3 | Markdown rendering |
| picocolors | ^1.1.1 | Terminal colors |
| tsdown | ^0.21.7 | Bundler |
| tsx | ^4.21.0 | Dev runner |
| vitest | ^4.1.2 | Tests |
| node:readline/promises | built-in | REPL input |

## Stack Additions for v2

### Sessions -- NO new dependency needed

**Confidence: HIGH** (verified via official Claude Agent SDK docs)

The Claude Agent SDK already provides everything for session management. No new library required.

| SDK Feature | How ClaudeShell Uses It | API |
|-------------|------------------------|-----|
| `continue: true` | Continue most recent session in cwd | `query({ options: { continue: true } })` |
| `resume: sessionId` | Resume a specific past session by ID | `query({ options: { resume: id } })` |
| `forkSession: true` | Branch from a session without losing original | `query({ options: { resume: id, forkSession: true } })` |
| `persistSession: false` | Ephemeral one-shot queries (no disk write) | `query({ options: { persistSession: false } })` |
| `listSessions()` | List past sessions for a project directory | `listSessions({ dir: cwd, limit: N })` |
| `getSessionMessages()` | Read history from a past session transcript | `getSessionMessages(sessionId, { dir })` |
| `session_id` on ResultMessage | Capture session ID for resume/fork | Available on every `SDKResultMessage` |

**Implementation pattern:** Store the current `sessionId` in `ShellState`. On subsequent `a` commands, pass `continue: true` or `resume: sessionId`. Add a `/new` slash command to start a fresh session (just omit continue/resume). Add `/sessions` to list past sessions via `listSessions()`.

Source: [Claude Agent SDK Sessions docs](https://platform.claude.com/docs/en/agent-sdk/sessions)

### Model Selection -- NO new dependency needed

**Confidence: HIGH** (verified via official SDK reference)

The SDK `Options` type accepts a `model` field (string). The `Query` object also exposes `setModel()` for mid-session changes and `supportedModels()` to list available models.

| SDK Feature | Use Case |
|-------------|----------|
| `options.model` | Set model at query time (`"claude-sonnet-4-20250514"`, etc.) |
| `query.supportedModels()` | Discover available models dynamically |
| `query.setModel(model)` | Change model mid-session (streaming input mode) |
| `options.fallbackModel` | Automatic fallback if primary model fails |

**Implementation pattern:** Add `model` field to config.json. Support `a --haiku`, `a --opus`, `a --sonnet` prefix flags. Map shorthand names to full model strings. Use `supportedModels()` once at startup to validate.

Source: [Claude Agent SDK TypeScript reference](https://platform.claude.com/docs/en/agent-sdk/typescript)

### Token/Cost Display -- NO new dependency needed

**Confidence: HIGH** (verified via official SDK reference)

`SDKResultMessage` already contains all cost/token data:

```typescript
{
  total_cost_usd: number;
  duration_ms: number;
  num_turns: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
  modelUsage: {
    [modelName: string]: {
      inputTokens: number;
      outputTokens: number;
      cacheReadInputTokens: number;
      cacheCreationInputTokens: number;
      costUSD: number;
    }
  };
}
```

**Implementation pattern:** After the `for await` loop completes, check for `message.type === "result"` and render a summary line like `[sonnet | 1.2k in, 890 out | $0.0043 | 2.1s]` using picocolors (already a dependency).

### Permission Control -- NO new dependency needed

**Confidence: HIGH** (verified via official SDK permissions docs)

The SDK provides five permission modes and declarative allow/deny rules:

| Mode | Behavior | When to Use |
|------|----------|-------------|
| `"default"` | Falls through to `canUseTool` callback | Interactive approval |
| `"dontAsk"` | Deny anything not in `allowedTools` | Locked-down headless mode |
| `"acceptEdits"` | Auto-approve file edits, deny bash unless allowed | Trust edits, control execution |
| `"bypassPermissions"` | Approve everything (dangerous) | Fully trusted environments |
| `"plan"` | No tool execution at all | Read-only analysis mode |

Additionally:
- `allowedTools: string[]` -- pre-approve specific tools
- `disallowedTools: string[]` -- always deny specific tools (overrides everything)
- `canUseTool` callback -- runtime approval function

**Implementation pattern:** Add `permission_mode` and `allowed_tools` / `disallowed_tools` arrays to config.json. Default to `"acceptEdits"` (current behavior). Expose via `/permissions` command to cycle modes. Support per-project overrides.

Source: [Claude Agent SDK Permissions docs](https://platform.claude.com/docs/en/agent-sdk/permissions)

### Pipe-Friendly AI Output -- NO new dependency needed

**Confidence: HIGH** (Node.js built-in)

Pipe detection uses `process.stdin.isTTY` and `process.stdout.isTTY` (Node.js built-in). The codebase already checks `process.stdout.isTTY` in `createRenderer()`.

**Implementation pattern:**

1. **Detect pipe input:** `!process.stdin.isTTY` means stdin is piped. Read all stdin chunks, concatenate, then pass as context to the AI prompt.
2. **Plain output for pipes:** When `!process.stdout.isTTY`, skip markdown rendering (already handled), suppress "Thinking..." indicator, and write only the final text result to stdout (no tool notifications, no color).
3. **Usage:** `cat log.txt | claudeshell "summarize this"` -- detect non-TTY stdin, read piped data, prepend to prompt.

Changes needed:
- `cli.ts`: Check `process.stdin.isTTY`. If false, read stdin, pass as prompt context, and run single-shot (no REPL loop).
- `renderer.ts`: Already has `isTTY` flag. Extend to suppress all decoration when piping.
- `ai.ts`: Accept optional `stdinContent` parameter to prepend to prompt.

### PTY Support (Interactive Commands) -- NEW dependency: `node-pty`

**Confidence: MEDIUM** (node-pty is the standard but has native addon friction)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `node-pty` | ^1.1.0 | Pseudo-terminal for interactive commands | Only viable option for Node.js PTY; used by VS Code, Hyper, and 1000+ npm packages |

**Why node-pty:** Interactive commands (vim, ssh, less, htop) require a pseudo-terminal that handles raw mode, screen clearing, cursor positioning, and signal forwarding. Node's `child_process.spawn` with `stdio: 'inherit'` does NOT provide a proper PTY -- it inherits the parent's terminal but doesn't allocate a new one, so programs that call `isatty()` or use `tcgetattr()` may misbehave.

**Why not alternatives:**
- `pty.node` -- abandoned (last publish 5 years ago)
- `node-pty-prebuilt` -- stale fork, install issues
- `@lydell/node-pty` -- thin wrapper around node-pty, not independent
- Raw Node.js `child_process` -- no PTY allocation, interactive programs break

**Installation concern:** node-pty is a native addon requiring compilation (node-gyp + C++ toolchain). This adds friction to `npm install -g claudeshell`. Mitigations:
1. Make `node-pty` an **optional dependency** (`optionalDependencies` in package.json)
2. Fall back to `spawn({ stdio: 'inherit' })` when node-pty is unavailable
3. Document build prerequisites (Xcode CLI tools on macOS, build-essential on Linux)
4. Recent PR (#809) adds prebuild support, reducing compilation needs

**Implementation pattern:**
1. Detect interactive commands heuristically (vim, nano, ssh, less, top, htop, man)
2. If node-pty available, spawn via `pty.spawn()` with full PTY
3. If not available, fall back to current `spawn({ stdio: 'inherit' })` with a warning
4. Forward SIGWINCH for terminal resize

Source: [node-pty GitHub](https://github.com/microsoft/node-pty)

### Project Context Awareness -- NO new dependency needed

**Confidence: HIGH**

Detection of project files (package.json, Cargo.toml, pyproject.toml, go.mod, etc.) is trivial filesystem work using `node:fs`. No library needed.

**Implementation pattern:**
1. On shell startup (and after `cd`), scan cwd for known project files
2. Build a context string: `"Node.js project (package.json), using TypeScript, vitest, React"`
3. Inject into the system prompt passed to `query()`
4. Optionally read relevant sections (name, scripts, dependencies keys)

Files to detect and extract from:

| File | Ecosystem | What to Extract |
|------|-----------|-----------------|
| `package.json` | Node.js | name, scripts keys, key deps |
| `Cargo.toml` | Rust | package name |
| `pyproject.toml` / `requirements.txt` | Python | project name, key deps |
| `go.mod` | Go | module name |
| `Gemfile` | Ruby | -- |
| `pom.xml` / `build.gradle` | Java | -- |
| `Makefile` | C/C++ | -- |
| `.git/` | Any | current branch name |
| `CLAUDE.md` | Claude projects | full content for system prompt |

### Per-Project Configuration -- NO new dependency needed

**Confidence: HIGH**

**Implementation pattern:** Look for `.claudeshell/config.json` in cwd (and parent dirs up to git root or home). Merge with global `~/.claudeshell/config.json` using spread (project overrides global). Same `ClaudeShellConfig` type, extended with v2 fields.

Config resolution order (last wins):
1. Built-in defaults
2. `~/.claudeshell/config.json` (global)
3. `<project-root>/.claudeshell/config.json` (project)
4. Environment variables (`ANTHROPIC_API_KEY`, etc.)
5. Command-line flags (`a --haiku`)

### Configurable AI Command Prefix -- NO new dependency needed

**Confidence: HIGH**

Currently hardcoded as `"a"` in `classify.ts`. Make it configurable via config.json.

```typescript
// config.json
{ "ai_prefix": "ai" }

// classify.ts -- read prefix from config instead of hardcoded "a"
```

### Error Recovery -- NO new dependency needed

**Confidence: HIGH**

Already partially implemented (`lastError` in ShellState, `a explain` / `a why`). Extend to:
1. Auto-detect failed commands (exit code !== 0) -- already done
2. Offer to diagnose: `Command failed. Type 'a fix' to auto-fix.` -- partially done
3. `a fix` sends stderr + command to AI with "fix this" prompt -- new
4. AI can execute the fix directly (with permission mode controlling safety)

### Fresh Context Slash Command -- NO new dependency needed

**Confidence: HIGH**

`/new` command clears the current session ID from ShellState, so the next `a` command creates a fresh session (no `continue` or `resume` passed to SDK).

## Recommended Stack (v2 complete)

### Core (unchanged)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TypeScript | ^6.0.2 | Language | Matches SDK |
| Node.js | >=22.0.0 | Runtime | SDK requirement |
| @anthropic-ai/claude-agent-sdk | ^0.2.88 | AI backbone (sessions, models, permissions, costs) | All v2 AI features are SDK-native |
| marked | ^15.0.12 | Markdown parsing | Existing |
| marked-terminal | ^7.3.0 | Terminal markdown | Existing |
| picocolors | ^1.1.1 | Terminal colors | Existing |

### New (optional)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| node-pty | ^1.1.0 | PTY for interactive commands | Only option for proper PTY; make it optionalDependency |

### Dev (unchanged)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| tsdown | ^0.21.7 | Bundler | Existing |
| tsx | ^4.21.0 | Dev runner | Existing |
| vitest | ^4.1.2 | Tests | Existing |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Sessions | SDK built-in `continue`/`resume` | Custom conversation file storage | SDK handles all persistence, IDs, forking automatically |
| PTY | node-pty (optional) | Raw child_process | child_process lacks PTY allocation; interactive programs break |
| PTY | node-pty (optional) | pty.node | Abandoned 5 years ago |
| Model selection | SDK `model` option | Separate Anthropic API calls | SDK handles model routing, fallback, and discovery |
| Cost tracking | SDK ResultMessage fields | Manual token counting | SDK provides exact USD cost, per-model breakdown |
| Permissions | SDK permission modes | Custom file-edit interceptor | SDK has 5 modes + allow/deny rules + runtime callback |
| Pipe detection | process.stdin.isTTY (built-in) | is-interactive npm package | Built-in is sufficient, zero-dep |
| Config merging | Object spread | cosmiconfig / rc | Overkill for simple JSON merge; keep zero-dep |
| Project detection | fs.existsSync checks | detective / projector | Simple file existence checks; no AST parsing needed |
| CLI arg parsing | Manual prefix parsing | commander / yargs | Only parsing `--haiku`/`--opus`/`--sonnet` flags; not worth a dep |

## Installation

```bash
# Core (unchanged from v1)
npm install @anthropic-ai/claude-agent-sdk marked marked-terminal picocolors

# Optional: PTY support for interactive commands
npm install node-pty  # Requires C++ toolchain (Xcode CLI on macOS, build-essential on Linux)

# Dev dependencies (unchanged)
npm install -D tsdown tsx typescript vitest @types/node
```

### package.json changes for v2

```json
{
  "optionalDependencies": {
    "node-pty": "^1.1.0"
  }
}
```

## Key Insight

**9 of 10 v2 features require ZERO new dependencies.** The Claude Agent SDK already provides sessions, model selection, permissions, and cost tracking. Node.js built-ins handle pipe detection and project file scanning. The only new dependency is `node-pty` for interactive command support, and it should be optional to avoid installation friction.

## Sources

- [Claude Agent SDK Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions) -- session management (continue, resume, fork)
- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- Options type, Query object, ResultMessage, ModelUsage
- [Claude Agent SDK Permissions](https://platform.claude.com/docs/en/agent-sdk/permissions) -- permission modes, allowedTools, disallowedTools
- [Node.js TTY docs](https://nodejs.org/api/tty.html) -- isTTY for pipe detection
- [node-pty GitHub](https://github.com/microsoft/node-pty) -- PTY for interactive commands
- [Claude Agent SDK GitHub Issues](https://github.com/anthropics/claude-agent-sdk-typescript/issues/14) -- session history retrieval
