# Phase 10: Auto-Suggestions & History Search - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement fish-like ghost text auto-suggestions from command history. As the user types, dim suggestion text appears showing the most recent matching history entry. Right-arrow accepts the suggestion. Keypress handling is debounced for zero perceptible lag. Sensitive commands (API keys, passwords, tokens) are filtered from suggestions. Feature is independently disablable in config.

This phase does NOT include: syntax highlighting (Phase 11), plugin management (Phase 11), profile system (Phase 11), or batch plugin porting (Phase 12).

</domain>

<decisions>
## Implementation Decisions

### Ghost Text Rendering
- **D-01:** Output-only rendering — ghost text is written to stdout as dim ANSI text AFTER the cursor position, then erased on the next keypress. `rl.line` ALWAYS remains plain text (per v3.0 decision).
- **D-02:** Use ANSI escape sequences: `\x1b[2m` (dim) for suggestion text, `\x1b[0m` (reset) after, `\x1b[K` (clear to end of line) to erase previous suggestion
- **D-03:** Suggestion text is the suffix only — if user typed `git ch` and suggestion is `git checkout`, display only `eckout` in dim after cursor
- **D-04:** New module `src/suggestions/renderer.ts` — handles ghost text rendering/clearing on the terminal
- **D-05:** Rendering is a pure side-effect on stdout — no modification to readline's internal state

### Keypress Interception
- **D-06:** Listen to `process.stdin` 'keypress' events (emitted by readline) — NOT raw mode keypress handling
- **D-07:** Debounce suggestion lookup at 50ms — fast enough to feel instant at >5 chars/sec, slow enough to avoid unnecessary history scans during rapid typing
- **D-08:** Right-arrow key acceptance: detect right-arrow keypress, if a suggestion is active, write the remaining text to `rl.line` via `rl.write(suggestion_suffix)` and clear ghost text
- **D-09:** Any other keypress while suggestion is visible: clear ghost text, update suggestion for new input
- **D-10:** New module `src/suggestions/keypress.ts` — keypress event handler with debounce logic
- **D-11:** Escape key or Ctrl+C while suggestion visible: clear suggestion without accepting

### History Search
- **D-12:** Reverse linear scan of history array with prefix matching — start from most recent, exit on first match
- **D-13:** Prefix match: the current `rl.line` content must be a prefix of the history entry (case-sensitive)
- **D-14:** Skip history entries that exactly match current input (no point suggesting what's already typed)
- **D-15:** New module `src/suggestions/history-search.ts` — `findSuggestion(prefix: string, history: readonly string[], filters: readonly RegExp[]): string | null`
- **D-16:** History array is the same one managed by readline — access via `(rl as any).history` (already used in shell.ts for save)

### Sensitive Pattern Filtering
- **D-17:** Default sensitive patterns: API keys (`/[A-Za-z0-9_-]{20,}/` preceded by key/token/secret/password keywords), common env var patterns (`ANTHROPIC_API_KEY=`, `AWS_SECRET_ACCESS_KEY=`, etc.), password flags (`--password`, `-p` followed by non-flag)
- **D-18:** Configurable via config: `"suggestions": { "sensitive_patterns": ["custom_regex"] }` — merged with defaults
- **D-19:** Filtering happens during history search — matching entries are skipped entirely (never shown as suggestions)
- **D-20:** Default patterns are conservative — better to over-filter than to leak a secret

### Config Integration
- **D-21:** New config field: `"suggestions": { "enabled": true, "debounce_ms": 50, "sensitive_patterns": [] }`
- **D-22:** `enabled: false` disables auto-suggestions completely — no keypress listener, no ghost text
- **D-23:** Feature check in shell.ts: `if (config.suggestions?.enabled !== false)` — enabled by default
- **D-24:** Extend `NeshConfig` interface in `src/config.ts` with `suggestions?: SuggestionsConfig`

### Module Architecture
- **D-25:** Module structure: `src/suggestions/renderer.ts` (ghost text), `src/suggestions/keypress.ts` (keypress handler + debounce), `src/suggestions/history-search.ts` (search + filter), `src/suggestions/index.ts` (facade that wires the three together)
- **D-26:** Facade `src/suggestions/index.ts` exports `setupAutoSuggestions(rl, history, config)` — called from shell.ts, returns cleanup function
- **D-27:** Cleanup function removes keypress listener on shell exit — prevents memory leaks

### Claude's Discretion
- Exact regex patterns for default sensitive filters
- Whether to support partial word matching (vs strict prefix only)
- Terminal width handling for long suggestions that would wrap
- Whether suggestions persist during Tab completion or are cleared

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Shell Infrastructure
- `src/shell.ts` — REPL loop, readline interface, keypress handling, history access
- `src/history.ts` — History load/save, `shouldSaveToHistory`, HISTORY_PATH
- `src/config.ts` — NeshConfig interface to extend with suggestions field
- `src/types.ts` — ShellState (may need suggestion-related state)

### Plugin System (Phase 8-9)
- `src/plugins/types.ts` — PluginManifest (suggestions could be a plugin, but core feature is simpler)
- `src/plugins/hooks.ts` — Hook dispatch pattern (prePrompt hook fires before suggestions update)

### Research & Requirements
- `.planning/REQUIREMENTS.md` — SUGG-01 through SUGG-05
- `.planning/ROADMAP.md` — Phase 10 success criteria
- `.planning/research/PITFALLS.md` — readline keypress timing, rl.line/rl.cursor update order

### Prior Decisions
- `.planning/STATE.md` — "rl.line must ALWAYS remain plain text (output-only rendering)"
- `.planning/phases/08-plugin-engine-alias-system/08-CONTEXT.md` — Plugin architecture pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/history.ts`: `loadHistory()` returns string array — same array used for suggestion search
- `src/shell.ts`: readline interface with `(rl as any).history` access pattern — already used for history save
- `src/config.ts`: NeshConfig validation pattern — extend for suggestions config

### Established Patterns
- **Output-only rendering**: Phase 8 established that `rl.line` stays plain text — suggestions follow the same constraint
- **Debounce**: Similar to completion timeout pattern from Phase 9 — use setTimeout/clearTimeout
- **Config validation**: Type guards with safe defaults
- **Module-per-concern**: New `src/suggestions/` directory

### Integration Points
- `src/shell.ts`: Call `setupAutoSuggestions(rl, history, config)` after readline creation, before REPL loop
- `src/config.ts`: Add `suggestions?: SuggestionsConfig` to NeshConfig
- `src/shell.ts`: Cleanup function called alongside existing cleanup

</code_context>

<specifics>
## Specific Ideas

- Fish shell is the gold standard — suggestions should feel identical to fish's behavior
- The 50ms debounce is key — too short wastes cycles, too long feels laggy
- Right-arrow acceptance is the critical UX moment — must feel instant and natural
- Sensitive filtering is a security feature — err on the side of caution

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-auto-suggestions-history-search*
*Context gathered: 2026-04-05*
