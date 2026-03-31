# Technology Stack

**Project:** ClaudeShell - AI-native interactive terminal shell
**Researched:** 2026-03-31

## Recommended Stack

### Core AI Engine

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@anthropic-ai/claude-agent-sdk` | ^0.2.x | AI agent loop, tool use, streaming | Official SDK that powers Claude Code itself. Provides `query()` async generator for streaming, built-in tools (Read, Edit, Bash, Glob, Grep), session management, and permission modes. This IS the product's core -- everything else is plumbing. | HIGH |

**Key API surface:**
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "user input here",
  options: {
    allowedTools: ["Read", "Edit", "Bash", "Glob", "Grep"],
    permissionMode: "acceptEdits",
    systemPrompt: "You are ClaudeShell...",
    // Sessions for multi-turn context
  }
})) {
  // Stream messages to terminal
}
```

**Prerequisites:** Node.js 18+, `ANTHROPIC_API_KEY` env var (also supports Bedrock/Vertex/Azure auth).

### Runtime & Language

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Node.js | 22 LTS | Runtime | Required by Claude Agent SDK. v22 is current LTS with native ESM, top-level await, and stable `node:readline` APIs. | HIGH |
| TypeScript | ^5.7 | Type safety | Claude Agent SDK is TypeScript-native. Strict mode catches bugs at compile time. The SDK ships its own type definitions. | HIGH |

### Terminal I/O & REPL

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `node:readline/promises` | (built-in) | Line input, history, tab completion | Built into Node.js, zero dependencies. Provides `createInterface()` with prompt, history, and completer support. For a shell REPL, this is the right abstraction -- lightweight, no framework overhead. | HIGH |
| `node:child_process` | (built-in) | Execute pass-through shell commands | `spawn()` with `{ stdio: 'inherit' }` for transparent command execution. Handles pipes, signals, exit codes natively. | HIGH |

**Why NOT Ink/React:** Ink is excellent for structured CLI UIs (forms, spinners, layouts). ClaudeShell is a *shell* -- it needs raw line-by-line I/O, not a component tree. Ink would add 50+ dependencies for something `readline` does natively. The AI output is just streamed text, not interactive widgets.

