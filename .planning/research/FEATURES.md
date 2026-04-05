# Feature Landscape: Oh-My-Nesh Plugin Ecosystem

**Domain:** Shell plugin framework / oh-my-zsh TypeScript port
**Researched:** 2026-04-03
**Overall confidence:** HIGH (based on OMZ repo analysis, Zsh Plugin Standard, competing framework analysis, popularity data)

## How Oh-My-Zsh Plugins Actually Work

### Plugin File Structure

Every OMZ plugin lives in `~/.oh-my-zsh/plugins/<name>/` and must contain `<name>.plugin.zsh` as the entry point. The [Zsh Plugin Standard](https://wiki.zshell.dev/community/zsh_plugin_standard) defines the full anatomy:

```
plugin-name/
  plugin-name.plugin.zsh   # Main entry (sourced on load)
  _plugin-name             # Completion function (optional, added to $fpath)
  functions/               # Autoload functions directory (optional)
  bin/                     # Executables added to $PATH (optional)
  README.md                # Documentation
```

**Loading mechanism:** OMZ iterates the `plugins=(...)` array in `.zshrc`, sources each `<name>.plugin.zsh`, and adds completion dirs to `$fpath`. There is no dependency resolution, no lazy loading, no lifecycle hooks beyond basic sourcing. Plugins execute top-level code on source (defining aliases, env vars, function definitions).

**Lifecycle in the standard:** The Zsh Plugin Standard (not OMZ itself) defines `{plugin-name}_plugin_unload` for cleanup, `@zsh-plugin-run-on-unload` and `@zsh-plugin-run-on-update` callbacks, and a `PMSPEC` parameter for manager capability discovery. OMZ does not implement any of these -- only advanced managers like zinit do.

### Plugin Categories (by implementation pattern)

Analysis of the ~350 OMZ plugins reveals **5 distinct implementation categories** with very different porting complexity for Nesh:

| Category | Count | What They Do | Examples | Nesh Porting Complexity |
|----------|-------|-------------|----------|------------------------|
| **Aliases-only** | ~120 | Define shell aliases (`alias gst='git status'`) | git, brew, docker, npm, kubectl, common-aliases | LOW - pure data mapping |
| **Completion-only** | ~100 | Add tab-completion for CLI tools via zsh completion functions | aws, terraform, helm, docker-compose, gh | MEDIUM - need completion engine |
| **Environment setup** | ~40 | Set env vars, modify PATH, initialize version managers | nvm, pyenv, rbenv, direnv, dotenv, virtualenv | LOW-MEDIUM - env manipulation |
| **Hooks/Widgets** | ~30 | Bind zle widgets, precmd/preexec hooks, key bindings | autosuggestions, syntax-highlighting, sudo, history-substring-search, bgnotify | HIGH - need hook system + readline integration |
| **Full tools** | ~50 | Define functions, commands, or full utilities | extract, z, web-search, encode64, copypath, thefuck, jsontools | MEDIUM-HIGH - reimplement logic in TS |

### Nesh Architecture Integration Points

Based on the existing Nesh codebase (`src/` analysis):

| Nesh Module | Plugin Integration Surface |
|-------------|---------------------------|
| `classify.ts` | Must add `plugin-command` action type for plugin-provided builtins/commands |
| `builtins.ts` | Plugin-provided commands register here or in a parallel command registry |
| `passthrough.ts` | Alias expansion must happen BEFORE passthrough to `bash -c` |
| `shell.ts` | Plugin lifecycle hooks (preexec, precmd, chpwd) attach to the REPL loop |
| `prompt.ts` | Prompt segment plugins (git info, virtualenv, kube context) feed into prompt builder |
| `types.ts` | `ShellState` needs plugin state extension mechanism (currently has no plugin field) |
| `config.ts` | Plugin enable/disable, per-plugin config, profiles all extend the config schema |
| `context.ts` | AI-enhanced plugin suggestions use project detection already built here |

---

## Table Stakes

Features users expect from any OMZ-compatible plugin system. Missing = "why not just use OMZ?"

| # | Feature | Why Expected | Complexity | Nesh Dependency |
|---|---------|--------------|------------|-----------------|
| 1 | **Alias expansion** | Core value of ~120 plugins. Users type `gst` and expect `git status`. | LOW | `classify.ts` - expand before passthrough |
| 2 | **Plugin enable/disable** | OMZ has `plugins=(...)` array. Users expect declarative config. | LOW | `config.ts` - plugins array in nesh config |
| 3 | **Git aliases plugin** | THE most used OMZ plugin (177 aliases, universal adoption). Every OMZ user has it enabled. | LOW | Alias system only |
| 4 | **Tab completion framework** | ~100 plugins exist solely to add completions. Without this, one-third of all plugins are useless. | HIGH | New `completion.ts` engine integrated with Node readline |
| 5 | **Directory jumping (z/zoxide)** | Top-5 most requested feature. Users expect `z project` to jump to ~/Projects/myproject. | MEDIUM | New module, frecency database, `cd` hook in shell loop |
| 6 | **Environment/PATH management** | Plugins like nvm, pyenv, rbenv modify PATH and set env vars on shell init. | LOW | `shell.ts` init hooks, `process.env` manipulation |
| 7 | **Extract utility** | Universal archive extraction. Users expect `extract foo.tar.gz` to just work. | LOW | Single function, delegates to system tools (tar, unzip, 7z) |
| 8 | **Sudo toggle (ESC ESC)** | Extremely popular convenience. Press ESC twice to prepend sudo to current/previous command. | MEDIUM | Readline key binding integration |
| 9 | **Colored man pages** | Visual improvement users notice immediately when missing. | LOW | Set LESS_TERMCAP_* environment variables |
| 10 | **History substring search** | Arrow-key search through history by partial match. Fish-shell's most loved feature. | MEDIUM | Readline customization with custom keybindings |
| 11 | **Plugin config in nesh config** | Users expect `~/.nesh/config.json` to control plugins, not a separate system. | LOW | `config.ts` extension of existing schema |
| 12 | **Bundled core plugins** | OMZ ships 350 plugins built-in. Users expect common ones to work without any install step. | LOW | Ship as npm package contents in dist/ |
| 13 | **Custom plugin directory** | OMZ has `$ZSH_CUSTOM/plugins/`. Users expect to drop in their own plugins. | LOW | Config path + loader scanning |
| 14 | **Web search from terminal** | `web-search google "query"` opens browser. Simple but beloved utility. | LOW | Single function using `open`/`xdg-open` |
| 15 | **Common aliases plugin** | Aliases for ls, grep, mkdir, etc. Baseline productivity improvement. | LOW | Alias system only |

---

## Differentiators

Features that set Nesh apart from OMZ. Not expected, but create "why would I go back?" moments.

| # | Feature | Value Proposition | Complexity | Nesh Dependency |
|---|---------|-------------------|------------|-----------------|
| 1 | **AI-enhanced plugin discovery** | `a suggest plugins for this project` analyzes cwd and recommends plugins. No other shell does this. | MEDIUM | `ai.ts` + `context.ts` integration |
| 2 | **Profile system** | Pick "developer", "devops", "cloud", "ai-engineer" and get curated plugin sets instantly. OMZ has no profiles; Sheldon does via TOML. | MEDIUM | New `profiles.ts`, config extension |
| 3 | **TypeScript plugin API** | Type-safe plugin authoring with interfaces and compile-time validation. Catches errors before runtime, unlike shell scripts. | HIGH | New `plugin-api.ts` with full type definitions |
| 4 | **Cross-platform by default** | OMZ plugins are zsh-only. Nesh plugins work on macOS + Linux with zero shell dependency. | LOW (inherent) | Already Node.js based |
| 5 | **Lazy loading with startup metrics** | Zinit's killer feature (turbo mode, 80% faster startup). Nesh can do this natively with dynamic `import()`. | MEDIUM | Plugin loader with deferred imports |
| 6 | **Plugin dependency resolution** | OMZ has zero dependency management. Plugin A requiring Plugin B just fails silently. Prezto's `pmodload` is the only framework that handles this. | MEDIUM | Topological sort in loader |
| 7 | **Native syntax highlighting** | Reimplement zsh-syntax-highlighting (18K stars) in TypeScript. Works everywhere, no zsh dependency. | HIGH | New `syntax.ts`, deep readline integration |
| 8 | **Native autosuggestions** | Reimplement zsh-autosuggestions (28K stars) in TypeScript. Fish-like suggestions from history. | HIGH | New `suggestions.ts`, readline integration |
| 9 | **Plugin management CLI** | `nesh plugin install`, `nesh plugin search`, `nesh plugin list`. OMZ has no CLI for plugin management. | MEDIUM | New `plugin-cli.ts` |
| 10 | **Git-installable plugins** | `nesh plugin install gh:user/repo`. Like zinit/sheldon but built into the shell. | MEDIUM | Git clone + plugin loader |
| 11 | **Per-project plugin config** | `.nesh/plugins.json` in project root activates project-specific plugins automatically. OMZ is global-only. | LOW | `config.ts` already has project config infrastructure |
| 12 | **Hot reload** | Change plugin config, plugins reload without shell restart. OMZ requires `source ~/.zshrc`. | MEDIUM | File watcher + plugin unload/reload lifecycle |
| 13 | **Plugin health checks** | `nesh plugin doctor` checks for conflicts, missing dependencies, performance issues. | LOW | Diagnostic runner over loaded plugins |
| 14 | **Declarative completion specs (Fig-style)** | JSON/TS completion specs for any CLI tool, like Fig's 500+ specs. Community-contributable, higher quality than zsh completion functions. | HIGH | New completion engine with spec parser |
| 15 | **AI-powered alias recall** | Forget an alias? `a what's the git stash alias?` answers from loaded plugin data. | LOW | `ai.ts` with plugin context injection |

---

## Anti-Features

Features to explicitly NOT build. Tempting but wrong for Nesh.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Source .plugin.zsh files directly** | Creates zsh dependency, defeats cross-platform goal, shell-in-shell performance nightmare | Port plugin logic to TypeScript modules |
| **Theme engine (OMZ themes)** | Nesh already has 5 prompt templates. OMZ themes are zsh-specific with `PROMPT=` syntax. Massive scope creep (140+ themes). | Extend existing template system with plugin-provided prompt segments |
| **Full zsh compatibility layer** | Emulating zsh builtins/options (zle, zstyle, setopt) is unbounded work with diminishing returns | Port the ~80% of plugins that are pure aliases/functions; mark zsh-specific ones as "not applicable" |
| **Plugin marketplace/registry** | Premature. Need plugin ecosystem to exist first. Registry adds auth, hosting, moderation overhead. | Use Git URLs (GitHub/GitLab) for third-party plugins, like zinit and sheldon do |
| **GUI plugin manager** | Nesh is a terminal shell. A separate GUI app is scope creep and architectural mismatch. | Interactive TUI picker using readline, like the existing theme selector |
| **Runtime zsh subprocess for unsupported plugins** | Spawning zsh to run a plugin defeats the purpose. Performance and portability nightmare. | Mark unsupported plugins clearly. Provide migration guide for plugin authors. |
| **Windows support in v3.0** | OMZ does not support Windows. Adding it now doubles testing surface for no proven user demand. | Design for it (no unix-specific assumptions in plugin API) but do not test or ship yet |
| **Plugin sandboxing/permissions** | Over-engineering. Plugins run in the same Node.js process. Sandboxing adds complexity with no real security benefit for CLI tools. | Trust model: bundled plugins are trusted, git-installed plugins show a warning on first load |

---

## Top 30 Most Popular/Used OMZ Plugins (Ranked)

Ranked by combination of: GitHub stars (for external plugins), recommendation frequency across 8+ "best plugins" articles from 2024-2026, and category importance. Stars data from [Top Popular ZSH Plugins on GitHub](https://safjan.com/top-popular-zsh-plugins-on-github-2023/) and [Best Oh My ZSH Plugins 2026](https://www.bitdoze.com/best-oh-my-zsh-plugins/).

| Rank | Plugin | Category | Stars/Signal | Port Priority | Complexity |
|------|--------|----------|-------------|---------------|------------|
| 1 | **git** | Aliases | Built-in, universal adoption, 177 aliases | P0 | LOW |
| 2 | **zsh-autosuggestions** | Hooks/Widgets | 28K stars, every "best plugins" list | P0 | HIGH |
| 3 | **zsh-syntax-highlighting** | Hooks/Widgets | 18K stars, every "best plugins" list | P0 | HIGH |
| 4 | **z** | Full tool | 15K stars, top-5 in all lists | P0 | MEDIUM |
| 5 | **fzf** | Full tool | 49K stars (standalone tool) | P1 | HIGH |
| 6 | **sudo** | Hooks/Widgets | Built-in, appears in every top-10 list | P0 | MEDIUM |
| 7 | **extract** | Full tool | Built-in, appears in every top-10 list | P0 | LOW |
| 8 | **docker** | Completion | Built-in, essential for DevOps users | P1 | MEDIUM |
| 9 | **kubectl** | Completion | Built-in, essential for cloud/k8s users | P1 | MEDIUM |
| 10 | **history-substring-search** | Hooks/Widgets | Built-in, Fish-inspired, top-10 lists | P0 | MEDIUM |
| 11 | **npm** | Completion | Built-in, essential for Node.js developers | P1 | MEDIUM |
| 12 | **colored-man-pages** | Environment | Built-in, frequently recommended | P0 | LOW |
| 13 | **web-search** | Full tool | Built-in, frequently cited in articles | P1 | LOW |
| 14 | **thefuck** | Full tool | 76K stars (standalone tool) | P1 | MEDIUM |
| 15 | **aws** | Completion | Built-in, essential for cloud users | P1 | MEDIUM |
| 16 | **common-aliases** | Aliases | Built-in, baseline productivity | P0 | LOW |
| 17 | **copypath** | Full tool | Built-in, simple utility | P0 | LOW |
| 18 | **copyfile** | Full tool | Built-in, simple utility | P0 | LOW |
| 19 | **encode64** | Full tool | Built-in, simple utility | P0 | LOW |
| 20 | **alias-finder** | Full tool | Built-in, helps users learn their aliases | P1 | LOW |
| 21 | **dotenv** | Environment | Built-in, auto-loads .env files on cd | P1 | LOW |
| 22 | **docker-compose** | Completion | Built-in, pairs with docker plugin | P1 | MEDIUM |
| 23 | **nvm** | Environment | Built-in, essential for Node.js developers | P1 | LOW |
| 24 | **pyenv** | Environment | 30K stars (standalone tool) | P1 | LOW |
| 25 | **zoxide** | Full tool | Modern successor to z, growing fast | P1 | MEDIUM |
| 26 | **terraform** | Completion | Built-in, essential for IaC users | P2 | MEDIUM |
| 27 | **bgnotify** | Hooks/Widgets | Built-in, notifies on long-running command completion | P1 | MEDIUM |
| 28 | **direnv** | Environment | Built-in, per-directory env loading | P1 | LOW |
| 29 | **virtualenv** | Environment | Built-in, Python virtual env indicator | P2 | LOW |
| 30 | **brew** | Aliases | Built-in, macOS-specific aliases | P2 | LOW |

**Priority key:** P0 = ship in initial release (proves the system), P1 = fast follow (broadens value), P2 = community demand driven.

---

## Feature Dependencies

```
Plugin Loader -------> ALL other plugin features depend on this
  (lifecycle,           being built first
   registry,
   config integration)

Alias System ---------> Git Plugin, Common Aliases, Brew, Docker aliases,
  (expand before         kubectl aliases, npm aliases
   passthrough)          (~120 aliases-only plugins depend on this)

Completion Engine ----> Docker, Kubectl, NPM, AWS, Terraform, Helm,
  (readline tab          docker-compose completions
   integration)          (~100 completion plugins depend on this)

Readline Hook --------> Sudo toggle, History substring search,
  System                 Autosuggestions, Syntax highlighting
  (key bindings,         (~30 interactive plugins depend on this)
   preexec/precmd)

Shell Lifecycle ------> Directory jumping (z/zoxide needs chpwd hook),
  Hooks                  Dotenv (needs chpwd), bgnotify (needs preexec/precmd),
  (chpwd, preexec,       Per-directory history, git-auto-fetch
   precmd)

Config System --------> Plugin enable/disable, Profiles, Per-project plugins,
  Extension              Per-plugin configuration
  (plugins array,
   profile selection)

Prompt Segments ------> Git info in prompt, Virtualenv indicator,
  API                    Kube context display, Node version
  (plugin-provided       (prompt-enriching plugins)
   prompt data)
```

**Critical path 1:** Plugin Loader -> Alias System -> Git plugin
*Proves the system works with the single most-used plugin*

**Critical path 2:** Plugin Loader -> Readline Hooks -> History substring search
*Proves interactive/keybinding plugins work*

**Critical path 3:** Plugin Loader -> Completion Engine -> Docker/kubectl completions
*Proves completions work -- unlocks ~100 plugins*

---

## What Competing Frameworks Improve Over OMZ

| Framework | Key Innovation | Should Nesh Adopt? |
|-----------|---------------|-------------------|
| **Zinit** | Turbo mode (async/lazy loading, 80% faster startup). Plugin-level bytecode compilation. Load reporting (`zinit times`). | YES: lazy loading via dynamic `import()`. YES: `nesh plugin times` for load diagnostics. |
| **Sheldon** | TOML config with profiles. Shell-agnostic design. Rust-speed parallel install. Template-based plugin rendering. | YES: profiles (already planned). YES: declarative config (already JSON-based). |
| **Antidote** | Static plugin file generation (zero runtime parsing overhead). Concurrent plugin resolution. | PARTIAL: Nesh compiles to JS anyway, so "static" is inherent. No extra work needed. |
| **Fig/Warp** | IDE-style completion specs (declarative JSON schemas for 500+ CLIs). Visual autocomplete dropdown. | YES: declarative completion specs are higher quality than zsh completion functions and community-contributable. |
| **Prezto** | Module system with explicit dependencies (`pmodload`). Optimized defaults (zcompdump caching, `--no-rehash` for version managers). | YES: dependency resolution between plugins. YES: smart defaults out of the box. |
| **Zplug** | DSL for plugin sources (GitHub, local, oh-my-zsh snippets). Hook system (at-load, at-unload). | PARTIAL: Git source support. YES: lifecycle hooks (onLoad, onUnload, onUpdate). |

### Synthesized Improvements for Nesh Over OMZ

1. **Lazy loading by default** (from Zinit) - Plugins loaded on first use, not shell startup
2. **Profiles** (from Sheldon) - Curated plugin sets for developer personas
3. **Declarative completion specs** (from Fig) - JSON/TS specs instead of zsh completion functions
4. **Dependency resolution** (from Prezto) - Plugins declare what they need, loader resolves order
5. **Lifecycle hooks** (from Zsh Plugin Standard) - onLoad, onUnload, onUpdate
6. **Performance diagnostics** (from Zinit) - `nesh plugin times` shows per-plugin load cost
7. **Static type safety** (unique to Nesh) - TypeScript catches plugin errors at build time, not at shell startup

---

## Plugin Manager Features Users Expect

Based on analysis of zinit, sheldon, antidote, zplug, zgenom, and community discussions:

| Feature | Must Have | Nice to Have | Overkill for v3 |
|---------|-----------|-------------|-----------------|
| Enable/disable plugins in config | YES | | |
| List installed/enabled plugins | YES | | |
| Search available bundled plugins | | YES | |
| Install from git URL | YES | | |
| Update installed plugins | YES | | |
| Remove installed plugins | YES | | |
| Lazy loading (deferred init) | | YES (becomes must-have at >20 plugins) | |
| Profiles/groups | | YES | |
| Lock file (pinned versions) | | | YES |
| Plugin templates/scaffolding | | | YES |
| Parallel install | | YES | |
| Post-install hooks | | YES | |
| Interactive TUI browser | | YES | |
| Conflict detection | | | YES |
| Plugin update notifications | | | YES |

---

## MVP Recommendation

### Phase 1: Prove the Engine (ship first, validates architecture)

Prioritize features that prove the plugin system works end-to-end across all 5 categories:

1. **Plugin loader with lifecycle** - load, enable, disable, unload
2. **Alias system** - expand aliases before passthrough (unlocks ~120 plugins)
3. **Git plugin** - THE most used plugin, pure aliases, proves aliases-only category
4. **Common aliases** - Second most basic plugin, proves breadth
5. **Extract, copypath, copyfile, encode64** - Simple utility plugins, proves full-tool category
6. **Colored man pages** - Proves environment-setup category
7. **Plugin config in nesh config** - `{ "plugins": ["git", "common-aliases", "extract"] }`
8. **Sudo toggle** - Proves readline hook integration

### Phase 2: Interactive Power (fast follow, the "wow" features)

9. **History substring search** - Proves readline integration at depth
10. **Completion engine** - Unlocks ~100 completion plugins
11. **Directory jumping (z)** - High-demand utility plugin
12. **Autosuggestions** - Killer feature (28K stars), requires deep readline work
13. **Profile system** - "developer", "devops", "cloud" presets
14. **Plugin management CLI** - `nesh plugin list/install/remove/update`

### Phase 3: Ecosystem Growth (community and scale)

15. **Syntax highlighting** - Most complex interactive plugin (18K stars)
16. **Git-installable third-party plugins** - Opens community ecosystem
17. **Declarative completion specs** - Fig-style, community contributable
18. **Lazy loading** - Performance at scale (>20 plugins)
19. **AI-enhanced plugin discovery** - Nesh's unique differentiator
20. **Batch port of P1/P2 alias and environment plugins** (docker, kubectl, npm, aws, nvm, pyenv, etc.)

### Defer Indefinitely

- Plugin marketplace/registry (premature)
- Windows support (no demand)
- OMZ theme engine (already have templates)
- Zsh compatibility layer (unbounded scope)
- Plugin sandboxing (over-engineering)

---

## Sources

### Official Repositories and Documentation
- [Oh-My-Zsh GitHub](https://github.com/ohmyzsh/ohmyzsh) - 155K stars, 350+ plugins, 2400+ contributors
- [OMZ Plugins Wiki](https://github.com/ohmyzsh/ohmyzsh/wiki/plugins) - Complete alphabetical plugin list with descriptions
- [OMZ Plugins Overview](https://github.com/ohmyzsh/ohmyzsh/wiki/plugins-overview) - Categorized list (Productivity, Build Tools, Node, PHP, Ruby, Python, Distro, macOS, Misc)
- [Zsh Plugin Standard](https://wiki.zshell.dev/community/zsh_plugin_standard) - Formal spec: file structure, $0 handling, PMSPEC, lifecycle hooks, naming conventions
- [OMZ Git Plugin Source](https://github.com/ohmyzsh/ohmyzsh/blob/master/plugins/git/git.plugin.zsh) - 177 aliases reference implementation

### Plugin Managers and Competing Frameworks
- [Zinit](https://github.com/zdharma-continuum/zinit) - Turbo mode, async loading, plugin bytecode compilation
- [Sheldon](https://github.com/rossmacarthur/sheldon) - TOML config, profiles, Rust performance, shell-agnostic
- [Sheldon Configuration Docs](https://sheldon.cli.rs/Configuration.html) - Profile system, templates, plugin sources
- [Antidote](https://getantidote.github.io/) - Static plugin file generation, concurrent resolution
- [Fig Autocomplete](https://github.com/withfig/autocomplete) - 500+ declarative completion specs, IDE-style
- [Prezto](https://github.com/sorin-ionescu/prezto) - Module system with pmodload, optimized defaults
- [Zplug](https://github.com/zplug/zplug) - DSL for sources, parallel install, lazy loading, hooks

### Popularity and Rankings
- [Top Popular ZSH Plugins on GitHub (2023)](https://safjan.com/top-popular-zsh-plugins-on-github-2023/) - Comprehensive stars-based ranking across categories
- [Best Oh My ZSH Plugins for 2026](https://www.bitdoze.com/best-oh-my-zsh-plugins/) - Current recommendations with categories
- [24 Zsh Plugins for 2025](https://dev.to/chandrashekhar/24-zsh-plugins-every-developer-devops-engineer-should-use-in-2025-383k) - Developer/DevOps focus
- [Top 10 OMZ Plugins for Productive Developers](https://travis.media/blog/top-10-oh-my-zsh-plugins-for-productive-developers/) - Productivity focus
- [The Only 6 Zsh Plugins You Need](https://catalins.tech/zsh-plugins/) - Minimalist essential set

### Framework Comparisons and Performance
- [ZSH Frameworks and Plugin Managers Comparison](https://gist.github.com/laggardkernel/4a4c4986ccdcaf47b91e8227f9868ded) - Detailed performance and feature analysis with startup benchmarks
- [Plugin Manager Benchmark](https://github.com/rossmacarthur/zsh-plugin-manager-benchmark) - Load time and install time benchmarks
- [Slant: Best Plugin Managers for ZSH (2026)](https://www.slant.co/topics/3265/~best-plugin-managers-for-zsh) - Community voting and comparison
