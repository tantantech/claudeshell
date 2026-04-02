# Project Research Summary

**Project:** ClaudeShell v2.0 — Sessions & Power Features
**Domain:** AI-native interactive terminal shell (Node.js/TypeScript)
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

ClaudeShell v2 extends a well-architected 13-module TypeScript shell wrapper into a full power-user AI development environment. The research reveals a striking implementation advantage: 9 of 10 planned v2 features require zero new dependencies. The Claude Agent SDK already provides native session management (`resume`/`continue`/`fork`), model selection, permission control, and cost/token tracking via fields on `SDKResultMessage`. Node.js built-ins cover pipe detection (`process.stdin.isTTY`) and project file scanning (`node:fs`). The only new dependency is `node-pty` for interactive command PTY support, and it should be made an optional dependency to avoid native build friction. This means v2 is primarily an integration and wiring problem, not a new technology adoption problem.

The recommended approach is to extend the existing immutable `ShellState` pattern — adding `sessionId`, `currentModel`, and `permissionLevel` fields — and introduce 6 new focused modules (session, model, permissions, context, pipe, cost) that `ai.ts` composes via a single `buildQueryOptions()` function. The key architectural constraint is keeping `shell.ts` as a thin dispatcher. Slash commands (`/session`, `/model`, `/permissions`, `/cost`) provide the UX surface for all new features without changing the core `a` prefix workflow. The existing renderer's `isTTY` check already handles non-TTY output formatting for pipe support.

The highest-risk area is session management, where silent failures are easy to introduce and hard to detect. Sessions must be tracked via explicit session IDs stored in `ShellState` (never relying on directory-based `continue: true`), and session metadata must be persisted to disk for crash recovery. The PTY feature carries the most implementation risk due to readline/PTY stdin conflicts and resource leak potential — the architecture research recommends `spawn({ stdio: 'inherit' })` satisfies the vast majority of interactive command needs without the native build complexity of node-pty. Ship PTY as optional and defer it to Phase 4.

## Key Findings

### Recommended Stack

The v1 stack (TypeScript 6, Node.js 22+, `@anthropic-ai/claude-agent-sdk`, marked, marked-terminal, picocolors, tsdown, tsx, vitest) requires no changes for v2. All planned AI features — session persistence, model selection, permission modes, cost tracking — are already exposed by the SDK's `query()` options and `SDKResultMessage` fields. The SDK's `listSessions()`, `getSessionMessages()`, and `renameSession()` functions provide the full session management surface. Permission control uses the SDK's five-mode system (`default`, `dontAsk`, `acceptEdits`, `bypassPermissions`, `plan`) plus `canUseTool` callback and `allowedTools`/`disallowedTools` arrays.

**Core technologies:**
- `@anthropic-ai/claude-agent-sdk ^0.2.88`: AI backbone with native sessions, model selection, permissions, and cost data — zero new deps needed for any of these features
- `node:readline/promises` (built-in): REPL input, already in use; must be paused/resumed atomically around any PTY usage
- `node:fs` / `node:crypto` (built-ins): project context detection and session ID generation
- `process.stdin.isTTY` / `process.stdout.isTTY` (built-ins): pipe detection, zero-dep
- `node-pty ^1.1.0` (optional): PTY for interactive commands — native addon, must be `optionalDependencies` only

**Critical version note:** Node.js >=22.0.0 is required (SDK requirement, already enforced in v1).

### Expected Features

**Must have (table stakes):**
- Session context persistence — users expect `a` commands to maintain context across turns; every competitor has this
- `/new` command for fresh session — standard expectation across all AI CLI tools
- Token/cost display — SDK provides exact USD cost; users expect visibility especially with Opus
- Model selection (`/model`, `--model` flag, config default) — haiku/sonnet/opus triage is table stakes for power users
- Pipe-friendly output — `cat error.log | a summarize` is the Unix integration killer feature; no competitor combines this with session context

**Should have (differentiators):**
- Automatic error recovery loop (diagnose + suggest fix + explicit approval) — no competitor does the full loop
- Project context awareness (auto-inject package.json/Cargo.toml/CLAUDE.md into system prompt)
- Permission control with sensible defaults (default to `acceptEdits`, not constant prompting)
- Per-project `.claudeshell.json` config overrides — project-specific model, permissions, system prompt
- Session cost accumulator with `/cost` command — no competitor tracks running session total well
- Configurable AI prefix — some users want `ai` or `claude` instead of `a`

