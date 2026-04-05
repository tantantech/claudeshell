# Phase 11: Syntax Highlighting, Profiles & Plugin Management - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Three capabilities in one phase: (1) real-time input syntax highlighting with output-only rendering, (2) curated plugin profiles for one-click setup, (3) full plugin management CLI with git install, enable/disable, search, doctor, and hot-reload. Also PORT-06 for platform annotations in manifests.

This phase does NOT include: batch porting of remaining ~250 plugins (Phase 12), OMZ migration detection (Phase 12), AI-enhanced discovery (Phase 12), or theme integration (Phase 12).

</domain>

<decisions>
## Implementation Decisions

### Syntax Highlighting (HLGT-01 through HLGT-04)
- **D-01:** Output-only rendering — same approach as auto-suggestions. Rewrite the visible line with ANSI colors AFTER readline renders, but `rl.line` ALWAYS stays plain text.
- **D-02:** Tokenizer splits input into: command (first word), flags (starting with `-`), strings (quoted), paths (containing `/`), pipes/operators (`|`, `&&`, `||`, `;`), and arguments (everything else)
- **D-03:** Color scheme: valid commands → green, invalid commands → red, strings → yellow, flags → cyan, paths → blue, pipes/operators → magenta, arguments → default
- **D-04:** Command validity check: lookup against a cached set of known commands (from `compgen -c` at startup, refreshed every 60s) and aliases from plugin registry
- **D-05:** Rendering uses the same keypress event as auto-suggestions — on each keypress, tokenize `rl.line`, build colored string, overwrite the visible line using ANSI cursor movement
- **D-06:** 16ms frame budget enforced via `requestAnimationFrame`-style check — if tokenize+render exceeds 16ms, skip the color update for that keypress (plain text fallback)
- **D-07:** New module `src/highlighting/tokenizer.ts` — pure function, no side effects
- **D-08:** New module `src/highlighting/renderer.ts` — applies ANSI colors based on token types, writes to stdout
- **D-09:** Independently disablable: `"highlighting": { "enabled": true }` in config. Default: enabled
- **D-10:** Highlighting and suggestions coexist — highlighting renders the typed portion, suggestions render the ghost suffix after cursor

### Profile System (PROF-01 through PROF-04)
- **D-11:** Five curated profiles defined in `src/plugins/profiles.ts` as readonly data objects
- **D-12:** Profile definitions:
  - `core`: git (aliases only)
  - `developer`: core + npm-completions, docker-completions, git-completions, extract, copypath, jsontools
  - `devops`: developer + kubectl-completions, cloud-completions, sysadmin-completions
  - `cloud`: developer + cloud-completions (aws, gcloud, az)
  - `ai-engineer`: developer + python/pip completions, jsontools, encode64
- **D-13:** Profiles are additive — enabling "devops" includes everything in "developer" which includes "core"
- **D-14:** Interactive profile selector at first run: detect `~/.nesh/config.json` doesn't exist or has no `plugins.enabled`, show interactive menu using the same pattern as `theme` and `model` builtins
- **D-15:** Profile selection writes the expanded plugin list to `config.plugins.enabled` — after selection, profiles are just a convenient way to populate the enabled list
- **D-16:** `plugin profile` command re-shows the profile selector at any time

### Plugin Management CLI (MGMT-01 through MGMT-06)
- **D-17:** `plugin` is a new builtin command with subcommands: `list`, `enable`, `disable`, `install`, `update`, `remove`, `search`, `doctor`, `times`, `profile`
- **D-18:** New module `src/plugin-manager.ts` — implements all subcommands, receives readline interface for interactive menus
- **D-19:** `plugin list` — shows all bundled + installed plugins with enabled/disabled status
- **D-20:** `plugin enable <name>` / `plugin disable <name>` — modifies `config.plugins.enabled` array, saves config, hot-reloads (see D-28)
- **D-21:** `plugin install <user/repo>` — clones git repo to `~/.nesh/plugins/<name>/`, reads `manifest.ts` or `index.ts` for PluginManifest export, validates manifest, adds to available plugins
- **D-22:** `plugin update <name>` — runs `git pull` in the plugin directory, reloads manifest
- **D-23:** `plugin remove <name>` — removes directory from `~/.nesh/plugins/`, removes from enabled list if present
- **D-24:** `plugin search <query>` — searches bundled plugin catalog by name/description. Community search deferred to Phase 12.
- **D-25:** `plugin doctor` — shows failed plugins (from registry status), load times, missing dependencies, recommendations
- **D-26:** `plugin times` — shows load timing for Phase 1 (sync) and Phase 2 (async) per plugin
- **D-27:** All interactive selections use `readline` question with numbered choices — consistent with existing `theme`, `model`, `settings` builtins

