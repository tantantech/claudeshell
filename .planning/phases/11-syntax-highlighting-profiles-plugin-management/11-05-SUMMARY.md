---
phase: 11-syntax-highlighting-profiles-plugin-management
plan: 05
subsystem: shell
tags: [highlighting, plugin-management, profiles, hot-reload, builtin, integration]

# Dependency graph
requires:
  - phase: 11-01
    provides: syntax highlighting renderer and tokenizer
  - phase: 11-02
    provides: profile system with expandProfile
  - phase: 11-03
    provides: plugin manager CLI with executePlugin
  - phase: 11-04
    provides: hot-reload with HotReloadResult
provides:
  - plugin builtin command wired into shell REPL
  - syntax highlighting on every keypress
  - first-run profile selector for new users
  - hot-reload callback updating registry/hookBus/enabledPlugins
  - all Phase 11 features coexisting (highlighting + suggestions + completions)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [keypress-handler-ordering, first-run-detection, hot-reload-callback]

key-files:
  created: []
  modified:
    - src/types.ts
    - src/classify.ts
    - src/shell.ts
    - tests/classify.test.ts

key-decisions:
  - "Highlighting keypress handler registered BEFORE suggestions for correct visual priority"
  - "First-run profile selector skipped in non-TTY mode to avoid breaking piped/test input"
  - "Hot-reload callback also refreshes command cache with new plugin aliases"

patterns-established:
  - "Keypress handler ordering: highlighting first, suggestions second"
  - "First-run detection via fs.accessSync + config check with TTY guard"

requirements-completed: [PROF-02, PROF-04]

# Metrics
duration: 4min
completed: 2026-04-05
---

# Phase 11 Plan 05: Shell Integration Summary

**Wired plugin builtin, syntax highlighting keypress handler, first-run profile selector, and hot-reload into the shell REPL**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T17:08:12Z
- **Completed:** 2026-04-05T17:27:03Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added 'plugin' as a builtin command routed to the plugin manager CLI
- Attached syntax highlighting keypress handler before suggestions for correct visual ordering
- Implemented first-run profile detection that shows profile selector when no plugins configured
- Connected hot-reload callback that replaces registry, hookBus, and enabled plugins in-place

## Task Commits

Each task was committed atomically:

1. **Task 1: Add plugin builtin and wire highlighting + first-run + hot-reload into shell** - `05aea25` (feat)
2. **Task 1 fix: Skip first-run in non-TTY mode** - `cfbb22d` (fix)
3. **Task 2: Verify all Phase 11 features end-to-end** - auto-approved (tsc clean, 569/569 tests pass, build succeeds)

## Files Created/Modified
- `src/types.ts` - Added 'plugin' to BuiltinName union type
- `src/classify.ts` - Added 'plugin' to BUILTINS set
- `src/shell.ts` - Four integration points: imports, highlighting setup, first-run detection, plugin builtin case, cleanup
- `tests/classify.test.ts` - Added 3 tests for plugin builtin classification

## Decisions Made
- Highlighting keypress handler registered BEFORE suggestions to ensure correct visual priority per Pattern 4 from research
- First-run profile selector guarded by TTY check -- interactive selection makes no sense in piped/test environments
- Hot-reload callback also calls addKnownCommands to keep highlighting cache in sync with new plugin aliases

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] First-run profile selector consuming test input in non-TTY mode**
- **Found during:** Task 2 (verification)
- **Issue:** Integration tests failed because first-run profile selector fired in non-TTY piped mode, consuming input meant for shell commands
- **Fix:** Added `process.stdout.isTTY` guard to first-run detection block
- **Files modified:** src/shell.ts
- **Verification:** All 569 tests pass after fix
- **Committed in:** cfbb22d

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential fix for test correctness. No scope creep.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all features fully wired with real data sources.

## Next Phase Readiness
- All Phase 11 features are complete and integrated
- Syntax highlighting, profiles, plugin management CLI, and hot-reload all work end-to-end
- Ready for next milestone phase

---
*Phase: 11-syntax-highlighting-profiles-plugin-management*
*Completed: 2026-04-05*
