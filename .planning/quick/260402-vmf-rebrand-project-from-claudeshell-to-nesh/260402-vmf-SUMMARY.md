---
phase: quick
plan: 260402-vmf
subsystem: all
tags: [rebrand, rename]
key-files:
  modified:
    - src/config.ts
    - src/types.ts
    - src/ai.ts
    - src/cli.ts
    - src/shell.ts
    - src/chat.ts
    - src/pipe.ts
    - src/prompt.ts
    - src/templates.ts
    - src/history.ts
    - package.json
    - README.md
    - CLAUDE.md
    - .github/workflows/release.yml
    - scripts/build-binaries.sh
    - scripts/ci-test.sh
    - landing/src/app/layout.tsx
    - landing/src/components/landing/hero.tsx
    - landing/src/components/landing/nav.tsx
    - landing/src/components/landing/footer.tsx
    - landing/src/components/landing/cta.tsx
    - landing/src/components/landing/terminal-demo.tsx
    - landing/src/components/landing/features.tsx
    - landing/src/components/landing/how-it-works.tsx
    - tests/ai-permissions.test.ts
    - tests/config.test.ts
    - tests/shell-context.test.ts
    - tests/templates.test.ts
    - tests/prompt.test.ts
    - tests/history.test.ts
    - tests/builtins.test.ts
    - tests/shell.integration.test.ts
decisions:
  - "Brand split in nav/footer logo: ne<span>sh</span> matching original claude<span>shell</span> pattern"
metrics:
  duration: 5min
  completed: 2026-04-02
---

# Quick Task 260402-vmf: Rebrand claudeshell to nesh - Summary

Complete project rebrand from claudeshell to nesh across 32 files with zero type errors and all unit tests passing.

## What Was Done

### Task 1: Source code rebrand (TypeScript)
- Renamed `ClaudeShellConfig` to `NeshConfig` in config.ts, shell.ts, chat.ts
- Renamed `ClaudeShellPermission` to `NeshPermission` in types.ts, ai.ts
- Updated system prompt: "You are Nesh" (was "You are ClaudeShell")
- Updated version string: `nesh v${version}` (was `claudeshell v${version}`)
- Updated error messages: "Nesh error" / "Nesh fatal error"
- Updated config paths: `~/.nesh/config.json`, `.nesh.json`
- Updated history file: `.nesh_history`
- Updated all prompt templates (minimal, classic, powerline, hacker, pastel)

### Task 2: Project config rebrand
- package.json: name `nesh`, bin `nesh`, repo URL `tantantech/nesh`
- README.md: complete rebrand with new install commands, config paths, URLs
- CLAUDE.md: all references updated
- CI/CD: artifact names `nesh-*` in release.yml
- Build script: binary name `nesh-*`, SEA comments updated
- CI test script: version regex updated to match `nesh v*`

### Task 3: Landing page rebrand
- Layout metadata: "Nesh" titles
- Nav logo: `ne<span>sh</span>` (brand split style)
- Footer logo: same brand split pattern
- Hero: install command `npm install -g nesh`, GitHub link to `tantantech/nesh`
- CTA: install command and links updated
- Terminal demo: PromptSegment text and title bar
- Features: "Nesh delegates" (was "ClaudeShell delegates")
- How It Works: "Nesh classifies it" (was "ClaudeShell classifies it")

### Task 4: Test files rebrand
- Updated 8 test files with renamed types, config paths, and assertion strings
- All test description strings updated to match new names

## Verification

- `npx tsc --noEmit`: PASS (zero type errors)
- `npx vitest run`: 225/231 tests pass, 16/17 test files pass
- 6 failing tests in `shell.integration.test.ts` are pre-existing (verified by running original code before rebrand -- same failures due to empty stdout from subprocess spawning in this environment)

## Deviations from Plan

None - plan executed exactly as written. Task 5 (GitHub repo rename) skipped per orchestrator instruction.

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| 0cd2553 | feat: rebrand claudeshell to nesh | 32 files |

## Known Stubs

None.

## Self-Check: PASSED
