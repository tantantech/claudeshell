# Phase 1: Shell Foundation - Research

**Researched:** 2026-03-31
**Domain:** Interactive REPL shell with Node.js readline, child_process, signal handling
**Confidence:** HIGH

## Summary

Phase 1 builds a fully functional interactive shell (REPL) using Node.js built-in modules -- no external runtime dependencies beyond `picocolors` for prompt coloring. The shell delegates all command execution to `bash -c` (no shell syntax parsing), intercepts a minimal set of builtins (`cd`, `exit`, `quit`, `clear`, `export`), and persists command history to `~/.claudeshell_history`.

The core technical challenges are: (1) correct signal handling so Ctrl+C never kills the shell, (2) `cd` interception via `process.chdir()` since child processes cannot change the parent's cwd, (3) history persistence using readline's built-in history array plus file I/O on startup/shutdown, and (4) TTY state protection so crashes never corrupt the terminal.

**Primary recommendation:** Use `node:readline/promises` for the REPL loop, `child_process.spawn('bash', ['-c', cmd], { stdio: 'inherit' })` for command execution, and `picocolors` for prompt coloring. Keep Phase 1 to zero heavy dependencies -- this is pure Node.js stdlib plus one tiny color library.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Prompt format is `claudeshell <cwd> > ` -- shell name in dim, directory in cyan, `>` in default
- **D-02:** Use `picocolors` for prompt coloring
- **D-03:** Prompt updates after every `cd` command
- **D-04:** Home directory abbreviated as `~` in prompt
- **D-05:** All non-builtin commands executed via `spawn('bash', ['-c', command])`
- **D-06:** Do NOT parse pipes, redirects, globs, or shell syntax in JavaScript
- **D-07:** Inherit user's environment variables from parent process
- **D-08:** Command stdout/stderr stream directly to terminal (inherit stdio)
- **D-09:** Minimal builtin set: `cd`, `exit`, `quit`, `clear`, `export`
- **D-10:** `cd` uses `process.chdir()`
- **D-11:** `cd` with no args goes to `$HOME`
- **D-12:** `cd -` returns to previous directory (track OLDPWD)
- **D-13:** `export KEY=VALUE` sets `process.env`
- **D-14:** `exit` and `quit` both close cleanly (exit code 0)
- **D-15:** `clear` clears terminal screen
- **D-16:** Ctrl+C at empty prompt: clear line, show fresh prompt (do NOT exit)
- **D-17:** Ctrl+C during child process: forward SIGINT to child
- **D-18:** Ctrl+D at empty prompt: exit shell cleanly
- **D-19:** Ctrl+D with text on line: ignore
- **D-20:** History file at `~/.claudeshell_history`
- **D-21:** Use Node.js `readline` built-in history support
- **D-22:** History persists across sessions (read on startup, append on exit)
- **D-23:** Duplicate consecutive commands not added to history
- **D-24:** Lines starting with space not saved to history
- **D-25:** Wrap main REPL loop in try/catch -- never crash from user input
- **D-26:** Display non-zero exit codes from failed commands (`[exit: 1]`)
- **D-27:** Handle missing commands gracefully

### Claude's Discretion
- TypeScript project structure (src/ layout, tsconfig settings)
- Specific readline configuration options beyond the decisions above
- Build tooling choice (tsc, tsup, esbuild -- whatever works for a simple CLI)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHELL-01 | Launch as interactive REPL with visible prompt showing cwd | D-01 through D-04: prompt format, picocolors, cwd display, tilde abbreviation |
| SHELL-02 | Standard shell commands execute via system shell | D-05 through D-08: `spawn('bash', ['-c', cmd])` with inherited stdio |
| SHELL-03 | `cd` changes directory and prompt updates | D-03, D-10 through D-12: `process.chdir()`, $HOME default, OLDPWD tracking |
| SHELL-04 | Pipes, redirects, shell syntax work | D-05, D-06: delegated entirely to bash, no JS parsing |
| SHELL-05 | Ctrl+C cancels running command without exiting shell | D-16, D-17: SIGINT handling per state (idle vs child running) |
| SHELL-06 | Ctrl+D or `exit` quits cleanly | D-14, D-18, D-19: readline close event, explicit exit/quit builtins |
| SHELL-07 | Up/down arrow history navigation | D-21: readline built-in history support |
| SHELL-08 | History persists across sessions | D-20, D-22 through D-24: file at ~/.claudeshell_history, dedup, space-prefix skip |
| SHELL-09 | Environment variables inherited | D-07: parent process env inherited by default via spawn |
| ERR-03 | Shell never crashes from malformed input or errors | D-25 through D-27: try/catch REPL loop, exit code display, graceful errors |
| PLAT-01 | Works on macOS | Verified: Node.js 22 LTS on macOS, bash available at /bin/bash |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Immutability:** Always create new objects, never mutate existing ones
- **File size:** 200-400 lines typical, 800 max per file
- **Functions:** Small (<50 lines each)
- **Error handling:** Comprehensive try/catch, user-friendly messages
- **No console.log:** Use proper output mechanisms
- **Conventional commits:** `feat:`, `fix:`, `refactor:`, etc.
- **Commit after every change**
- **TDD approach:** Write tests first (RED), implement (GREEN), refactor

