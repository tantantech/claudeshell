<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-03 | Updated: 2026-04-03 -->

# scripts

## Purpose
Build and CI automation scripts.

## Key Files

| File | Description |
|------|-------------|
| `ci-test.sh` | Full CI validation — build + test + artifact checks |
| `build-binaries.sh` | Cross-platform binary builds for distribution |

## For AI Agents

### Working In This Directory
- Scripts are bash — ensure POSIX compatibility
- `ci-test.sh` is the source of truth for CI validation
- Run `./scripts/ci-test.sh` before releasing

<!-- MANUAL: -->
