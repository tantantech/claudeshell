# Technology Stack

**Project:** Nesh v3.0 -- Oh-My-Nesh Plugin Ecosystem
**Researched:** 2026-04-03

## Existing Stack (No Changes Needed)

These are already in place and validated from v1/v2. Listed for integration context only.

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | >=22.0.0 | Runtime (ESM, recursive fs.watch support) |
| TypeScript | ^6.0.2 | Language with strict mode |
| @anthropic-ai/claude-agent-sdk | ^0.2.91 | AI backbone |
| marked + marked-terminal | ^15 / ^7.3 | Markdown rendering |
| picocolors | ^1.1.1 | Terminal colors |
| openai | ^6.33.0 | OpenAI-compatible providers |
| @google/generative-ai | ^0.24.1 | Gemini provider |
| tsdown | ^0.21.7 | Bundler |
| tsx | ^4.21.0 | Dev runner |
| vitest | ^4.1.2 | Tests |
| node:readline/promises | built-in | REPL input |

## New Stack Additions for v3

### Plugin Loader and Lifecycle (zero new dependencies)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js dynamic `import()` | built-in | Load plugin modules at runtime | Nesh already uses lazy `import()` for the Claude SDK. Same pattern extends to plugins. No loader library needed -- plugins are standard ESM modules with a known export shape. |
| `node:fs` (readdir, stat) | built-in | Discover plugins in directories | Scan `~/.nesh/plugins/` and bundled plugin dirs at startup. Synchronous discovery is fine -- oh-my-zsh does the same. |
| `node:path` + `node:url` | built-in | Resolve plugin paths to `file://` URLs for `import()` | Required for cross-platform dynamic import of absolute paths on both macOS and Linux. |

**Rationale:** A plugin is a directory containing an `index.ts` (or compiled `index.js`) that default-exports an object conforming to the `NeshPlugin` interface. No plugin framework library is needed -- the TypeScript interface IS the framework. This mirrors how oh-my-zsh works: a naming convention (`<name>.plugin.zsh`) plus a known structure. In Nesh, the convention is `<name>/index.js` exporting a `NeshPlugin`.

**Why not tapable/architect/c9:** These are plugin systems designed for complex multi-hook pipelines (webpack) or large-scale server dependency injection (Cloud9). Nesh plugins have a simple lifecycle: `init(context) -> active -> destroy()`. A TypeScript interface enforces the contract at compile time. Adding a plugin framework library would be over-engineering.

### Auto-Suggestions Engine (zero new dependencies)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `readline.emitKeypressEvents()` | built-in | Intercept each keystroke for ghost-text rendering | Emits `keypress` events on stdin. Combined with `rl.line` and `rl.cursor`, provides all primitives needed for fish-style suggestions. |
| `readlinePromises.Readline` class | built-in | Cursor manipulation (`cursorTo`, `clearLine`, `moveCursor`) with transaction support | The Readline class provides `commit()`/`rollback()` for batched cursor operations. Avoids flicker when clearing and redrawing ghost text. |
| History-based suggestion source | custom code | Prefix-match current input against command history | zsh-autosuggestions works primarily from history. Same approach: search `~/.nesh/history` for the most recent line matching the current prefix. No external library needed. |

**How it works:** On each keypress, check history for the most recent command starting with `rl.line`. If found, render the remaining suffix in dim ANSI (`\x1b[2m...text...\x1b[0m`) after the cursor position. On the next keypress, clear the ghost text before processing. Right-arrow accepts the full suggestion (copies it to `rl.line`). This is exactly how zsh-autosuggestions and fish work.

**Why no library exists:** Auto-suggestions for Node.js readline is a niche requirement. No maintained npm package implements fish-style ghost text on top of `node:readline`. The primitives (`rl.line`, `rl.cursor`, `readline.cursorTo`, `readline.clearLine`) are all built-in. The implementation is approximately 100-150 lines.

**Confidence:** HIGH -- all APIs verified against Node.js v25 readline documentation.

### Syntax Highlighting (one new dependency)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **emphasize** | ^7.0.0 | ANSI syntax highlighting for shell commands | Wraps lowlight/highlight.js to output ANSI-colored text for 190+ languages. Use the `bash` grammar to highlight shell input in real-time. ESM-compatible, TypeScript types included, maintained by wooorm (unified ecosystem). |