## Standard Stack

### Core (Phase 1 only)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 22.12.0 (installed) | Runtime | Current LTS, stable readline/promises API |
| TypeScript | 6.0.2 (latest) | Type safety | Strict mode, ESM-native |
| `picocolors` | 1.1.1 (latest) | Prompt coloring | 7KB, zero deps, 10x faster than chalk (D-02) |

### Dev Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tsx` | 4.21.0 (latest) | Run TS during dev | esbuild-based, zero config, used by SDK quickstart |
| `tsdown` | 0.21.7 (latest) | Build/bundle | Successor to tsup, Rolldown-based, zero config |
| `vitest` | 4.1.2 (latest) | Testing | ESM + TS native, fast watch mode |
| `@types/node` | (latest) | Node.js types | Type definitions for readline, child_process, etc. |

### Node.js Built-ins Used (zero install)

| Module | Purpose |
|--------|---------|
| `node:readline/promises` | REPL loop, line input, history, key events |
| `node:child_process` | `spawn()` for command execution |
| `node:fs/promises` + `node:fs` | History file read/write |
| `node:path` | Path resolution for cd |
| `node:os` | `os.homedir()` for tilde expansion |
| `node:process` | Signal handling, cwd, env, exit |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:readline/promises` | Ink (React for CLI) | Ink is a UI framework; wrong abstraction for a REPL |
| `node:readline/promises` | `node:repl` | Designed for JS eval REPLs, not command shells |
| `picocolors` | `chalk` | 101KB vs 7KB, 6ms vs 0.5ms load time |
| `tsdown` | `tsc` alone | tsc works but no bundling; tsdown gives single-file dist |
| `child_process.spawn` | `execa` | Unnecessary abstraction; spawn with inherited stdio is sufficient |

**Installation:**
```bash
npm init -y
npm install picocolors
npm install -D typescript tsx tsdown vitest @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
claudeshell/
  src/
    cli.ts              # Entry point (shebang, bootstrap)
    shell.ts            # REPL loop, readline setup, input routing
    builtins.ts         # cd, exit, quit, clear, export handlers
    passthrough.ts      # spawn('bash', ['-c', cmd]) execution
    history.ts          # Load/save/manage command history
    prompt.ts           # Prompt string generation (colors, cwd, tilde)
    types.ts            # Shared TypeScript interfaces
  tests/
    builtins.test.ts    # cd, exit, export unit tests
    passthrough.test.ts # Command execution tests
    history.test.ts     # History persistence tests
    prompt.test.ts      # Prompt formatting tests
    classify.test.ts    # Input classification tests
  package.json
  tsconfig.json
  vitest.config.ts
```

### Pattern 1: Input Classification as Pure Function

**What:** Classify each input line to determine routing. No side effects in the classifier.
**When to use:** Every line entered in the REPL.

```typescript
type InputAction =
  | { type: 'builtin'; name: 'cd' | 'exit' | 'quit' | 'clear' | 'export'; args: string }
  | { type: 'passthrough'; command: string }
  | { type: 'ai_placeholder'; prompt: string }
  | { type: 'empty' }

function classifyInput(line: string): InputAction {
  const trimmed = line.trim()
  if (!trimmed) return { type: 'empty' }

  // Reserve 'a ' prefix for Phase 2
  if (trimmed === 'a' || trimmed.startsWith('a ')) {
    return { type: 'ai_placeholder', prompt: trimmed.slice(2).trim() }
  }

  const firstWord = trimmed.split(/\s+/)[0]
  const rest = trimmed.slice(firstWord.length).trim()

  if (['cd', 'exit', 'quit', 'clear', 'export'].includes(firstWord)) {
    return { type: 'builtin', name: firstWord as any, args: rest }
  }

  return { type: 'passthrough', command: trimmed }
}
```

### Pattern 2: Prompt Generation as Pure Function

**What:** Build prompt string from current state, no side effects.

```typescript
import pc from 'picocolors'

