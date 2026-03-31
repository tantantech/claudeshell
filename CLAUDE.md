<!-- GSD:project-start source:PROJECT.md -->
## Project

**ClaudeShell**

An AI-native shell that wraps Claude Code SDK to provide intelligent command-line assistance directly in the terminal. Users type an `a` command (e.g., `a find all large files`) and Claude processes the request in the background — no separate Claude Code UI needed. It behaves like a standard shell (zsh/bash replacement) but with AI superpowers baked in.

**Core Value:** Running AI-assisted commands feels as natural and fast as running normal shell commands — zero context switching, zero UI overhead.

### Constraints

- **Tech Stack**: TypeScript/Node.js — Claude Code SDK is TypeScript-based
- **SDK**: Must use Claude Code SDK (not raw Anthropic API) for full tool-use capabilities
- **Platform**: macOS primary, Linux secondary — no Windows for v1
- **Shell**: Must be usable as a login shell or launched from existing shell
- **Performance**: AI commands should start streaming within 2-3 seconds
- **Authentication**: Must support existing Claude/Anthropic API key setup
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core AI Engine
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@anthropic-ai/claude-agent-sdk` | ^0.2.x | AI agent loop, tool use, streaming | Official SDK that powers Claude Code itself. Provides `query()` async generator for streaming, built-in tools (Read, Edit, Bash, Glob, Grep), session management, and permission modes. This IS the product's core -- everything else is plumbing. | HIGH |
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
### Terminal Output & Formatting
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `picocolors` | ^1.1 | ANSI color output | 10x faster than chalk, 14x smaller (7KB vs 101KB), zero dependencies. For a shell that renders every line of AI output, load time and per-call performance matter. | HIGH |
| `marked` + `marked-terminal` | ^15 / ^7 | Markdown rendering in terminal | Claude responses contain markdown. `marked-terminal` renders it with proper formatting (bold, code blocks, lists) directly in the terminal. Battle-tested combo. | MEDIUM |
### Build & Development
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `tsdown` | ^0.14 | TypeScript bundler | Spiritual successor to tsup (which is no longer maintained). Powered by Rolldown (Rust-based). Zero-config, produces ESM + CJS, generates .d.ts. For a CLI tool, single-file output with bundled deps is ideal. | MEDIUM |
| `tsx` | ^4.x | Dev-time TypeScript execution | Run .ts files directly during development without a build step. Used by the Claude Agent SDK quickstart itself. Fast (esbuild-based). | HIGH |
| `vitest` | ^3.x | Testing | Native TypeScript support, ESM-first, fast watch mode. The standard for new TS projects in 2025-2026. Jest requires more config for ESM/TS. | HIGH |
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
# Core dependencies
# Dev dependencies  
## Project Structure (recommended)
## Sources
- [Claude Agent SDK - npm](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) - Official package, v0.2.87
- [Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) - Full API docs
- [Agent SDK Quickstart](https://platform.claude.com/docs/en/agent-sdk/quickstart) - Setup guide
- [Agent SDK Streaming](https://platform.claude.com/docs/en/agent-sdk/streaming-output) - Streaming patterns
- [picocolors](https://github.com/alexeyraspopov/picocolors) - Terminal colors benchmarks
- [tsdown](https://tsdown.dev/guide/) - Bundler documentation
- [Vitest](https://vitest.dev/) - Testing framework
- [Node.js readline](https://nodejs.org/api/repl.html) - Built-in REPL module docs
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