**Why emphasize over cli-highlight:** emphasize outputs ANSI escape codes directly from a highlight.js grammar. cli-highlight converts highlight.js HTML output to ANSI -- an unnecessary intermediate step that adds latency. For real-time keystroke rendering where every millisecond matters, the direct ANSI path is better. emphasize is also smaller (fewer transitive deps) and part of the well-maintained unified/remark ecosystem.

**Why not custom regex-based highlighting:** Shell syntax is deceptively complex: nested quotes, heredocs, parameter expansion (`${var:-default}`), process substitution, globbing, escape sequences. A proper grammar-based highlighter (highlight.js bash grammar) handles all of these correctly. A regex approach would require months of edge-case fixing.

**Integration with readline:** On each keypress, run `emphasize.highlight('bash', rl.line)` to get ANSI-colored output. Clear the current line, move cursor to start, write the highlighted text, then restore cursor position. The `readlinePromises.Readline` transaction APIs (`clearLine(0)`, `cursorTo(col)`, `commit()`) handle this without flicker. Performance is not a concern -- highlight.js processes single lines in under 1ms.

**Confidence:** HIGH -- emphasize verified on npm, ESM-compatible, TypeScript types bundled.

### Tab Completion System (zero new dependencies)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `readline.createInterface({ completer })` | built-in | Tab completion hook | Node readline has a built-in completer function API that supports both sync and async completers. Returns `[[completions], originalSubstring]`. This is the hook point for all plugin-provided completions. |
| Fig-style completion spec types | custom TypeScript types | Declarative completion definitions per command | Adopt the Fig/withfig autocomplete spec format as TypeScript interfaces. Plugins define completions as `{ name, subcommands, options, args }` trees. This is the de facto industry standard used by Fig, Warp, and Amazon Q. |

**Completer function signature (from Node.js docs):**
```typescript
// Sync
function completer(line: string): [string[], string]
// Async
function completer(line: string): Promise<[string[], string]>
```

**Why Fig-style specs:** The withfig/autocomplete repository has 400+ existing completion specs for common CLI tools (git, docker, npm, kubectl). By adopting compatible types, Nesh plugins can reference and adapt these specs. The format is a nested tree: commands have subcommands, options (flags starting with `-`), and args. Args can have generators (static lists or dynamic shell commands like `git branch --list`).

**Confidence:** HIGH for readline completer API. MEDIUM for Fig spec compatibility -- Fig was acquired by Amazon and the format may evolve, but the existing TypeScript types in withfig/autocomplete are stable and MIT-licensed.

### Git Operations for Plugin Install (one new dependency)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **simple-git** | ^3.27.0 | Clone and update plugin repos from GitHub/GitLab | Wraps the system `git` CLI with a clean async API. Full TypeScript types, ESM support since v3, 19M weekly npm downloads. |

**Why simple-git over isomorphic-git:** isomorphic-git is a pure JavaScript git reimplementation (~300KB+, heavy transitive deps). It is designed for environments without a git binary (browsers, serverless). Nesh users installing plugins from git repos already have git installed -- they are developers using a developer shell. simple-git wraps the existing binary, which is faster, smaller, and handles authentication (SSH keys, credential helpers) naturally.

**Why simple-git over raw spawn:** simple-git provides: (1) progress callbacks for download progress display, (2) proper error typing with structured error objects, (3) shallow clone support (`--depth 1`) for faster installs, (4) pull/fetch for updates, (5) edge case handling (auth prompts, large repos, timeout). Worth the small dependency for a clean plugin install UX.

**Why not degit:** degit (Rich Harris) downloads tarballs without git history -- good for scaffolding but plugins need `git pull` for updates. Plugin update is a core requirement.

**Confidence:** HIGH -- simple-git verified on npm, actively maintained, 19M weekly downloads.

### Shell Function and Alias Registration (zero new dependencies)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Extended `classifyInput()` | existing code in classify.ts | Route plugin-registered aliases before passthrough | Aliases are `Map<string, string>` (name to expansion). Before passthrough classification, check alias map and expand. Pure code change. |
| Shell function registry | custom `Map<string, PluginFunction>` | Store plugin-provided functions callable from shell | Functions are `(args: string[], context: PluginContext) => Promise<void>`. Registered by plugins during init, invoked by name before passthrough. Same as builtins but dynamically registered. |

