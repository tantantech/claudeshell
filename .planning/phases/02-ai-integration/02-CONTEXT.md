# Phase 2: AI Integration - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the Claude Agent SDK into ClaudeShell so users can type `a <prompt>` and get streaming AI responses with full tool-use capabilities (file read/write, command execution). Includes API key configuration, error handling for SDK failures, and markdown-formatted output rendering.

</domain>

<decisions>
## Implementation Decisions

### SDK Integration Pattern
- **D-01:** Lazy-load the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) on first `a` command — do NOT import at shell startup
- **D-02:** Use the SDK's `query()` async generator with `includePartialMessages: true` for streaming
- **D-03:** Pass `permissionMode: "acceptEdits"` to allow Claude to read/write files and execute commands without per-action prompts (v1 — permission control is v2)
- **D-04:** Create a dedicated `src/ai.ts` module that encapsulates all SDK interaction
- **D-05:** The existing `classifyInput()` already returns `ai_placeholder` for `a` prefix — update it to route to the AI module instead of showing the placeholder message

### Streaming Output
- **D-06:** Use `marked` + `marked-terminal` to render Claude's markdown responses with syntax highlighting and formatting
- **D-07:** Stream tokens to stdout as they arrive — do NOT buffer the full response
- **D-08:** Use `picocolors` (already installed) for status/info messages distinct from AI output
- **D-09:** After the AI response completes, print a blank line before the next prompt for readability
- **D-10:** When stdout is not a TTY (piped), output plain text without colors or markdown formatting (preparation for v2 pipe-friendly AI)

### Tool Visibility
- **D-11:** When Claude uses a tool (reads file, runs command), display an inline status line: e.g., `  → Reading src/types.ts...` or `  → Running npm test...`
- **D-12:** Use dim/gray color for tool status lines to distinguish from AI response text
- **D-13:** Show tool results briefly when relevant (e.g., command exit code, file path)
- **D-14:** Tool status lines go to stderr so they don't pollute piped stdout

### Error Handling
- **D-15:** Missing API key: show `"Set ANTHROPIC_API_KEY to use AI commands. Example: export ANTHROPIC_API_KEY=sk-ant-..."` and return to prompt (don't crash)
- **D-16:** Rate limit: show `"Rate limited — wait a moment and try again"` with retry-after if available
- **D-17:** Network error: show `"Network error — check your connection"` 
- **D-18:** Authentication failure: show `"Invalid API key — check ANTHROPIC_API_KEY"`
- **D-19:** All errors return to the shell prompt — never crash from an SDK error
- **D-20:** Wrap the entire AI execution in try/catch at the top level

### AI Cancellation (Ctrl+C)
- **D-21:** When user presses Ctrl+C during an AI response, use `AbortController` to cancel the SDK query
- **D-22:** After cancellation, print `"\n[cancelled]"` and return to the prompt cleanly
- **D-23:** The existing SIGINT handler in shell.ts needs to be extended to detect "AI streaming" state

### Error Explanation
- **D-24:** When a standard command fails (non-zero exit), offer to explain: `"Command failed [exit: N]. Type 'a explain' to ask AI about the error."`
- **D-25:** Store the last failed command's stderr in shell state for the AI to reference
- **D-26:** `a explain` (or `a why`) is a shortcut that passes the last error context to Claude

### API Key Configuration
- **D-27:** Check `ANTHROPIC_API_KEY` environment variable (primary)
- **D-28:** Also check `~/.claudeshell/config` for an `api_key` field (secondary, for convenience)
- **D-29:** If neither found, show the helpful error on first `a` command (not at startup — don't nag non-AI users)

### Claude's Discretion
- Exact SDK `query()` options beyond what's specified (temperature, max tokens, system prompt content)
- How to structure the system prompt for shell context (cwd, OS, shell info)
- Whether to show a "thinking..." indicator before the first token arrives
- Internal retry logic for transient SDK errors

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 Implementation (integrate with these)
- `src/types.ts` — ShellState, InputAction types — extend for AI state
- `src/classify.ts` — classifyInput() — change `ai_placeholder` to route to AI
- `src/shell.ts` — REPL loop — integrate AI execution path
- `src/cli.ts` — CLI entry point — no changes expected

### Project Docs
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — AI-01 through AI-07, CONF-01, CONF-02, ERR-01, ERR-02
- `.planning/research/ARCHITECTURE.md` — Component boundaries and data flow
- `.planning/research/STACK.md` — Technology choices including SDK details
- `.planning/research/PITFALLS.md` — SDK error handling, context management pitfalls

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/classify.ts`: Already classifies `a` prefix as `ai_placeholder` — change to `ai` action type
- `src/types.ts`: `ShellState` can be extended with `lastError?: { command: string; stderr: string; exitCode: number }`
- `src/prompt.ts`: `buildPrompt()` — no changes needed
- `src/passthrough.ts`: `executeCommand()` — capture stderr for error explanation feature

### Established Patterns
- Immutable state updates: `{ ...state, newField: value }` — maintain for AI state
- Module boundary pattern: one concern per file, pure functions where possible
- Test pattern: vitest with descriptive test names, isolated unit tests

### Integration Points
- `src/shell.ts` REPL loop: add AI execution path after input classification
- `src/classify.ts`: update `ai_placeholder` → `ai` action type with prompt extraction
- `src/passthrough.ts`: capture stderr on failure for error explanation context
- New `src/ai.ts`: AI module consumed by shell.ts REPL loop

</code_context>

<specifics>
## Specific Ideas

- The AI module should feel like a natural extension of the shell — responses stream inline, no modal UI
- Tool actions should feel like the AI is "doing things" in your terminal, not just talking about them
- Error messages should be actionable — tell the user exactly what to do, not just what went wrong
- The `a explain` shortcut should feel magical — fail a command, type two words, get an explanation

</specifics>

<deferred>
## Deferred Ideas

- Session/conversation context across multiple `a` commands (v2 — SESS-01)
- Model selection per query (v2 — SESS-03)
- Token/cost display (v2 — PWR-05)
- Permission control for AI actions (v2 — PWR-04)
- Pipe-friendly AI output `cat file | a summarize` (v2 — PWR-01)

</deferred>

---

*Phase: 02-ai-integration*
*Context gathered: 2026-03-31*
