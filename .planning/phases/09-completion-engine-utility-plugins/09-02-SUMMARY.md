---
phase: 09-completion-engine-utility-plugins
plan: 02
subsystem: completions
tags: [readline, tab-completion, plugin-dispatch, cache, timeout]

requires:
  - phase: 09-01
    provides: CompletionContext, CompletionResult, CompletionCache, compgenComplete, resolveFromSpec types and utilities
provides:
  - Central completion engine dispatcher (createCompletionEngine)
  - PluginManifest extended with completions and completionSpecs fields
  - PluginRegistry extended with getCompletionProvider and getCompletionSpecs lookups
  - Shell.ts wired with readline async completer callback
affects: [09-03, plugin-development]

tech-stack:
  added: []
  patterns: [priority-chain-dispatch, promise-race-timeout, async-readline-completer]

key-files:
  created:
    - src/completions/engine.ts
    - tests/completions/engine.test.ts
  modified:
    - src/plugins/types.ts
    - src/plugins/registry.ts
    - src/shell.ts
    - tests/plugins/registry.test.ts

key-decisions:
  - "Async completer (not callback-style) for readline/promises compatibility"
  - "Provider map keyed by plugin.name; spec map keyed by spec.name; both first-wins"

patterns-established:
  - "Priority-chain dispatch: plugin provider -> Fig spec -> compgen fallback"
  - "Promise.race timeout pattern for slow completion providers"
  - "Cache key format: commandName:currentWord with 30s TTL"

requirements-completed: [COMP-01, COMP-02]

duration: 4min
completed: 2026-04-05
---

# Phase 09 Plan 02: Completion Engine Dispatcher Summary

**Central completion engine with plugin->spec->compgen dispatch chain, 1s timeout, 30s cache, wired into shell readline**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T10:01:32Z
- **Completed:** 2026-04-05T10:05:46Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Extended PluginManifest with optional completions and completionSpecs fields
- Extended PluginRegistry with O(1) getCompletionProvider and getCompletionSpecs lookups (first-plugin-wins)
- Built completion engine dispatcher with priority chain: plugin provider -> Fig-style spec -> compgen fallback
- Engine enforces 1s timeout on providers via Promise.race, caches results for 30s, never throws
- Wired engine into shell.ts via readline async completer -- Tab completion works end-to-end

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend PluginManifest and Registry with completion fields** - `71ac383` (feat)
2. **Task 2: Completion engine dispatcher and shell.ts wiring** - `56740bb` (feat)

## Files Created/Modified
- `src/completions/engine.ts` - Central completion dispatcher with cache, timeout, priority chain
- `src/plugins/types.ts` - Added completions and completionSpecs optional fields to PluginManifest
- `src/plugins/registry.ts` - Added getCompletionProvider/getCompletionSpecs with O(1) map lookups
- `src/shell.ts` - Wired async completer into readline.createInterface
- `tests/completions/engine.test.ts` - 8 tests covering dispatch, timeout, caching, error handling
- `tests/plugins/registry.test.ts` - 8 new tests for completion provider/spec lookup

## Decisions Made
- Used async completer (returns Promise) instead of callback-style, since shell uses readline/promises module
- Provider map keyed by plugin.name, spec map keyed by spec.name -- both use first-plugin-wins semantics per D-11

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Async completer instead of callback-style**
- **Found during:** Task 2 (shell.ts wiring)
- **Issue:** Plan specified callback-style completer but readline/promises uses Completer type returning Promise<CompleterResult>
- **Fix:** Changed to async completer returning Promise<[string[], string]> directly
- **Files modified:** src/shell.ts
- **Verification:** npx tsc --noEmit passes clean
- **Committed in:** 56740bb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Type-correct completer signature required for readline/promises. No scope creep.

## Issues Encountered
None beyond the type deviation above.

## Known Stubs
None - all completions are wired to real providers or compgen fallback.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Completion engine is fully wired and operational
- Ready for Plan 03: utility plugins that can register completionSpecs
- Plugin authors can now provide CompletionProvider or CompletionSpec[] in their manifests

---
*Phase: 09-completion-engine-utility-plugins*
*Completed: 2026-04-05*