**How oh-my-zsh does it:** Plugins define aliases via `alias gst='git status'` and functions via `function gco() { ... }`. In Nesh, plugins call `context.registerAlias('gst', 'git status')` and `context.registerFunction('gco', handler)` during init. The classify step checks these registries before falling through to passthrough.

**Integration with classify.ts:** Currently `classifyInput()` checks builtins then falls through to passthrough. The new flow: builtins -> function registry -> alias expansion -> passthrough. A new `InputAction` variant `{ type: 'plugin-function'; name: string; args: string }` handles function invocations. Alias expansion rewrites the command string and re-classifies.

### Plugin Configuration (zero new dependencies)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Extended `NeshConfig` | existing code in config.ts | Add `plugins`, `profile`, `plugin_settings` to config | Extend `~/.nesh/config.json` with `{ plugins: ["git", "docker"], profile: "developer", plugin_settings: { git: { aliases: true } } }`. Same validated JSON config pattern already used. |
| `.nesh.json` project overrides | existing code in config.ts | Per-project plugin activation | Already supports project config. Add `plugins` field so projects can activate project-specific plugins (e.g., `node` plugin only in Node.js projects). |

### File Watching for Plugin Dev Mode (zero new dependencies)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `node:fs.watch` (recursive) | built-in (Node 22+) | Watch plugin source for hot-reload during development | Node 22+ supports `recursive: true` on macOS (FSEvents) and Linux (inotify). Sufficient for watching a single plugin directory during dev. Only activated via `nesh --dev-plugins` flag. |

**Why not chokidar:** Chokidar v5 (Nov 2025) is ESM-only and adds ~1.5MB. For the narrow use case of watching a single plugin directory during development (not production), native `fs.watch` with recursive support on Node 22+ is sufficient. If edge cases arise, chokidar can be added later.

## Stack Additions Summary

| Category | New Dependencies | Rationale |
|----------|-----------------|-----------|
| Plugin loader | 0 | ESM `import()` + TypeScript interface contract |
| Auto-suggestions | 0 | readline keypress events + ANSI escape codes |
| Syntax highlighting | 1 (emphasize) | Grammar-based bash highlighting, direct ANSI output |
| Tab completions | 0 | readline completer API + Fig-style TypeScript specs |
| Git plugin install | 1 (simple-git) | Clone/update repos, progress callbacks, error handling |
| Aliases/functions | 0 | Extended classify.ts + Map registries |
| Configuration | 0 | Extended existing NeshConfig |
| File watching (dev) | 0 | Node 22+ native fs.watch recursive |
| **Total new deps** | **2** | **Minimal footprint, max capability** |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Plugin loader | Native ESM `import()` | tapable (webpack) | Massive overkill for init/destroy lifecycle. |
| Plugin loader | Native ESM `import()` | architect (c9) | Server-oriented DI framework. Too heavy. |
| Auto-suggestions | Custom readline | ink (React for CLI) | Replaces readline entirely. Full rewrite for marginal benefit. |
| Auto-suggestions | Custom readline | prompts / enquirer | One-shot prompt libs, not persistent REPL shells. |
| Syntax highlighting | emphasize | cli-highlight | HTML-to-ANSI intermediate step adds latency. |
| Syntax highlighting | emphasize | Custom regex | Shell syntax too complex for regex correctness. |
| Git operations | simple-git | isomorphic-git | 300KB+ pure JS git. Users have git installed. SSH auth issues. |
| Git operations | simple-git | degit | No git history means no `git pull` for updates. |
| Completion format | Fig-style specs | Custom format | Fig is the industry standard with 400+ existing specs. |
| File watching | node:fs.watch | chokidar v5 | Unnecessary 1.5MB dep for Node 22+ recursive watch. |
| Config validation | Manual checks | zod | Overkill for config objects. Existing pattern works. |

## What NOT to Add

| Technology | Why Not |
|------------|---------|
| **zod** | Config validation uses manual type checks (existing pattern in config.ts). Zod adds ~50KB for no benefit. |
| **ink / blessed** | Would replace readline REPL. Auto-suggestions and highlighting layer on top of readline with ANSI. |
| **yeoman / plop** | Plugin scaffolding is mkdir + writeFile. No generator framework needed. |
| **semver** | Version constraints not needed for v3.0. Plugins work or they don't. |
| **tar / decompress** | simple-git handles clone. No tarball extraction needed. |
| **ora / cli-spinners** | Existing dim stderr status lines for progress. No spinner lib needed. |
| **cosmiconfig** | Config resolution already handled by loadConfig/loadProjectConfig/mergeConfigs. |
| **commander / yargs** | Plugin CLI subcommands are simple string splitting. No framework needed. |

