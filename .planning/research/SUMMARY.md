# Project Research Summary

**Project:** ClaudeShell - AI-native interactive terminal shell
**Domain:** AI-powered CLI / shell wrapper
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

ClaudeShell is a shell wrapper that embeds Claude's full agent capabilities via the Claude Agent SDK, invoked through a single-character `a` prefix. It occupies a unique gap between full terminal replacements (Warp), agentic coding CLIs (Claude Code), and simple AI command translators (ai-shell, shell-gpt). The recommended approach is a four-layer architecture: a readline-based REPL that classifies input and routes it to either a system shell passthrough (via `bash -c`) or the Claude Agent SDK streaming query engine. The stack is deliberately minimal -- Node.js builtins for I/O, the official Claude Agent SDK for AI, and almost zero third-party dependencies.

The critical architectural insight is that ClaudeShell must NOT try to be a shell -- it must delegate all shell syntax parsing to bash and only intercept a handful of builtins (`cd`, `export`, `exit`) and the `a` prefix. Projects that attempt to reimplement shell features inevitably fail. The Claude Agent SDK provides streaming, tool use, sessions, and permission control out of the box, so the product's value comes from tight integration between the shell REPL and the SDK, not from reimplementing any of those capabilities.

The dominant risks are security (shell injection via LLM-generated commands -- with real CVEs in competing tools like Codex CLI and Gemini CLI), terminal state corruption (broken Ctrl+C, TTY state not restored on crash), and silent SDK error swallowing. All three must be addressed in Phase 1 architecture, not bolted on later. Secondary risks include context window exhaustion in long sessions, cost explosion without visibility, and the `a` prefix colliding with existing user commands. These are manageable with straightforward mitigations in Phases 2-3.

## Key Findings

### Recommended Stack

The stack is intentionally minimal, leaning heavily on Node.js builtins and the official Claude Agent SDK. Total production dependencies: 5 packages (claude-agent-sdk, picocolors, dotenv, marked, marked-terminal). Everything else is built-in.

