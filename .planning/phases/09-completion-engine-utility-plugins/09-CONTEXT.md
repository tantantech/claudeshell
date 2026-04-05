# Phase 9: Completion Engine & Utility Plugins - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Tab completion framework: async completion providers with timeout and caching, Fig-style declarative completion specs, bash/zsh compgen fallback, and hand-crafted completions for top 20 commands. Port ~100 completion-dependent plugins and ~40 utility plugins (extract, copypath, sudo toggle, etc.) to TypeScript.

This phase does NOT include: auto-suggestions (Phase 10), syntax highlighting (Phase 11), plugin management CLI (Phase 11), profile system (Phase 11), or batch porting of remaining plugins (Phase 12).

</domain>

<decisions>
## Implementation Decisions

### Completion Provider Interface
- **D-01:** Extend `PluginManifest` with optional `completions?: CompletionProvider` field — follows the existing manifest pattern from Phase 8
- **D-02:** `CompletionProvider` is a function: `(context: CompletionContext) => Promise<CompletionResult>`
- **D-03:** `CompletionContext` includes: `line` (full input), `cursor` (position), `words` (split tokens), `currentWord` (word being completed), `commandName` (first word), `cwd` (working directory)
- **D-04:** `CompletionResult` is: `{ items: readonly string[], prefix?: string }` — items are the completion candidates, prefix is the matched portion to replace
- **D-05:** Each completion provider runs with a 1-second timeout via `Promise.race` — slow providers return empty rather than blocking
- **D-06:** Results are cached per `(commandName, currentWord)` key with a 30-second TTL — repeated Tab presses don't re-invoke providers

### Tab Key Integration
- **D-07:** Use readline's built-in `completer` callback: `readline.createInterface({ completer })` — the standard Node.js approach
- **D-08:** The completer function is async (readline supports `(line, callback)` async pattern) — dispatches to the completion engine
- **D-09:** New module `src/completions/engine.ts` — the central completion dispatcher that routes Tab presses to the right provider
- **D-10:** Completion engine checks in order: (1) plugin-provided completion for the command, (2) Fig-style spec for the command, (3) compgen fallback
- **D-11:** If multiple plugins provide completions for the same command, only the first match is used (no merging)

### Fig-Style Completion Specs
- **D-12:** Own TypeScript types for completion specs — do NOT depend on Fig's package (per STATE.md research note)
- **D-13:** `CompletionSpec` interface: `{ name: string, subcommands?: Record<string, CompletionSpec>, options?: CompletionOption[], args?: CompletionArg[] }`
- **D-14:** `CompletionOption`: `{ name: string | string[], description?: string, args?: CompletionArg[] }` — supports short/long flag aliases like `['-v', '--verbose']`
- **D-15:** `CompletionArg`: `{ name: string, template?: 'filepaths' | 'folders', generators?: CompletionGenerator[] }` — templates for common patterns
- **D-16:** `CompletionGenerator`: async function that produces dynamic completions (e.g., git branches, docker containers)
- **D-17:** Plugins register specs via `completionSpecs?: readonly CompletionSpec[]` field on `PluginManifest`
- **D-18:** Spec parser module `src/completions/spec-parser.ts` walks the spec tree based on parsed input tokens to find matching completions

### Compgen Fallback
- **D-19:** When no native completion or spec is available, shell out to `bash -c "compgen -W '$(compgen -c)' -- '${currentWord}'"` for command name completion
- **D-20:** For file path completion, use `compgen -f -- '${currentWord}'`
- **D-21:** Compgen fallback has a 500ms timeout (shorter than plugin timeout) — if bash is slow, return empty
- **D-22:** New module `src/completions/compgen.ts` — wraps the compgen subprocess call

### Top 20 Hand-Crafted Completions
- **D-23:** Hand-crafted completions for: git, docker, npm, yarn, pnpm, kubectl, ssh, aws, gcloud, az, terraform, helm, cargo, pip, python, node, make, systemctl, brew, apt
- **D-24:** Each uses Fig-style specs — static data objects, no runtime generators except for dynamic completions (git branches, docker containers)
- **D-25:** Completions are bundled plugins: `src/plugins/completions/git-completions.ts`, etc. — registered via `completionSpecs` on the manifest
- **D-26:** Git completions include: subcommands (checkout, branch, merge, rebase, etc.), branch names via generator (`git branch --list`), remote names, file paths for `git add`