**Defer to v2.1+:**
- PTY integration for interactive commands — most interactive commands work with `spawn({ stdio: 'inherit' })`; node-pty adds native build risk
- Model shorthand prefixes (`a!` for haiku, `a*` for opus) — polish, not essential
- Full conversation replay UI — terminal scrollback is sufficient; scope creep risk
- Multi-model support (GPT, Gemini) — Claude SDK tool-use is the competitive moat; don't dilute it
- AI-powered tab completion — readline integration complexity, latency concerns

### Architecture Approach

v2 extends the existing 13-module graph with 6 new single-responsibility modules (session.ts, model.ts, permissions.ts, context.ts, pipe.ts, cost.ts) that `ai.ts` composes via a `buildQueryOptions()` function. The `ShellState` interface gains three new readonly fields (`sessionId`, `currentModel`, `permissionLevel`), updated immutably via spread. The classify-then-dispatch pattern in `shell.ts` gains a new `slash` InputAction variant for `/` commands. `cli.ts` gets a pre-REPL pipe detection branch: if stdin is not a TTY and argv contains a prompt, run a single AI call and exit. The existing renderer's `isTTY` check already handles non-TTY output formatting.

**Major components:**
1. `session.ts` (NEW) — Session lifecycle: create ID, resolve resume options, list via SDK, clear; only the ID lives in ShellState; SDK handles all conversation storage; persists metadata to `~/.claudeshell/active-session.json` for crash recovery
2. `model.ts` (NEW) — Alias resolution (`haiku` -> full model string), per-query `@alias` parsing from prompts, `/model` slash command handler
3. `permissions.ts` (NEW) — Maps ClaudeShell levels (`strict`/`normal`/`permissive`/`plan`) to SDK permission modes; stores mode alongside session ID; warns on permission-mode mismatch during session resume
4. `context.ts` (NEW) — Detects project type from marker files (package.json, Cargo.toml, go.mod, etc.), builds system prompt snippet, caches per-cwd, invalidates on `cd`
5. `pipe.ts` (NEW) — Detects `!process.stdin.isTTY`, reads and frames piped stdin, triggers single-shot AI call via `cli.ts` before `runShell()` launches
6. `cost.ts` (NEW) — Extracts `total_cost_usd` and token counts from `SDKResultMessage`, formats dim status line, accumulates running session total

### Critical Pitfalls

1. **Silent session resume failure via CWD mismatch** — Never use `continue: true`; always track and pass explicit `sessionId` via `resume: sessionId`. When the user `cd`s, the session ID stays the same in `ShellState`. A visual session indicator in the prompt prevents silent loss. This is the most common `resume` pitfall in the SDK docs.

2. **Pipe input destroying the interactive REPL** — Detect `process.stdin.isTTY === false` at `cli.ts` startup before `runShell()`. If not a TTY, switch to single-shot mode: read stdin, run one AI call, output plain text, exit. Never combine piped stdin with an interactive readline REPL — this caused crashes in Claude Code issues #1072 and #5925.

3. **ANSI/markdown garbage in piped output** — When `process.stdout.isTTY` is false, disable all ANSI codes, disable markdown rendering, suppress spinners and tool indicators. Write status messages to stderr only. Test with `a hello | cat -v` — any `^[[` sequences mean the check is incomplete.

4. **Permission escalation through session resume** — Store permission mode alongside session ID in `ShellState` AND in `~/.claudeshell/active-session.json`. When resuming, restore the original permission mode. Warn if current mode differs from the session's original mode before proceeding.

5. **Context window explosion with long sessions** — Plan for compaction from the start. Show a token usage indicator (e.g., `[42K/200K]`). Trigger auto-compaction when usage exceeds 60% of the context window. The cost accumulator helps users notice when they are burning tokens on accumulated history.

## Implications for Roadmap

Based on research, a 4-phase structure maps cleanly to dependency chains, risk profiles, and user value delivery:

### Phase 1: Session & Visibility
**Rationale:** P0 features; all rely on well-documented SDK capabilities with zero new dependencies. These transform ClaudeShell from stateless to stateful and give users cost visibility. They are the prerequisite for every other v2 feature — permission modes must be stored with sessions, project context is injected per-query, and pipe mode bypasses the session REPL entirely.
**Delivers:** Session persistence across `a` commands; `/new` command; token/cost display after each response; model selection via config, `/model` command, and `--model` flag; session metadata persisted for crash recovery.
**Addresses:** Table-stakes features (session context, `/new`, cost display, model selection) from FEATURES.md
**Avoids:** Silent session resume failure (Pitfall 1) — must use explicit session IDs from day one; session metadata loss on crash (Pitfall 10)

