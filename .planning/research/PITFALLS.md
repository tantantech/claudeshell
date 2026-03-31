# Domain Pitfalls

**Domain:** AI-powered shell / CLI wrapping Claude Code SDK
**Researched:** 2026-03-31

## Critical Pitfalls

Mistakes that cause rewrites, security incidents, or abandoned projects.

### Pitfall 1: Shell Injection via LLM-Generated Commands

**What goes wrong:** The LLM generates shell commands containing injected payloads -- either from prompt injection (malicious content in files/repos the AI reads) or from hallucination (the model produces syntactically dangerous output). A user asks "find large files" and the AI produces a command with unsanitized metacharacters, or a malicious repo comment triggers destructive commands through prompt injection.

**Why it happens:** Developers treat LLM output as trusted because it came from "their own AI." But the LLM is an untrusted input source -- it can be manipulated via prompt injection in file contents, git commit messages, or README files it reads. OpenAI Codex CLI and Google Gemini CLI both had critical command injection vulnerabilities discovered in 2025 (CVEs from Checkpoint Research and Cyera Research Labs).

**Consequences:** Arbitrary code execution with user privileges. Data loss. Credential theft (GitHub tokens, API keys in environment). Trail of Bits research demonstrated bypassing allowlists through flag injection in "safe" commands like `go test -exec` and `git show --format`.

**Prevention:**
- Treat ALL LLM output as untrusted input -- never pass directly to shell-mode execution without validation
- Use `execFile` (array arguments) instead of shell-mode execution wherever possible
- Use argument separators (`--`) before any user/AI-provided arguments
- Implement a command validation layer between the AI and the OS
- Allowlists alone are insufficient -- `find`, `git`, `go test` all have execution flags that bypass them
- Log all executed commands for audit
- Note: Claude Code SDK already has its own permission model -- leverage it rather than building from scratch

**Detection:** Review whether any path exists from AI response to shell-mode subprocess execution without sanitization. If yes, you have this bug.

**Phase:** Must be addressed in Phase 1 (core architecture). Retrofitting security is orders of magnitude harder.

**Confidence:** HIGH -- multiple real-world CVEs in production AI CLI tools confirm this.

---

### Pitfall 2: Trying to Parse Shell Syntax / Be a Real Shell

**What goes wrong:** Developers attempt to reimplement shell features -- parsing pipes (`|`), redirects (`>`), subshells (`$()`), globbing (`*`), quoting, aliases, job control, environment variable expansion. The project scope balloons from "AI wrapper" to "reimplementing bash."

**Why it happens:** Seems simple at first -- "just split on `|`". But shell syntax is context-sensitive and enormously complex. Even fish shell took years to get right. Bash has decades of POSIX compliance and edge cases baked in.

**Consequences:** Months of work on edge cases. Commands that work in bash break in your shell. Users discover their aliases don't work, their `.bashrc` isn't sourced, pipes behave differently. They go back to their real shell.

