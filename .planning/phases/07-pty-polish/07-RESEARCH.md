# Phase 7: PTY & Polish - Research

**Researched:** 2026-03-31
**Domain:** Interactive terminal command passthrough, readline lifecycle, PTY handling
**Confidence:** HIGH

## Summary

Phase 7 makes interactive terminal programs (vim, ssh, less, htop, nano, top) work correctly when launched from ClaudeShell, and ensures the shell prompt restores cleanly after they exit. This is the final phase of v2.0.

The current `passthrough.ts` uses `spawn('bash', ['-c', cmd], { stdio: ['inherit', 'inherit', 'pipe'] })` -- stdin and stdout are inherited but stderr is piped for capture. This is almost correct for interactive commands, but the piped stderr breaks programs that write UI to stderr (less, vim status bars). The fix is straightforward: detect known interactive commands and spawn with full `stdio: 'inherit'` (all three streams). The harder part is the readline lifecycle -- readline must be paused before spawning an interactive child and resumed after it exits, or keystrokes will be split between readline and the child.

**Primary recommendation:** Extend `passthrough.ts` with an `executeInteractive()` function that spawns with `stdio: 'inherit'`, add readline pause/resume around interactive command execution in `shell.ts`, and add an `interactive_commands` config field for user extensibility. Do NOT add `node-pty` -- `stdio: 'inherit'` is sufficient for all target use cases.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: First approach: rely on existing `spawn('bash', ['-c', cmd], { stdio: 'inherit' })` -- this already passes stdin/stdout/stderr directly to the child
- D-02: Test with vim, less, ssh, htop, nano, top to validate stdio:inherit coverage
- D-03: If stdio:inherit fails for specific commands, add `node-pty` as an `optionalDependency` (not required -- graceful degradation if it fails to install)
- D-04: Create `src/interactive.ts` module that wraps the passthrough with PTY-aware logic
- D-05: Before spawning an interactive command, pause the readline interface to release stdin ownership
- D-06: After interactive command exits, resume readline and redraw the prompt
- D-07: Maintain a known-interactive list: `vim`, `vi`, `nvim`, `nano`, `less`, `more`, `man`, `ssh`, `htop`, `top`, `tmux`, `screen`, `fzf`
- D-08: Detection heuristic: extract first word (command name) from input, check against list
- D-09: Commands with pipes are NOT treated as interactive (e.g., `less` alone is interactive, `cat file | less` still works via stdio:inherit)
- D-10: If a non-listed command needs a TTY and fails, show hint: "Command may need interactive mode. Add it to config: interactive_commands"
- D-11: Config field: `"interactive_commands": ["vim", "vi", ...]` -- user-extensible list
- D-12: Before interactive command: call `rl.pause()` and set `process.stdin.setRawMode(false)` if in raw mode
- D-13: After interactive command: call `rl.resume()`, restore raw mode if needed, redraw prompt
- D-14: Track readline state in ShellState: `interactiveRunning: boolean`
- D-15: Ctrl+C during interactive command: let the child process handle it (don't intercept)
- D-16: After interactive command exits, clear any residual terminal state with `process.stdout.write('\x1b[0m')` (reset ANSI)
- D-17: Redraw the prompt on a fresh line -- don't assume cursor position
- D-18: If terminal dimensions changed during interactive command (resize), prompt still renders correctly (already dynamic)

### Claude's Discretion
- Whether to add node-pty at all (try stdio:inherit first, may be sufficient)
- Exact raw mode handling details
- Whether to show "entering interactive mode..." indicator
- How to handle interactive commands in chat mode (likely: temporarily exit chat, run command, return)

### Deferred Ideas (OUT OF SCOPE)
None -- this is the final phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PTY-01 | Interactive commands (vim, ssh, less, htop) work correctly via PTY passthrough | Interactive detection list (D-07), full stdio:inherit spawn (D-01), readline pause/resume lifecycle (D-05/D-06) |
| PTY-02 | Shell prompt restores cleanly after interactive command exits | ANSI reset (D-16), prompt redraw on fresh line (D-17), readline resume (D-13) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js child_process | Built-in | `spawn()` with `stdio: 'inherit'` | Zero-dependency interactive command execution |
| Node.js readline/promises | Built-in | Pause/resume for stdin ownership handoff | Already used by shell.ts |

### Supporting
No new dependencies needed. This phase uses only Node.js built-ins.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| stdio: 'inherit' | node-pty | Full PTY emulation but requires native C++ compilation, breaks npm install on systems without build tools. Only needed if stdio:inherit fails for specific programs. |
| node-pty | @lydell/node-pty / node-pty-prebuilt-multiarch | Prebuilt binaries avoid compilation, but still a native dependency with platform matrix |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  interactive.ts     # NEW: Interactive command detection + execution
  passthrough.ts     # UNCHANGED: Non-interactive command execution
  classify.ts        # MINOR: Route interactive commands distinctly (optional)
  shell.ts           # MINOR: readline pause/resume around interactive calls
  config.ts          # MINOR: Add interactive_commands field
  types.ts           # MINOR: Add interactiveRunning to ShellState
```

### Pattern 1: Interactive Command Detection
**What:** Extract first word from command, check against configurable known-interactive set. Skip detection if command contains pipes.
**When to use:** Before dispatching any passthrough command.
**Example:**
```typescript
// interactive.ts
const DEFAULT_INTERACTIVE: ReadonlySet<string> = new Set([
  'vim', 'vi', 'nvim', 'nano', 'emacs',
  'less', 'more', 'man',
  'top', 'htop', 'btop',
  'ssh', 'telnet',
  'tmux', 'screen',
  'fzf',
])

export function isInteractiveCommand(
  command: string,
  userList: readonly string[] = []
): boolean {
  // Commands with pipes use normal passthrough (stdio:inherit on stdin/stdout handles it)
  if (command.includes('|')) return false
  const firstWord = command.trim().split(/\s/)[0]
  if (DEFAULT_INTERACTIVE.has(firstWord)) return true
  return userList.includes(firstWord)
}
```

### Pattern 2: Readline Pause/Resume Lifecycle
**What:** Before spawning an interactive child, pause readline to release stdin. After child exits, resume readline and redraw prompt.
**When to use:** Every interactive command execution.
**Example:**
```typescript
// In shell.ts, around interactive command dispatch:

// Before interactive command:
rl.pause()
if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
  process.stdin.setRawMode(false)
}
state = { ...state, interactiveRunning: true }

