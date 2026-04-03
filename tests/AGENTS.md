<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-03 | Updated: 2026-04-03 -->

# tests

## Purpose
Vitest test suite covering all shell modules. Each source file in `src/` has a corresponding test file here.

## Key Files

| File | Description |
|------|-------------|
| `shell.integration.test.ts` | Integration tests for the full REPL loop |
| `shell-context.test.ts` | Shell context and project detection tests |
| `ai.test.ts` | AI streaming, abort, error handling tests |
| `ai-permissions.test.ts` | AI permission mode tests |
| `classify.test.ts` | Input classification tests |
| `builtins.test.ts` | cd, export, exit, theme tests |
| `passthrough.test.ts` | Shell command execution tests |
| `config.test.ts` | Config loading and API key resolution |
| `prompt.test.ts` | Prompt rendering tests |
| `renderer.test.ts` | Markdown rendering tests |
| `cost.test.ts` | Token counting and cost accumulation |
| `chat.test.ts` | Chat mode tests |
| `pipe.test.ts` | Pipe mode tests |
| `history.test.ts` | Command history tests |
| `interactive.test.ts` | Interactive command tests |
| `session.test.ts` | Session ID generation tests |
| `providers.test.ts` | Multi-provider registry and resolution tests |
| `settings.test.ts` | Settings menu tests |
| `templates.test.ts` | Prompt template tests |
| `context.test.ts` | Project context detection tests |

## For AI Agents

### Working In This Directory
- Test files mirror source files: `src/foo.ts` → `tests/foo.test.ts`
- Tests use Vitest — `describe`, `it`, `expect`, `vi.fn()`, `vi.mock()`
- Mock external dependencies (Agent SDK, file system) — don't call real APIs
- Follow TDD: write test first (RED), implement (GREEN), refactor

### Testing Requirements
- `npm test` runs all tests
- `npx vitest run tests/<name>.test.ts` for a single file
- `npx vitest run -t "test name"` for a single test
- Target 80%+ coverage

### Common Patterns
- Mock `process.env` for API key tests
- Mock `child_process.spawn` for passthrough tests
- Use `vi.mock()` at top of file for module mocks
- Test immutability: verify original state unchanged after operations

## Dependencies

### Internal
- Imports from `../src/` modules under test

### External
- `vitest` — Test runner and assertions

<!-- MANUAL: -->
