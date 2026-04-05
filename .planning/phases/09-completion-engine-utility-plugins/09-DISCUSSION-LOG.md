# Phase 9: Completion Engine & Utility Plugins - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 09-completion-engine-utility-plugins
**Areas discussed:** Completion provider interface, Tab key integration, Fig-style spec format, Utility plugin architecture
**Mode:** Auto (all areas auto-selected, recommended defaults chosen)

---

## Completion Provider Interface

| Option | Description | Selected |
|--------|-------------|----------|
| Add completions field to PluginManifest | Async function on manifest, 1s timeout, cached results | ✓ |
| Separate completion registry | Independent registration outside manifest | |
| Static completion data only | No async generators, pure static lists | |

**User's choice:** [auto] Add completions field to PluginManifest (recommended default)
**Notes:** Extends existing manifest pattern. CompletionProvider is an async function returning string array. 1-second timeout via Promise.race. Cached per (command, word) with 30s TTL.

---

## Tab Key Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Readline built-in completer callback | Standard Node.js approach via createInterface({ completer }) | ✓ |
| Raw keypress handler on Tab | Full control but complex, must handle display manually | |
| Third-party completion library | External dependency like tab-completer | |

**User's choice:** [auto] Readline built-in completer callback (recommended default)
**Notes:** Standard approach. Supports async via callback pattern. Avoids raw keypress complexity.

---

## Fig-Style Completion Specs

| Option | Description | Selected |
|--------|-------------|----------|
| Own TypeScript interface with subcommand/options/args tree | Declarative object tree, own types, no external deps | ✓ |
| Use Fig's @withfig/autocomplete package | Official Fig types, large community specs | |
| Simple command-to-completions map | Flat mapping without subcommand nesting | |

**User's choice:** [auto] Own TypeScript interface (recommended default)
**Notes:** Per STATE.md research note: "define own TS types, don't depend on their package." Tree structure supports subcommands, options with short/long aliases, args with templates and generators.

---

## Utility Plugin Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Use init() with extended plugin API context | Context object provides registerKeybinding/registerCommand methods | ✓ |
| Builtin command extension | Add utility commands to classify.ts builtins set | |
| Standalone utility modules | Not plugins at all, just modules loaded by shell | |

**User's choice:** [auto] Use init() with extended plugin API context (recommended default)
**Notes:** Extends existing Phase 8 init pattern. extract, sudo, copypath use registration methods. Cross-platform via process.platform checks.

---

## Claude's Discretion

- Exact subcommands/options for top 20 command completions
- Completion candidate display format
- Internal naming conventions
- Sudo toggle keybinding

## Deferred Ideas

None — all discussion stayed within Phase 9 scope.
