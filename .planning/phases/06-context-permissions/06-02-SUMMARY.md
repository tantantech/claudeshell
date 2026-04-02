---
phase: 06-context-permissions
plan: 02
subsystem: ai, permissions
tags: [claude-agent-sdk, permissions, canUseTool, system-prompt, project-context]

requires:
  - phase: 06-context-permissions plan 01
    provides: ProjectContext type, detectProject, ShellState.permissionMode/projectContext fields, config permissions field
provides:
  - Permission-aware AI execution with SDK permissionMode mapping
  - Project context enrichment in AI system prompt
  - canUseTool interactive callback for ask mode
  - /permissions slash command in chat mode
affects: [07-pty-interactive]

tech-stack:
  added: []
  patterns: [SDK permission mode mapping, non-TTY permission guard, one-shot readline for permission prompts]

key-files:
  created:
    - tests/ai-permissions.test.ts
  modified:
    - src/ai.ts
    - src/chat.ts
    - tests/chat.test.ts

key-decisions:
  - "Use static imports with vi.mock for SDK testing instead of vi.resetModules with dynamic imports"
  - "Format permission prompt as 'Claude wants to [action] [target]. Allow? (y/n)' using SDK title field with fallback"
  - "Non-TTY stdin forces ask mode to auto to prevent hanging in piped mode"

patterns-established:
  - "Permission mode mapping: auto->acceptEdits, ask->default, deny->plan"
  - "canUseTool uses one-shot readline interface per prompt to avoid deadlocking main readline"

requirements-completed: [PERM-01, PERM-02, PERM-03, CTX-01]

duration: 6min
completed: 2026-04-02
---

# Phase 6 Plan 2: Permission-Aware AI Pipeline & /permissions Command Summary

**SDK permission mode mapping (auto/ask/deny), project context in system prompt, canUseTool interactive callback, and /permissions slash command**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-02T19:35:18Z
- **Completed:** 2026-04-02T19:41:35Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Permission modes correctly map to SDK options (auto->acceptEdits, ask->default, deny->plan)
- System prompt includes project context summary when available
- canUseTool callback prompts user inline with y/n for ask mode, with re-prompt on invalid input
- Non-TTY mode forces ask to auto to prevent hanging in piped scenarios
- /permissions slash command shows current mode and sets new mode in chat

## Task Commits

Each task was committed atomically:

1. **Task 1: Permission mode mapping and system prompt enrichment in ai.ts** - `ef61923` (feat)
2. **Task 2: /permissions slash command in chat.ts** - `7533767` (feat)

## Files Created/Modified
- `src/ai.ts` - Added toSDKPermissionMode, updated buildSystemPrompt with project context, createCanUseTool callback, updated executeAI options
- `src/chat.ts` - Extended SlashCommandResult type, added /permissions parsing and handling, updated help text
- `tests/ai-permissions.test.ts` - 12 tests covering permission mapping, system prompt, and executeAI integration
- `tests/chat.test.ts` - 6 new tests for /permissions slash command variants

## Decisions Made
- Used static imports with vi.mock instead of vi.resetModules + dynamic imports for reliable SDK mock access in tests
- Non-TTY stdin forces ask mode to auto (Pitfall 5 from research) to prevent hanging when piped
- canUseTool uses one-shot readline.createInterface per prompt to avoid deadlocking the main readline interface

## Deviations from Plan

None - plan executed exactly as written. The permissionMode and projectContext were already being passed to executeAI from runChatMode (done in Plan 01), so Task 2 step 4 was already satisfied.

## Issues Encountered
- Vitest mock isolation: dynamic imports after vi.resetModules() caused SDK mock instances to diverge between test code and ai.ts internal dynamic import. Resolved by switching to static imports with top-level vi.mock().

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Permission control fully wired into AI pipeline
- Chat mode supports runtime permission changes via /permissions
- Ready for Phase 07 (PTY/interactive) or any remaining Phase 06 plans

## Self-Check: PASSED

- All 4 created/modified files exist on disk
- Commit ef61923 (Task 1) verified in git log
- Commit 7533767 (Task 2) verified in git log
- All 50 tests pass (ai-permissions: 12, chat: 21, ai: 17)
- TypeScript type check passes with zero errors

---
*Phase: 06-context-permissions*
*Completed: 2026-04-02*
