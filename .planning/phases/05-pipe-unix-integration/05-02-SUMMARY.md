---
phase: 05-pipe-unix-integration
plan: 02
subsystem: shell
tags: [error-recovery, ai-fix, cli, typescript]

requires:
  - phase: 04-sessions-cost
    provides: executeAI, ShellState, session context, cost accumulation
provides:
  - buildFixPrompt and parseFixResponse utilities in ai.ts
  - lastSuggestedFix field on ShellState
  - Auto-fix suggestion on command failure in shell.ts
  - "a fix" command to execute suggested fix
affects: [05-pipe-unix-integration]

tech-stack:
  added: []
  patterns: [auto-fix-suggestion-on-error, fix-command-shortcut]

key-files:
  created: []
  modified: [src/types.ts, src/ai.ts, src/shell.ts, tests/ai.test.ts]

key-decisions:
  - "Skip auto-fix AI call when no API key is configured to avoid blocking in CI/test environments"
  - "Use break inside switch to exit passthrough case early when no API key present"

patterns-established:
  - "Error recovery pattern: command fails -> AI suggests fix -> user types 'a fix' to execute"
  - "parseFixResponse strips backticks, leading $, and handles NO_FIX sentinel"

requirements-completed: [ERR-04, ERR-05]

duration: 3min
completed: 2026-04-02
---

# Phase 05 Plan 02: Error Recovery Summary

**Auto error recovery with AI fix suggestions and 'a fix' shortcut command using buildFixPrompt/parseFixResponse in ai.ts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-02T18:33:24Z
- **Completed:** 2026-04-02T18:37:50Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended ShellState with lastSuggestedFix field for storing AI-suggested fixes
- Added buildFixPrompt() and parseFixResponse() utilities with full test coverage (8 new tests)
- Wired auto-fix suggestion flow into shell.ts passthrough error handling
- Added 'a fix' exact-match command to execute the last suggested fix

## Task Commits

Each task was committed atomically:

1. **Task 1: Add lastSuggestedFix to ShellState and create fix prompt utilities** - `3f02408` (feat)
2. **Task 2: Wire error recovery and 'a fix' command into shell.ts** - `62ed923` (feat)

## Files Created/Modified
- `src/types.ts` - Added lastSuggestedFix field to ShellState interface
- `src/ai.ts` - Added buildFixPrompt() and parseFixResponse() exported functions
- `src/shell.ts` - Wired auto-fix suggestion on error, 'a fix' command, API key guard
- `tests/ai.test.ts` - Added 8 tests for buildFixPrompt and parseFixResponse

## Decisions Made
- Skip auto-fix AI call when no API key is configured -- prevents blocking/errors in CI and test environments
- Use resolveApiKey check before attempting fix call rather than letting executeAI handle the error (cleaner UX, no spurious error messages)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added API key guard before auto-fix AI call**
- **Found during:** Task 2 (wire error recovery)
- **Issue:** Auto-fix AI call would write "Set ANTHROPIC_API_KEY..." error to stderr when no key present, polluting error output in CI/test environments
- **Fix:** Added resolveApiKey check before attempting fix call; break early if no key
- **Files modified:** src/shell.ts
- **Verification:** All 167 unit tests pass; pre-existing integration test failures confirmed unrelated
- **Committed in:** 62ed923 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential for correct behavior without API key. No scope creep.

## Issues Encountered
- Pre-existing integration test failures (6 tests in shell.integration.test.ts) confirmed by running tests on clean stash -- not caused by this plan's changes

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Error recovery foundation complete
- Ready for plan 03 (next in pipe-unix-integration phase)
- lastSuggestedFix available for future enhancements (e.g., auto-retry, fix history)

---
*Phase: 05-pipe-unix-integration*
*Completed: 2026-04-02*
