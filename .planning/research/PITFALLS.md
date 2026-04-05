# Domain Pitfalls

**Domain:** oh-my-zsh plugin ecosystem port to TypeScript/Node.js shell (Nesh v3.0)
**Researched:** 2026-04-03
**Scope:** Adding a full plugin ecosystem to an existing AI-native terminal shell
**Note:** v2 pitfalls (session management, PTY, pipes, permissions) are assumed addressed. This document covers pitfalls specific to the plugin ecosystem milestone.

---

## Critical Pitfalls

Mistakes that cause rewrites, major performance regressions, or security incidents.

### Pitfall 1: Readline Cannot Do Real-Time Input Coloring or Inline Suggestions

**What goes wrong:** Node.js `readline` calculates cursor position based on string length in the line buffer. ANSI escape codes injected for syntax highlighting are invisible characters that corrupt this calculation, causing the cursor to jump to wrong positions, text to wrap incorrectly, and input to become garbled. This is a [known, longstanding Node.js issue](https://github.com/nodejs/node-v0.x-archive/issues/3860). Auto-suggestions require rendering "ghost text" after the cursor and accepting it on right-arrow -- readline has zero API for this.

**Why it happens:** `readline` was designed for simple line-by-line input, not as a terminal UI framework. The [node-color-readline](https://github.com/aantthony/node-color-readline) package attempted to solve this 9 years ago and was abandoned -- the approach is fundamentally broken because readline's internal cursor tracking cannot be overridden without monkey-patching private state.

There are two distinct sub-problems:
- **Syntax highlighting:** Must NEVER put ANSI codes in `rl.line`. The line buffer must remain plain text. Highlighting is output-only: save cursor position, move to start of input area, write ANSI-colored version, restore cursor.
- **Auto-suggestions ghost text:** Requires rendering dim text AFTER the cursor position that is not part of the actual input buffer. readline has no concept of "display text that is not input." Accepting the suggestion (right-arrow) must replace the buffer contents.

**Consequences:** If you bolt these features onto `readline`:
- Cursor position corruption on every colored re-render
- Broken line wrapping when input exceeds terminal width
- Ghost text that persists after acceptance or appears at wrong offset
- Flickering on every keystroke as you clear and re-render
- The current `shell.ts` REPL loop (line 44-50) creates `readline.createInterface` that owns stdin -- this must eventually be replaced

**Prevention:**
1. **Phase correctly.** Ship the plugin framework first with standard readline. The plugin framework provides the DATA (completions, aliases, hooks). The custom input engine CONSUMES that data later. These are separate concerns.
2. **For highlighting within readline constraints:** Use output-only rendering. After each keypress, use `readline.clearLine()` and `readline.cursorTo()` to rewrite the colored line, then restore cursor. Never modify `rl.line` with ANSI codes.
3. **For full auto-suggestions:** Build a custom input handler using `process.stdin.setRawMode(true)` with manual keypress parsing, cursor tracking, and ANSI rendering. This is what zsh-autosuggestions and fish do -- they own the entire input pipeline. Study the [zsh-autosuggestions strategy pattern](https://deepwiki.com/zsh-users/zsh-autosuggestions) (history, completion, match_prev_cmd).
4. **Test rigorously:** Lines >80 chars (wrap boundary), Unicode characters (multi-byte width), terminal resize during input, rapid typing (>5 chars/sec).

**Detection:** Type a command >30 characters with highlighting enabled. If the cursor is not where it should be, ANSI codes have leaked into the line buffer. If ghost text from suggestions does not disappear after acceptance, the rendering model is wrong.

**Risk:** CRITICAL
**Phase:** Architecture decision in Phase 1. Plugin framework can ship before this is solved (plugins provide data; rendering engine consumes it later). Custom input engine is a dedicated phase.

---

### Pitfall 2: Loading 300 Plugins Synchronously Kills Startup Time

**What goes wrong:** Eagerly `import()`-ing 300 plugin modules at startup adds 2-5 seconds of load time. Each file must be read from disk, parsed by V8, and have its top-level code executed. oh-my-zsh suffers this exact problem -- [users report 1-5 second startup times](https://github.com/ohmyzsh/ohmyzsh/issues/5327) and the primary fix is disabling plugins. Zinit and [lazy.nvim](https://deepwiki.com/folke/lazy.nvim/4.2-plugin-loading-and-initialization) exist specifically because this problem is so severe.

**Why it happens:** The natural implementation is `for (plugin of enabled) await import(plugin)`. This is correct but scales terribly. Version manager plugins (nvm, rbenv, pyenv) are especially expensive because they shell out to detect installed versions at load time. One user [reduced zsh startup from 1.5s to 200ms](https://armno.in.th/blog/zsh-startup-time/) just by lazy-loading nvm.

**Consequences:**
- Shell takes 3-5 seconds to show first prompt (users expect < 200ms)
- Users disable plugins to restore speed, defeating the ecosystem
- "nesh is slow" becomes the dominant complaint on day one
- Startup time grows linearly with enabled plugins, no ceiling

**Prevention:**
1. **Lazy loading IS the architecture, not an optimization.** Every plugin ships a static `manifest.json` declaring aliases, completions, commands, and hooks. The loader reads manifests (fast JSON parse) and defers `import()` until first invocation.
2. **Two-phase loading:** Phase 1 (sync, <50ms) registers alias-only plugins as pure data (object literals, no `import()`). Phase 2 (deferred via `setImmediate`) initializes plugins with `init()` functions AFTER the first prompt renders.
3. **Manifest pre-compilation.** On first run or after plugin changes, compile all manifests into a single `manifest-cache.json`. Subsequent startups read one file instead of 300.
4. **Benchmark gate in CI.** `time nesh -c exit` must complete in < 300ms with default profile. Fail CI if exceeded.
5. **`nesh plugin times` command** showing per-plugin load time so users can identify slow plugins.
6. **Follow existing pattern:** Nesh already lazy-loads the Claude Agent SDK on first `a` command (good pattern in `ai.ts`). Apply the same pattern to every plugin.

**Detection:** Measure `process.hrtime()` from process start to first prompt display. If > 500ms with default plugins, this pitfall is active.

**Risk:** CRITICAL
**Phase:** Must be solved in plugin loader architecture (Phase 1). Retrofitting lazy loading onto an eager loader requires rewriting every plugin's initialization contract.

---

### Pitfall 3: Zsh Plugins Are Not "Portable Aliases" -- They Use Deep Shell Internals

**What goes wrong:** Developers assume OMZ plugins are just collections of aliases that can be trivially translated to TypeScript. In reality, ~40% of OMZ plugins use zsh-specific features with no direct Node.js equivalent:

| Zsh Feature | What It Does | Node.js Equivalent |
|---|---|---|
| `compdef` / `compadd` | Register context-aware completions | None -- must build completion engine |
| `zle` widgets | Custom keybinding handlers modifying input line | None -- must build input engine |
| `precmd` / `preexec` hooks | Run code before prompt / before command | Must build hook system |
| `zstyle` | Hierarchical configuration for completion | Must build config system |
| `autoload -Uz` | Lazy function loading from fpath | Dynamic `import()` (different semantics) |
| `$BUFFER` / `$CURSOR` / `$LBUFFER` | Direct access to live input buffer | None in readline |
| `TRAPINT` / `TRAPUSR1` | Signal handler functions | `process.on('SIGINT')` (different scope) |

**Why it happens:** The git plugin (most popular) looks like "just aliases." But the docker plugin uses `compdef` extensively. The vi-mode plugin rewrites `zle` widgets. The history-substring-search plugin manipulates `$BUFFER` directly. Each category requires a different porting strategy, and the easy ones create false confidence.

**Consequences:**
- 1:1 porting is impossible for ~120 plugins that use zsh internals
- Ported plugins silently lose core functionality (completions missing, keybindings gone)
- Users compare against real OMZ and find Nesh plugins "broken"
- Scope balloons as each new zsh primitive is discovered mid-implementation

**Prevention:**
1. **Audit and categorize all 300 plugins before writing code.** Three buckets:
   - **Alias-only** (~100 plugins): Direct port. Examples: git, npm, yarn, brew.
   - **Completion-dependent** (~120 plugins): Require Nesh completion system. Examples: docker, kubectl, aws.
   - **Zsh-internal** (~80 plugins): Need equivalent Nesh APIs or full reimplementation. Examples: vi-mode, auto-suggestions, syntax-highlighting, history-substring-search.
2. **Build the plugin API surface before porting.** Define Nesh equivalents for: aliases, completions (context-aware), pre/post command hooks, keybindings, prompt segments.
3. **Port in waves by category.** Alias-only first (quick wins), then completion-dependent (after engine exists), then zsh-internal (hardest, requires custom input engine).
4. **Do not promise "all 300 OMZ plugins ported."** Promise "all 300 plugin capabilities available" -- many will be reimplementations with matching user-facing behavior.

**Detection:** If the first 20 ported plugins are all alias-only and the team reports "porting is easy," the hard 200 have been deferred.

**Risk:** CRITICAL
**Phase:** Plugin audit in research/design. Plugin API surface defined before any porting begins. This determines the entire phase structure.

---

### Pitfall 4: Running Untrusted Plugin Code from Git Repos Without Sandboxing

**What goes wrong:** Users install plugins from arbitrary git repos. These execute with full Node.js permissions: filesystem access, network, environment variables (API keys, SSH keys, AWS credentials), child process spawning. A malicious plugin can exfiltrate `~/.ssh`, `~/.aws/credentials`, or any API key in the environment.

**Why it happens:** Node.js has no built-in permission boundary for loaded modules. The `vm` module is [explicitly insecure](https://snyk.io/blog/security-concerns-javascript-sandbox-node-js-vm-module/) for untrusted code. `vm2` has been [abandoned due to unfixable sandbox escapes](https://github.com/patriksimek/vm2) -- in January 2026 [another critical escape was found](https://thehackernews.com/2026/01/critical-vm2-nodejs-flaw-allows-sandbox.html). In-process JavaScript sandboxing is a fundamentally unsolved problem.

**Consequences:**
- Supply chain attack via popular community plugin
- Plugins that silently alias-hijack `sudo`, `ssh`, `git push`
- Reputational catastrophe when "nesh plugin stole my AWS keys" hits Hacker News

**Prevention:**
1. **Tiered trust model.** Bundled plugins = trusted, in-process. Curated registry = human-reviewed. Arbitrary git repos = explicit warnings + restricted defaults.
2. **Permission declarations in manifest.** `{ "permissions": ["fs:read", "net", "env:PATH"] }`. Shown at install time like mobile app permissions.
3. **Do NOT attempt in-process sandboxing.** For untrusted plugins, use process-level isolation: child process with scrubbed env vars and restricted filesystem access.
4. **Start bundled-only.** Phase 1 ships only bundled plugins. Git-installable plugins come in a later phase after the security model is proven.
5. **Automated review tooling** for the curated registry: static analysis for `child_process`, `fs.write` outside plugin dir, undeclared `net` or `process.env` access.

**Detection:** If the loader uses bare `import(userPath)` on user-installed code without isolation, this pitfall is active.

**Risk:** CRITICAL
**Phase:** Security model designed in Phase 1. Git-installable plugins deferred to Phase 3+.

---

### Pitfall 5: Plugin Error Crashes the Entire Shell

**What goes wrong:** A plugin throws an unhandled exception in `init()`, or a completion provider throws during Tab, or a hook throws during preCommand. The exception propagates up through the REPL loop and crashes the shell. If the crashing plugin is in the user's config, every new shell session crashes -- they cannot use the shell at all.

**Why it happens:** Plugin code is untrusted (even bundled plugins can have bugs triggered by unusual system configs). Without error boundaries, any throw in plugin code reaches `shell.ts`'s try/catch or becomes an unhandled rejection. OMZ itself is fragile here -- a bad `.plugin.zsh` prevents shell startup entirely.

**Consequences:** Users lose their shell session. Repeated crashes on startup lock users out until they manually edit `~/.nesh/config.json`.

**Prevention:**
1. Every plugin lifecycle call (`init`, `destroy`) runs inside try-catch. Failures log a warning and disable the plugin, they never crash the shell.
2. Every hook dispatch runs inside try-catch that logs and skips the failing hook.
3. Every completion provider has a try-catch AND a timeout (1 second max).
4. If a plugin fails 3 times in a row across sessions, auto-disable with a warning.
5. `nesh plugin doctor` command shows failed plugins and reasons.
6. Safe mode: `nesh --safe` starts with zero plugins for recovery.

**Detection:** Install a plugin with `init() { throw new Error('boom') }`. Shell must start normally with a warning.

**Risk:** CRITICAL
**Phase:** Plugin loader Phase 1. Error boundaries must be baked into the loader from day one.

---

## High Pitfalls

### Pitfall 6: Plugin State Mutation Breaks Immutable ShellState Pattern

**What goes wrong:** Nesh uses immutable `ShellState` (see `src/types.ts`: every field is `readonly`, updates use `state = { ...state, field: value }`). Plugins will store their own state (git branch cache, env snapshots, completion caches). If plugins mutate shared objects or maintain mutable singletons, it breaks the architectural invariant.

**Why it happens:** Zsh plugins freely mutate global variables -- this is the programming model being ported FROM. Plugin authors will naturally write `this.cache = newValue`. The immutable pattern requires deliberate API enforcement.

**Consequences:**
- Race conditions between plugins during async operations
- Plugins that work alone break when combined
- Gradual erosion of the immutable pattern

**Prevention:**
1. **Namespaced state via PluginContext.** `context.getState<T>()` and `context.setState<T>(updater: (prev: T) => T)`. Plugins never see `ShellState`.
2. **TypeScript enforcement.** `Readonly<T>` state types, `readonly` API parameters.
3. **`Object.freeze()` in dev mode** to catch mutations with thrown errors.
4. **Lint rule** banning direct `process.env` mutation and `ShellState` imports in plugin code.

**Detection:** Grep for `ShellState` imports in plugin code. Any plugin importing it violates the boundary.

**Risk:** HIGH
**Phase:** Plugin API design (Phase 1). Must be locked before any plugins are written.

---

### Pitfall 7: Completion System Cannot Match Zsh's Context-Awareness

**What goes wrong:** Zsh completions are deeply context-aware: `git ch<TAB>` completes to subcommands, `git checkout <TAB>` completes to branches. A naive flat word list feels broken compared to real zsh. [Existing Node.js completion libraries](https://github.com/mklabs/tabtab) only support command-level completions, not argument-level.

**Why it happens:** Zsh has decades of hand-written completion definitions encoding deep command grammar knowledge. Building this from scratch for even 50 commands is months of work.

**Consequences:** Completions feel "dumb" compared to zsh. This becomes the #1 reason users don't switch. Without completions, 120+ plugins lose their primary value.

**Prevention:**
1. **Leverage Fig's open-sourced completion specs** (archived March 2025). 500+ command grammars already written in TypeScript.
2. **Shell-out fallback.** If Nesh cannot complete natively, ask `bash`/`zsh` (if available) via `compgen`. Provides 80% coverage on day one.
3. **Prioritize top 20 commands.** git, docker, npm, kubectl, ssh, cd, aws, gcloud, terraform, cargo. Hand-craft these; use fallback for rest.
4. **Pluggable completions.** Each plugin registers its own completion provider. The engine dispatches based on command prefix (longer prefixes win over shorter).
5. **Async completion with timeout.** Providers that spawn subprocesses (`docker ps` for container names) get a 1-second timeout. Cache results for 5 seconds. Show "completing..." indicator. Ctrl+C cancels pending provider.

**Detection:** `git checkout <TAB>` should show branch names, not file names. If it shows file names, context-awareness is missing.

**Risk:** HIGH
**Phase:** Completion engine architecture in Phase 1. Individual command completions added incrementally.

---

### Pitfall 8: Keypress Event Handler Latency Causes Typing Lag

**What goes wrong:** The syntax highlighter and auto-suggestion engine process every keypress. If processing takes >16ms, users perceive lag -- characters appear late, cursor stutters.

**Why it happens:** On each keypress: (1) readline processes key, (2) highlighter tokenizes and colors the line, (3) suggester searches history, (4) both write ANSI to stdout. Long lines, large history, or slow terminals exceed the budget.

**Consequences:** Users disable highlighting and suggestions because typing feels slow. The most-requested features ship but are unusable.

**Prevention:**
1. **Debounce highlighting:** Only re-highlight after 10ms of no keypress (pause in typing). Fast continuous typing skips re-rendering.
2. **Cache suggestion results:** If current prefix matches cached prefix, reuse result.
3. **History search:** Reverse linear scan with early exit on first match. Do not sort/index full history per keypress.
4. **Diff-based rendering:** Compare new highlighted output against previous render. Only write changed portions to stdout.
5. **Frame budget profiling:** `process.hrtime.bigint()` before/after keypress handler. If >10ms, skip current render cycle.
6. **Both features independently disablable** in config.

**Detection:** Type quickly (>5 chars/sec) with both features enabled. If visible delay, the handler is too slow.

**Risk:** HIGH
**Phase:** Auto-suggestions/highlighting phase. Both require performance optimization from the start.

---

### Pitfall 9: Alias Expansion Infinite Loop

**What goes wrong:** Plugin A defines `g` -> `git`. Plugin B defines `git` -> `git --verbose`. Expansion enters infinite loop: `g` -> `git` -> `git --verbose` -> `git --verbose --verbose` -> ...

**Why it happens:** Naive expansion re-checks the expanded result against the alias registry. If aliases chain or cycle, expansion never terminates. The existing `classify.ts` classifies input by first word -- if alias expansion feeds back into classification, it loops.

**Consequences:** Shell hangs on any aliased command. User must force-kill.

**Prevention:**
1. **Expand aliases exactly once.** Look up first word, replace, do NOT re-check expanded first word.
2. **Depth limit as safety net** (max 10 levels, bail with error).
3. **Test with:** circular aliases (`a` -> `b`, `b` -> `a`), self-referencing (`git` -> `git --verbose`), chains (`g` -> `git` -> `git status`).

**Detection:** Define `alias x='x --flag'` and type `x`. If shell hangs, expansion is recursive.

**Risk:** HIGH
**Phase:** Alias system (Phase 1). Must be correct before any alias-bearing plugins are loaded.

---

### Pitfall 10: Cross-Platform Path and Shell Assumptions

**What goes wrong:** OMZ plugins assume Unix paths (`/usr/local/bin`), bash/zsh commands (`compgen`, `whence`, `type -p`), and GNU tool flags. macOS ships BSD `grep`/`sed` (different flags than GNU). Homebrew is at `/opt/homebrew` on Apple Silicon vs `/usr/local` on Intel.

**Consequences:** Plugin works on developer's Mac, fails on Linux CI (or vice versa). Hardcoded paths fail on non-standard installs.

**Prevention:**
1. **Pure TypeScript wherever possible.** Don't `spawn('grep')` -- use `string.match()`. Don't `spawn('which')` -- walk PATH with `node:fs`.
2. **Platform utility layer.** `platform.which(cmd)`, `platform.homeDir`, `platform.isAppleSilicon()`. Plugins use utilities, not raw `process.platform`.
3. **CI matrix testing** on macOS and Linux from Phase 1.
4. **Platform tags in manifest.** `{ "platforms": ["darwin"] }` for macOS-only plugins.

**Detection:** Grep plugin code for hardcoded paths, `spawn('grep')`, `spawn('sed')`.

**Risk:** HIGH
**Phase:** Utility layer in Phase 1. Platform testing ongoing.

---

### Pitfall 11: Plugin Dependency Ordering and Circular Dependencies

**What goes wrong:** Plugin A depends on Plugin B for shared helpers. Plugin B depends on C. C optionally enhances A. The loader must resolve this DAG correctly or plugins fail with "function not defined." OMZ has no dependency system -- [plugins break silently when listed in wrong order](https://github.com/ohmyzsh/ohmyzsh/issues/4932).

**Prevention:**
1. **Explicit dependencies in manifest.** `{ "dependencies": ["git"], "optionalDependencies": ["fzf"] }`. Loader topologically sorts.
2. **Cycle detection at load time.** Clear error naming participants. Never hang or loop.
3. **Auto-enable for bundled deps.** If plugin A requires `git` (bundled), auto-enable it with a notice. For third-party deps, refuse to load with an error.
4. **Integration tests for default profiles** verify zero conflicts and missing deps.

**Detection:** Enable two plugins defining the same alias. If last-loaded wins silently (no warning), collision detection is missing.

**Risk:** HIGH
**Phase:** Plugin loader Phase 1. Dependency resolution must be part of the initial loader.

---

## Moderate Pitfalls

### Pitfall 12: Alias Conflicts Between Plugins and User Config

**What goes wrong:** Plugin defines `g` for `git`. User has `g` for `goto`. Plugin silently overwrites. Or two plugins define `dc` (docker-compose vs desk calculator).

**Prevention:**
1. User aliases always win (loaded last).
2. Collision detection at load time with warning.
3. Per-plugin alias disable: `{ "docker": { "disabledAliases": ["dc"] } }`.
4. `nesh aliases` command listing all aliases with source plugin.

**Risk:** MEDIUM
**Phase:** Phase 1 (alias registration).

---

### Pitfall 13: Prompt Segment Integration Conflicts

**What goes wrong:** Nesh has a powerline prompt system (5 themes in `src/templates.ts`). Plugins that modify the prompt must integrate with templates. If plugins write raw ANSI to stdout, it conflicts with the existing system.

**Prevention:**
1. Prompt composed of segments provided by plugins. Renderer assembles; plugins never write prompt ANSI directly.
2. Plugins register: `context.registerPromptSegment('git-status', { position: 'left', priority: 50, render: () => ... })`.
3. Prompt segment plugins are async-capable with 100ms timeout. Cache values between renders.
4. For git: use `git rev-parse --abbrev-ref HEAD` (fast) not `git status` (slow in monorepos). The existing `getGitBranch()` in `prompt.ts` already follows this pattern.

**Risk:** MEDIUM
**Phase:** Phase 1 (prompt segment API before any prompt-modifying plugins).

---

### Pitfall 14: Dynamic import() Fails for User-Installed Plugins

**What goes wrong:** Plugin cloned to `~/.nesh/plugins/my-plugin/`. `import(pluginPath)` fails because: (a) path not a valid `file://` URL, (b) plugin is TypeScript not compiled JS, (c) plugin uses `require()` not ESM, (d) plugin has unresolved npm dependencies.

**Prevention:**
1. Convert paths to `file://` URLs via `pathToFileURL()` from `node:url`.
2. Require user plugins to be pre-compiled JS with ESM exports. Provide `nesh plugin build`.
3. Validate exports after import (check for required fields).
4. For v3.0, do NOT support raw TypeScript plugins (would require tsx at runtime).

**Risk:** MEDIUM
**Phase:** Plugin management CLI (Phase 2).

---

### Pitfall 15: History-Based Suggestions Expose Sensitive Commands

**What goes wrong:** Auto-suggestions display commands containing secrets: `export API_KEY=sk-...`, `mysql -p password123`. Ghost text visible to anyone looking at the screen.

**Prevention:**
1. Filter history entries matching secret patterns (`API_KEY=`, `TOKEN=`, `PASSWORD=`, `Bearer `).
2. Skip commands starting with space (zsh convention for non-history commands).
3. Configurable additional filter patterns.

**Risk:** MEDIUM
**Phase:** Auto-suggestions phase.

---

### Pitfall 16: Plugin Installation UX Complexity Kills Adoption

**What goes wrong:** [Nushell's plugin system](https://qqq.ninja/blog/post/nushell-install-plugins/) required multiple steps (download, register, activate, restart). Users reported the complexity "ruined the excitement." If Nesh requires more than one command, adoption suffers.

**Prevention:**
1. One command: `nesh plugin install <name>`. Downloads, registers, enables.
2. No restart required -- plugin activates in current session via hot-reload.
3. `nesh plugin search <query>` for discovery.
4. Bundled plugins require zero installation (profile selection or config toggle).
5. `nesh --safe` for recovery if a plugin breaks startup.

**Risk:** MEDIUM
**Phase:** Phase 2 (community plugin installation). Bundled plugins in Phase 1 sidestep this.

---

### Pitfall 17: Hot-Reload Causing State Corruption

**What goes wrong:** During development, a plugin is reloaded. Old registrations (aliases, completions, hooks) remain alongside new ones, causing duplicates or ghost behavior.

**Prevention:**
1. Plugin unload is symmetric with load: `deactivate()` removes everything `activate()` registered.
2. Framework tracks all registrations per-plugin and can bulk-remove.
3. Hot-reload = unload old + load new, never additive.

**Risk:** MEDIUM
**Phase:** Phase 1 (lifecycle design).

---

## Minor Pitfalls

### Pitfall 18: npm Package Size Explosion

**What goes wrong:** 300 plugin files add significant size. Users installing `npm install -g nesh` download more than needed.

**Prevention:** Alias-only plugins are tiny (~50KB for 150 plugins). Completion specs are larger -- load lazily or ship as optional `@nesh/plugins` package. Set 2MB size budget enforced in CI.

**Risk:** LOW
**Phase:** Phase 2+ (after plugin count grows).

---

### Pitfall 19: Environment Variable Leakage Between Commands

**What goes wrong:** Plugin sets `process.env.FOO = 'bar'` and it persists globally. Correct for `export` but wrong for per-command env vars.

**Prevention:** Plugin API provides `context.setEnv()` via immutable state. Lint rule flags direct `process.env` mutation.

**Risk:** LOW
**Phase:** Phase 1 (plugin API).

---

### Pitfall 20: Test Coverage Gap for Plugin Combinations

**What goes wrong:** Plugins pass isolated tests but conflict when combined in profiles.

**Prevention:** Integration tests for each default profile. Alias collision detection makes conflicts loud. Manifest validation catches dependency issues statically.

**Risk:** LOW
**Phase:** Ongoing from Phase 1.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|---|---|---|---|
| Plugin loader architecture | Eager loading kills startup (P2), crashes shell (P5) | Lazy-load by default; error boundaries on all lifecycle calls | CRITICAL |
| Plugin API surface | Zsh primitives have no equivalent (P3) | Audit all 300 plugins first; define API before porting | CRITICAL |
| Auto-suggestions engine | Readline cannot do ghost text (P1), typing lag (P8) | Custom input engine (later phase); debounce + cache | CRITICAL |
| Syntax highlighting | ANSI in line buffer corrupts cursor (P1), lag (P8) | Output-only rendering; frame budget; debounce | CRITICAL |
| Git-installable plugins | Untrusted code execution (P4) | Defer to Phase 3+; permission model first | CRITICAL |
| Alias system | Infinite loop (P9), conflicts (P12) | Expand once only; collision detection | HIGH |
| Completion engine | Flat completions feel broken (P7), blocks event loop | Context-aware engine; Fig specs; async + timeout | HIGH |
| Plugin state management | Mutation breaks architecture (P6) | Namespaced state API; TypeScript readonly | HIGH |
| Cross-platform porting | macOS/Linux divergence (P10) | Pure TS; platform utility layer; CI matrix | HIGH |
| Plugin dependencies | Silent ordering failures (P11) | Topological sort; cycle detection; auto-enable | HIGH |
| Prompt integration | Conflicts with templates (P13) | Segment-based composition API | MEDIUM |
| Plugin management CLI | import() failures (P14), UX complexity (P16) | pathToFileURL; one-command install; no restart | MEDIUM |
| Sensitive history | Suggestions expose secrets (P15) | Filter patterns for common secrets | MEDIUM |

---

## Lessons from Other Projects

| Project | What Failed | Lesson for Nesh |
|---|---|---|
| **oh-my-zsh** | [Startup time with many plugins](https://github.com/ohmyzsh/ohmyzsh/issues/5327) -- 1-5s startup, primary fix is disabling plugins | Lazy loading is the architecture, not an optimization |
| **Zinit** | Exists solely because OMZ startup was too slow | Turbo mode (deferred loading) is the proven pattern |
| **lazy.nvim** | [Solved 300+ plugin loading](https://deepwiki.com/folke/lazy.nvim/4.2-plugin-loading-and-initialization) with on-demand init | Separate registration from initialization. Trigger on command/event, not startup |
| **Fig** | [Archived March 2025](https://github.com/withfig/fig) -- tried to own completions via terminal emulator injection | Stay at shell level. Do not couple to terminal emulator internals |
| **vm2** | [Abandoned: unfixable sandbox escapes](https://github.com/patriksimek/vm2). [New escape Jan 2026](https://thehackernews.com/2026/01/critical-vm2-nodejs-flaw-allows-sandbox.html) | In-process JS sandboxing is a dead end. Use process-level isolation |
| **Nushell plugins** | [Multi-step install killed adoption](https://qqq.ninja/blog/post/nushell-install-plugins/) | One command, zero config, no restart |
| **node-color-readline** | [Abandoned 9 years ago](https://github.com/aantthony/node-color-readline) | Bolting color onto readline is a dead end |
| **Fish shell** | [POSIX incompatibility](https://batsov.com/articles/2025/05/20/switching-from-zsh-to-fish/) breaks aliases, env syntax | Match user-facing behavior, not internal syntax |

---

## Sources

- [Node.js readline ANSI cursor bug](https://github.com/nodejs/node-v0.x-archive/issues/3860) -- HIGH confidence
- [Node.js readline cursor/line API limitations](https://github.com/nodejs/node/issues/30347) -- HIGH confidence
- [oh-my-zsh slow startup issue #5327](https://github.com/ohmyzsh/ohmyzsh/issues/5327) -- HIGH confidence
- [oh-my-zsh slow startup issue #8536](https://github.com/ohmyzsh/ohmyzsh/issues/8536) -- HIGH confidence
- [Speeding up zsh with lazy loading](https://blog.mattclemente.com/2020/06/26/oh-my-zsh-slow-to-load/) -- HIGH confidence
- [Lazy-loading nvm for faster zsh](https://armno.in.th/blog/zsh-startup-time/) -- HIGH confidence
- [lazy.nvim plugin loading architecture](https://deepwiki.com/folke/lazy.nvim/4.2-plugin-loading-and-initialization) -- HIGH confidence
- [Lazy load completions for faster shell](https://willhbr.net/2025/01/06/lazy-load-command-completions-for-a-faster-shell-startup/) -- MEDIUM confidence
- [Snyk: Node.js vm module insecurity](https://snyk.io/blog/security-concerns-javascript-sandbox-node-js-vm-module/) -- HIGH confidence
- [vm2 abandoned, sandbox escapes](https://github.com/patriksimek/vm2) -- HIGH confidence
- [vm2 critical escape January 2026](https://thehackernews.com/2026/01/critical-vm2-nodejs-flaw-allows-sandbox.html) -- HIGH confidence
- [isolated-vm as alternative](https://riza.io/compare/isolated-vm-alternative) -- MEDIUM confidence
- [zsh-autosuggestions architecture](https://deepwiki.com/zsh-users/zsh-autosuggestions) -- HIGH confidence
- [node-color-readline (abandoned)](https://github.com/aantthony/node-color-readline) -- HIGH confidence
- [tabtab: Node.js tab completion](https://github.com/mklabs/tabtab) -- MEDIUM confidence
- [omelette: Node.js autocompletion](https://github.com/f/omelette) -- MEDIUM confidence
- [Fig archived March 2025](https://github.com/withfig/fig) -- HIGH confidence
- [Nushell plugin installation friction](https://qqq.ninja/blog/post/nushell-install-plugins/) -- MEDIUM confidence
- [Zsh to Fish migration gotchas](https://batsov.com/articles/2025/05/20/switching-from-zsh-to-fish/) -- MEDIUM confidence
- [OMZ plugin troubleshooting](https://www.w3tutorials.net/blog/how-can-i-fix-not-working-oh-my-zsh-plugins/) -- MEDIUM confidence
- [Node.js ESM dynamic import docs](https://nodejs.org/api/esm.html#import-expressions) -- HIGH confidence
- [Zinit turbo mode](https://github.com/zdharma-continuum/zinit) -- HIGH confidence
- [zsh-syntax-highlighting performance](https://github.com/zsh-users/zsh-syntax-highlighting/blob/master/docs/highlighters.md) -- MEDIUM confidence