**Prevention:**
- Pass ALL non-AI commands to `bash -c "entire command"` (or user's preferred shell) as a single string
- Only intercept the `a` prefix -- everything else passes through verbatim
- Do not parse shell syntax yourself -- let the real shell handle pipes, redirects, globs
- Consider using `node-pty` for proper pseudo-terminal allocation when running system commands

**Detection:** If you find yourself writing a tokenizer or parser for shell commands, stop. Try running: `ls | grep foo`, `cd ~/Projects && pwd`, `export FOO=bar; echo $FOO`, `for i in {1..3}; do echo $i; done`. If any fail, you're reimplementing too much.

**Phase:** Phase 1 (architecture decision). This determines the entire project direction.

**Confidence:** HIGH -- the #1 failure mode of shell wrapper projects.

---

### Pitfall 3: Blocking the REPL / Broken Ctrl+C

**What goes wrong:** Two interrelated failures: (a) The shell becomes completely unresponsive while waiting for AI responses -- no visual feedback, no cancellation possible. (b) Ctrl+C kills the entire shell instead of just the current operation.

**Why it happens:** Node.js is single-threaded. If AI streaming isn't properly async, or if the readline interface isn't paused/resumed correctly, the event loop blocks. Default Node.js SIGINT behavior is to exit the process. The `AbortController` pattern for cancelling SDK queries isn't obvious.

**Consequences:** Users who are used to sub-100ms shell response times will not tolerate multi-second freezes with no feedback. One accidental Ctrl+C killing their shell session destroys trust immediately.

**Prevention:**
- Stream AI responses token-by-token (Claude SDK supports `includePartialMessages`)
- Show a spinner/indicator within 100ms of the `a` command being entered
- Use `AbortController` with the SDK query -- SIGINT handler calls `controller.abort()`
- During pass-through commands: let SIGINT flow to child process (`spawn` with `{ stdio: 'inherit' }`)
- At idle prompt: readline handles SIGINT by clearing the current line
- NEVER call `process.exit()` on SIGINT
- Test: start a long AI query, press Ctrl+C, verify it cancels within 1 second and returns to prompt

**Detection:** Time the interval between pressing Enter on an `a` command and seeing the first visual feedback. If >2 seconds with nothing, UX is broken. Press Ctrl+C at an empty prompt -- shell should NOT exit.

**Phase:** Phase 1 (REPL foundation + streaming architecture). Must be correct from day one.

**Confidence:** HIGH -- streaming UX is well-studied; users perceive streaming as 40-60% faster than equivalent non-streaming.

---

### Pitfall 4: `cd` Not Changing Directory / Env Desync

**What goes wrong:** Running `cd /some/path` via a child process means the cd executes in a child process and the parent's cwd never changes. Similarly, `export FOO=bar` in one command doesn't persist to the next because each `spawn()` gets a fresh env copy. The AI then operates in the wrong directory with wrong environment.

**Why it happens:** Every spawned child process has its own working directory and environment. `cd` is a shell builtin because only the current process can change its own cwd.

**Consequences:** Users type `cd project && ls` and see wrong files. AI queries operate in wrong directory. Fundamental shell contract is broken. This is a dealbreaker -- users will abandon immediately.

**Prevention:**
- Intercept `cd` as a builtin command. Call `process.chdir(resolvedPath)` directly
- Handle `cd` edge cases: no args (go to $HOME), `cd -` (previous dir), `cd ~` (home), `CDPATH`
- Maintain a session env map. Intercept `export` as a builtin. Merge session env into every `spawn()` call
- Alternative: run all commands in a persistent shell subprocess (e.g., `node-pty`) where state naturally persists
- After every passthrough command, re-read the shell's `$PWD` if not using persistent subprocess

**Detection:** `cd /tmp && pwd` should show `/tmp`. `export FOO=bar` then `echo $FOO` should show `bar`.

**Phase:** Phase 1 (shell passthrough architecture).

**Confidence:** HIGH -- fundamental to any shell wrapper.

---

### Pitfall 5: TTY/Terminal State Corruption

**What goes wrong:** The shell wrapper corrupts terminal state -- raw mode isn't restored after AI streaming, signal handlers don't clean up, child processes with inherited stdio get killed and leave the terminal broken (no echo, wrong line discipline, garbled output). User has to run `reset` or close the terminal.

**Why it happens:** Node.js TTY handling has well-documented edge cases: `process.stdin.setRawMode(true)` without cleanup on exit, harsh process kills to children with inherited stdio skip TTY cleanup, piped vs TTY detection (`process.stdout.isTTY`) behaves differently in spawned contexts. Building a shell means you own the terminal lifecycle -- every crash must restore state.

**Consequences:** Worse than a crash -- it corrupts the user's entire terminal session, affecting other running processes.

**Prevention:**
- Register `process.on('exit')`, `SIGINT`, `SIGTERM`, `uncaughtException`, and `unhandledRejection` handlers that restore terminal state
- Prefer `SIGTERM` over `SIGKILL` for child process cleanup
- Wrap all raw mode operations in try/finally blocks
- Use Node.js `readline` module rather than manual raw mode where possible
- Test: crash the process, Ctrl+C during streaming, API connection drop mid-stream, terminal resize during output

**Detection:** Start an AI command, then force-kill the process externally. If `echo` stops working or the prompt disappears, you have this bug.

**Phase:** Phase 1 (REPL foundation).

**Confidence:** HIGH -- Node.js GitHub issues #12101, #13278, #21319 document these exact problems.

---

### Pitfall 6: Silent SDK Error Swallowing

**What goes wrong:** The Claude Agent SDK query throws on network errors, auth failures, rate limits, etc. If not caught, the async generator silently stops. User sees nothing after typing an AI command -- no error, no feedback.

**Why it happens:** Async generator errors require try/catch around the `for await` loop. Unhandled rejections may not surface visibly in a readline-based REPL.

**Consequences:** User sees nothing after typing an AI command. Feels completely broken with no diagnostic path.

**Prevention:**
- Wrap every `for await (const msg of query(...))` in try/catch
- Handle specific error types: auth errors ("Run `claudeshell config`"), network errors ("Connection failed"), rate limits ("Rate limited, retry in Xs")
- Detect and warn about conflicting `ANTHROPIC_API_KEY` values (Claude Code troubleshooting docs flag this as top issue)
- Test with: no key, wrong key, expired key, disconnected network, rate-limited account

**Detection:** Disconnect from internet, run `a hello`. Should show a clear error, not silence.

**Phase:** Phase 1 (must work on first launch).

**Confidence:** HIGH -- based on Claude Code troubleshooting docs and SDK error patterns.

## Moderate Pitfalls

### Pitfall 7: Context Window Exhaustion in Long Sessions

**What goes wrong:** The shell maintains conversation history across many AI invocations. After 20-30 commands, the context window fills up, responses degrade in quality, latency spikes, and costs explode. The user doesn't understand why the AI suddenly "got dumb."

**Why it happens:** Each `a` command adds to conversation history. File contents, command outputs, and tool-use results all consume tokens. A single `a show me what's in this directory` can consume thousands of tokens. Claude's 200K context fills faster than expected in shell contexts.

**Prevention:**
- Implement conversation compaction (Claude SDK supports server-side compaction for Opus 4.6 and Sonnet 4.6)
- Truncate large command outputs before adding to context (first/last N lines)
- Consider each `a` command as potentially independent -- don't carry full history by default
- Give users explicit control: `a --context` to reference previous commands, default to fresh context
- Monitor token usage and warn users when approaching limits

**Detection:** Use the shell for 30+ AI commands. Measure response latency on command 1 vs command 30. If latency doubles or quality drops, context management is broken.

**Phase:** Phase 2 (after basic AI works). But architecture must support it from Phase 1 -- don't store unbounded history.

**Confidence:** HIGH -- universal problem in LLM tools; Kilo-Org/kilocode issue #1224 documents this pattern.

---

### Pitfall 8: Cost Explosion Without Visibility

**What goes wrong:** Users run expensive AI operations without realizing the cost. A single `a analyze this codebase` could read hundreds of files consuming massive tokens. Users get a surprise bill from a casual session.

**Prevention:**
- Show token usage after each AI command (subtle, non-intrusive)
- Implement configurable spending limits per session or per day
- Warn before operations that will read many files
- Cache recent file contents to avoid re-reading unchanged files
- Use Claude Code SDK's built-in cost management features

**Detection:** Run `a refactor all TypeScript files in this project` on a large codebase. Check the API bill afterward.

**Phase:** Phase 2-3 (before public release).

**Confidence:** MEDIUM -- common complaint in Claude Code user community.

---

### Pitfall 9: Prompt Display After Async Output

**What goes wrong:** After AI streaming completes, the prompt doesn't re-appear, or appears in the wrong position interleaved with output.

**Prevention:**
- Always write a newline after AI output completes
- Use readline's `prompt()` method to re-display the prompt cleanly
- Handle edge case where user types during AI output -- buffer and replay input

**Detection:** Run an AI query. After it completes, the prompt should appear cleanly on its own line.

**Phase:** Phase 1 (REPL polish).

**Confidence:** HIGH -- fundamental readline issue.

---

### Pitfall 10: History File Corruption

**What goes wrong:** Multiple shell instances writing to the same history file simultaneously causes data loss or corruption.

**Prevention:**
- Use append-only writes (`fs.appendFile`)
- Consider file locking with `proper-lockfile` if multi-instance is important
- Maintain separate histories: regular commands go to system shell history, `a` commands to ClaudeShell history
- Never write to `~/.zsh_history` or `~/.bash_history` directly

**Detection:** Open two ClaudeShell instances, run commands in both, close both, reopen -- is history intact?

**Phase:** Phase 2 (after core REPL works).

**Confidence:** MEDIUM.

---

### Pitfall 11: The "a" Prefix Collision

**What goes wrong:** The user has an existing alias, function, or binary named `a`. ClaudeShell breaks their workflow by hijacking it.

**Prevention:**
- Make the prefix configurable from day one (`claudeshell config set prefix ai`)
- Check for existing `a` binaries/aliases on first launch and warn
- Support multiple invocation styles: `a query`, `? query`, `ai query`

**Detection:** Run `which a` or `type a` in the user's normal shell. If it returns something, there's a collision.

**Phase:** Phase 1 (configuration). Simple to implement early, painful to change later.

**Confidence:** MEDIUM -- `a` is short enough that collisions are plausible.

---

### Pitfall 12: Large AI Responses Overwhelming Terminal

**What goes wrong:** Claude generates a very long response (multi-page code file, etc.) that floods the terminal, making it hard to scroll back to find the actual answer.

**Prevention:**
- Consider a pager mode (pipe to `less`) for responses over N lines
- Show a "response was N lines" summary at the end
- Truncate with `--full` option to see everything

**Phase:** Phase 2.

**Confidence:** LOW.

## Minor Pitfalls

### Pitfall 13: Shell Startup Time Over 1 Second

**What goes wrong:** Importing the Claude SDK at startup adds noticeable delay. Users expect shells to start in <200ms.

**Prevention:**
- Lazy-load the SDK module on first `a` command, not at startup
- Load config files asynchronously
- Defer auth validation until first AI use
- Profile startup time and set a budget of <500ms

**Detection:** Time `claudeshell` startup vs `zsh` startup. If >3x slower, users will notice.

**Phase:** Phase 2 (optimization).

**Confidence:** MEDIUM.

---

### Pitfall 14: TTY Detection for Non-Interactive Use

**What goes wrong:** Output formatting (colors, markdown) breaks when piped (`claudeshell | tee log.txt`).

**Prevention:** Check `process.stdout.isTTY` before applying colors/formatting. Output plain text when not a TTY.

**Phase:** Phase 3 (polish).

**Confidence:** LOW.

---

### Pitfall 15: Home Directory / Tilde Expansion

**What goes wrong:** `~` doesn't expand in paths when handled by Node.js builtins rather than bash.

**Prevention:** For builtins like `cd ~`, manually expand `~` to `process.env.HOME`. For pass-through commands, bash handles this since we use `bash -c`.

**Phase:** Phase 1 (builtin commands).

**Confidence:** HIGH -- easy to miss, easy to fix.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| REPL Loop | SIGINT handling (#3), TTY corruption (#5) | Test Ctrl+C in all states; register cleanup handlers |
| Command Pass-through | cd/env desync (#4), shell parsing (#2) | Intercept builtins; delegate everything else to bash |
| AI Integration | Silent errors (#6), blocking REPL (#3) | try/catch + AbortController + streaming |
| Security | Shell injection (#1) | Command validation layer; treat LLM as untrusted |
| Streaming Output | Prompt position (#9), terminal overflow (#12) | Newline + prompt() after stream; pager for long output |
| Context Management | Exhaustion (#7), cost explosion (#8) | Compaction; independent-by-default commands; token display |
| Configuration | API key chaos (#6), prefix collision (#11) | Follow SDK auth chain; configurable prefix |
| History | File corruption (#10) | Append-only; separate history files |
| Polish | Startup time (#13), TTY detection (#14) | Lazy-load SDK; check isTTY |

## Sources

- [Trail of Bits: Prompt Injection to RCE in AI Agents](https://blog.trailofbits.com/2025/10/22/prompt-injection-to-rce-in-ai-agents/) -- HIGH confidence
- [OpenAI Codex CLI Command Injection (Checkpoint Research)](https://research.checkpoint.com/2025/openai-codex-cli-command-injection-vulnerability/) -- HIGH confidence
- [Cyera: Command & Prompt Injection in Gemini CLI](https://www.cyera.com/research/cyera-research-labs-discloses-command-prompt-injection-vulnerabilities-in-gemini-cli) -- HIGH confidence
- [Securing CLI Based AI Agents](https://medium.com/@visrow/securing-cli-based-ai-agent-c36429e88783) -- MEDIUM confidence
- [Node.js: Child process stdio terminal corruption (#12101)](https://github.com/nodejs/node/issues/12101) -- HIGH confidence
- [Node.js: SSH TTY termination (#13278)](https://github.com/nodejs/node/issues/13278) -- HIGH confidence
- [Node.js: readline with /dev/tty issues (#21319)](https://github.com/nodejs/node/issues/21319) -- HIGH confidence
- [Node.js signals documentation](https://nodejs.org/api/process.html#signal-events) -- HIGH confidence
- [Node.js readline SIGINT behavior](https://nodejs.org/api/readline.html) -- HIGH confidence
- [Claude Code Troubleshooting Docs](https://code.claude.com/docs/en/troubleshooting) -- HIGH confidence
- [Claude Agent SDK: Streaming Output](https://platform.claude.com/docs/en/agent-sdk/streaming-output) -- HIGH confidence
- [Claude API: Context Windows & Compaction](https://platform.claude.com/docs/en/build-with-claude/context-windows) -- HIGH confidence
- [Kilo-Org/kilocode: Context Window Truncation (#1224)](https://github.com/Kilo-Org/kilocode/issues/1224) -- HIGH confidence
- [Builder.io/ai-shell](https://github.com/BuilderIO/ai-shell) -- MEDIUM confidence
- [LangChain: AI Agent Latency 101](https://blog.langchain.com/how-do-i-speed-up-my-agent/) -- MEDIUM confidence
