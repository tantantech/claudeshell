---
phase: quick
plan: 260405-j9w
subsystem: prompt-config
tags: [wizard, p10k, configuration, theme]
dependency_graph:
  requires: [prompt-config, templates, builtins]
  provides: [wizard]
  affects: [config, builtins, prompt-config]
tech_stack:
  added: []
  patterns: [sequential-wizard, immutable-config-accumulation]
key_files:
  created:
    - src/wizard.ts
  modified:
    - src/config.ts
    - src/prompt-config.ts
    - src/builtins.ts
decisions:
  - Wizard uses 12 sequential steps matching p10k flow
  - Separator/head style steps auto-skip for non-powerline templates
  - Icon density step auto-skips for ascii mode
  - All settings saved atomically at confirmation step
metrics:
  duration: 3min
  completed: 2026-04-05
  tasks: 3
  files: 4
---

# Quick Task 260405-j9w: Add Full P10k-Style Configuration Wizard

12-step sequential configuration wizard mirroring Powerlevel10k's guided setup with visual previews, font detection gating, and atomic config save.

## What Was Done

### Task 1: Extend NeshConfig and prompt-config types (b09c738)
- Added 8 new fields to `NeshConfig`: separator style, head style, height, spacing, icon density, flow, transient, time format
- Added validation for all new fields in `loadConfig()` with union-type and boolean checks
- Added `SEPARATOR_STYLES` map (angled, vertical, slanted, round) with powerline glyphs
- Added `HEAD_STYLES` map (sharp, blurred, slanted, round) with head/tail decorations
- Added `getSeparatorStyle()` lookup function with angled fallback
- Exported `WizardConfig` interface grouping all wizard-settable fields

### Task 2: Create p10k-style wizard (bd04aa9)
- Created `src/wizard.ts` (444 lines) with 12 sequential steps:
  1. Font Detection (diamond glyph test, falls through to unicode/ascii test)
  2. Prompt Style (template selection filtered by icon mode)
  3. Color Scheme (with color swatches)
  4. Time Format (none/12h/24h)
  5. Separator Style (with visual previews, powerline-only)
  6. Head/Tail Style (powerline-only)
  7. Prompt Height (one-line/two-line with previews)
  8. Prompt Spacing (compact/sparse)
  9. Icon Density (few/many, skipped for ascii)
  10. Prompt Flow (concise/fluent)
  11. Transient Prompt (yes/no)
  12. Confirmation (full settings summary + live preview)
- Press q at any step to cancel gracefully
- Immutable config accumulation (spread pattern at each step)
- Atomic save via `saveConfig()` only at confirmation

### Task 3: Update theme menu (1dd1d96)
- Theme menu now shows [1] Configuration Wizard and [2] Quick Edit
- Quick Edit preserves existing template/colors/segments sub-menu
- `ThemeResult` extended with all new wizard fields
- Import wiring from builtins to wizard module

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all wizard steps are fully wired to config persistence.

## Verification

- `npx tsc --noEmit`: PASSED (zero errors)
- `npm run build`: PASSED (dist/cli.js 155KB)
- `npx vitest run`: 466 tests passed, 1 pre-existing failure in suggestions/renderer.test.ts (unrelated vi.mock hoisting issue)

## Self-Check: PASSED