function buildPrompt(cwd: string, homedir: string): string {
  const display = cwd.startsWith(homedir)
    ? '~' + cwd.slice(homedir.length)
    : cwd
  return `${pc.dim('claudeshell')} ${pc.cyan(display)} ${pc.reset('>')} `
}
```

### Pattern 3: Spawn with Inherited stdio

**What:** Delegate all shell syntax to bash. Return a promise that resolves with the exit code.

```typescript
import { spawn } from 'node:child_process'

function executeCommand(command: string, cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', command], {
      stdio: 'inherit',
      cwd,
      env: process.env,
    })

    child.on('close', (code) => {
      resolve(code ?? 1)
    })

    child.on('error', (err) => {
      console.error(`Failed to execute: ${err.message}`)
      resolve(127)
    })
  })
}
```

### Pattern 4: REPL Loop with Async/Await

**What:** Main loop using readline/promises question() in a while loop.

```typescript
import * as readline from 'node:readline/promises'

async function runShell(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    history: loadHistory(),
    terminal: true,
  })

  let running = true

  // Ctrl+D sends 'close' event
  rl.on('close', () => { running = false })

  while (running) {
    try {
      const line = await rl.question(buildPrompt(process.cwd(), os.homedir()))
      // ... classify and dispatch
    } catch (err) {
      // readline throws on close (Ctrl+D) -- this is normal
      if ((err as any)?.code === 'ERR_USE_AFTER_CLOSE') break
      // Unexpected error -- log and continue
      console.error(`Error: ${(err as Error).message}`)
    }
  }

  saveHistory(rl)
  rl.close()
}
```

### Anti-Patterns to Avoid
- **Parsing shell syntax:** Never split on `|`, `>`, `;` etc. Let bash handle it via `bash -c`.
- **Synchronous I/O:** Never use `readFileSync`, `execSync` in the REPL loop -- blocks event loop, breaks Ctrl+C.
- **Global mutable state:** Pass config/state through function params, not module-level variables.
- **`process.exit()` on SIGINT:** Ctrl+C must clear the line, not exit. Only Ctrl+D or `exit` command should exit.
- **Catching SIGINT globally during spawn:** When a child has `stdio: 'inherit'`, SIGINT naturally propagates to the child. Do not add a global handler that intercepts it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Terminal colors | ANSI escape code strings | `picocolors` | Cross-terminal compatibility, color detection |
| Line editing (arrow keys, backspace) | Raw stdin key processing | `node:readline` | Handles all terminal line editing natively |
| History navigation (up/down) | Manual history array with key bindings | `readline` `history` option | Built into createInterface |
| Shell syntax parsing | Custom tokenizer for pipes/redirects | `bash -c` delegation | Shell syntax is enormously complex; bash handles it |
| Process signal forwarding | Manual SIGINT piping | `spawn` with `stdio: 'inherit'` | Signals flow naturally to child with inherited stdio |

**Key insight:** Phase 1 should use almost exclusively Node.js built-in modules. The only npm dependency is `picocolors` (7KB). Everything else -- readline, child_process, fs, path, os, process -- is stdlib.

## Common Pitfalls

### Pitfall 1: cd in Child Process Does Nothing
**What goes wrong:** Running `cd /tmp` via `spawn('bash', ['-c', 'cd /tmp'])` changes the child's cwd, not the parent's. The shell prompt still shows the old directory.
**Why it happens:** Each spawned process has its own cwd. Only the parent can change its own via `process.chdir()`.
**How to avoid:** Intercept `cd` as a builtin. Call `process.chdir(resolvedPath)` directly. Handle edge cases: no args -> $HOME, `cd -` -> OLDPWD, `cd ~` -> homedir, `cd ~/foo` -> homedir + /foo.
**Warning signs:** `cd /tmp && pwd` shows wrong directory; prompt doesn't update after cd.

### Pitfall 2: Ctrl+C Kills the Shell
**What goes wrong:** Default Node.js SIGINT behavior exits the process. User presses Ctrl+C expecting to cancel a command, shell dies instead.
**Why it happens:** Node.js readline has its own SIGINT handling that emits a 'SIGINT' event on the interface. If not handled, it propagates to the process default handler which exits.
**How to avoid:** Listen for `rl.on('SIGINT', ...)` on the readline interface. During idle: clear line, re-display prompt. During child process with inherited stdio: SIGINT flows to child naturally (no action needed). Never call `process.exit()` from a SIGINT handler.
**Warning signs:** Shell exits when Ctrl+C is pressed at empty prompt.

### Pitfall 3: readline question() Rejection on Close
**What goes wrong:** When Ctrl+D is pressed, readline closes the interface. If `rl.question()` is pending, it rejects with `ERR_USE_AFTER_CLOSE`. Unhandled, this crashes the shell.
**Why it happens:** The promises API of readline rejects the question promise when the interface is closed.
**How to avoid:** Wrap `rl.question()` in try/catch. Catch `ERR_USE_AFTER_CLOSE` specifically and break the REPL loop (this is the normal Ctrl+D exit path).
**Warning signs:** Pressing Ctrl+D shows an unhandled promise rejection error.

### Pitfall 4: History File Race Condition
**What goes wrong:** Multiple ClaudeShell instances append to the same history file, potentially interleaving or corrupting entries.
**Why it happens:** Append-only writes are mostly safe on POSIX, but readline loads history once at startup, so instances don't see each other's commands.
**How to avoid:** Load history at startup (read file into array). Save history at exit (overwrite file with current array). Accept that concurrent instances have independent history within a session -- merge happens on next startup by loading the file again. This matches bash/zsh behavior.
**Warning signs:** History entries from another session appear mid-session (they should not).

### Pitfall 5: Tilde Expansion in cd Builtin
**What goes wrong:** `cd ~/Projects` fails because Node.js `process.chdir()` does not expand `~`. It tries to find a literal directory named `~`.
**Why it happens:** Tilde expansion is a shell feature, not an OS feature. Since `cd` is intercepted before reaching bash, we must handle it ourselves.
**How to avoid:** Before calling `process.chdir()`, replace leading `~` with `os.homedir()`. Only replace `~` at the start of the path (not in the middle).
**Warning signs:** `cd ~/Projects` fails with "no such directory".

### Pitfall 6: TTY State Corruption on Crash
**What goes wrong:** If the shell crashes during readline operation, the terminal may be left in raw mode (no echo, broken input).
**Why it happens:** readline sets terminal raw mode internally. An unhandled exception can skip cleanup.
**How to avoid:** Register cleanup handlers on `process.on('exit')`, `uncaughtException`, and `unhandledRejection` that call `rl.close()` and `process.stdin.setRawMode(false)` if applicable.
**Warning signs:** After a crash, typed characters don't appear in the terminal. User must run `reset`.

## Code Examples

### Complete cd Builtin with Edge Cases

```typescript
// Source: CONTEXT.md decisions D-10 through D-12
import * as path from 'node:path'
import * as os from 'node:os'

