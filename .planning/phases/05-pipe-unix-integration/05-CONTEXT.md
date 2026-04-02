# Phase 5: Pipe & Unix Integration - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Make ClaudeShell a Unix citizen: pipe-friendly AI input/output, automatic error recovery with `a fix`, and configurable AI command prefix. After this phase, ClaudeShell integrates naturally with Unix pipelines and workflows.

</domain>

<decisions>
## Implementation Decisions

### Pipe Input Handling
- **D-01:** Detect pipe mode at startup: `!process.stdin.isTTY` means stdin is piped
- **D-02:** Pipe mode is a separate code path in `src/cli.ts` — never enter the REPL loop
- **D-03:** Read all piped stdin content, then execute a single AI call with stdin as context appended to the prompt
- **D-04:** Usage: `cat log.txt | claudeshell "summarize this"` or `echo "explain this code" | claudeshell`
- **D-05:** If both stdin pipe and CLI argument exist, combine: argument is the prompt, stdin is the context
- **D-06:** If only stdin pipe (no argument), stdin IS the prompt
- **D-07:** Exit after single response (exit code 0 on success, 1 on error)

### Pipe Output Handling
- **D-08:** When stdout is not a TTY (`!process.stdout.isTTY`), output plain text only — no ANSI colors, no markdown formatting, no tool status lines
- **D-09:** Renderer already handles this (`isTTY: false` path) — ensure pipe mode sets this correctly
- **D-10:** Cost footer goes to stderr (already does) — visible to user even when stdout is piped
- **D-11:** Tool status lines go to stderr (already do) — visible to user even when stdout is piped
- **D-12:** Enable chaining: `claudeshell "generate csv" | head -5` works because stdout is clean text

### Error Recovery
- **D-13:** When a command fails (non-zero exit), show the existing error hint PLUS an AI-suggested fix inline
- **D-14:** Fix suggestion format: `Suggested fix: <command>. Type 'a fix' to run it.`
- **D-15:** `a fix` executes the last suggested fix command (stored in ShellState)
- **D-16:** `a fix` first asks AI for the fix using lastError context, then executes the suggested command
- **D-17:** If AI can't determine a fix, say so honestly — don't guess
- **D-18:** Error recovery uses the current session for context (knows what user was doing)
- **D-19:** Extend ShellState with `lastSuggestedFix?: string` field

### Configurable Prefix
- **D-20:** Config field: `"prefix": "a"` in `~/.claudeshell/config.json` (default: `"a"`)
- **D-21:** Classifier reads prefix from loaded config, uses it instead of hardcoded `"a"`
- **D-22:** Per-project `.claudeshell.json` can override prefix (Phase 6 will add per-project config loading)
- **D-23:** Prefix must be a single word (no spaces) — validate on config load
- **D-24:** Chat mode entry still uses bare prefix (typing just the prefix word enters chat mode)
- **D-25:** Show configured prefix in error messages and help text

### Claude's Discretion
- Exact format of the fix suggestion prompt to Claude
- Whether to show a brief "analyzing error..." indicator before the fix suggestion
- How to handle binary stdin (likely: reject with message "Binary input not supported")
- Maximum stdin size for pipe mode (recommend: 100KB warning, 1MB hard limit)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Implementation
- `src/cli.ts` — Entry point — add pipe mode detection before REPL
- `src/shell.ts` — REPL loop — wire `a fix` handling
- `src/ai.ts` — executeAI — already supports session/model, add pipe-mode single-shot
- `src/classify.ts` — classifyInput — read prefix from config instead of hardcoded `"a"`
- `src/renderer.ts` — already handles isTTY for output formatting
- `src/config.ts` — ClaudeShellConfig — add `prefix` field
- `src/types.ts` — ShellState — add `lastSuggestedFix`

### Research
- `.planning/research/ARCHITECTURE.md` — Pipe mode as cli.ts concern
- `.planning/research/PITFALLS.md` — Pipe input crashes REPL (must be separate path)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/renderer.ts`: `createRenderer({ isTTY: false })` already outputs plain text — reuse for pipe mode
- `src/ai.ts`: `executeAI()` already returns `AIResult` with usage — works for single-shot pipe
- `src/cost.ts`: `renderCostFooter()` already writes to stderr — works in pipe mode
- `src/shell.ts`: `lastError` tracking already exists — extend for `lastSuggestedFix`

### Established Patterns
- Immutable ShellState with spread updates
- `isTTY` checks for conditional formatting
- stderr for meta-info, stdout for content
- Config schema extension pattern (add field, update loadConfig)

### Integration Points
- `src/cli.ts`: Add pipe detection before `runShell()` call — new `runPipe()` function
- `src/classify.ts`: Replace hardcoded `'a'` with `config.prefix`
- `src/shell.ts`: Add `a fix` to error handling flow

</code_context>

<specifics>
## Specific Ideas

- Pipe mode should feel invisible — `cat file | claudeshell "summarize"` just works, no flags needed
- Error recovery should be one-step: see the fix, type `a fix`, done
- Custom prefix is a power-user feature — default `a` works for everyone, but devs who have an `a` alias can change it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-pipe-unix-integration*
*Context gathered: 2026-04-02*
