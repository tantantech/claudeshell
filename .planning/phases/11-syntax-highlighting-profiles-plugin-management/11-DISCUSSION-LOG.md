# Phase 11: Syntax Highlighting, Profiles & Plugin Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-05
**Phase:** 11-syntax-highlighting-profiles-plugin-management
**Areas discussed:** Syntax highlighting, Profile definitions, Plugin CLI, Hot-reload, Git installation
**Mode:** Auto

---

## Syntax Highlighting Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Output-only keypress rewrite | Tokenize rl.line, overwrite visible line with ANSI colors, rl.line untouched | ✓ |
| Custom readline subclass | Override _writeToOutput for coloring | |
| External terminal library (blessed/ink) | Full TUI control | |

**User's choice:** [auto] Output-only keypress rewrite (recommended)

## Profile Definitions

| Option | Description | Selected |
|--------|-------------|----------|
| 5 additive curated profiles | core→developer→devops/cloud/ai-engineer hierarchy | ✓ |
| Single "recommended" list | One-size-fits-all | |
| User-defined profiles only | No curation | |

**User's choice:** [auto] 5 additive curated profiles (recommended)

## Plugin CLI Design

| Option | Description | Selected |
|--------|-------------|----------|
| plugin builtin with subcommands | list/enable/disable/install/update/remove/search/doctor/times/profile | ✓ |
| Separate commands per action | plugin-list, plugin-enable, etc. | |
| Config-only management | Edit config.json manually | |

**User's choice:** [auto] plugin builtin with subcommands (recommended)

## Hot-Reload Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Full registry rebuild | Re-run loadPluginsPhase1, replace registry and hookBus | ✓ |
| Incremental patch | Add/remove single plugin from existing registry | |
| Require restart | Like oh-my-zsh | |

**User's choice:** [auto] Full registry rebuild (recommended)

## Git Plugin Installation

| Option | Description | Selected |
|--------|-------------|----------|
| git clone + dynamic import | Clone to ~/.nesh/plugins/, import manifest, validate | ✓ |
| npm package install | npm install --prefix | |
| Download tarball | curl + extract | |

**User's choice:** [auto] git clone + dynamic import (recommended)

## Claude's Discretion

- compgen caching, worker threads, doctor formatting, git error handling

## Deferred Ideas

None.
