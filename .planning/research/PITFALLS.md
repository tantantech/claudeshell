# Domain Pitfalls

**Domain:** AI-powered shell / CLI wrapping Claude Code SDK
**Researched:** 2026-03-31
**Scope:** v2 features -- session management, pipe-friendly AI, PTY support, permission control
**Note:** v1 pitfalls (shell injection, REPL blocking, cd/env desync, TTY corruption, etc.) are assumed addressed. This document covers pitfalls specific to ADDING v2 features to the existing system.

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or broken user experience.

### Pitfall 1: Session Resume Fails Silently Due to CWD Mismatch

**What goes wrong:** Sessions are stored under `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`, where `<encoded-cwd>` is the absolute working directory with every non-alphanumeric character replaced by `-`. If a user runs `a analyze this codebase` from `/Users/me/project`, then `cd`s to `/Users/me/project/src` and types `a continue that analysis`, the SDK looks in the wrong directory and silently creates a fresh session instead of resuming. The user thinks context is preserved but the AI has no memory of the prior conversation.

**Why it happens:** The SDK's `continue: true` option finds the most recent session *in the current directory*. ClaudeShell changes `process.cwd()` when the user runs `cd`, which changes the encoded path used for session lookup. This is invisible to the user -- nothing indicates the session wasn't actually resumed.

**Consequences:** Users rely on session continuity as a core feature. Silent session loss means repeated work, lost analysis context, and confusion when the AI "forgets" what it just said. Worse, the user may not realize it happened until several commands later.

**Prevention:**
- Track the session ID explicitly from the `ResultMessage.session_id` field -- never rely solely on `continue: true`
- When resuming, always use `resume: sessionId` with the stored session ID, not `continue: true`
- Store the active session ID in `ShellState` and pass it to every `query()` call
- When the user runs `cd`, the session should continue with the same session ID (use explicit resume, not directory-based lookup)
- Provide visual feedback: display "(session: abc123)" in the prompt or a status indicator so users can see which session is active
- On `/fresh` or session reset, explicitly clear the stored session ID

**Detection:** Run `a hello` from `/project`, `cd src`, then `a what did I just say`. If the AI has no context from the prior greeting, session resume is broken.

**Phase:** Must be correct in the session management implementation. Fundamental design decision.

**Confidence:** HIGH -- documented in official Claude SDK session docs as the most common `resume` pitfall.

---

### Pitfall 2: readline and node-pty Fighting Over stdin

**What goes wrong:** The existing shell uses Node.js `readline` to manage the REPL prompt. Adding `node-pty` for interactive program support (vim, ssh, less) creates two systems competing for `process.stdin`. When a PTY-spawned program is running, readline must completely yield stdin control. When the program exits, readline must cleanly reclaim stdin. Getting this handoff wrong causes lost keystrokes (~50% randomly dropped), double-echoed input, or a completely frozen shell.

**Why it happens:** Node.js documents that there should be only one `tty.ReadStream` instance reading stdin at a time. `readline` sets raw mode on stdin for its prompt handling. `node-pty` allocates a separate pseudo-terminal that needs its own input stream. If both are active simultaneously, keystrokes are split randomly between them. The handoff on program exit is also fragile -- readline must re-enter raw mode and redisplay the prompt without corrupting terminal state.

**Consequences:** Users type commands and characters disappear. Interactive programs behave erratically. After exiting vim or ssh, the shell prompt is broken or keystrokes echo twice.

**Prevention:**
- Before spawning a PTY child: call `rl.pause()`, disable raw mode, pipe `process.stdin` directly to the PTY
- After PTY child exits: re-enable raw mode, call `rl.resume()`, redisplay the prompt
- Never have readline and a PTY child reading stdin simultaneously
- Consider a state machine: `IDLE` (readline owns stdin), `PASSTHROUGH` (child process owns stdin via spawn inherit), `PTY` (node-pty owns stdin). Transitions must be atomic
- Test with: vim (full TUI), ssh (remote session), less (pager), ctrl+c inside PTY program, rapid exit-and-type sequences

**Detection:** Open vim via the shell, type text, exit. Immediately type a command. If characters are missing or doubled, the handoff is broken.

**Phase:** PTY support implementation. Must be designed before any PTY code is written.