### Utility Plugins (PORT-03, PORT-04)
- **D-27:** Utility plugins use `init()` to register their functionality — extends existing Phase 8 init pattern
- **D-28:** Plugin API context object extended with registration methods: `registerKeybinding(key, handler)`, `registerCommand(name, handler)`
- **D-29:** `extract` plugin: registers as a command plugin — detects archive type and runs appropriate extraction tool (tar, unzip, gunzip, etc.)
- **D-30:** `sudo` plugin: registers a keybinding (Escape+Escape or configurable) that toggles `sudo` prefix on the current line
- **D-31:** `copypath` plugin: registers `copypath` command that copies current directory to clipboard (`pbcopy` on macOS, `xclip` on Linux)
- **D-32:** Cross-platform design: utility plugins check `process.platform` and use platform-appropriate tools
- **D-33:** ~40 utility plugins ported: each as a single file in `src/plugins/utilities/` following the manifest pattern

### Completion Engine Architecture
- **D-34:** Module structure: `src/completions/engine.ts` (dispatcher), `src/completions/types.ts` (interfaces), `src/completions/spec-parser.ts` (Fig spec walker), `src/completions/compgen.ts` (fallback), `src/completions/cache.ts` (TTL cache)
- **D-35:** Completion cache is a simple Map with TTL — no external dependencies
- **D-36:** Engine is initialized in `shell.ts` alongside plugin loader — receives the plugin registry to look up providers

### Claude's Discretion
- Exact set of subcommands/options for each of the top 20 command completions
- How to display completion candidates (readline's default list display vs custom formatting)
- Whether to show completion source (e.g., "[git plugin]") alongside candidates
- Internal naming of helper functions and utility types
- Exact keybinding for sudo toggle (Escape+Escape is the OMZ default)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Plugin Architecture (Phase 8)
- `src/plugins/types.ts` — PluginManifest interface to extend with completions/completionSpecs fields
- `src/plugins/registry.ts` — PluginRegistry with O(1) lookup — extend for completion provider lookup
- `src/plugins/loader.ts` — Two-phase loader — completions register in Phase 1 (sync)
- `src/plugins/hooks.ts` — Hook dispatch pattern — completion engine follows similar async pattern
- `src/plugins/index.ts` — BUNDLED_PLUGINS array — add completion and utility plugins here
- `src/plugins/git.ts` — Example alias-only plugin — template for completion plugins

### Shell Integration
- `src/shell.ts` — REPL loop with readline — Tab completer hooks in here
- `src/config.ts` — NeshConfig — may need completion-specific config fields
- `src/classify.ts` — Input classification — completions fire before classify on Tab

### Requirements
- `.planning/REQUIREMENTS.md` — COMP-01 through COMP-05, PORT-03, PORT-04
- `.planning/ROADMAP.md` — Phase 9 success criteria (5 criteria)

### Prior Research
- `.planning/research/PITFALLS.md` — readline keypress timing pitfalls
- `.planning/research/ARCHITECTURE.md` — Architecture decisions and module map
- `.planning/STATE.md` — Research note: "Fig completion spec format — define own TS types, don't depend on their package"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/plugins/types.ts`: PluginManifest — extend with `completions` and `completionSpecs` fields
- `src/plugins/registry.ts`: buildRegistry — extend to index completion providers by command name
- `src/plugins/loader.ts`: Two-phase loader — completion registration goes in Phase 1 (sync data)
- `src/plugins/hooks.ts`: `dispatchHook` with `Promise.allSettled` and error boundaries — completion engine uses same timeout/error pattern
- `src/alias.ts`: expandAlias runs before classify — completions are orthogonal (Tab key, not Enter)

### Established Patterns
- **Immutable state**: All registries frozen with `Object.freeze`
- **Module-per-concern**: New `src/completions/` directory for completion engine
- **Error boundaries**: Every async plugin call wrapped in try/catch
- **Two-phase loading**: Sync data registration first, async init deferred
- **Config validation**: Type guards with safe defaults

### Integration Points
- `src/shell.ts`: readline `completer` option — wire completion engine here
- `src/plugins/types.ts`: Extend PluginManifest with completion fields
- `src/plugins/registry.ts`: Build completion lookup map alongside alias map
- `src/plugins/index.ts`: Add completion and utility plugins to BUNDLED_PLUGINS

</code_context>

<specifics>
## Specific Ideas

- Tab completion should feel instant — the 1-second timeout is a safety net, most completions should return in <100ms
- Git branch completion via `git branch --list` is the key dynamic generator — if this works smoothly, other generators follow the same pattern
- Fig-style specs are data declarations, not runtime code — they should be easy to write and read
- Utility plugins should "just work" after enabling — no additional configuration needed
- The compgen fallback ensures Tab always does something useful even for unrecognized commands

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-completion-engine-utility-plugins*
*Context gathered: 2026-04-05*