**Core technologies:**
- **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`): AI agent loop with streaming, tool use, sessions, permissions -- this IS the product's core engine
- **Node.js 22 LTS**: Runtime required by the SDK; provides readline, child_process, fs, and process APIs natively
- **TypeScript 5.7+**: Type safety; SDK is TypeScript-native with shipped type definitions
- **`node:readline/promises`**: REPL input, history, tab completion -- zero-dependency, right abstraction for a shell (not Ink, not node-pty)
- **picocolors**: Terminal colors at 10x faster and 14x smaller than chalk
- **tsdown**: TypeScript bundler (successor to unmaintained tsup), Rust-based via Rolldown
- **vitest**: Testing framework with native TS/ESM support

### Expected Features

**Must have (table stakes):**
- `a <prompt>` invokes Claude Agent SDK with streaming response
- Standard command pass-through (all shell commands work via `bash -c`)
- Working directory tracking (`cd` as intercepted builtin)
- Command history with persistence
- Signal handling (Ctrl+C cancels AI or child, never exits shell)
- API key configuration with helpful error messages
- Colored/formatted markdown output
- File read/write via AI (SDK tools)

**Should have (differentiators):**
- Single-character `a` prefix (shortest friction of any AI CLI)
- Persistent conversation context via SDK sessions
- Tool use visibility (show file reads, command runs inline)
- Pipe-friendly output (`cat log.txt | a summarize`)
- Automatic error recovery (command fails, AI diagnoses and offers fix)
- Permission control for file edits and command execution
- Configurable AI model (Haiku/Sonnet/Opus)
- Token/cost display after responses

**Defer (v2+):**
- Multi-model provider support, GUI/TUI panels, plugin/theme system, cloud sync, team collaboration, autonomous agent mode, full bash compatibility, built-in code editor

### Architecture Approach

Four-layer architecture: CLI entry point, REPL shell (readline + command router), two execution engines (passthrough for system commands, AI engine for Claude SDK queries), and a streaming renderer. Cross-cutting concerns (config, history, sessions, types) are isolated modules. The command router is a pure function that classifies input into five categories: AI, passthrough, builtin, slash command, or empty. All system commands go to `bash -c` as a single string -- never parse shell syntax.

**Major components:**
1. **shell.ts** (REPL loop) -- readline management, input classification, signal handling, prompt display
2. **passthrough.ts** (shell engine) -- `spawn('bash', ['-c', cmd])` with inherited stdio; intercepts `cd`/`export`/`unset`
3. **ai.ts** (AI engine) -- Claude SDK `query()` wrapper, streaming via async generator, abort via `query.interrupt()`
4. **renderer.ts** (streaming output) -- state machine for text deltas, tool-use indicators, markdown formatting
5. **config.ts / history.ts / session.ts** (persistence) -- file-based, local-first, XDG-compliant paths

### Critical Pitfalls

1. **Shell injection via LLM output** -- Treat all LLM output as untrusted; use `execFile` (array args) not shell-mode execution; leverage SDK's built-in permission model; log all executed commands. Real CVEs exist in Codex CLI and Gemini CLI.
2. **Trying to parse shell syntax** -- Never tokenize or parse pipes/redirects/globs. Pass entire command to `bash -c`. Only intercept `a` prefix and builtins. This is the #1 failure mode of shell wrapper projects.
3. **Blocking REPL / broken Ctrl+C** -- Stream AI responses token-by-token; show feedback within 100ms; use AbortController for cancellation; never call `process.exit()` on SIGINT. Signal handling must be state-aware (AI active vs child active vs idle).
4. **`cd` not changing directory** -- Intercept `cd` as builtin, call `process.chdir()`. Handle `cd -`, `cd ~`, no-args. Same pattern for `export`/`unset`.
5. **TTY state corruption** -- Register cleanup on exit, SIGINT, SIGTERM, uncaughtException; prefer SIGTERM over SIGKILL for children; wrap raw mode in try/finally.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core Shell Foundation
**Rationale:** A working shell REPL is the foundation everything depends on. It validates the readline architecture, signal handling, and passthrough engine before adding AI complexity. All 6 critical pitfalls have Phase 1 implications.
**Delivers:** A functional shell that can replace a user's terminal session for basic use -- prompt, history, command execution, directory navigation.
**Addresses:** Command pass-through, working directory tracking, command history, signal handling, exit/quit
**Avoids:** Shell syntax parsing (Pitfall 2), cd desync (Pitfall 4), TTY corruption (Pitfall 5), broken Ctrl+C (Pitfall 3)

### Phase 2: AI Integration
**Rationale:** The core value proposition. Depends on a stable REPL from Phase 1. The Claude Agent SDK provides streaming, tool use, and sessions -- the work is wiring it into the command router and building the streaming renderer.
**Delivers:** `a <prompt>` triggers Claude AI with streaming output, cancellation, error handling, and basic markdown formatting.
**Uses:** Claude Agent SDK (`query()`, streaming, `interrupt()`), picocolors, marked-terminal
**Implements:** ai.ts (AI engine), renderer.ts (streaming output), command router AI path
**Avoids:** Shell injection (Pitfall 1 -- command validation layer), silent errors (Pitfall 6), blocking REPL (Pitfall 3)

### Phase 3: Sessions, History, and Context
**Rationale:** Quality-of-life features that depend on both engines working. Session support enables the "persistent conversation" differentiator. History unification and context management prevent the context exhaustion pitfall.
**Delivers:** Conversation continuity across `a` commands, slash commands (/help, /session, /resume, /history), token/cost display, context management.
**Addresses:** Persistent conversation context, tool use visibility, token/cost display, slash commands
**Avoids:** Context window exhaustion (Pitfall 7), cost explosion (Pitfall 8), history corruption (Pitfall 10)

### Phase 4: Polish and Power Features
**Rationale:** Deferred features that add native compilation dependencies (node-pty) or require all prior phases to be stable. These are competitive differentiators, not table stakes.
**Delivers:** Interactive command support (vim, less, ssh via node-pty), pipe-friendly output, permission control, project context awareness, model selection, error recovery loop, configurable AI prefix.
**Addresses:** Pipe-friendly output, permission control, project context awareness, model selection, smart typo correction, automatic error recovery
**Avoids:** Prefix collision (Pitfall 11), startup time (Pitfall 13), TTY detection issues (Pitfall 14)

### Phase Ordering Rationale

- **Dependencies flow downward:** Each phase depends on the prior phase being stable. AI integration cannot be tested without a working REPL. Sessions cannot work without AI. Polish cannot be evaluated without the full pipeline.
- **Risk front-loading:** All 6 critical pitfalls have Phase 1 or Phase 2 implications. The architecture decisions that prevent rewrites (bash delegation, signal handling, streaming) are locked in early.
- **Incremental value:** Phase 1 alone is a usable (if unremarkable) shell. Phase 2 delivers the core differentiator. Phase 3 makes it sticky. Phase 4 makes it delightful.
- **Native dependency isolation:** node-pty (the only native compilation dependency) is deferred to Phase 4, keeping Phases 1-3 pure JavaScript with zero node-gyp risk.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Claude Agent SDK streaming API -- the `SDKMessage` types and `stream_event` subtypes need hands-on exploration. The SDK is young (v0.2.x) and API surface may shift. A V2 preview interface with `send()` and `stream()` patterns is also available and worth evaluating.
- **Phase 4:** node-pty integration for interactive commands -- detecting which commands need a PTY vs spawn is heuristic-based and needs experimentation.
- **Phase 4:** Pipe-friendly output -- detecting non-TTY stdout and adjusting AI output format needs testing across terminal emulators and piping scenarios.

Phases with standard patterns (skip research-phase):
- **Phase 1:** REPL with readline, child_process spawn, process.chdir -- all extremely well-documented Node.js patterns.
- **Phase 3:** File-based history persistence, SDK session resume -- straightforward implementation with clear SDK docs.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are official, well-documented, or Node.js builtins. Claude Agent SDK is the only risk (v0.2.x, young). |
| Features | HIGH | Competitive landscape is clear. Table stakes are well-defined by existing tools (Warp, aichat, ai-shell). |
| Architecture | HIGH | Four-layer pattern validated by academic research (OpenDev paper) and real-world tools. Component boundaries are clean. |
| Pitfalls | HIGH | Critical pitfalls backed by real CVEs (Trail of Bits, Checkpoint, Cyera), Node.js issue tracker, and production failures in competing tools. |

**Overall confidence:** HIGH

### Gaps to Address

- **Claude Agent SDK version stability:** The SDK is at v0.2.x. API surface could change. Pin exact versions and test against SDK updates before upgrading. A V2 preview interface exists -- evaluate during Phase 2 planning.
- **`a` prefix collision frequency:** Research identified the risk but didn't quantify how common `a` aliases are in practice. Check on first launch and make prefix configurable from day one.
- **Windows support:** Research assumed macOS/Linux. `bash -c` passthrough won't work on Windows without WSL. Decide early whether to support Windows natively or require WSL.
- **SDK cost management APIs:** Research mentions built-in cost management features but specifics are unclear. Investigate during Phase 2-3 planning.
- **Multi-line input UX:** How to handle multi-line prompts to `a` (e.g., pasting code) needs design during Phase 3.
- **Login shell compatibility:** Making ClaudeShell usable as a login shell (set in `/etc/shells`) requires testing profile/rc file sourcing -- defer to Phase 4.

## Sources

### Primary (HIGH confidence)
- [Claude Agent SDK - npm](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) -- SDK capabilities, API surface
- [Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- Full API docs
- [Agent SDK Streaming Output](https://platform.claude.com/docs/en/agent-sdk/streaming-output) -- Streaming patterns
- [Agent SDK Permissions](https://platform.claude.com/docs/en/agent-sdk/permissions) -- Permission modes
- [Trail of Bits: Prompt Injection to RCE](https://blog.trailofbits.com/2025/10/22/prompt-injection-to-rce-in-ai-agents/) -- Security pitfalls
- [Checkpoint: Codex CLI Command Injection](https://research.checkpoint.com/2025/openai-codex-cli-command-injection-vulnerability/) -- Security CVEs
- [Cyera: Gemini CLI Injection](https://www.cyera.com/research/cyera-research-labs-discloses-command-prompt-injection-vulnerabilities-in-gemini-cli) -- Security CVEs
- [Node.js readline](https://nodejs.org/api/readline.html) -- REPL patterns
- [Node.js child_process](https://nodejs.org/api/child_process.html) -- Process spawning
- [Claude Code Troubleshooting Docs](https://code.claude.com/docs/en/troubleshooting) -- SDK error patterns

### Secondary (MEDIUM confidence)
- [OpenDev Terminal Agent Architecture (arXiv 2603.05344)](https://arxiv.org/html/2603.05344v1) -- Four-layer AI terminal agent design
- [aichat](https://github.com/sigoden/aichat) -- Competitor reference architecture (29k+ stars)
- [ai-shell](https://github.com/BuilderIO/ai-shell) -- Competitor feature set
- [Warp](https://www.warp.dev/) -- Competitor: full terminal emulator approach
- [picocolors](https://github.com/alexeyraspopov/picocolors) -- Performance benchmarks
- [tsdown](https://tsdown.dev/guide/) -- Bundler docs
- [Securing CLI Based AI Agents](https://medium.com/@visrow/securing-cli-based-ai-agent-c36429e88783) -- Security patterns

### Tertiary (LOW confidence)
- [Kilo-Org/kilocode #1224](https://github.com/Kilo-Org/kilocode/issues/1224) -- Context window exhaustion pattern (single project, may not generalize)

---
*Research completed: 2026-03-31*
*Ready for roadmap: yes*
