---
phase: 01-shell-foundation
plan: 02
subsystem: shell
tags: [builtins, cd, export, history, tdd, vitest]

requires:
  - phase: 01-shell-foundation-01
    provides: "types.ts with CdState, ShellState, BuiltinName"
provides:
  - "Shell builtin handlers: executeCd, executeExport, expandTilde"
  - "History persistence: loadHistory, saveHistory, shouldSaveToHistory"
  - "HISTORY_PATH and MAX_HISTORY constants"
affects: [01-shell-foundation-03, 01-shell-foundation-04]

tech-stack:
  added: []
  patterns: [immutable-state-updates, tdd-red-green, pure-functions-with-side-effects-isolated]

key-files:
  created: [src/builtins.ts, src/history.ts, tests/builtins.test.ts, tests/history.test.ts]
  modified: [tsconfig.json]

key-decisions:
  - "cd returns immutable CdState with previousDir tracking"
  - "History uses synchronous fs for simplicity (shell startup/shutdown)"
  - "shouldSaveToHistory trims for duplicate comparison"

patterns-established:
  - "Immutable state: functions return new state objects, never mutate input"
  - "Error-as-return: builtins return error strings instead of throwing"
  - "TDD: tests written first, verified failing, then implementation"

requirements-completed: [SHELL-03, SHELL-06, SHELL-07, SHELL-08, ERR-03]

duration: 4min
completed: 2026-03-31
---

# Phase 01 Plan 02: Builtins and History Summary

**Shell builtins (cd with tilde/OLDPWD/HOME, export) and history persistence (load/save/filter) as pure testable modules**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-31T08:30:28Z
- **Completed:** 2026-03-31T08:35:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- executeCd handles all edge cases: no args (HOME), dash (OLDPWD), tilde expansion, invalid paths with immutable state updates
- executeExport parses KEY=VALUE format with proper error handling
- History loads from file, saves to file with parent dir creation, filters space-prefixed and consecutive duplicates
- 35 total tests passing across both modules (18 builtins + 17 history)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement cd, export, and clear builtins with tests** - `6f155da` (feat)
2. **Task 2: Implement history persistence with tests** - `286dd2e` (feat)

## Files Created/Modified
- `src/builtins.ts` - Shell builtin handlers: executeCd, executeExport, expandTilde
- `src/history.ts` - History persistence: loadHistory, saveHistory, shouldSaveToHistory
- `tests/builtins.test.ts` - 18 tests covering all cd/export/tilde edge cases
- `tests/history.test.ts` - 17 tests covering load/save/filter/constants
- `tsconfig.json` - Added "types": ["node"] for node module resolution

## Decisions Made
- cd returns immutable CdState with previousDir tracking (spread operator, never mutate)
- History uses synchronous fs (readFileSync/writeFileSync) for simplicity at shell startup/shutdown
- shouldSaveToHistory trims both current and previous line for duplicate comparison
- expandTilde is a separate exported function for reuse outside cd

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added "types": ["node"] to tsconfig.json**
- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** TypeScript could not resolve node: protocol imports (node:fs, node:path, node:os) or process global
- **Fix:** Added `"types": ["node"]` to tsconfig compilerOptions
- **Files modified:** tsconfig.json
- **Verification:** `npx tsc --noEmit` passes clean
- **Committed in:** 286dd2e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for TypeScript compilation. No scope creep.

## Issues Encountered
- macOS /tmp symlink (/var vs /private/var) caused test assertion failures - resolved with fs.realpathSync in test setup

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Builtins and history modules ready for integration into REPL loop (Plan 03/04)
- Types from Plan 01 (CdState) successfully imported and used
- All functions are pure/testable with side effects isolated to process.chdir and process.env

---
## Self-Check: PASSED

- All 4 created files exist on disk
- Both task commits (6f155da, 286dd2e) found in git log
- 35 tests pass, tsc --noEmit clean

*Phase: 01-shell-foundation*
*Completed: 2026-03-31*
