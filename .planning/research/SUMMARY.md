# Research Summary: Nesh v3.0 Oh-My-Nesh Plugin Ecosystem

**Domain:** TypeScript plugin framework for AI-native terminal shell
**Researched:** 2026-04-03
**Overall confidence:** HIGH

## Executive Summary

Nesh v3.0 aims to make the shell a full oh-my-zsh replacement by building a native TypeScript plugin framework with all ~300 OMZ plugins ported, organized into user profiles, and cross-platform. Research reveals this is a tractable engineering problem, not a research problem -- the hard design questions (plugin API shape, readline integration, completion architecture) have well-understood solutions from OMZ, zinit, Fig, and the Node.js readline API.

The ~300 oh-my-zsh plugins decompose into 5 categories with very different porting complexity: ~120 alias-only (trivial -- pure data), ~100 completion-only (medium -- need completion engine), ~40 environment setup (low-medium -- env manipulation), ~30 hooks/widgets (high -- readline integration), and ~50 full tools (medium-high -- reimplement in TS). The critical insight is that 70% of all plugins (alias + completion + environment) require only two framework capabilities: alias expansion in classify.ts and a completion engine hooked into readline's completer API. Building these two capabilities unlocks the vast majority of the plugin catalog.

The three hardest features are auto-suggestions (fish-like ghost text from history), syntax highlighting (real-time ANSI coloring of input), and the completion engine (aggregating plugin-provided completions via readline). All three require deep integration with Node.js readline, but critically, they all work through public APIs -- `readline.emitKeypressEvents()` for keypress interception, the `completer` option for Tab completion, and stdout ANSI writes for display. The key constraint is that `rl.line` must always remain plain text; all coloring is output-only. Violating this causes cursor positioning bugs that are extremely hard to debug.

The recommended architecture adds 12 new modules under `src/plugins/` without modifying the core REPL loop structure. Shell.ts gains ~20 lines of integration code (plugin init, alias expansion, hook calls, completer wiring). The plugin interface is a TypeScript interface (`NeshPlugin`) with optional fields -- alias-only plugins are just `{ name, version, aliases }` objects, while full plugins add `init()`, `destroy()`, hooks, and completion providers. This mirrors OMZ's convention-based approach but with compile-time type safety.

## Key Findings

**Stack:** Zero new runtime dependencies for the core framework. Two optional additions: `emphasize` for syntax highlighting and `simple-git` for plugin installation from git repos.

**Architecture:** 12 new modules under `src/plugins/`, 7 modified existing modules. Plugin Manager orchestrates lifecycle; Registry provides O(1) alias/command/completion lookups; HookBus dispatches REPL lifecycle events; Sandbox wraps every plugin call in error boundaries.

**Critical pitfall:** Slow startup from synchronous plugin loading. Must use two-phase loading (alias data sync, async init deferred after first prompt) to hit <200ms startup with 300 plugins.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Plugin Engine + Alias Plugins** - Build the loader, registry, and alias system. Ship with git + common-aliases plugins to prove the framework end-to-end.
   - Addresses: Plugin loader, alias expansion, config integration, the git plugin (most popular OMZ plugin)
   - Avoids: Slow startup (two-phase loading from day one), plugin crash (error boundaries from day one), alias loops (expand-once rule)

2. **Completion Engine + Utility Plugins** - Build the readline completer integration and Fig-style completion specs. Ship docker, kubectl, npm completions and utility plugins (extract, copypath, sudo toggle).
   - Addresses: Tab completion framework (~100 plugins unlocked), interactive hook integration (sudo ESC-ESC), utility function plugins
   - Avoids: Completer blocking event loop (async + timeout), completion conflicts (prefix routing)

3. **Auto-suggestions + History Search** - Build the keypress event layer for fish-like suggestions from history. Implement history substring search.
   - Addresses: The two most-requested features (28K + stars), readline keypress integration
   - Avoids: ANSI in line buffer (output-only rendering), typing lag (debounce + cache), sensitive history exposure (pattern filtering)

4. **Syntax Highlighting + Profiles + Plugin Management** - Build the syntax highlighter (emphasize integration), profile system, and plugin CLI for install/update/remove.
   - Addresses: Syntax highlighting (18K stars), curated profiles (developer/devops/cloud), git-installable third-party plugins
   - Avoids: Typing lag (debounce with frame budget), import failures (validate pre-compiled JS), stale profiles (additive design)

