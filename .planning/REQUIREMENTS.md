# Requirements: Nesh v3.0

**Defined:** 2026-04-05
**Core Value:** Running AI-assisted commands feels as natural and fast as running normal shell commands

## v3.0 Requirements

### Plugin Framework

- [x] **PLUG-01**: Plugin loader initializes enabled plugins at shell startup with two-phase loading (sync alias data <50ms, async init deferred after first prompt)
- [x] **PLUG-02**: Plugin registry provides O(1) lookup for aliases, completions, hooks, and commands
- [x] **PLUG-03**: Every plugin lifecycle call (init, destroy) runs inside error boundaries — a crashing plugin never crashes the shell
- [x] **PLUG-04**: Plugin manifest declares metadata (name, version, description, dependencies, platform, permissions)
- [x] **PLUG-05**: Plugin dependency resolution with topological sort and cycle detection
- [x] **PLUG-06**: Shell startup with 30+ enabled plugins completes in under 300ms
- [x] **PLUG-07**: Safe mode (`nesh --safe`) starts with zero plugins for recovery
- [x] **PLUG-08**: Plugin hook system dispatches REPL lifecycle events (preCommand, postCommand, prePrompt, onCd)

### Alias System

- [x] **ALIAS-01**: Plugins register aliases that expand in the command pipeline before passthrough
- [x] **ALIAS-02**: Alias expansion uses expand-once rule with depth limit to prevent infinite loops
- [x] **ALIAS-03**: User aliases always override plugin aliases
- [x] **ALIAS-04**: Collision detection warns when multiple plugins define the same alias
- [x] **ALIAS-05**: User can disable specific aliases per-plugin in config
- [x] **ALIAS-06**: `nesh aliases` command lists all aliases with their source plugin

### Completion Engine

- [x] **COMP-01**: Context-aware Tab completion dispatches to plugin-provided completion providers
- [x] **COMP-02**: Completion providers are async with 1-second timeout and caching
- [x] **COMP-03**: Fig-style declarative completion specs supported for command grammar definitions
- [x] **COMP-04**: Fallback to bash/zsh `compgen` when no native completion is available
- [ ] **COMP-05**: Top 20 commands have hand-crafted completions (git, docker, npm, kubectl, ssh, aws, etc.)

### Auto-Suggestions

- [ ] **SUGG-01**: Fish-like ghost text appears from history as user types, accepted with right-arrow
- [ ] **SUGG-02**: Suggestion engine searches history with reverse linear scan and early exit
- [ ] **SUGG-03**: Keypress handler debounced to prevent typing lag (>5 chars/sec feels instant)
- [ ] **SUGG-04**: History filtering excludes commands containing sensitive patterns (API keys, passwords, tokens)
- [ ] **SUGG-05**: Auto-suggestions independently disablable in config

### Syntax Highlighting

- [ ] **HLGT-01**: Real-time input coloring for commands, strings, flags, and paths
- [ ] **HLGT-02**: Highlighting uses output-only rendering — `rl.line` always remains plain text
- [ ] **HLGT-03**: Debounced rendering with frame budget (<16ms) to prevent typing lag
- [ ] **HLGT-04**: Syntax highlighting independently disablable in config

### Plugin Management

- [ ] **MGMT-01**: `plugin` builtin command with subcommands: list, enable, disable, install, update, remove, search, doctor, times
- [ ] **MGMT-02**: Install plugins from git repos (`plugin install zsh-users/zsh-autosuggestions`) stored in ~/.nesh/plugins/
- [ ] **MGMT-03**: Plugin search across bundled catalog and popular community plugins
- [ ] **MGMT-04**: `plugin doctor` shows failed plugins, load times, and recommendations
- [ ] **MGMT-05**: All plugin configuration uses interactive selection menus (like existing `theme` and `model` builtins)
- [ ] **MGMT-06**: No shell restart required after enable/disable/install — hot-reload in current session

### Profile System

- [ ] **PROF-01**: Curated plugin profiles: core, developer, devops, cloud, ai-engineer
- [ ] **PROF-02**: Interactive profile selector at first run or via `plugin profile` command
- [ ] **PROF-03**: Profiles are additive — enabling "devops" adds to "core", not replaces
- [ ] **PROF-04**: Users can customize profiles after selection (add/remove individual plugins)

### Plugin Catalog (OMZ Port)

- [ ] **PORT-01**: All ~300 oh-my-zsh plugins ported to TypeScript with matching user-facing behavior
- [x] **PORT-02**: Alias-only plugins (~120) ported as pure data objects (no init function needed)
- [ ] **PORT-03**: Completion-dependent plugins (~100) ported using Fig-style completion specs
- [ ] **PORT-04**: Environment/utility plugins (~40) ported with cross-platform TypeScript implementations
- [ ] **PORT-05**: Hook/widget plugins (~30) ported using Nesh hook system and keypress API
- [ ] **PORT-06**: Platform annotations in manifest for platform-specific plugins (brew=macOS, apt=Linux)

