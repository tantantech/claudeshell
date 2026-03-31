# Phase 2: AI Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 02-ai-integration
**Areas discussed:** SDK Integration Pattern, Streaming Output, Tool Visibility, Error Handling Strategy
**Mode:** Auto (all areas auto-selected, recommended defaults chosen)

---

## SDK Integration Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy-load on first `a` command | Import SDK only when needed, keep startup fast | ✓ |
| Import at startup | Always ready but slower launch | |
| Background preload | Start loading after shell init | |

**User's choice:** Lazy-load on first `a` command (auto-selected recommended default)
**Notes:** Research confirmed SDK import adds significant startup time. Lazy-load validated.

---

## Streaming Output

| Option | Description | Selected |
|--------|-------------|----------|
| Token-by-token with marked-terminal | Stream + markdown rendering | ✓ |
| Buffer full response then render | Simpler but poor UX | |
| Raw text streaming | No formatting | |

**User's choice:** Stream token-by-token with marked-terminal (auto-selected recommended default)

---

## Tool Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Inline status lines | Show tool name + target in dim text | ✓ |
| Verbose with full output | Show tool inputs and outputs | |
| Silent | Don't show tool use | |

**User's choice:** Inline status lines (auto-selected recommended default)

---

## Error Handling Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Categorized user-friendly messages | Specific guidance per error type | ✓ |
| Generic error display | Show raw error message | |
| Silent retry | Auto-retry then show error | |

**User's choice:** Categorized user-friendly messages with retry hints (auto-selected recommended default)

---

## Claude's Discretion

- SDK query options (temperature, max tokens, system prompt)
- "Thinking..." indicator before first token
- Internal retry logic for transient errors

## Deferred Ideas

- Session context (v2 SESS-01), model selection (v2 SESS-03), token display (v2 PWR-05), permissions (v2 PWR-04), pipe-friendly AI (v2 PWR-01)