// Execute interactive command (stdio: 'inherit')
const result = await executeInteractive(action.command)

// After interactive command:
state = { ...state, interactiveRunning: false }
process.stdout.write('\x1b[0m')  // Reset ANSI attributes
if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
  process.stdin.setRawMode(true)
}
rl.resume()
// Prompt redraws automatically on next rl.question() iteration
```

### Pattern 3: Full stdio:inherit Spawn
**What:** Spawn interactive commands with all three stdio streams inherited, giving the child full terminal control.
**When to use:** For detected interactive commands only.
**Example:**
```typescript
// interactive.ts
import { spawn } from 'node:child_process'
import type { CommandResult } from './passthrough.js'

export function executeInteractive(
  command: string,
  cwd?: string
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', command], {
      stdio: 'inherit',   // ALL streams to child -- full terminal control
      cwd: cwd ?? process.cwd(),
      env: process.env,
    })
    child.on('close', (code) => {
      resolve({ exitCode: code ?? 1, stderr: '' })
    })
    child.on('error', (err) => {
      resolve({ exitCode: 127, stderr: err.message })
    })
  })
}
```

### Anti-Patterns to Avoid
- **Keeping readline active during interactive command:** Causes keystroke splitting between readline and child. Always `rl.pause()` before.
- **Using node-pty as first approach:** Adds native compilation dependency. stdio:inherit handles vim, ssh, less, htop, nano, top correctly.
- **Intercepting Ctrl+C during interactive mode:** Let the child handle SIGINT. Remove/disable readline's SIGINT handler during interactive execution.
- **Assuming cursor position after interactive exit:** Always write to a fresh line. Interactive programs may leave cursor anywhere.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Terminal control for interactive programs | Custom PTY management | `stdio: 'inherit'` on `spawn()` | Node.js inherits the parent's TTY directly; child gets full terminal control |
| Keystroke forwarding to child | Manual stdin.pipe() to child | `stdio: 'inherit'` | Inherit passes the fd directly, no JS-level piping needed |
| Terminal reset after interactive exit | Custom ANSI state tracker | `\x1b[0m` reset sequence | Single escape sequence resets all attributes; sufficient for cleanup |

**Key insight:** `stdio: 'inherit'` passes the actual file descriptors (not streams) to the child process. This means the child gets direct access to the terminal, including raw mode, alternate screen buffer, and signal handling -- exactly what interactive programs need.

## Common Pitfalls

### Pitfall 1: readline and Child Fighting Over stdin
**What goes wrong:** If readline is not paused before spawning an interactive child, both readline and the child read from stdin simultaneously. Keystrokes are randomly split between them -- roughly 50% lost.
**Why it happens:** Node.js readline sets up its own read loop on stdin. When a child with `stdio: 'inherit'` also reads stdin, the OS kernel round-robins data between the two readers.
**How to avoid:** Always call `rl.pause()` before spawning interactive commands. Call `rl.resume()` only after the child exits.
**Warning signs:** Characters disappear when typing in vim/less. Shell prompt appears mixed with interactive program output.

### Pitfall 2: Ctrl+C Kills Shell Instead of Interactive Program
**What goes wrong:** The existing `rl.on('SIGINT')` handler runs during interactive command execution and interferes with the child's signal handling. Ctrl+C aborts the shell or triggers AI cancellation logic instead of being handled by vim/ssh/less.
**Why it happens:** readline's SIGINT handler fires on Ctrl+C regardless of whether an interactive child is running. The handler checks `state.aiStreaming` but doesn't know about interactive commands.
**How to avoid:** Track `interactiveRunning` in ShellState. In the SIGINT handler, if `interactiveRunning` is true, do nothing -- let the signal flow to the child process group via the inherited stdio. The child (vim, ssh, etc.) handles SIGINT itself.
**Warning signs:** Pressing Ctrl+C in vim exits to shell prompt instead of staying in vim.

### Pitfall 3: Prompt Corruption After Interactive Exit
**What goes wrong:** After exiting an interactive program (especially vim which uses alternate screen buffer), the shell prompt renders incorrectly -- overlapping text, wrong colors, or missing entirely.
**Why it happens:** Interactive programs may leave the terminal in a non-default state: alternate screen buffer active, colors set, cursor positioned arbitrarily. If readline resumes without cleanup, the prompt renders on top of residual state.
**How to avoid:** After interactive exit: (1) write `\x1b[0m` to reset ANSI attributes, (2) write `\n` to ensure fresh line, (3) resume readline -- the next `rl.question()` call redraws the prompt naturally.
**Warning signs:** Shell prompt appears with wrong colors or in wrong position after exiting vim/htop.

### Pitfall 4: Interactive Detection False Positives/Negatives
**What goes wrong:** A command like `python` (REPL) is not in the interactive list and fails when launched normally. Or `vim --version` is treated as interactive even though it just prints and exits.
**Why it happens:** Detection is based on command name only, not on whether the program actually needs a TTY. Some commands are interactive sometimes (python with no args) and non-interactive other times (python script.py).
**How to avoid:** Keep the default list conservative (only clearly interactive programs). Provide user config `interactive_commands` for extensibility. Show a helpful hint when a command fails with TTY-related errors: "Command may need interactive mode."
**Warning signs:** User reports command not working, needs to be added to interactive list.

### Pitfall 5: Raw Mode Not Restored After Interactive Exit
**What goes wrong:** If readline was in raw mode before the interactive command, and raw mode is not restored after, subsequent readline input behaves differently -- no line editing, no arrow keys, etc.
**Why it happens:** readline sets raw mode on stdin for features like character-by-character input, arrow key handling. Interactive programs may change raw mode settings. If we disable raw mode before spawning (D-12) but forget to restore it, readline breaks.
**How to avoid:** Check `process.stdin.isRaw` before spawning, save the value, restore after child exits. However, based on codebase analysis, the current code never explicitly calls `setRawMode` -- readline manages this internally. The safest approach is: `rl.pause()` before, `rl.resume()` after -- readline will re-establish its own raw mode state on resume.
**Warning signs:** Arrow keys produce `^[[A` characters instead of navigation after exiting an interactive command.

## Code Examples

### Complete Interactive Module (interactive.ts)
```typescript
// Source: Based on Node.js child_process docs + project patterns
import { spawn } from 'node:child_process'
import type { CommandResult } from './passthrough.js'

const DEFAULT_INTERACTIVE: ReadonlySet<string> = new Set([
  'vim', 'vi', 'nvim', 'nano', 'emacs',
  'less', 'more', 'man',
  'top', 'htop', 'btop',
  'ssh', 'telnet',
  'tmux', 'screen',
  'fzf',
])

export function isInteractiveCommand(
  command: string,
  userList: readonly string[] = []
): boolean {
  if (command.includes('|')) return false
  const firstWord = command.trim().split(/\s/)[0]
  if (DEFAULT_INTERACTIVE.has(firstWord)) return true
  return userList.includes(firstWord)
}

export function executeInteractive(
  command: string,
  cwd?: string
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', command], {
      stdio: 'inherit',
      cwd: cwd ?? process.cwd(),
      env: process.env,
    })
    child.on('close', (code) => {
      resolve({ exitCode: code ?? 1, stderr: '' })
    })
    child.on('error', (err) => {
      resolve({ exitCode: 127, stderr: err.message })
    })
  })
}
```

### Shell.ts Integration Pattern
```typescript
// In the passthrough case of shell.ts REPL loop:
case 'passthrough': {
  const interactiveList = config.interactive_commands ?? []
  if (isInteractiveCommand(action.command, interactiveList)) {
    // Pause readline to release stdin
    rl.pause()
    state = { ...state, interactiveRunning: true }

    const result = await executeInteractive(action.command)

    // Restore terminal and readline
    process.stdout.write('\x1b[0m')  // Reset ANSI
    state = { ...state, interactiveRunning: false }
    rl.resume()

    if (result.exitCode !== 0) {
      process.stderr.write(`[exit: ${result.exitCode}]\n`)
    }
    break
  }

  // Non-interactive: existing executeCommand path
  const result = await executeCommand(action.command)
  // ... existing error handling ...
  break
}
```

### SIGINT Handler Extension
```typescript
// In shell.ts SIGINT handler:
rl.on('SIGINT', () => {
  if (state.interactiveRunning) {
    // Do nothing -- let child process handle Ctrl+C
    return
  }
  if (state.aiStreaming && currentAbortController) {
    currentAbortController.abort()
    process.stderr.write('\n[cancelled]\n')
    state = { ...state, aiStreaming: false }
  }
  // When not streaming and not interactive, readline handles SIGINT normally
})
```

### Config Extension
```typescript
// In config.ts ClaudeShellConfig interface:
export interface ClaudeShellConfig {
  readonly api_key?: string
  readonly model?: string
  readonly history_size?: number
  readonly prompt_template?: string
  readonly prefix?: string
  readonly permissions?: 'auto' | 'ask' | 'deny'
  readonly interactive_commands?: readonly string[]  // NEW
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| node-pty for all interactive commands | stdio: 'inherit' on spawn | Always available in Node.js | Eliminates native dependency; works on all platforms |
| Custom stdin forwarding | File descriptor inheritance | Node.js 0.12+ | Child gets direct TTY access without JS intermediary |
| Re-implementing terminal emulation | Let the real terminal handle it | N/A | No terminal emulation needed -- shell is already in a real terminal |

**Deprecated/outdated:**
- node-pty is still actively maintained but unnecessary for this use case. It's needed when you want to create a terminal inside a non-terminal context (e.g., VS Code's terminal panel, web-based terminals). ClaudeShell runs in a real terminal, so stdio:inherit suffices.