**Confidence:** HIGH -- Node.js issue #5574 documents the exact keystroke-loss pattern with multiple stdin readers.

---

### Pitfall 3: Pipe Input Destroys the Interactive REPL

**What goes wrong:** When stdin is piped (`cat file.txt | claudeshell` or `echo "a summarize" | claudeshell`), `process.stdin.isTTY` is `false`. The current readline interface is initialized with `terminal: true`, which will break. More subtly, the `a` command pipe use case (`cat log.txt | a summarize`) requires reading piped data as context while KEEPING the REPL interactive -- two fundamentally different stdin modes at the same time.

**Why it happens:** Unix pipes replace stdin with a pipe fd. `process.stdin.isTTY` becomes `undefined`/`false`. readline configured with `terminal: true` on a non-TTY stdin causes either a crash ("Raw mode is not supported") or silent malfunction. Claude Code itself had issue #1072 and #5925 documenting this exact crash pattern. The harder problem is that `cat file.txt | a summarize` needs to: (1) read all piped data from stdin, (2) pass it as context to the AI prompt, (3) return to interactive mode for the response -- but stdin is exhausted after step 1.

**Consequences:** Users who try to pipe data into the shell get crashes or hangs. The pipe workflow -- one of the most requested v2 features -- simply does not work.

**Prevention:**
- Detect pipe vs TTY at startup: if `process.stdin.isTTY` is false, switch to non-interactive mode automatically
- For non-interactive mode: read all stdin, process the `a` command, output result to stdout (plain text, no colors), exit
- For the hybrid case (`cat file.txt | a summarize` within an interactive session): this is NOT piping into claudeshell -- it is claudeshell detecting that a subcommand's stdin should come from a pipe. Implement this as a shell syntax feature, not stdin multiplexing
- Alternative approach: use the shell's passthrough to bash, which naturally handles pipes. `cat file.txt | a summarize` can be rewritten internally as reading the file content and injecting it into the AI prompt
- Check `process.stdout.isTTY` separately for output formatting -- piped output should be plain text without ANSI codes or markdown rendering
- Claude Code SDK's `--output-format json` flag is useful for programmatic consumers

**Detection:** Run `echo "hello" | claudeshell` -- should not crash. Run `cat large_file.txt | claudeshell -p "summarize"` -- should output a plain-text summary.

**Phase:** Pipe support implementation. Requires architectural decision on how piped context reaches the AI.

**Confidence:** HIGH -- Claude Code issues #1072, #5925 document the exact "Raw mode not supported" crash. The pipe architecture challenge is well-understood from tools like `aichat` and `gh copilot suggest`.

---

### Pitfall 4: Permission Escalation Through Session Resume

**What goes wrong:** A session created with restrictive permissions (`allowedTools: ["Read", "Grep"]`) is resumed later with more permissive settings (e.g., `permissionMode: "acceptEdits"` or `bypassPermissions`). The AI now has access to tools and actions that were denied in the original session. Conversely, a session created with broad permissions might be resumed with restrictions, but the AI's conversation history contains results from tools that are now denied -- leading to inconsistent state.

**Why it happens:** The SDK applies the *current query's* permission options, not the original session's. Session resume restores conversation history but does not restore the permission context. Developers assume "same session = same permissions" but this is not how the SDK works. The `bypassPermissions` warning in the SDK docs explicitly states that all subagents inherit this mode and it cannot be overridden.

**Consequences:** Untrusted or shared sessions could be weaponized to escalate permissions. A user who carefully restricted AI access in one context gets broad access when resuming from a different configuration. In the opposite direction, resuming with tighter permissions creates confusing "permission denied" errors for tools the AI previously used successfully.

**Prevention:**
- Store the permission mode alongside the session ID in `ShellState`
- When resuming a session, restore the same permission mode unless the user explicitly changes it
- Warn the user if the permission mode differs from the original session: "This session was created with restricted permissions. Current mode allows file edits. Continue? [y/N]"
- Never store `bypassPermissions` sessions -- or if you do, mark them clearly so they aren't accidentally resumed in production contexts
- Use `disallowed_tools` as a hard deny list that persists regardless of permission mode (the SDK enforces this even in `bypassPermissions`)

**Detection:** Create a session with `allowedTools: ["Read"]`, resume it with `permissionMode: "bypassPermissions"`. If the AI can now write files, permission escalation exists.