### Phase 2: Unix Integration
**Rationale:** Pipe support is the single most differentiating feature for shell power users and makes ClaudeShell a genuine Unix citizen. Error recovery builds on the existing `lastError` infrastructure in `ShellState`. Configurable prefix is trivial but completes the customization story. All three are medium-complexity with well-understood, zero-new-dependency implementation paths.
**Delivers:** `cat file | a summarize` pipe workflow via single-shot non-interactive mode; error recovery loop (diagnose, suggest fix, require explicit approval, cap at 3 attempts); configurable `ai_prefix` in config.
**Uses:** `process.stdin.isTTY` / `process.stdout.isTTY` (Node.js built-ins); existing `lastError` in `ShellState`; existing classifier in `classify.ts`
**Avoids:** Pipe destroying REPL (Pitfall 3); ANSI codes leaking to pipe output (Pitfall 8); autonomous fix execution without approval (anti-feature from FEATURES.md)

### Phase 3: Context & Control
**Rationale:** Permission control and project context make ClaudeShell feel "project-aware" and safe. They depend on Phase 1 (session state must exist before permission modes can be stored with sessions) and benefit from Phase 2 being stable (users understand the tool before configuring it). These three features together close the gap with Claude Code's project-awareness story.
**Delivers:** SDK permission modes via `/permissions` command and config (defaulting to `acceptEdits`); project type auto-detection injected into system prompt; CLAUDE.md loading via SDK `settingSources`; per-project `.claudeshell.json` config overrides; session cost accumulator with `/cost` command.
**Implements:** context.ts, permissions.ts, config.ts project-level layering
**Avoids:** Permission UX blocking flow (Pitfall 7) — default to `acceptEdits`, not constant prompting; permission escalation on resume (Pitfall 4); synchronous project detection on every AI call (Anti-Pattern 4 — cache per-cwd)

### Phase 4: PTY & Polish
**Rationale:** PTY integration has the highest risk (readline/PTY stdin conflict, resource leaks, native build failures) and benefits the fewest users — `spawn({ stdio: 'inherit' })` already satisfies the vast majority of interactive command needs. Defer until the rest of v2 is stable. Model shorthands and session cleanup are low-effort polish.
**Delivers:** PTY support for edge-case interactive programs (vim, ssh) via `node-pty` as `optionalDependency` with graceful fallback; model shorthand prefixes (`a!`, `a*`); session file rotation/cleanup command.
**Avoids:** PTY zombie leaks (Pitfall 5); readline/PTY stdin conflict (Pitfall 2); Ctrl+C contract breakage (Pitfall 9); node-pty build failures (Pitfall 11)

### Phase Ordering Rationale

- Phase 1 before all others: session ID is the shared state primitive that permissions, context, and cost all attach to — it must be established and crash-safe before dependent features are built
- Pipe support (Phase 2) before project context (Phase 3): pipe is the most-requested missing feature, is entirely independent of stateful features, and completing it builds user confidence before tackling config layering complexity
- Permission control and project context (Phase 3) together: they share the same config layering infrastructure (`.claudeshell.json` overrides) and project-specific permission modes are the primary use case for per-project config
- PTY last: highest risk, lowest user coverage, architectural complexity that could destabilize the clean REPL loop if introduced too early; `spawn({ stdio: 'inherit' })` is the recommended default and should be implemented first in Phase 3 passthrough extension

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (session management):** Verify exact `SDKResultMessage.session_id` field name and `resume` option behavior against the installed SDK version `0.2.88` — confirm from `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` before writing session.ts
- **Phase 1 (cost tracking):** The `SDKResultMessage` usage shape (`total_cost_usd`, `modelUsage`, `usage.input_tokens`) has MEDIUM confidence — verify exact field names from SDK type definitions
- **Phase 2 (pipe support):** Test the single-shot non-interactive path with binary data and large files (>50KB) — edge cases around encoding and truncation need empirical validation before shipping
- **Phase 4 (PTY packaging):** Research `node-pty-prebuilt-multiarch` as an alternative that ships prebuilt binaries before committing to raw node-pty compilation

