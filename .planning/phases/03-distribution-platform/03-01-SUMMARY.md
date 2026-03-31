---
phase: 03-distribution-platform
plan: 01
subsystem: config, distribution
tags: [npm, cli, config, tsdown, package.json]

requires:
  - phase: 02-ai-integration
    provides: resolveApiKey() config module, ai.ts consumer, shell.ts REPL
provides:
  - ClaudeShellConfig interface with api_key, model, history_size fields
  - loadConfig() reading ~/.claudeshell/config.json with defaults fallback
  - ensureConfigDir() for directory creation
  - npm-distributable package with bin, files, prepublishOnly
  - --version flag printing package version
affects: [03-distribution-platform]

tech-stack:
  added: [createRequire for package.json version reading]
  patterns: [type-narrowed JSON config parsing, tsdown ESM build with rename]

key-files:
  created: []
  modified: [src/config.ts, src/cli.ts, src/ai.ts, src/shell.ts, package.json, tests/config.test.ts, tests/ai.test.ts]

key-decisions:
  - "Type-narrow each config field individually rather than casting entire object"
  - "Rename dist/cli.mjs to dist/cli.js post-build since tsdown lacks --out-extension flag"
  - "Use createRequire to read package.json version at runtime in ESM context"

patterns-established:
  - "Config loading: JSON file with type narrowing per field, stderr warnings on parse errors"
  - "Build pipeline: tsdown ESM + mv rename for .js extension compatibility"

requirements-completed: [CONF-03, PLAT-03]

duration: 3min
completed: 2026-03-31
---

# Phase 03 Plan 01: Config File & npm Distribution Summary

**Full config file support at ~/.claudeshell/config.json with typed schema, plus npm-distributable package producing dist/cli.js with shebang and --version flag**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-31T09:28:37Z
- **Completed:** 2026-03-31T09:31:52Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Extended config.ts with ClaudeShellConfig interface, loadConfig(), resolveApiKey(config), ensureConfigDir()
- Wired config into ai.ts and shell.ts consumers (history_size from config)
- Configured package.json with files, prepublishOnly, build script producing dist/cli.js
- Added --version flag to CLI entry point
- npm pack produces clean 14.5KB tarball with only dist/cli.js and package.json

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend config module (RED)** - `c5aff10` (test)
2. **Task 1: Extend config module (GREEN)** - `00416c5` (feat)
3. **Task 2: npm distribution and --version** - `87d99d6` (feat)

_TDD task had separate test and implementation commits._

## Files Created/Modified
- `src/config.ts` - Full config loader with ClaudeShellConfig interface, loadConfig, resolveApiKey, ensureConfigDir
- `src/cli.ts` - Added --version/-v flag using createRequire
- `src/ai.ts` - Updated to use loadConfig() + resolveApiKey(config)
- `src/shell.ts` - Updated to use config.history_size for readline
- `package.json` - Added files, prepublishOnly, updated build script
- `tests/config.test.ts` - 11 tests for loadConfig, resolveApiKey, ensureConfigDir
- `tests/ai.test.ts` - Updated mock to include loadConfig export

## Decisions Made
- Type-narrow each config field individually (typeof checks) rather than casting the entire parsed object -- safer against unexpected JSON shapes
- Rename dist/cli.mjs to dist/cli.js via post-build mv since tsdown 0.21 lacks --out-extension flag -- ensures bin field works correctly
- Use createRequire from node:module to read package.json version at runtime in ESM context

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed ai.test.ts mock missing loadConfig export**
- **Found during:** Task 1 (full test suite verification)
- **Issue:** ai.test.ts mocked config.js with only resolveApiKey, missing new loadConfig export
- **Fix:** Added loadConfig to the vi.mock factory in ai.test.ts
- **Files modified:** tests/ai.test.ts
- **Verification:** All 109 tests pass
- **Committed in:** 00416c5 (part of Task 1 commit)

**2. [Rule 3 - Blocking] Fixed tsdown .mjs output extension mismatch**
- **Found during:** Task 2 (build verification)
- **Issue:** tsdown produces cli.mjs but bin field expects cli.js; --out-extension flag not available in tsdown 0.21
- **Fix:** Added post-build mv command: `&& mv dist/cli.mjs dist/cli.js`
- **Files modified:** package.json
- **Verification:** dist/cli.js exists with shebang, npm pack shows correct files
- **Committed in:** 87d99d6 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## Known Stubs
None - all functionality is fully wired.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Config and distribution infrastructure complete
- Ready for Phase 03 Plan 02 (cross-platform validation or further distribution work)
- Package can be installed globally via `npm install -g` after publish

## Self-Check: PASSED

All 7 files verified present. All 3 commits verified in git log.

---
*Phase: 03-distribution-platform*
*Completed: 2026-03-31*