**Phase:** Must be addressed when implementing session management + permission control together.

**Confidence:** HIGH -- the SDK docs explicitly warn about `allowed_tools` not constraining `bypassPermissions`, and subagent permission inheritance.

---

### Pitfall 5: PTY Process Zombies and Resource Leaks

**What goes wrong:** Interactive programs launched via node-pty don't get properly cleaned up. The user starts vim, presses Ctrl+C or the shell crashes, and the PTY process keeps running. Over time, zombie PTY processes accumulate, consuming file descriptors and system resources. On macOS, each node-pty instance consumes a pseudo-terminal pair from a limited pool (typically 256).

**Why it happens:** node-pty's official docs warn that "Pseudo-terminals and shell processes consume system resources, so you should make sure to close the pty process when it's no longer needed by calling the kill method." But crash paths, SIGINT during PTY operation, and unhandled promise rejections can all skip the cleanup code. node-pty is also not thread-safe -- if the shell uses worker threads for any purpose, PTY operations can corrupt state.

**Consequences:** System resource exhaustion after extended use. "No PTY available" errors that require terminal restart. Zombie processes consuming CPU/memory. On shared systems, this can affect other users.

**Prevention:**
- Maintain a registry of active PTY processes in `ShellState`
- Register cleanup on ALL exit paths: `process.on('exit')`, `SIGINT`, `SIGTERM`, `uncaughtException`, `unhandledRejection`
- Use try/finally around every PTY lifecycle: `const pty = spawn(...); try { await waitForExit(pty); } finally { pty.kill(); }`
- Set a timeout for PTY processes -- if a PTY child hasn't produced output in N minutes, offer to kill it
- On shell startup, check for orphaned PTY processes from previous crashed sessions
- Never use node-pty across worker threads

**Detection:** Start vim via the shell, then force-kill the shell process. Check `ps aux | grep pty` for orphaned processes. Repeat 10 times. If PTY count grows, cleanup is broken.

**Phase:** PTY support implementation. Must be designed into the PTY lifecycle from the start.

**Confidence:** HIGH -- node-pty docs explicitly warn about resource cleanup. macOS PTY limits are well-documented.

## Moderate Pitfalls

### Pitfall 6: Context Window Explosion with Session History

**What goes wrong:** Session continuity means every prior `a` command's full conversation (prompts, tool calls, file contents, results) stays in context. Users who rely on sessions heavily hit context limits 5-10x faster than single-query users. The "lost-in-the-middle" effect (LLMs weigh beginning and end of context more heavily than the middle) means important earlier session context gets functionally ignored even before the window fills.

**Why it happens:** v1 treats each `a` command independently (no session). v2 adds session continuity, which accumulates context across commands. A user running 10 AI commands in a session might have 50K+ tokens of history, with file reads and tool outputs being the biggest consumers. Research shows effective context often falls far below advertised limits -- up to 99% degradation on complex tasks.

**Prevention:**
- Implement explicit session boundaries: `/fresh` starts a new session, `a --session` uses the current session, `a` (bare) defaults to session mode but with a configurable default
- Use the SDK's compaction feature (`/compact` equivalent) -- trigger it automatically when token usage exceeds a threshold (e.g., 60% of window)
- Show a "context usage" indicator: `[42K/200K tokens]` so users understand why responses may degrade
- Truncate large tool outputs before they enter the session history (first/last N lines of command output)
- Consider a "sliding window" approach: summarize older session turns rather than keeping full history
- The SDK supports `persistSession: false` for stateless queries -- offer this as a flag for one-off questions within a session

**Detection:** Start a session, run 20+ AI commands including file reads, measure response quality and latency on command 1 vs command 20. If quality drops or latency doubles, context management is needed.

**Phase:** Session management implementation. Must plan for compaction from the start, not bolt it on later.

**Confidence:** HIGH -- research from Chroma (context rot) and production LLM tools confirms this universally.

---

### Pitfall 7: Permission UX That Blocks Flow

**What goes wrong:** Every potentially dangerous operation prompts the user for permission: "Allow file edit? [y/N]", "Allow bash command? [y/N]". Users who wanted AI-assisted productivity now spend more time approving operations than typing commands. They either switch to `bypassPermissions` (unsafe) or stop using AI commands (defeats the purpose).