## Installation

```bash
# New production dependencies (2 total)
npm install emphasize simple-git

# No new dev dependencies needed
```

## Integration Points with Existing Architecture

### classify.ts
- Before returning `passthrough`, check function registry then alias registry
- New action type: `{ type: 'plugin-function'; name: string; args: string }`
- Alias expansion rewrites the command string and re-classifies

### shell.ts
- Plugin initialization after config load, before REPL loop starts
- Plugin cleanup (`destroy()`) on shell exit
- Pass aggregated completer function to `readline.createInterface({ completer })`
- Keypress listener setup for auto-suggestions after readline interface creation
- New `plugin-function` case in the action switch

### config.ts
- Extend `NeshConfig` with: `plugins?: string[]`, `profile?: string`, `plugin_settings?: Record<string, Record<string, unknown>>`
- Extend `loadProjectConfig()` to read plugin overrides from `.nesh.json`

### types.ts
- New `NeshPlugin` interface (the core plugin contract)
- New `PluginContext` interface (registries, config, shell state access)
- New `CompletionSpec` types (Fig-compatible tree structure)
- Extended `InputAction` union with `plugin-function` variant
- Extended `BuiltinName` with `plugin` for management CLI

### New source files (src/plugins/)
- `src/plugins/loader.ts` -- discover, validate, import, init/destroy plugins
- `src/plugins/registry.ts` -- alias, function, and completion registries (Maps)
- `src/plugins/suggestions.ts` -- auto-suggestion engine (keypress + ghost text)
- `src/plugins/highlighter.ts` -- syntax highlighting (emphasize integration)
- `src/plugins/completions.ts` -- Fig-style spec resolver + readline completer
- `src/plugins/installer.ts` -- git clone/update for external plugins (simple-git)
- `src/plugins/profiles.ts` -- profile presets (developer, devops, cloud, ai-engineer)
- `src/plugins/types.ts` -- NeshPlugin, PluginContext, CompletionSpec interfaces

### Bundled plugin directories (src/plugins/builtins/)
- One directory per ported oh-my-zsh plugin
- Each exports a `NeshPlugin` conforming object
- Compiled into dist/ as part of the build

## Sources

- [Node.js Readline API v25](https://nodejs.org/api/readline.html) -- completer function, keypress events, cursor position, Readline transaction APIs (HIGH confidence)
- [Oh My Zsh Design Wiki](https://github.com/ohmyzsh/ohmyzsh/wiki/Design) -- plugin architecture: load order, naming conventions, no formal deps (HIGH confidence)
- [Oh My Zsh Plugins Wiki](https://github.com/ohmyzsh/ohmyzsh/wiki/plugins) -- full plugin listing for porting scope (HIGH confidence)
- [Oh My Zsh Plugins Overview](https://github.com/ohmyzsh/ohmyzsh/wiki/plugins-overview) -- plugin categorization (HIGH confidence)
- [emphasize (GitHub)](https://github.com/wooorm/emphasize) -- ANSI syntax highlighting, ESM, TS types (HIGH confidence)
- [simple-git (npm)](https://www.npmjs.com/package/simple-git) -- git wrapper, 19M weekly downloads, ESM + TS since v3 (HIGH confidence)
- [Fig Completion Spec Docs](https://fig.io/docs/getting-started/first-completion-spec) -- spec format standard (MEDIUM confidence)
- [withfig/autocomplete (GitHub)](https://github.com/withfig/autocomplete) -- 400+ existing completion specs (MEDIUM confidence)
- [isomorphic-git](https://isomorphic-git.org/) -- evaluated and rejected (HIGH confidence on rationale)
- [chokidar v5 (GitHub)](https://github.com/paulmillr/chokidar) -- evaluated and rejected for Node 22+ (HIGH confidence on rationale)
- [Plugin Architecture with TypeScript (dev.to)](https://dev.to/hexshift/designing-a-plugin-system-in-typescript-for-modular-web-applications-4db5) -- TS plugin patterns (LOW confidence)
