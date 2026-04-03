<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-03 | Updated: 2026-04-03 -->

# src

## Purpose
Core shell source code. Implements the REPL loop, input classification, AI integration, multi-provider support, and terminal rendering.

## Key Files

| File | Description |
|------|-------------|
| `cli.ts` | Entry point — `--version` flag, TTY vs pipe detection |
| `shell.ts` | Main REPL loop — readline, state management, command dispatch |
| `classify.ts` | Input router — returns discriminated union: builtin/passthrough/ai/empty |
| `ai.ts` | Claude Agent SDK integration — streaming, abort, error classification |
| `renderer.ts` | Markdown rendering for TTY (marked+marked-terminal), raw for pipes |
| `passthrough.ts` | Spawns `bash -c` for regular shell commands |
| `builtins.ts` | In-process commands: cd, export, exit, clear, theme |
| `config.ts` | Loads `~/.nesh/config.json`, resolves API keys from env/config |
| `prompt.ts` | p10k-style powerline prompt with git branch detection |
| `types.ts` | Core types: `ShellState`, `InputAction`, `LastError`, `UsageInfo` |
| `cost.ts` | Token counting and cost accumulation |
| `chat.ts` | Persistent chat mode (enter with bare `a`) |
| `pipe.ts` | Non-TTY pipe mode for Unix pipeline usage |
| `session.ts` | Session ID generation |
| `history.ts` | Command history load/save |
| `interactive.ts` | Interactive command detection and execution |
| `model-switcher.ts` | `model` builtin — interactive model picker |
| `key-manager.ts` | `keys` builtin — API key management |
| `settings.ts` | `settings` builtin — interactive settings menu |
| `context.ts` | Project context detection (`.nesh.json`) |
| `templates.ts` | Prompt theme templates (minimal, classic, powerline, hacker, pastel) |
| `marked-terminal.d.ts` | Type declarations for marked-terminal |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `providers/` | Multi-provider AI abstraction (see `providers/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- All state flows through immutable `ShellState` — use spread, never mutate
- `classify.ts` is the routing heart — all input goes through it
- AI SDK is lazy-loaded via dynamic `import()` in `ai.ts` for fast startup
- Builtins run in-process (they modify shell state); everything else spawns bash

### Testing Requirements
- Every `.ts` file has a corresponding test in `tests/`
- Run `npx vitest run tests/<name>.test.ts` for individual files
- Run `npx tsc --noEmit` for type checking

### Common Patterns
- Discriminated unions with `readonly type` field for `InputAction`
- All interfaces use `readonly` properties
- Error classification: auth/rate-limit/network/billing in `ai.ts`
- ANSI 256-color codes in `prompt.ts` for powerline segments

## Dependencies

### Internal
- All modules import types from `types.ts`
- `shell.ts` orchestrates all other modules

### External
- `@anthropic-ai/claude-agent-sdk` — AI streaming
- `openai` — OpenAI-compatible providers
- `@google/generative-ai` — Gemini
- `marked` + `marked-terminal` — TTY markdown
- `picocolors` — Colors

<!-- MANUAL: -->