### Migration & Discovery

- [ ] **MIG-01**: Auto-detect existing oh-my-zsh installation and show which plugins have Nesh equivalents
- [ ] **MIG-02**: AI-enhanced plugin discovery — user describes what they want, AI suggests relevant plugins
- [ ] **MIG-03**: Plugin themes integrate with Nesh's existing prompt template system via segment registration API

## v2.0 Validated

- ✓ SESS-01 through SESS-06: Sessions, chat mode, model selection — v2.0
- ✓ PIPE-01 through PIPE-03: Pipe-friendly AI, stdin context — v2.0
- ✓ ERR-04, ERR-05: Auto error recovery, `a fix` command — v2.0
- ✓ CTX-01, CTX-02: Project context detection, per-project config — v2.0
- ✓ PERM-01 through PERM-03: Permission control (auto/ask/deny) — v2.0
- ✓ VIS-01, VIS-02: Token/cost display — v2.0
- ✓ PTY-01, PTY-02: Interactive command PTY passthrough — v2.0
- ✓ CFG-01, CFG-02: Custom prefix, per-project config — v2.0

## v1.0 Validated

- ✓ SHELL-01 through SHELL-09: Interactive REPL, passthrough, cd, pipes, signals, history — v1.0
- ✓ AI-01 through AI-07: Claude Agent SDK streaming, tool visibility, markdown rendering — v1.0
- ✓ CONF-01 through CONF-03: API key config, error messages, config file — v1.0
- ✓ ERR-01 through ERR-03: Error explanation, SDK errors, crash resilience — v1.0
- ✓ PLAT-01 through PLAT-03: macOS, Linux, npm install — v1.0

## Future Requirements

### Advanced Ecosystem

- **ADV-01**: Plugin marketplace with ratings and reviews
- **ADV-02**: Plugin authoring CLI (`nesh plugin init` scaffolding)
- **ADV-03**: Windows platform support for all plugins
- **ADV-04**: Plugin telemetry (opt-in usage stats for popularity ranking)

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-process JavaScript sandboxing (vm/vm2) | Fundamentally insecure — use process-level isolation for untrusted plugins |
| Running actual zsh plugin scripts via subprocess | Creates dual-shell dependency, breaks cross-platform goal |
| Plugin marketplace with server infrastructure | Too complex for v3.0 — git repos sufficient |
| Windows support for this milestone | macOS/Linux focus — platform annotations allow future Windows port |
| GUI plugin manager | Terminal-native interactive menus only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLUG-01 | Phase 8 | Complete |
| PLUG-02 | Phase 8 | Complete |
| PLUG-03 | Phase 8 | Complete |
| PLUG-04 | Phase 8 | Complete |
| PLUG-05 | Phase 8 | Complete |
| PLUG-06 | Phase 8 | Complete |
| PLUG-07 | Phase 8 | Complete |
| PLUG-08 | Phase 8 | Complete |
| ALIAS-01 | Phase 8 | Complete |
| ALIAS-02 | Phase 8 | Complete |
| ALIAS-03 | Phase 8 | Complete |
| ALIAS-04 | Phase 8 | Complete |
| ALIAS-05 | Phase 8 | Complete |
| ALIAS-06 | Phase 8 | Complete |
| COMP-01 | Phase 9 | Complete |
| COMP-02 | Phase 9 | Complete |
| COMP-03 | Phase 9 | Complete |
| COMP-04 | Phase 9 | Complete |
| COMP-05 | Phase 9 | Pending |
| SUGG-01 | Phase 10 | Pending |
| SUGG-02 | Phase 10 | Pending |
| SUGG-03 | Phase 10 | Pending |
| SUGG-04 | Phase 10 | Pending |
| SUGG-05 | Phase 10 | Pending |
| HLGT-01 | Phase 11 | Pending |
| HLGT-02 | Phase 11 | Pending |
| HLGT-03 | Phase 11 | Pending |
| HLGT-04 | Phase 11 | Pending |
| MGMT-01 | Phase 11 | Pending |
| MGMT-02 | Phase 11 | Pending |
| MGMT-03 | Phase 11 | Pending |
| MGMT-04 | Phase 11 | Pending |
| MGMT-05 | Phase 11 | Pending |
| MGMT-06 | Phase 11 | Pending |
| PROF-01 | Phase 11 | Pending |
| PROF-02 | Phase 11 | Pending |
| PROF-03 | Phase 11 | Pending |
| PROF-04 | Phase 11 | Pending |
| PORT-01 | Phase 12 | Pending |
| PORT-02 | Phase 8 | Complete |
| PORT-03 | Phase 9 | Pending |
| PORT-04 | Phase 9 | Pending |
| PORT-05 | Phase 12 | Pending |
| PORT-06 | Phase 11 | Pending |
| MIG-01 | Phase 12 | Pending |
| MIG-02 | Phase 12 | Pending |
| MIG-03 | Phase 12 | Pending |

**Coverage:**
- v3.0 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-03 after roadmap creation (traceability added)*