**Why it happens:** The default permission mode in the SDK triggers `canUseTool` for every unmatched tool request. If ClaudeShell implements permission control without thoughtful defaults, every `Bash`, `Write`, and `Edit` tool use prompts the user. In a shell context where the user *already typed the command*, re-asking for permission feels absurdly redundant.

**Consequences:** Users disable permissions entirely (`bypassPermissions`) to avoid friction, which is the worst security outcome. Or they abandon AI commands because the UX is too slow. Neither achieves the goal of "safe but productive."

**Prevention:**
- Default to `acceptEdits` mode for shell contexts -- the user invoked the AI, they expect it to do things
- Use `allowedTools` to pre-approve the standard tool set: `["Read", "Write", "Edit", "Bash", "Glob", "Grep"]`
- Only prompt for truly dangerous operations: destructive commands (`rm -rf`), operations outside the current project directory, network access
- Implement a "trust radius" -- auto-approve operations within the current project tree, prompt for anything outside it
- Use `disallowed_tools` as the hard safety net rather than prompting for everything
- Show what the AI is doing (tool start/end indicators already exist) but don't block on approval unless genuinely risky
- Provide a config option: `permission_level: "standard" | "cautious" | "yolo"` with sensible descriptions

**Detection:** Run `a add a comment to this file` and count how many permission prompts appear. If > 1, the UX is too aggressive.

**Phase:** Permission control implementation. The default permission stance is a critical UX/security tradeoff.

**Confidence:** MEDIUM -- based on Claude Code user community feedback about permission fatigue, and the SDK's explicit `dontAsk` mode existing to address this pattern.

---

### Pitfall 8: Pipe Output Includes ANSI/Markdown Garbage

**What goes wrong:** When ClaudeShell output is piped (`a explain git | less` or `a summarize > output.txt`), the output includes ANSI color codes, markdown rendering artifacts, spinner characters, and tool-use indicators. The piped output is unreadable in a text file and breaks downstream tools that expect clean text.

**Why it happens:** The existing renderer uses `marked-terminal` for markdown rendering and `picocolors` for colors. These produce ANSI escape sequences. The "Thinking..." spinner writes and erases to stderr. When stdout is piped, `process.stdout.isTTY` becomes false, but if the renderer doesn't check this, all formatting goes to the pipe.

**Consequences:** One of v2's headline features (pipe-friendly output) is broken. Users can't integrate ClaudeShell with Unix pipelines, which is the primary value proposition of being a shell rather than a separate UI.

**Prevention:**
- Check `process.stdout.isTTY` at renderer creation (this already exists in `createRenderer` -- verify it actually disables all formatting)
- When `isTTY` is false: disable all ANSI codes, disable markdown rendering (output raw text), suppress spinners and progress indicators, suppress tool-use indicators
- Write spinners and status messages to stderr only (already partially done with "Thinking..."), so they don't contaminate piped stdout
- Support `--format json` flag for programmatic consumers
- Support `--format plain` flag to force plain text even in a TTY
- Test with: `a hello | cat`, `a hello > /tmp/out.txt && cat /tmp/out.txt`, `a hello | grep -c '\x1b'` (should be 0)

**Detection:** Run `a hello | cat -v`. If you see `^[[` escape sequences, ANSI codes are leaking.

**Phase:** Pipe support implementation. Must verify the existing `isTTY` check is comprehensive.

**Confidence:** HIGH -- the existing codebase already checks `isTTY` but only at renderer creation; it may not cover all output paths (stderr, spinner, tool indicators).

---

### Pitfall 9: PTY Breaks Ctrl+C Contract

**What goes wrong:** The existing shell has a carefully designed SIGINT contract: Ctrl+C during AI streaming calls `abortController.abort()`, Ctrl+C at idle prompt clears the line. Adding PTY support introduces a third state where Ctrl+C should flow to the PTY child process. Getting this wrong means Ctrl+C kills the shell while vim is running, or Ctrl+C doesn't cancel AI queries when a PTY was previously active.

**Why it happens:** SIGINT handling must now be a three-way state machine instead of two-way. The transition between states is tricky: when does "PTY active" end? What if the PTY program spawns a child? What if the user backgrounds a PTY process? The existing `rl.on('SIGINT')` handler must be augmented or replaced depending on the current state.