5. **Batch Port + Ecosystem Growth** - Port remaining ~250 OMZ plugins. AI-enhanced plugin discovery. Lazy loading optimization. Community plugin documentation.
   - Addresses: Full OMZ parity, Nesh-unique AI differentiator, performance at scale
   - Avoids: Package size bloat (lazy completion specs), prompt latency (async segments with timeout)

**Phase ordering rationale:**
- Phase 1 first: the loader + registry + aliases are prerequisites for every other plugin feature. The git plugin proves the system with the single most-used OMZ plugin.
- Completions (Phase 2) before suggestions (Phase 3): completions unlock ~100 plugins immediately and have a simpler readline integration (the built-in completer API). Suggestions require the more complex keypress event layer.
- Suggestions (Phase 3) before highlighting (Phase 4): suggestions are more impactful (28K stars vs 18K) and simpler to implement (history search vs grammar-based tokenization). Building the keypress layer for suggestions also establishes the infrastructure that highlighting reuses.
- Profiles and plugin management (Phase 4): require a stable plugin catalog to curate profiles from, and stable loader to manage installs against.
- Batch porting (Phase 5): the framework must be proven stable before investing in porting 250+ plugins.

**Research flags for phases:**
- Phase 2: Completion engine needs empirical validation of readline async completer behavior with slow providers. Test with artificial 500ms delay.
- Phase 3: Keypress event handler interaction with readline's internal state (`rl.line`, `rl.cursor`) needs careful testing -- these are documented but their update timing relative to keypress events is implementation-dependent.
- Phase 4: emphasize performance with long lines and rapid typing needs benchmarking. The library processes single lines in <1ms per their docs, but the full render cycle (clear + write + cursor restore) may add overhead.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new deps for core; emphasize and simple-git are well-maintained, verified on npm |
| Features | HIGH | OMZ plugin catalog fully analyzed; top-30 ranked by stars + recommendation frequency; competing frameworks (zinit, sheldon, Fig) surveyed for innovation adoption |
| Architecture | HIGH | Based on direct analysis of all 22 existing Nesh source files; integration points identified by filename; new module boundaries follow existing patterns (pure functions, immutable state, lazy loading) |
| Pitfalls | HIGH | Critical pitfalls sourced from OMZ community (slow startup), Node.js issues (ANSI cursor bug), shell design literature (alias loops), and plugin system design patterns (error boundaries) |

## Gaps to Address

- **readline keypress timing:** The exact timing of when `rl.line` and `rl.cursor` update relative to the `keypress` event needs empirical testing. Documentation suggests they update before the event fires, but this needs verification on Node 22+.
- **emphasize bundle size:** Need to measure how much `emphasize` (and its lowlight/highlight.js dependency) adds to the tsdown bundle. If >500KB, consider lazy-loading it only when syntax highlighting is enabled.
- **Fig completion spec licensing:** The withfig/autocomplete specs are MIT-licensed, but the format may evolve after Amazon's acquisition. Need to define our own compatible TypeScript types rather than depending on their package directly.
- **Windows readiness:** The plugin API is designed platform-neutral, but no Windows testing is planned for v3.0. Some plugins (colored-man-pages, brew) are inherently platform-specific. Need a platform annotation in the manifest.
- **Plugin authoring DX:** How third-party plugin authors compile TypeScript to JS for distribution needs documentation. Consider shipping a `nesh plugin init` scaffolding command.

## Sources

### Primary (HIGH confidence)
- [Oh My Zsh Wiki - Plugins](https://github.com/ohmyzsh/ohmyzsh/wiki/plugins)
- [Oh My Zsh Wiki - Design](https://github.com/ohmyzsh/ohmyzsh/wiki/Design)
- [Oh My Zsh Wiki - Plugins Overview](https://github.com/ohmyzsh/ohmyzsh/wiki/Plugins-Overview)
- [Zsh Plugin Standard](https://wiki.zshell.dev/community/zsh_plugin_standard)
- [Node.js Readline API v25](https://nodejs.org/api/readline.html)
- [zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions)
- [zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting)

### Secondary (MEDIUM confidence)
- [Zinit turbo mode](https://github.com/zdharma-continuum/zinit)
- [Sheldon configuration](https://sheldon.cli.rs/Configuration.html)
- [Fig Autocomplete specs](https://github.com/withfig/autocomplete)
- [TypeScript Plugin Architecture patterns](https://dev.to/hexshift/designing-a-plugin-system-in-typescript-for-modular-web-applications-4db5)
- [Node.js Plugin Manager patterns](https://v-checha.medium.com/node-js-advanced-patterns-plugin-manager-44adb72aa6bb)

---
*Research completed: 2026-04-03*
*Ready for roadmap: yes*
