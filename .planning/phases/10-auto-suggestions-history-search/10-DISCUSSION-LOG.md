# Phase 10: Auto-Suggestions & History Search - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-05
**Phase:** 10-auto-suggestions-history-search
**Areas discussed:** Ghost text rendering, Keypress interception, History search, Sensitive pattern filtering
**Mode:** Auto

---

## Ghost Text Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| ANSI escape output-only | Write dim text after cursor, erase on next keypress, rl.line untouched | ✓ |
| Modify rl.line with markers | Embed suggestion in rl.line with escape markers | |
| Separate line below prompt | Show suggestion on a new line | |

**User's choice:** [auto] ANSI escape output-only (recommended default)

---

## Keypress Interception

| Option | Description | Selected |
|--------|-------------|----------|
| process.stdin keypress events + debounce | Standard readline keypress events, 50ms debounce | ✓ |
| Raw mode keypress handling | Full control but complex | |
| Polling rl.line on interval | Simple but wasteful | |

**User's choice:** [auto] process.stdin keypress events + debounce (recommended default)

---

## History Search Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Reverse linear scan with prefix match | Start from recent, early exit on first match | ✓ |
| Trie index for O(1) prefix lookup | Fast but memory-heavy, complex to maintain | |
| Fuzzy matching | More flexible but slower, harder to predict | |

**User's choice:** [auto] Reverse linear scan with prefix match (recommended default)

---

## Sensitive Pattern Filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Regex-based pattern list | Configurable patterns, sensible defaults, conservative | ✓ |
| Keyword blocklist only | Simpler but less precise | |
| No filtering (user responsibility) | Minimal but risky | |

**User's choice:** [auto] Regex-based pattern list (recommended default)

---

## Claude's Discretion

- Exact default sensitive regex patterns
- Partial word matching support
- Terminal width handling for long suggestions
- Suggestion behavior during Tab completion

## Deferred Ideas

None.