interface CdState {
  readonly previousDir: string | undefined
}

function expandTilde(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

function executeCd(args: string, state: CdState): { newState: CdState; error?: string } {
  const currentDir = process.cwd()
  let targetDir: string

  if (!args || args === '') {
    targetDir = os.homedir()                    // D-11: cd with no args
  } else if (args === '-') {
    if (!state.previousDir) {
      return { newState: state, error: 'cd: OLDPWD not set' }
    }
    targetDir = state.previousDir               // D-12: cd - returns to previous
    console.log(targetDir)                      // bash convention: print dir on cd -
  } else {
    targetDir = expandTilde(args)               // Handle ~/path
    targetDir = path.resolve(targetDir)         // Resolve relative paths
  }

  try {
    process.chdir(targetDir)                    // D-10: process.chdir()
    return {
      newState: { ...state, previousDir: currentDir },  // Immutable update
    }
  } catch {
    return {
      newState: state,
      error: `cd: no such file or directory: ${args}`,
    }
  }
}
```

### History Load/Save

```typescript
// Source: CONTEXT.md decisions D-20 through D-24
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

const HISTORY_FILE = path.join(os.homedir(), '.claudeshell_history')
const MAX_HISTORY = 10000

function loadHistory(): string[] {
  try {
    const content = fs.readFileSync(HISTORY_FILE, 'utf-8')
    return content.split('\n').filter(Boolean).slice(-MAX_HISTORY)
  } catch {
    return []  // File doesn't exist yet -- that's fine
  }
}

function shouldSaveToHistory(line: string, previousLine: string | undefined): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (trimmed.startsWith(' ')) return false        // D-24: space prefix = private
  if (trimmed === previousLine) return false        // D-23: no consecutive dupes
  return true
}