**Why NOT node-pty:** node-pty is for building terminal *emulators* (like VS Code's integrated terminal). ClaudeShell runs *inside* a terminal -- it doesn't need to emulate one. node-pty adds native compilation complexity (node-gyp) for zero benefit here.

**Why NOT Inquirer.js:** Inquirer is for structured prompts (select from list, confirm yes/no). ClaudeShell is a free-form REPL. Inquirer would fight the interaction model.

### Terminal Output & Formatting

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `picocolors` | ^1.1 | ANSI color output | 10x faster than chalk, 14x smaller (7KB vs 101KB), zero dependencies. For a shell that renders every line of AI output, load time and per-call performance matter. | HIGH |
| `marked` + `marked-terminal` | ^15 / ^7 | Markdown rendering in terminal | Claude responses contain markdown. `marked-terminal` renders it with proper formatting (bold, code blocks, lists) directly in the terminal. Battle-tested combo. | MEDIUM |

**Why NOT chalk:** Chalk is 101KB with slower load time (6ms vs 0.5ms). In a shell that starts on every terminal session, startup speed matters. Picocolors has the same API surface we need (bold, dim, red, green, cyan).

### Build & Development

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `tsdown` | ^0.14 | TypeScript bundler | Spiritual successor to tsup (which is no longer maintained). Powered by Rolldown (Rust-based). Zero-config, produces ESM + CJS, generates .d.ts. For a CLI tool, single-file output with bundled deps is ideal. | MEDIUM |
| `tsx` | ^4.x | Dev-time TypeScript execution | Run .ts files directly during development without a build step. Used by the Claude Agent SDK quickstart itself. Fast (esbuild-based). | HIGH |
| `vitest` | ^3.x | Testing | Native TypeScript support, ESM-first, fast watch mode. The standard for new TS projects in 2025-2026. Jest requires more config for ESM/TS. | HIGH |

**Why NOT tsup:** tsup is no longer actively maintained. The maintainer recommends tsdown as the successor. Migrate now rather than accumulate tech debt.

**Why NOT esbuild directly:** esbuild is the engine, not the tool. tsdown/tsup wrap it with .d.ts generation, watch mode, and sensible defaults. Direct esbuild config is unnecessary boilerplate for a CLI project.

### CLI Packaging & Distribution

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| npm `bin` field | (package.json) | CLI entry point | Standard npm mechanism. `"bin": { "claudeshell": "./dist/cli.js" }` makes the shell available as a command after `npm install -g`. | HIGH |
| `#!/usr/bin/env node` | - | Shebang for CLI | Standard Node.js CLI convention. Required for the `bin` field to work. | HIGH |

### Configuration & Persistence

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `node:fs/promises` | (built-in) | Config file I/O | Read/write JSON config files. No library needed for simple config. | HIGH |
| XDG Base Directory | (convention) | Config location | `~/.config/claudeshell/config.json` on Linux, `~/Library/Application Support/claudeshell/` on macOS. Use `env.XDG_CONFIG_HOME` with fallback. | HIGH |
| `dotenv` | ^16.x | Environment variable loading | Load `.env` files for API keys. Claude Agent SDK expects `ANTHROPIC_API_KEY` in env. | HIGH |
| `node:fs` (append) | (built-in) | Command history | Append-only history file at `~/.claudeshell_history`. readline has built-in history support -- just persist it to disk. | HIGH |

### Process & Signal Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `node:process` | (built-in) | Signal handling, exit codes | Handle SIGINT (Ctrl+C) gracefully during AI queries, SIGTSTP (Ctrl+Z) for backgrounding. Critical for shell UX. | HIGH |

## Supporting Libraries (use when needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^3.23 | Input validation | Validating config files, CLI arguments. Already a dependency of Claude Agent SDK. | 
| `ora` | ^8.x | Spinner/loading indicator | Show "thinking..." while waiting for first AI token. Small, focused library. |
| `which` | ^5.x | Command existence checking | Verify commands exist before pass-through execution. Optional -- can use `child_process` directly. |
| `glob` | ^11.x | File glob patterns | Only if implementing custom tab completion for file paths beyond readline defaults. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| AI SDK | Claude Agent SDK | Raw Anthropic API (`@anthropic-ai/sdk`) | Agent SDK provides the full tool-use loop, file access, command execution. Raw API would require reimplementing all of that. |
| REPL | `node:readline/promises` | Ink (React for CLI) | Ink is a UI framework; we need a REPL. Wrong abstraction level. |
| REPL | `node:readline/promises` | `node:repl` module | `node:repl` is designed for JavaScript REPLs with eval. We need a command shell, not a JS evaluator. |
| Terminal | Direct terminal (run inside existing) | node-pty | node-pty emulates terminals. We run inside one. Adds native compilation burden. |
| Colors | picocolors | chalk | Slower load, larger bundle. No features we need that picocolors lacks. |
| Colors | picocolors | ansis | ansis is excellent but picocolors has wider adoption and is sufficient for our needs. |
| Bundler | tsdown | tsup | tsup is unmaintained. tsdown is the official successor. |
| Bundler | tsdown | Rollup | More config, less TypeScript-focused. tsdown wraps Rolldown with better defaults. |
| Testing | vitest | jest | Jest needs extra config for ESM + TypeScript. Vitest works out of the box. |
| Shell scripting | `node:child_process` | Google zx | zx is for shell scripts, not for building shells. We need fine-grained control over process spawning. |
| Config | XDG + JSON | cosmiconfig | Over-engineered for a single config file. We know exactly where config lives. |

## Installation

```bash
# Core dependencies
npm install @anthropic-ai/claude-agent-sdk picocolors dotenv marked marked-terminal

# Dev dependencies  
npm install -D typescript tsx tsdown vitest @types/node zod
```

## Project Structure (recommended)

```
claudeshell/
  src/
    cli.ts              # Entry point, shebang, arg parsing
    shell.ts            # REPL loop, readline setup
    ai.ts               # Claude Agent SDK integration
    passthrough.ts      # System command execution
    config.ts           # Configuration loading/saving
    history.ts          # Command history persistence
    output.ts           # Terminal output formatting (colors, markdown)
    types.ts            # Shared type definitions
  tests/
    shell.test.ts
    ai.test.ts
    passthrough.test.ts
    config.test.ts
  package.json
  tsconfig.json
  tsdown.config.ts
  vitest.config.ts
```

## Sources

- [Claude Agent SDK - npm](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) - Official package, v0.2.87
- [Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) - Full API docs
- [Agent SDK Quickstart](https://platform.claude.com/docs/en/agent-sdk/quickstart) - Setup guide
- [Agent SDK Streaming](https://platform.claude.com/docs/en/agent-sdk/streaming-output) - Streaming patterns
- [picocolors](https://github.com/alexeyraspopov/picocolors) - Terminal colors benchmarks
- [tsdown](https://tsdown.dev/guide/) - Bundler documentation
- [Vitest](https://vitest.dev/) - Testing framework
- [Node.js readline](https://nodejs.org/api/repl.html) - Built-in REPL module docs