## Open Questions

1. **Does readline.pause() fully release stdin?**
   - What we know: Node.js docs say `rl.pause()` pauses the readline input stream. The readline source calls `input.pause()` internally.
   - What's unclear: Whether pausing the stream actually stops it from consuming bytes from the fd, or just buffers them. With `stdio: 'inherit'` the child gets the fd directly, so this should work -- the child reads from the fd, not from the Node.js stream.
   - Recommendation: Test empirically with vim. If keystrokes are lost, investigate further. HIGH confidence this works based on architecture analysis.

2. **Chat mode interaction with interactive commands**
   - What we know: Chat mode (D-discretion) may need to handle users typing interactive commands while in `ai >` prompt.
   - What's unclear: Whether to allow shell passthrough from chat mode, or require `/exit` first.
   - Recommendation: In chat mode, lines not starting with `/` go to AI. Users must `/exit` to shell mode first, then run interactive commands. This avoids complexity and matches the current design where chat mode is AI-only.

3. **Should we show an "entering interactive mode" indicator?**
   - What we know: D-discretion allows this.
   - Recommendation: No -- it adds visual noise. Interactive commands should feel transparent. The program's own UI (vim's status bar, etc.) makes it obvious.

## Project Constraints (from CLAUDE.md)

- **Runtime:** Node.js 22+ (ESM, `"type": "module"`)
- **Language:** TypeScript 6 with strict mode
- **Build:** tsdown (produces single `dist/cli.js`)
- **Test:** Vitest (`npm test`)
- **Immutable state:** ShellState updated via spread, never mutated
- **Shell passthrough:** All non-builtin commands go to `spawn('bash', ['-c', cmd])`
- **Lazy SDK loading:** SDK imported on first `a` command only
- **No console.log:** Use process.stderr.write or process.stdout.write
- **File size:** 200-400 lines typical, 800 max
- **Commit after every change**

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v22.12.0 | -- |
| bash | spawn('bash', ...) | Yes | Built-in on macOS/Linux | -- |
| Vitest | Testing | Yes | ^4.1.2 (devDep) | -- |

No external dependencies needed for this phase. All functionality uses Node.js built-ins.

## Sources

### Primary (HIGH confidence)
- Node.js `child_process.spawn` documentation -- stdio: 'inherit' passes file descriptors directly
- Node.js `readline` documentation -- pause/resume lifecycle
- Node.js TTY documentation -- setRawMode, isRaw, isTTY
- Existing codebase analysis: `src/passthrough.ts`, `src/shell.ts`, `src/classify.ts`, `src/types.ts`, `src/config.ts`

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` -- Pitfall #2 (readline/PTY stdin conflict), Pitfall #5 (PTY zombies), Pitfall #9 (Ctrl+C contract)
- `.planning/research/ARCHITECTURE.md` -- Section 3 (PTY / Interactive Command Support)
- Node.js issue #5574 -- keystroke loss with multiple stdin readers

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and Node.js documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- using only Node.js built-ins, zero new dependencies
- Architecture: HIGH -- extending proven patterns (passthrough.ts, ShellState immutable spread, classify-then-dispatch)
- Pitfalls: HIGH -- well-documented in project's own PITFALLS.md and verified against codebase analysis

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (stable -- Node.js built-ins, no fast-moving dependencies)