**Consequences:** The most critical v1 pitfall (broken Ctrl+C) re-emerges. Users lose trust when basic keyboard shortcuts behave inconsistently.

**Prevention:**
- Extend the state machine: `IDLE` -> Ctrl+C clears line, `AI_STREAMING` -> Ctrl+C aborts AI, `PTY_ACTIVE` -> Ctrl+C passes to PTY child
- During PTY mode: remove or disable the readline SIGINT handler, let the PTY's signal handling take over
- On PTY exit: restore the readline SIGINT handler immediately
- Test each transition: idle->AI->cancel->idle, idle->PTY->ctrl+c->PTY handles it->exit->idle, AI streaming->ctrl+c->cancel->immediately start PTY->ctrl+c in PTY
- Edge case: what happens if the user spawns a background process from the PTY and then exits? The background process may still be attached to the PTY's signals

**Detection:** Start vim, press Ctrl+C (should NOT kill the shell). Exit vim, start an AI query, press Ctrl+C (should cancel AI). Verify prompt returns cleanly.

**Phase:** PTY support implementation. Must extend the existing SIGINT architecture, not replace it.

**Confidence:** HIGH -- this is a direct extension of v1 Pitfall #3 (broken Ctrl+C) which was identified as critical.

---

### Pitfall 10: Session Serialization on Crash

**What goes wrong:** The shell crashes (OOM, unhandled exception, SIGKILL) mid-session. The in-memory session state (active session ID, permission mode, session metadata) is lost. On restart, the shell either starts a fresh session (losing context) or tries to resume the wrong session.

**Why it happens:** The SDK persists session *conversations* to disk automatically (as .jsonl files). But ClaudeShell's *shell-level* session metadata (which session is "active", what permission mode is set, user preferences for the session) lives only in `ShellState` in memory. There's no write-ahead mechanism.

**Consequences:** Users who rely on sessions lose their active context on any crash. Since shells can crash for many reasons (out of memory during large AI operations, network interruptions, macOS sleep/wake issues), this will happen regularly.

**Prevention:**
- Write session metadata to a file (`~/.claudeshell/active-session.json`) on every session change
- Include: session ID, permission mode, creation timestamp, last activity timestamp
- On startup, check for an active session file and offer to resume: "Previous session found (2 hours ago). Resume? [Y/n]"
- On clean exit, clear the active session file
- On crash recovery, detect the stale file (no clean exit) and surface it prominently
- Keep the metadata file small and write it atomically (write to temp, rename)

**Detection:** Start a session with several AI commands, then `kill -9` the shell process. Restart the shell. If it doesn't offer to resume, crash recovery is broken.

**Phase:** Session management implementation. Simple to add early, very annoying to retrofit.

**Confidence:** MEDIUM -- standard crash recovery pattern, but easy to overlook in initial implementation.

## Minor Pitfalls

### Pitfall 11: node-pty Native Module Build Failures

**What goes wrong:** node-pty is a native C++ addon that requires compilation. Users installing ClaudeShell via `npm install -g claudeshell` hit build failures because they lack Xcode Command Line Tools (macOS) or build-essential (Linux). The error messages are cryptic C++ compiler output that most JS developers can't diagnose.

**Prevention:**
- Document the native dependency requirement in README and package.json `engines` field
- Consider using `@lydell/node-pty` or `node-pty-prebuilt-multiarch` which ship prebuilt binaries for common platforms
- Make PTY support optional (graceful fallback to `spawn` with `stdio: 'inherit'` for interactive programs)
- Add a postinstall check that verifies node-pty loaded successfully and prints a helpful message if not
- Test the install path on a clean macOS and Linux VM

**Phase:** PTY support packaging. Address before any public release.

**Confidence:** MEDIUM -- node-pty GitHub issues are dominated by build failures.

---

### Pitfall 12: Session History File Growth

**What goes wrong:** Long-running sessions with many AI interactions produce large `.jsonl` session files (tens of MB). Over weeks of use, `~/.claude/projects/` grows to gigabytes. The SDK's `listSessions()` becomes slow, and session resume takes seconds to parse large files.

