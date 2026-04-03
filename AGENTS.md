<!-- Generated: 2026-04-03 | Updated: 2026-04-03 -->

# Nesh

## Purpose
AI-native terminal shell. Users type regular commands normally and prefix with `a` to invoke AI (e.g., `a find all large files`). Supports 30+ models across 15 providers. Built on the Claude Agent SDK with full tool-use capabilities.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Project manifest — `nesh` npm package, v0.2.0 |
| `tsconfig.json` | TypeScript 6 strict config, ESM output |
| `vitest.config.ts` | Vitest test configuration |
| `README.md` | Full documentation with install, usage, architecture |
| `CLAUDE.md` | AI agent guidance for this project |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | Shell source code — REPL, AI, providers, builtins (see `src/AGENTS.md`) |
| `tests/` | Vitest test suite (see `tests/AGENTS.md`) |
| `scripts/` | Build and CI scripts (see `scripts/AGENTS.md`) |
| `assets/` | Demo GIF, VHS tape, logo SVG (see `assets/AGENTS.md`) |
| `.github/` | GitHub Actions CI/CD (see `.github/AGENTS.md`) |
| `landing/` | Marketing website — Next.js 16 (see `landing/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- Runtime: Node.js 22+, ESM (`"type": "module"`)
- Build: `tsdown` bundles to single `dist/cli.js` with shebang
- AI SDK: Always use `@anthropic-ai/claude-agent-sdk`, never raw `anthropic`
- State is immutable: `ShellState` updated via spread, never mutate

### Testing Requirements
- `npm test` runs Vitest suite
- `npm run build` bundles for distribution
- `./scripts/ci-test.sh` for full CI validation

### Common Patterns
- Discriminated unions for input classification (`InputAction` type)
- Lazy dynamic `import()` for heavy dependencies (Agent SDK)
- `AbortController` for Ctrl+C cancellation of AI streams

## Dependencies

### External
- `@anthropic-ai/claude-agent-sdk` — Claude AI integration
- `openai` — OpenAI-compatible provider support
- `@google/generative-ai` — Gemini provider
- `marked` + `marked-terminal` — Markdown rendering in TTY
- `picocolors` — Terminal colors

<!-- MANUAL: -->
