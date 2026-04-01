# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

ClaudeShell — an AI-native terminal shell. Users type regular commands normally and prefix with `a` to invoke Claude (e.g., `a find all large files`). Built on the Claude Agent SDK for full tool-use capabilities (file read/write, command execution) with streaming responses.

## Commands

```bash
npm run dev          # Run shell in development (tsx, no build step)
npm run build        # Bundle to dist/cli.js via tsdown
npm test             # Run all tests (vitest)
npm run test:watch   # Watch mode

npx vitest run tests/prompt.test.ts          # Single test file
npx vitest run -t "executes echo command"    # Single test by name
npx tsc --noEmit                             # Type check without emitting

./scripts/ci-test.sh                         # Full CI validation (build + test + artifact checks)
```

## Architecture

```
cli.ts → shell.ts → classify.ts → route to:
                       ├── builtins.ts   (cd, export, exit, clear)
                       ├── passthrough.ts (spawn bash -c for regular commands)
                       └── ai.ts         (Claude Agent SDK for "a" prefix)
                            └── renderer.ts (markdown + tool visibility)
```

**Entry point:** `src/cli.ts` — handles `--version`, calls `runShell()`

**REPL loop:** `src/shell.ts` — manages `ShellState` (immutable), readline, signal handling, history load/save

**Input classification:** `src/classify.ts` — returns discriminated union: `builtin | passthrough | ai | empty`

**AI integration:** `src/ai.ts` — lazy-loads `@anthropic-ai/claude-agent-sdk`, streams via `query()` async generator, `AbortController` for Ctrl+C cancellation, error classification (auth/rate-limit/network/billing)

**Rendering:** `src/renderer.ts` — TTY mode buffers text then renders markdown via `marked` + `marked-terminal` on finish; non-TTY mode passes raw text through. Tool use displayed as dim status lines on stderr.

**Config:** `src/config.ts` — loads `~/.claudeshell/config.json` (optional), resolves API key from env var then config file

**Prompt:** `src/prompt.ts` — p10k-style powerline prompt with orange/white segments, git branch detection

## Key Patterns

- **Immutable state**: `ShellState` updated via spread: `state = { ...state, field: value }`. Never mutate.
- **Shell passthrough**: All non-builtin commands go to `spawn('bash', ['-c', cmd])`. Never parse shell syntax in JS.
- **Builtins**: Only `cd`, `export`, `exit`, `quit`, `clear` are intercepted — they must run in-process.
- **Lazy SDK loading**: `@anthropic-ai/claude-agent-sdk` imported on first `a` command via dynamic `import()` to keep startup fast.
- **Signal handling**: Ctrl+C during AI streaming aborts via `AbortController`; during command execution, SIGINT forwards to child; at idle prompt, clears line.
- **Error context**: Failed commands store `LastError` (command, stderr, exitCode) in state for `a explain` shortcut.

## Tech Stack

- **Runtime**: Node.js 22+ (ESM, `"type": "module"`)
- **Language**: TypeScript 6 with strict mode
- **AI**: `@anthropic-ai/claude-agent-sdk` (not raw Anthropic API)
- **Build**: tsdown (Rolldown-based, produces single `dist/cli.js` with shebang)
- **Test**: Vitest
- **Colors**: picocolors (prompt uses raw ANSI 256-color for powerline segments)
- **Markdown**: marked + marked-terminal

## npm Distribution

- `"bin": { "claudeshell": "dist/cli.js" }` — global install via `npm install -g claudeshell`
- `"files": ["dist"]` — only built output ships
- `prepublishOnly` runs build + test
- Shebang `#!/usr/bin/env node` preserved in built output