**Prevention:**
- Implement session rotation: archive sessions older than N days
- Set a maximum session file size and auto-compact when exceeded
- Provide a `claudeshell sessions clean` command for manual cleanup
- Show disk usage in `claudeshell sessions list`

**Phase:** Session management polish. Not critical for initial implementation but important for long-term use.

**Confidence:** LOW -- depends on usage patterns; power users will hit this sooner.

---

### Pitfall 13: Model Selection Interacts with Session Context

**What goes wrong:** A user starts a session with Opus (200K context, expensive), then switches to Haiku mid-session for a quick question. The session history exceeds Haiku's context window, causing degraded responses or errors. Conversely, switching from Haiku to Opus mid-session works fine but the user doesn't realize the cost implications of the accumulated history.

**Prevention:**
- When switching models mid-session, check if session history exceeds the new model's effective context
- Warn if switching to a smaller model with a large session: "Session has 85K tokens. Haiku works best under 48K. Start fresh? [y/N]"
- Show token count and estimated cost with the model name in the prompt
- Consider starting a new session by default when switching models

**Phase:** Model selection + session management interaction.

**Confidence:** MEDIUM -- standard context window management challenge.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Session Management | Silent resume failure (#1), crash recovery (#10) | Always use explicit session IDs; persist metadata to disk |
| Session + Permissions | Permission escalation (#4) | Store and restore permission mode with session |
| Session + Context | Context explosion (#6), model switching (#13) | Auto-compaction; token usage display; model-aware warnings |
| Pipe Support | Pipe destroys REPL (#3), ANSI in output (#8) | Detect isTTY at startup; separate interactive vs non-interactive modes |
| PTY Support | readline/PTY stdin conflict (#2), Ctrl+C contract (#9), zombies (#5) | State machine for stdin ownership; cleanup registry; test all SIGINT transitions |
| PTY Packaging | Build failures (#11) | Prebuilt binaries or optional graceful degradation |
| Permission Control | UX blocks flow (#7), session escalation (#4) | Sensible defaults (acceptEdits); trust radius concept |
| Session Storage | File growth (#12) | Rotation; cleanup commands; size limits |

## Sources

- [Claude Agent SDK: Session Management](https://platform.claude.com/docs/en/agent-sdk/sessions) -- HIGH confidence (official docs, verified via WebFetch)
- [Claude Agent SDK: Configure Permissions](https://platform.claude.com/docs/en/agent-sdk/permissions) -- HIGH confidence (official docs, verified via WebFetch)
- [Claude Code: Pipe stdin crash (#1072)](https://github.com/anthropics/claude-code/issues/1072) -- HIGH confidence
- [Claude Code: Raw mode pipe crash (#5925)](https://github.com/anthropics/claude-code/issues/5925) -- HIGH confidence
- [Claude Code: Programmatic/Headless Usage](https://code.claude.com/docs/en/headless) -- HIGH confidence
- [Node.js: Lost keystrokes with multiple stdin readers (#5574)](https://github.com/nodejs/node/issues/5574) -- HIGH confidence
- [Node.js: readline pipe input echo (#37595)](https://github.com/nodejs/node/issues/37595) -- HIGH confidence
- [Node.js: TTY Documentation](https://nodejs.org/api/tty.html) -- HIGH confidence
- [node-pty: GitHub repository and docs](https://github.com/microsoft/node-pty) -- HIGH confidence
- [Chroma Research: Context Rot](https://research.trychroma.com/context-rot) -- HIGH confidence
- [LLM Chat History Summarization (mem0.ai)](https://mem0.ai/blog/llm-chat-history-summarization-guide-2025) -- MEDIUM confidence
- [Context Window Management Strategies (Agenta)](https://agenta.ai/blog/top-6-techniques-to-manage-context-length-in-llms) -- MEDIUM confidence
- [Trail of Bits: Prompt Injection to RCE](https://blog.trailofbits.com/2025/10/22/prompt-injection-to-rce-in-ai-agents/) -- HIGH confidence
- [AI Agent Permission Models: Least Privilege (AgentNode)](https://agentnode.net/blog/ai-agent-permission-models-least-privilege) -- MEDIUM confidence
- [Securing AI Coding Tools (Brian Gershon)](https://www.briangershon.com/blog/securing-ai-coding-tools/) -- MEDIUM confidence