function saveHistory(history: readonly string[]): void {
  try {
    const dir = path.dirname(HISTORY_FILE)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(HISTORY_FILE, history.join('\n') + '\n', 'utf-8')
  } catch (err) {
    // History save failure is non-fatal -- log and continue
    process.stderr.write(`Warning: could not save history: ${(err as Error).message}\n`)
  }
}
```

### Signal Handling Pattern

```typescript
// Source: CONTEXT.md decisions D-16 through D-19
function setupSignalHandling(rl: readline.Interface): void {
  // Ctrl+C on readline interface (D-16, D-17)
  rl.on('SIGINT', () => {
    // If child process is running, SIGINT flows to it naturally
    // via inherited stdio -- no action needed here.
    // This handler only fires when readline is active (idle prompt).
    
    // Clear current line and show fresh prompt
    rl.write(null, { ctrl: true, name: 'u' })  // Clear line
    // The REPL loop will re-prompt on next iteration
  })

  // Ctrl+D is handled by readline 'close' event (D-18)
  // readline ignores Ctrl+D when line is not empty (D-19) -- this is default behavior
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `readline` callback API | `readline/promises` | Node.js 17+ (stable in 22) | Cleaner async/await REPL loop |
| chalk for colors | picocolors | 2023+ | 10x faster, 14x smaller |
| tsup for bundling | tsdown | 2025+ | tsup unmaintained, tsdown is successor |
| Jest for TS testing | Vitest | 2024+ | Native ESM+TS, no config needed |
| Manual raw mode for key handling | readline terminal mode | Always | readline handles line editing natively |

**Deprecated/outdated:**
- `readline` callback API: Still works but `readline/promises` is preferred for new code
- `chalk`: Functional but picocolors is strictly better for CLIs (smaller, faster)
- `tsup`: No longer maintained; use tsdown

## Open Questions

1. **readline history array size limit**
   - What we know: `createInterface` accepts a `history` array and `historySize` number
   - What's unclear: Whether very large history arrays (10K+ entries) cause memory or performance issues
   - Recommendation: Cap at 10,000 entries (same as bash default HISTSIZE). Load from file on startup, save on exit.

2. **readline SIGINT behavior during question()**
   - What we know: readline emits 'SIGINT' event when Ctrl+C is pressed. The `question()` promise does NOT reject on SIGINT -- it stays pending.
   - What's unclear: Whether we need to manually re-prompt after SIGINT or if readline handles it
   - Recommendation: Test early. The SIGINT handler should clear the line; the question() call remains pending until user types something or presses Ctrl+D.

3. **`a` prefix reservation**
   - What we know: CONTEXT.md says reserve `a` prefix and show placeholder message
   - What's unclear: Exact message wording
   - Recommendation: Show `AI commands will be available in a future update.` -- simple, not misleading

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 22.12.0 | -- |
| npm | Package management | Yes | 10.9.0 | -- |
| bash | Command execution (D-05) | Yes | /bin/bash (macOS built-in) | -- |
| TypeScript | Build | Yes (via npm) | 6.0.2 (latest) | -- |

**Missing dependencies with no fallback:** None -- all requirements met.

**Missing dependencies with fallback:** None.

## Sources

### Primary (HIGH confidence)
- Node.js readline/promises API -- verified via `node -e` (exports: Interface, Readline, createInterface; Interface.question is the only custom method)
- Node.js child_process.spawn -- verified `bash -c` pipe execution works correctly
- CONTEXT.md -- 27 locked decisions defining exact behavior
- ARCHITECTURE.md -- component boundaries, data flow, anti-patterns
- PITFALLS.md -- 15 documented pitfalls with prevention strategies
- STACK.md -- technology choices with rationale

### Secondary (MEDIUM confidence)
- npm registry -- verified current versions: picocolors 1.1.1, tsx 4.21.0, tsdown 0.21.7, vitest 4.1.2, typescript 6.0.2

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all Node.js built-ins, verified on local machine, versions confirmed via npm
- Architecture: HIGH -- patterns directly from locked CONTEXT.md decisions, validated against ARCHITECTURE.md research
- Pitfalls: HIGH -- documented in PITFALLS.md with Node.js issue references, cross-verified with readline API behavior

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable domain -- Node.js stdlib APIs do not change frequently)
