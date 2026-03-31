---
phase: 02-ai-integration
plan: 01
subsystem: ai
tags: [types, classifier, config, stderr-capture, anthropic-api]

requires:
  - phase: 01-shell-foundation
    provides: "Base types.ts, classify.ts, passthrough.ts modules"
provides:
  - "InputAction with 'ai' type for AI command routing"
  - "LastError interface for stderr capture context"
  - "ShellState with lastError and aiStreaming fields"
  - "resolveApiKey() for API key resolution (env + config file)"
  - "CommandResult with exitCode and stderr from passthrough"
affects: [02-02-ai-core, 02-03-shell-integration]

tech-stack:
  added: []
  patterns: [stderr-tee-capture, env-then-file-config-resolution]

key-files:
  created: [src/config.ts, tests/config.test.ts]
  modified: [src/types.ts, src/classify.ts, src/passthrough.ts, tests/classify.test.ts, tests/passthrough.test.ts]

key-decisions:
  - "Replace ai_placeholder with ai in InputAction union -- cleaner naming for production use"
  - "Stderr tee pattern: pipe stderr to buffer AND process.stderr for real-time display plus capture"
  - "Config resolution order: env var first, then ~/.claudeshell/config JSON file"

patterns-established:
  - "Stderr tee: spawn with ['inherit','inherit','pipe'] and on('data') writing to both buffer and process.stderr"
  - "Config fallback chain: environment variable > config file > undefined"

requirements-completed: [AI-01, CONF-01, CONF-02, ERR-01, ERR-02]

duration: 3min
completed: 2026-03-31
---

# Phase 02 Plan 01: AI Integration Contracts Summary

**Extended type contracts with ai action type, API key config resolution, and stderr tee capture pattern for error explanation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-31T09:03:14Z
- **Completed:** 2026-03-31T09:06:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Replaced ai_placeholder with production ai type in InputAction union and classifier
- Added LastError interface and extended ShellState with lastError/aiStreaming fields
- Created config.ts with resolveApiKey() supporting env var and config file fallback
- Updated passthrough to return CommandResult with stderr capture via tee pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend types, update classifier, add config module** - `f171ee6` (feat)
2. **Task 2: Update passthrough to capture stderr with tee pattern** - `c41fd6a` (feat)

## Files Created/Modified
- `src/types.ts` - Added LastError interface, extended ShellState, replaced ai_placeholder with ai
- `src/classify.ts` - Changed ai_placeholder return to ai type
- `src/config.ts` - New module: resolveApiKey() with env var and config file fallback
- `src/passthrough.ts` - Changed to return CommandResult with stderr tee capture
- `tests/classify.test.ts` - Updated for ai type, added apt-update and bare-a tests
- `tests/config.test.ts` - New: env var, config file, missing file, malformed file tests
- `tests/passthrough.test.ts` - Updated for CommandResult return type with stderr assertions

## Decisions Made
- Replace ai_placeholder with ai in InputAction union -- cleaner naming for production use
- Stderr tee pattern: pipe stderr to buffer AND process.stderr for real-time display plus capture
- Config resolution order: env var first, then ~/.claudeshell/config JSON file
- Silent failure on config read errors -- return undefined, no console output

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Known Stubs
None -- all implementations are complete and functional.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Type contracts stable for Plan 02 (AI core) and Plan 03 (shell integration)
- shell.ts still references old ai_placeholder and number return from executeCommand -- expected, will be updated in Plan 03
- resolveApiKey() ready for use by AI core module

---
*Phase: 02-ai-integration*
*Completed: 2026-03-31*