### Hot-Reload (MGMT-06)
- **D-28:** Hot-reload on enable/disable: rebuild the plugin registry from scratch (re-run `loadPluginsPhase1`), replace the `pluginRegistry` variable in shell.ts, rebuild `hookBus`
- **D-29:** Hot-reload on install: add new plugin to available pool, then enable triggers full registry rebuild
- **D-30:** No live-patching of individual plugins — always rebuild entire registry (simple, correct, <50ms for 30 plugins)
- **D-31:** Shell.ts stores `pluginRegistry` and `hookBus` as `let` variables (already the case) — hot-reload assigns new immutable registries

### Git Plugin Installation (MGMT-02)
- **D-32:** External plugins stored in `~/.nesh/plugins/<plugin-name>/` — one directory per plugin
- **D-33:** Installation: `git clone --depth 1 <repo-url> ~/.nesh/plugins/<name>`
- **D-34:** Plugin must export a `PluginManifest` from `index.ts` or `manifest.ts` — validated at install time
- **D-35:** Dynamic loading: use `import()` with absolute file:// URL to load external plugin manifests
- **D-36:** Security: warn user before installing, show plugin name/description/permissions after clone, confirm enable

### Platform Annotations (PORT-06)
- **D-37:** `PluginManifest.platform` field already exists from Phase 8 (`'macos' | 'linux' | 'all'`)
- **D-38:** Plugin loader checks `process.platform` against manifest `platform` field — skip plugins that don't match current platform
- **D-39:** `plugin list` shows platform annotations: `[macos]`, `[linux]`, `[all]` next to plugin names
- **D-40:** Platform mismatch is a silent skip (not an error) — plugin just doesn't load

### Claude's Discretion
- Exact `compgen -c` caching mechanism for command validity
- Whether to use a worker thread for tokenization (likely unnecessary given 16ms budget)
- Plugin doctor output formatting details
- Git clone error handling specifics

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Plugin Infrastructure
- `src/plugins/types.ts` — PluginManifest with platform field, PluginConfig
- `src/plugins/registry.ts` — buildRegistry, PluginRegistry (to rebuild on hot-reload)
- `src/plugins/loader.ts` — loadPluginsPhase1/Phase2 (called during hot-reload)
- `src/plugins/hooks.ts` — buildHookBus (rebuilt on hot-reload)
- `src/plugins/index.ts` — BUNDLED_PLUGINS array

### Shell Integration
- `src/shell.ts` — REPL loop, pluginRegistry/hookBus as let variables, readline interface
- `src/config.ts` — NeshConfig, loadConfig, saveConfig patterns
- `src/builtins.ts` — Builtin command pattern (executeTheme, executeModelSwitcher, executeSettings)
- `src/classify.ts` — BUILTINS set (add 'plugin')
- `src/suggestions/` — Auto-suggestions using keypress events (highlighting coexists)
- `src/settings.ts` — Interactive settings menu pattern

### Requirements
- `.planning/REQUIREMENTS.md` — HLGT-01–04, PROF-01–04, MGMT-01–06, PORT-06
- `.planning/ROADMAP.md` — Phase 11 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/builtins.ts`: executeTheme/executeModelSwitcher — interactive menu pattern to reuse for profile/plugin selection
- `src/settings.ts`: Interactive settings menu — same readline question pattern for plugin subcommands
- `src/suggestions/renderer.ts`: Ghost text rendering pattern — highlighting renderer follows similar ANSI approach
- `src/config.ts`: loadConfig/saveConfig — plugin manager uses these for config persistence
- `src/plugins/loader.ts`: loadPluginsPhase1 — called directly during hot-reload

### Established Patterns
- Output-only rendering (rl.line stays plain text)
- Interactive menus via readline question with numbered choices
- Config validation with type guards and safe defaults
- Immutable registries rebuilt from scratch (never mutated)
- Module-per-concern

### Integration Points
- `src/classify.ts`: Add 'plugin' to BUILTINS set
- `src/shell.ts`: Add plugin builtin case, wire highlighting keypress handler, first-run profile detection
- `src/builtins.ts`: Add executePlugin dispatcher
- `src/config.ts`: Add highlighting config field

</code_context>

<specifics>
## Specific Ideas

- Syntax highlighting should be subtle — enhance readability, not create a Christmas tree
- Profile selector at first run is the "wow moment" — user picks "developer" and gets a curated shell instantly
- Hot-reload is the key UX differentiator from oh-my-zsh — no more "source ~/.zshrc" after plugin changes
- Plugin doctor is the debugging escape hatch — when something breaks, `plugin doctor` tells you what

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-syntax-highlighting-profiles-plugin-management*
*Context gathered: 2026-04-05*
