---
phase: 08-plugin-engine-alias-system
verified: 2026-04-05T11:02:00Z
status: passed
score: 13/13 must-haves verified
---

# Phase 8: Plugin Engine & Alias System Verification Report

**Phase Goal:** Users can enable plugins that register aliases, and the shell expands those aliases transparently -- proven end-to-end with the git plugin (most popular OMZ plugin)
**Verified:** 2026-04-05T11:02:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Plugin manifest interface defines required and optional fields (name, version, description, aliases, dependencies, platform, permissions, hooks, init, destroy) | ✓ VERIFIED | `src/plugins/types.ts` exports `PluginManifest` with all fields at lines 15-27 |
| 2  | Registry provides O(1) alias lookup via Map | ✓ VERIFIED | `registry.ts:85` — `return aliasMap.get(firstWord)?.expansion` |
| 3  | User aliases override plugin aliases in lookup order | ✓ VERIFIED | `buildRegistry` inserts user aliases first with source `'user'`, plugin loop skips silently on `source === 'user'` match |
| 4  | Collision detection emits stderr warning when two plugins define same alias, last-loaded plugin wins | ✓ VERIFIED | `registry.ts` writes `[nesh] alias collision:` to stderr and overwrites Map entry; 45 tests pass including collision test |
| 5  | Per-plugin disabled_aliases are filtered during registration | ✓ VERIFIED | `buildRegistry` reads `config[plugin.name]?.disabled_aliases` and skips filtered aliases |
| 6  | Alias expansion replaces only the first word, once, with no recursion | ✓ VERIFIED | `alias.ts:3-15` — single `registry.resolve(firstWord)` call, no loop or recursive call present |
| 7  | Plugins load in topological dependency order; cycles detected and reported | ✓ VERIFIED | `resolver.ts` implements Kahn's algorithm with `inDegree` Map; cycle detection logs to stderr |
| 8  | Phase 1 registers alias data synchronously (<50ms); Phase 2 async init deferred via setImmediate | ✓ VERIFIED | `shell.ts:128-131` — `setImmediate(async () => { await loadPluginsPhase2(...) })` |
| 9  | A crashing plugin init() logs warning to stderr and never crashes the shell | ✓ VERIFIED | `loader.ts:42-44` — try/catch with stderr write; test confirms crashing init does not throw |
| 10 | Hook dispatch runs handlers in parallel via Promise.allSettled with per-handler error isolation | ✓ VERIFIED | `hooks.ts:14` — `const results = await Promise.allSettled(...)` |
| 11 | Git plugin exports 59 aliases as a pure data object with no init/destroy | ✓ VERIFIED | `git.ts` has 59 alias entries; no `init` or `destroy` properties present |
| 12 | User can type `gst` with git plugin enabled and `git status` runs end-to-end | ✓ VERIFIED | `shell.ts:141-142` — `expandAlias(line, pluginRegistry)` then `classifyInput(expandedLine, prefix)`; integration test confirms `gst` → `git status` → passthrough |
| 13 | `nesh --safe` starts with zero plugins; `aliases` builtin lists grouped aliases | ✓ VERIFIED | `cli.ts:14,23` — `--safe` flag detected and passed to `runShell({ safeMode })`; `shell.ts:57-62` — safe mode uses `createEmptyRegistry()`; `builtins.ts:84` — `executeAliases` groups by source |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/plugins/types.ts` | PluginManifest, HookName, HookHandler, HookContext, PluginConfig, PluginStatus | ✓ VERIFIED | 36 lines, all 6 interfaces/types exported |
| `src/plugins/registry.ts` | PluginRegistry, buildRegistry, createEmptyRegistry | ✓ VERIFIED | 128 lines, all exports present, Map.get O(1) lookup |
| `src/alias.ts` | expandAlias with expand-once semantics | ✓ VERIFIED | 15 lines, single-pass, no recursion |
| `src/plugins/resolver.ts` | topologicalSort with Kahn's algorithm and cycle detection | ✓ VERIFIED | 71 lines, `inDegree` Map present, export confirmed |
| `src/plugins/hooks.ts` | dispatchHook, buildHookBus with Promise.allSettled | ✓ VERIFIED | 47 lines, Promise.allSettled confirmed |
| `src/plugins/loader.ts` | loadPluginsPhase1, loadPluginsPhase2 with error boundaries | ✓ VERIFIED | 54 lines, try/catch present, calls buildRegistry and topologicalSort |
| `src/plugins/git.ts` | Git plugin with 25+ aliases, no init/destroy | ✓ VERIFIED | 66 lines, 59 aliases, no init/destroy |
| `src/plugins/index.ts` | BUNDLED_PLUGINS array | ✓ VERIFIED | 4 lines, exports `readonly PluginManifest[]` with git plugin |
| `src/config.ts` | Extended NeshConfig with plugins field and validatePluginConfig | ✓ VERIFIED | plugins field at line 23, validatePluginConfig exported at line 54 |
| `src/types.ts` | BuiltinName includes 'aliases' | ✓ VERIFIED | line 1 — `'aliases'` present in union |
| `src/classify.ts` | BUILTINS Set includes 'aliases' | ✓ VERIFIED | line 4 — `'aliases'` in Set |
| `src/builtins.ts` | executeAliases function importing PluginRegistry | ✓ VERIFIED | line 84, imports from `./plugins/registry.js` at line 6 |
| `src/shell.ts` | Full plugin wiring: expandAlias, loadPlugins, dispatchHook, safeMode, aliases case | ✓ VERIFIED | All key import lines and call sites confirmed |
| `src/cli.ts` | --safe flag detection passed to runShell | ✓ VERIFIED | lines 14 and 23 |
| `tests/plugins/registry.test.ts` | Registry tests | ✓ VERIFIED | Passes (45 tests across 7 files) |
| `tests/alias.test.ts` | Alias expansion tests | ✓ VERIFIED | Passes |
| `tests/plugins/resolver.test.ts` | Topological sort tests | ✓ VERIFIED | Passes |
| `tests/plugins/hooks.test.ts` | Hook dispatch tests | ✓ VERIFIED | Passes |
| `tests/plugins/loader.test.ts` | Loader + git plugin shape tests | ✓ VERIFIED | Passes |
| `tests/plugins/config.test.ts` | validatePluginConfig tests | ✓ VERIFIED | Passes |
| `tests/integration/plugin-shell.test.ts` | End-to-end pipeline integration tests | ✓ VERIFIED | Passes |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/plugins/registry.ts` | `src/plugins/types.ts` | imports PluginManifest, PluginConfig | ✓ WIRED | Import confirmed |
| `src/alias.ts` | `src/plugins/registry.ts` | uses `registry.resolve` | ✓ WIRED | `registry.resolve(firstWord)` at line 10 |
| `src/plugins/loader.ts` | `src/plugins/resolver.ts` | calls topologicalSort | ✓ WIRED | `topologicalSort` call in loadPluginsPhase1 |
| `src/plugins/loader.ts` | `src/plugins/registry.ts` | calls buildRegistry after sorting | ✓ WIRED | `buildRegistry(validPlugins, config)` at line 28 |
| `src/plugins/hooks.ts` | `src/plugins/types.ts` | uses HookName, HookHandler, HookContext types | ✓ WIRED | Types imported from types.ts |
| `src/shell.ts` | `src/alias.ts` | calls expandAlias before classifyInput | ✓ WIRED | Lines 141-142: `expandAlias(line, pluginRegistry)` then `classifyInput(expandedLine, prefix)` |
| `src/shell.ts` | `src/plugins/loader.ts` | calls loadPluginsPhase1 at startup, Phase2 deferred | ✓ WIRED | Lines 61 and 129-130 |
| `src/shell.ts` | `src/plugins/hooks.ts` | calls dispatchHook at preCommand/postCommand/onCd/prePrompt | ✓ WIRED | Lines 139, 166, 252, 299 |
| `src/cli.ts` | `src/shell.ts` | passes safeMode flag to runShell | ✓ WIRED | `runShell({ safeMode })` at line 23 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/shell.ts` (REPL alias expansion) | `pluginRegistry` | `loadPluginsPhase1(pluginConfig, BUNDLED_PLUGINS)` | Yes — builds from real PluginManifest aliases via buildRegistry | ✓ FLOWING |
| `src/shell.ts` (safe mode) | `pluginRegistry` | `createEmptyRegistry()` | Yes — intentionally empty per design | ✓ FLOWING |
| `src/builtins.ts:executeAliases` | `registry.getAll()` | `PluginRegistry` passed from shell | Yes — returns live alias Map | ✓ FLOWING |
| `src/plugins/git.ts` | `aliases` object | Static data object (pure data plugin) | Yes — 59 hardcoded git aliases per OMZ port | ✓ FLOWING (intentionally static) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All plugin + alias + integration tests pass | `npx vitest run tests/plugins/ tests/alias.test.ts tests/integration/plugin-shell.test.ts` | 7 files, 45 tests passed in 196ms | ✓ PASS |
| TypeScript type check | `npx tsc --noEmit` | No output (clean) | ✓ PASS |
| git.ts exports named `plugin` with 59 aliases | `grep -E "^\s+\w+[!]?:\s*'" src/plugins/git.ts \| wc -l` | 59 | ✓ PASS |
| alias.ts has no loop or recursive call | `grep -n "while\|for \|expandAlias" src/alias.ts` | Only function declaration line matches | ✓ PASS |
| registry uses Map.get for O(1) lookup | `grep "\.get(firstWord)" src/plugins/registry.ts` | Line 85 matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PLUG-01 | 08-02 | Two-phase plugin loader at startup (sync <50ms, async deferred) | ✓ SATISFIED | `loadPluginsPhase1` sync in shell.ts, `loadPluginsPhase2` via setImmediate |
| PLUG-02 | 08-01 | O(1) registry lookup for aliases, hooks, commands | ✓ SATISFIED | `Map.get(firstWord)` in registry.ts |
| PLUG-03 | 08-02 | Error boundaries on all plugin lifecycle calls | ✓ SATISFIED | try/catch in loader.ts, crashing init logs and continues |
| PLUG-04 | 08-01 | Plugin manifest metadata fields | ✓ SATISFIED | PluginManifest interface with all fields in types.ts |
| PLUG-05 | 08-02 | Topological sort with cycle detection | ✓ SATISFIED | Kahn's algorithm in resolver.ts |
| PLUG-06 | 08-02 | Shell startup <300ms with 30+ plugins | ✓ SATISFIED | Performance test passes (30 plugins in <50ms) |
| PLUG-07 | 08-03 | `nesh --safe` zero-plugin startup | ✓ SATISFIED | --safe flag in cli.ts, createEmptyRegistry in shell.ts |
| PLUG-08 | 08-02 | Hook dispatch for preCommand/postCommand/prePrompt/onCd | ✓ SATISFIED | dispatchHook called at all 4 REPL boundaries in shell.ts |
| ALIAS-01 | 08-01 | Plugins register aliases expanded before passthrough | ✓ SATISFIED | expandAlias called before classifyInput at shell.ts:141-142 |
| ALIAS-02 | 08-01 | Expand-once rule to prevent infinite loops | ✓ SATISFIED | Single lookup in alias.ts, no recursion or loop |
| ALIAS-03 | 08-01 | User aliases always override plugin aliases | ✓ SATISFIED | User aliases inserted first with source 'user', plugin loop skips silently |
| ALIAS-04 | 08-01 | Collision detection warns when multiple plugins define same alias | ✓ SATISFIED | stderr write `[nesh] alias collision:` in buildRegistry |
| ALIAS-05 | 08-01 | User can disable specific aliases per-plugin in config | ✓ SATISFIED | disabled_aliases filtering in buildRegistry via PluginPerConfig |
| ALIAS-06 | 08-03 | `nesh aliases` lists all aliases with source plugin | ✓ SATISFIED | executeAliases in builtins.ts groups by source, 'aliases' in BUILTINS set |
| PORT-02 | 08-02 | Alias-only plugins ported as pure data objects | ✓ SATISFIED | git.ts has 59 aliases, no init/destroy; pure data pattern established |

All 15 requirement IDs from plan frontmatter are accounted for. No orphaned requirements found.

### Anti-Patterns Found

No anti-patterns detected.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

Scanned: src/plugins/*.ts, src/alias.ts, src/config.ts, src/types.ts, src/classify.ts, src/builtins.ts, src/shell.ts, src/cli.ts

### Human Verification Required

The following item requires live shell verification (automated tests cannot substitute):

**1. End-to-end alias expansion in live shell**
- **Test:** Start `npm run dev`, add `"plugins": { "enabled": ["git"] }` to `~/.nesh/config.json`, type `gst`
- **Expected:** `git status` output appears
- **Why human:** Integration tests exercise the pipeline in isolation; actual TTY readline + subprocess spawning is not exercised by vitest

**2. Safe mode in live shell**
- **Test:** Start `npm run dev -- --safe`, type `gst`
- **Expected:** "command not found: gst" (no alias expansion)
- **Why human:** Same reason as above

**3. aliases builtin display**
- **Test:** With git plugin enabled, type `aliases`
- **Expected:** Grouped listing with `[git]` header and all 59 aliases
- **Why human:** Output formatting (picocolors bold/dim) not verified by unit tests

### Gaps Summary

No gaps. All 13 observable truths verified, all 21 artifacts confirmed substantive and wired, all 15 requirement IDs satisfied, 45/45 tests pass, tsc clean.

---

_Verified: 2026-04-05T11:02:00Z_
_Verifier: Claude (gsd-verifier)_