Phases with standard patterns (skip research-phase):
- **Phase 1 (model selection):** SDK `query()` `model` option is straightforward; alias-to-full-string mapping is mechanical
- **Phase 2 (configurable prefix):** Single classifier change, fully understood
- **Phase 3 (per-project config):** JSON merge with object spread is the established pattern; no new concepts
- **Phase 3 (project detection):** `fs.existsSync` checks on known marker files; no AST parsing needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core additions verified against official Claude Agent SDK docs; node-pty is well-documented; all alternatives considered and ruled out with rationale |
| Features | HIGH | SDK-native features (sessions, model, cost, permissions) verified from official source; pipe and PTY patterns verified from Claude Code GitHub issues and competitor tool analysis |
| Architecture | HIGH | Based on direct analysis of all 13 existing source files plus official SDK TypeScript reference; module boundaries derived from existing codebase patterns |
| Pitfalls | HIGH | Critical pitfalls sourced from official SDK docs, real GitHub issues (Claude Code #1072, #5925; Node.js #5574), production LLM context research (Chroma), and security CVEs (Trail of Bits) |

**Overall confidence:** HIGH

### Gaps to Address

- **cost.ts exact field names:** The `SDKResultMessage` usage shape needs confirmation against the installed SDK's type definitions before implementing cost.ts. Architecture researcher rated this MEDIUM confidence.
- **Session metadata file format:** The `~/.claudeshell/active-session.json` crash recovery format is not specified by the SDK and must be designed. Recommended minimal shape: `{ sessionId, permissionMode, createdAt, lastActiveAt }`.
- **Context window limits per model:** When implementing context explosion warnings (Pitfall 6), per-model context limits should be sourced from `query.supportedModels()` or hardcoded from Anthropic documentation at implementation time.
- **PTY vs spawn empirical validation:** The architecture research recommends `spawn({ stdio: 'inherit' })` over node-pty. Validate against vim, ssh, less, htop, and python REPL before finalizing Phase 4 scope — if spawn handles all common cases, node-pty may be unnecessary entirely.
- **`a` prefix collision on fresh installs:** v1 research identified this risk; v2 should surface a configurable prefix prominently in onboarding to prevent silent command shadowing.

## Sources

### Primary (HIGH confidence)
- [Claude Agent SDK Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions) — session resume, continue, fork, listSessions, getSessionMessages, renameSession
- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) — Options type, Query object, ResultMessage, ModelUsage, supportedModels, setModel
- [Claude Agent SDK Permissions](https://platform.claude.com/docs/en/agent-sdk/permissions) — 5 permission modes, allowedTools, disallowedTools, canUseTool callback, bypassPermissions warning
- [Node.js TTY docs](https://nodejs.org/api/tty.html) — isTTY for pipe detection
- [Node.js readline/promises](https://nodejs.org/api/readline.html) — REPL input, pause/resume lifecycle
- [node-pty GitHub](https://github.com/microsoft/node-pty) — PTY bindings, resource management, platform support, prebuilt options
- [Claude Code: Pipe stdin crash #1072](https://github.com/anthropics/claude-code/issues/1072) — pipe/REPL conflict pattern
- [Claude Code: Raw mode pipe crash #5925](https://github.com/anthropics/claude-code/issues/5925) — readline raw mode with piped stdin
- [Node.js: Multiple stdin readers issue #5574](https://github.com/nodejs/node/issues/5574) — keystroke loss with readline + PTY simultaneously
- [Chroma Research: Context Rot](https://research.trychroma.com/context-rot) — context window degradation in long sessions
- [Trail of Bits: Prompt injection to RCE](https://blog.trailofbits.com/2025/10/22/prompt-injection-to-rce-in-ai-agents/) — permission model security implications

### Secondary (MEDIUM confidence)
- [aichat](https://github.com/sigoden/aichat) — competitor pipe/session patterns; first-class stdin support
- [Claude Agent SDK Cost Tracking](https://platform.claude.com/docs/en/agent-sdk/cost-tracking) — `total_cost_usd`, `modelUsage`, per-step token tracking
- [Gemini CLI Context Management](https://datalakehousehub.com/blog/2026-03-context-management-gemini-cli/) — hierarchical context, GEMINI.md pattern
- [Claude Code Session Management](https://stevekinney.com/courses/ai-development/claude-code-session-management) — session persistence patterns
- [LLM Chat History Summarization (mem0.ai)](https://mem0.ai/blog/llm-chat-history-summarization-guide-2025) — context compaction strategies
- [AI Agent Permission Models (AgentNode)](https://agentnode.net/blog/ai-agent-permission-models-least-privilege) — least-privilege patterns for tool-using agents
- [Anthropic Claude Code Sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing) — permission and sandbox architecture reference

### Tertiary (LOW confidence)
- [ctx CLI](https://dev.to/lakshmisravyavedantham/i-built-a-cli-that-gives-any-ai-instant-context-about-your-project-3ig8) — project context detection patterns; single source, validate during Phase 3 planning

---
*Research completed: 2026-03-31*
*Ready for roadmap: yes*
