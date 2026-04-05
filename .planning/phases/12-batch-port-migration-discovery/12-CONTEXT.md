# Phase 12: Batch Port, Migration & Discovery - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the oh-my-zsh plugin ecosystem: batch port all remaining ~250 plugins to TypeScript, build OMZ migration detection, implement AI-enhanced plugin discovery, and integrate plugin themes with Nesh's prompt template system. This is the final phase of the v3.0 milestone.

</domain>

<decisions>
## Implementation Decisions

### Batch Porting Strategy (PORT-01, PORT-05)
- **D-01:** Plugins are organized into 4 categories matching OMZ: alias-only (~120 already have template from git.ts), completion-dependent (~100 use Fig-style specs), environment/utility (~40 follow extract/copypath pattern), hook/widget (~30 use hook system)
- **D-02:** Alias-only plugins are pure data objects — generate them programmatically by parsing OMZ plugin files for alias definitions, then writing TypeScript data files
- **D-03:** Each plugin is one file in its category directory: `src/plugins/aliases/<name>.ts`, `src/plugins/completions/<name>.ts`, `src/plugins/utilities/<name>.ts`, `src/plugins/hooks/<name>.ts`
- **D-04:** Batch generation script `scripts/generate-alias-plugins.ts` reads OMZ alias definitions from a reference data file and outputs TypeScript plugin files
- **D-05:** Hook/widget plugins (PORT-05) use the existing hook system (preCommand, postCommand, prePrompt, onCd) plus the keypress API from suggestions — e.g., per-directory-history uses onCd, colored-man-pages uses preCommand
- **D-06:** All generated plugins are validated: must conform to PluginManifest, must compile with tsc, must pass a basic import test
- **D-07:** BUNDLED_PLUGINS array in `src/plugins/index.ts` updated to include all ~300 plugins — lazy-loaded by category to avoid startup cost

### OMZ Migration Detection (MIG-01)
- **D-08:** New module `src/migration/detector.ts` — scans for `~/.oh-my-zsh/` directory and `~/.zshrc` for `plugins=(...)` line
- **D-09:** Parse the `plugins=(...)` array from .zshrc to get the user's active OMZ plugin list
- **D-10:** Cross-reference against Nesh's bundled plugin catalog — produce a mapping: `{ omzName: string, neshEquivalent: string | null, status: 'available' | 'partial' | 'missing' }`
- **D-11:** Show migration report: green for available equivalents, yellow for partial, red for missing
- **D-12:** Offer to auto-enable all available equivalents with one confirm — writes to `config.plugins.enabled`
- **D-13:** Migration accessible via `nesh --migrate` CLI flag or `plugin migrate` subcommand

### AI-Enhanced Plugin Discovery (MIG-02)
- **D-14:** New module `src/migration/discovery.ts` — accepts natural language description, returns plugin recommendations
- **D-15:** Uses the existing AI integration (`src/ai.ts`) with a specialized system prompt: "Given the Nesh plugin catalog below, suggest the most relevant plugins for a user who describes: {user_input}"
- **D-16:** Plugin catalog is embedded in the prompt as a compact list: `name | description | category` — no need for vector search, the catalog fits in a single prompt
- **D-17:** Results display as a ranked list with enable suggestions
- **D-18:** Accessible via `plugin discover` subcommand: `plugin discover "I work with kubernetes and terraform"`
- **D-19:** Falls back gracefully when no API key is configured — shows "AI discovery requires an API key. Use `plugin search <keyword>` for keyword-based search instead."

### Theme Integration (MIG-03)
- **D-20:** New concept: `PromptSegment` — a function that returns a string to be displayed in the prompt
- **D-21:** Extend the prompt template system (`src/templates.ts`) with a segment registration API: `registerSegment(name: string, fn: () => string)`
- **D-22:** Plugin themes are plugins that register prompt segments via their `init()` function
- **D-23:** Built-in segments: `cwd`, `git_branch`, `git_status`, `node_version`, `python_version`, `time`, `exit_code`
- **D-24:** Template format extended to support segment references: `{segment:git_status}` in template strings
- **D-25:** Existing p10k-style template continues to work — segments are additive, not a replacement

### Plugin Index & Lazy Loading
- **D-26:** With ~300 plugins, importing all at startup is too slow — use dynamic imports grouped by category
- **D-27:** `src/plugins/index.ts` exports a `loadBundledPlugins(enabled: readonly string[])` function that only imports the categories needed
- **D-28:** Plugin name → category mapping stored as a static lookup table (generated at build time)
- **D-29:** Startup performance target unchanged: <300ms with 30+ plugins enabled

### Claude's Discretion
- Exact list of all ~300 OMZ plugins and their Nesh category mapping
- Which OMZ plugins are "partial" equivalents vs full ports
- Prompt format for AI discovery
- How to handle OMZ plugins that have no meaningful Nesh equivalent (platform-specific, deprecated, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Plugin System
- `src/plugins/types.ts` — PluginManifest, HookName, HookHandler, PluginConfig
- `src/plugins/index.ts` — BUNDLED_PLUGINS (currently 16 plugins)
- `src/plugins/loader.ts` — loadPluginsPhase1/Phase2
- `src/plugins/git.ts` — Template for alias-only plugins
- `src/plugins/completions/` — Template for completion plugins
- `src/plugins/utilities/` — Template for utility plugins
- `src/plugins/profiles.ts` — Profile definitions (need updating with new plugins)
- `src/plugins/external.ts` — External plugin loader pattern

### Shell Integration
- `src/templates.ts` — Prompt template system to extend with segments
- `src/ai.ts` — AI integration for discovery feature
- `src/config.ts` — Config for migration/discovery settings
- `src/cli.ts` — CLI flags (add --migrate)
- `src/plugin-manager.ts` — Plugin CLI (add migrate/discover subcommands)

### Requirements
- `.planning/REQUIREMENTS.md` — PORT-01, PORT-05, MIG-01, MIG-02, MIG-03
- `.planning/ROADMAP.md` — Phase 12 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/plugins/git.ts`: Template for alias-only plugins — all ~120 alias plugins follow this pattern
- `src/plugins/completions/`: Template for completion plugins with Fig-style specs
- `src/plugins/utilities/extract.ts`: Template for utility plugins with cross-platform support
- `src/plugin-manager.ts`: Plugin CLI — extend with `migrate` and `discover` subcommands
- `src/ai.ts`: AI integration — reuse for discovery feature

### Established Patterns
- Pure data object plugins (no init/destroy) for aliases and completions
- PluginManifest interface for all plugin types
- Interactive menus via readline for user prompts
- Config persistence via loadConfig/saveConfig

### Integration Points
- `src/plugins/index.ts`: Replace static BUNDLED_PLUGINS with dynamic loadBundledPlugins()
- `src/plugin-manager.ts`: Add `migrate` and `discover` subcommands
- `src/templates.ts`: Add segment registration API
- `src/cli.ts`: Add `--migrate` flag

</code_context>

<specifics>
## Specific Ideas

- Batch porting is mostly code generation — the hard work was building the framework in Phases 8-11
- Migration detection is the "bridge" feature — makes switching from OMZ to Nesh frictionless
- AI discovery is the "wow" feature — users describe their workflow and get personalized recommendations
- Theme integration closes the loop — users can customize their prompt with plugin-provided segments

</specifics>

<deferred>
## Deferred Ideas

None — this is the final phase of v3.0

</deferred>

---

*Phase: 12-batch-port-migration-discovery*
*Context gathered: 2026-04-05*
