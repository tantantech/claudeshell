# Roadmap: ClaudeShell

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped)
- 🚧 **v2.0 Sessions & Power Features** - Phases 4-7 (in progress)
- 📋 **v3.0 Oh-My-Nesh Plugin Ecosystem** - Phases 8-12 (planned)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-3) - SHIPPED</summary>

### Phase 1: Shell Foundation
**Goal**: Users can launch ClaudeShell and use it as a functional interactive shell for everyday terminal work
**Depends on**: Nothing (first phase)
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05, SHELL-06, SHELL-07, SHELL-08, SHELL-09, ERR-03, PLAT-01
**Success Criteria** (what must be TRUE):
  1. User can launch ClaudeShell, see a prompt with the current directory, type shell commands, and see their output
  2. User can navigate directories with `cd` and the prompt updates; pipes, redirects, and shell syntax work correctly
  3. User can press up/down arrows to navigate command history, and that history persists after restarting the shell
  4. User can press Ctrl+C to cancel a running command without the shell exiting, and Ctrl+D or `exit` to quit cleanly
  5. Malformed input, missing commands, and unexpected errors never crash the shell
**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffolding, types, prompt generation, input classifier
- [x] 01-02-PLAN.md — Shell builtins (cd, export) and history persistence
- [x] 01-03-PLAN.md — Command passthrough, REPL loop, CLI entry point
- [x] 01-04-PLAN.md — Integration tests and human verification

### Phase 2: AI Integration
**Goal**: Users can invoke Claude via the `a` command and get streaming AI responses with full tool-use capabilities
**Depends on**: Phase 1
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, CONF-01, CONF-02, ERR-01, ERR-02
**Success Criteria** (what must be TRUE):
  1. User can type `a <prompt>` and Claude's response streams back token-by-token with markdown formatting and syntax highlighting
  2. User can press Ctrl+C during an AI response to cancel the stream and return to the shell prompt
  3. User can see when Claude is reading files or running commands as part of its response, and those tool actions execute correctly
  4. User sees a clear error message when the API key is missing, when rate-limited, or when the network is down
  5. After a failed command, user can ask AI to explain the error and gets a useful response
**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — Type contracts, config module, classifier update, passthrough stderr capture
- [x] 02-02-PLAN.md — AI module (SDK wrapper) and streaming renderer
- [x] 02-03-PLAN.md — Shell REPL integration and end-to-end verification

### Phase 3: Distribution & Platform
**Goal**: Users can install ClaudeShell via npm and use it reliably on macOS and Linux
**Depends on**: Phase 2
**Requirements**: CONF-03, PLAT-01, PLAT-02, PLAT-03
**Success Criteria** (what must be TRUE):
  1. User can run `npm install -g claudeshell` and the `claudeshell` command is available system-wide
  2. User can configure shell behavior via a `~/.claudeshell/config` file
  3. All Phase 1 and Phase 2 functionality works identically on both macOS and Linux
**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md — Config file support and npm distribution packaging
- [x] 03-02-PLAN.md — Cross-platform validation and CI test script

</details>

<details>
<summary>v2.0 Sessions & Power Features (Phases 4-7)</summary>

### Phase 4: Sessions & Chat Mode
**Goal**: Users can have continuous AI conversations that remember context, switch between shell and chat modes instantly, choose their model, and see what each interaction costs
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04, SESS-05, SESS-06, VIS-01, VIS-02
**Success Criteria** (what must be TRUE):
  1. User can run multiple `a` commands in sequence and Claude remembers what was discussed earlier in the session
  2. User can type `a` with no prompt to enter chat mode, sees a distinct `ai >` prompt, and every line goes to Claude until typing `/exit` to return to shell mode
  3. User can type `/new` to start a fresh AI context without restarting the shell
  4. User can select a model per query (`a --haiku "quick question"`) or set a default model in config, and Claude responds using that model
  5. After each AI response, user sees token count and estimated cost; in chat mode, cumulative session cost is shown
**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md — Foundation types, session.ts, and cost.ts modules
- [x] 04-02-PLAN.md — Model flag parsing, AI pipeline session/model/cost wiring
- [x] 04-03-PLAN.md — Chat mode module and shell REPL integration

### Phase 5: Pipe & Unix Integration
**Goal**: Users can pipe data through AI like any Unix tool and get automatic help recovering from command failures
**Depends on**: Phase 4
**Requirements**: PIPE-01, PIPE-02, PIPE-03, ERR-04, ERR-05, CFG-01
**Success Criteria** (what must be TRUE):
  1. User can run `cat log.txt | a summarize` and the file contents are passed as context to Claude
  2. When stdout is piped (e.g., `a generate csv | head -5`), AI output is plain text without colors, markdown formatting, or spinner artifacts
  3. When a shell command fails, ClaudeShell automatically shows an AI-suggested fix that the user can accept or ignore
  4. User can type `a fix` after a failed command and Claude attempts to fix it automatically
  5. User can configure a custom AI command prefix (e.g., `ai` or `claude` instead of `a`) via config file
**Plans:** 3 plans

Plans:
- [x] 05-01-PLAN.md — Pipe mode: stdin detection, pipe.ts module, cli.ts wiring
- [x] 05-02-PLAN.md — Error recovery: auto-fix suggestions and `a fix` command
- [x] 05-03-PLAN.md — Configurable AI command prefix

### Phase 6: Context & Permissions
**Goal**: Users can trust ClaudeShell to understand their project and respect their boundaries on what AI can modify
**Depends on**: Phase 4
**Requirements**: CTX-01, CTX-02, PERM-01, PERM-02, PERM-03, CFG-02
**Success Criteria** (what must be TRUE):
  1. When inside a project directory, ClaudeShell auto-detects the project type (Node.js, Rust, Go, etc.) and Claude's responses reflect that context
  2. User can place a `.claudeshell.json` in any directory and its settings (model, permissions, prefix) override global config for that project
  3. User can configure permission mode (auto-approve, ask-each-time, or deny-all) for AI file edits globally and per-project
  4. When permission mode is "ask", user sees exactly what Claude wants to do (file path, action) and can approve or deny inline before it happens
**Plans:** 3 plans

Plans:
- [x] 06-01-PLAN.md — Types, context detection module, per-project config loading
- [x] 06-02-PLAN.md — Permission control in AI pipeline, /permissions chat command
- [x] 06-03-PLAN.md — Shell REPL integration: startup detection, cd re-detection wiring

### Phase 7: PTY & Polish
**Goal**: Interactive terminal programs work correctly inside ClaudeShell without visual glitches or broken input
**Depends on**: Phase 5, Phase 6
**Requirements**: PTY-01, PTY-02
**Success Criteria** (what must be TRUE):
  1. User can run interactive commands (vim, ssh, less, htop) and they display and accept input correctly
  2. After an interactive command exits, the shell prompt restores cleanly with no visual artifacts or broken input state
**Plans:** 2/2 plans complete

Plans:
- [x] 07-01-PLAN.md — Interactive command detection module, types/config extension, unit tests
- [x] 07-02-PLAN.md — Shell REPL integration with readline pause/resume and human verification

</details>

### v3.0 Oh-My-Nesh Plugin Ecosystem (Planned)

**Milestone Goal:** Make Nesh a full oh-my-zsh replacement by building a native TypeScript plugin framework with all ~300 OMZ plugins ported, organized into user profiles, and cross-platform.

**Phase Numbering:**
- Integer phases (8, 9, 10, 11, 12): Planned milestone work
- Decimal phases (8.1, 9.1): Urgent insertions (marked with INSERTED)

- [ ] **Phase 8: Plugin Engine & Alias System** - Core plugin framework with loader, registry, hooks, error boundaries, and alias expansion proven with git plugin
- [ ] **Phase 9: Completion Engine & Utility Plugins** - Tab completion framework with Fig-style specs, bash fallback, and top-20 command completions plus utility plugin ports
- [ ] **Phase 10: Auto-Suggestions & History Search** - Fish-like ghost text from history with keypress engine, debounce, and sensitive pattern filtering
- [ ] **Phase 11: Syntax Highlighting, Profiles & Plugin Management** - Real-time input coloring, curated plugin profiles, full plugin CLI with git install and interactive menus
- [ ] **Phase 12: Batch Port, Migration & Discovery** - Remaining ~250 plugin ports, OMZ migration detector, AI-enhanced plugin discovery, and theme integration

## Phase Details

### Phase 8: Plugin Engine & Alias System
**Goal**: Users can enable plugins that register aliases, and the shell expands those aliases transparently -- proven end-to-end with the git plugin (most popular OMZ plugin)
**Depends on**: Phase 7 (v2.0 complete)
**Requirements**: PLUG-01, PLUG-02, PLUG-03, PLUG-04, PLUG-05, PLUG-06, PLUG-07, PLUG-08, ALIAS-01, ALIAS-02, ALIAS-03, ALIAS-04, ALIAS-05, ALIAS-06, PORT-02
**Success Criteria** (what must be TRUE):
  1. User can enable the git plugin in config, start Nesh, and type `gst` to run `git status` -- alias expansion works transparently in the command pipeline
  2. Shell startup with 30+ enabled plugins completes in under 300ms (two-phase loading: sync alias data <50ms, async init deferred)
  3. A crashing plugin never crashes the shell -- user sees a warning and continues working; `nesh --safe` starts with zero plugins for recovery
  4. User aliases in config always override plugin aliases; when two plugins define the same alias, user sees a collision warning
  5. User can run `nesh aliases` to see all active aliases grouped by source plugin, and can disable specific aliases per-plugin in config
**Plans:** 3 plans

Plans:
- [x] 08-01-PLAN.md — Plugin type contracts, immutable registry, and alias expansion module
- [x] 08-02-PLAN.md — Plugin loader, dependency resolver, hook dispatch, and git plugin
- [x] 08-03-PLAN.md — Shell integration: config, builtins, REPL wiring, safe mode, and human verification

### Phase 9: Completion Engine & Utility Plugins
**Goal**: Users get context-aware Tab completions for common developer tools and can use utility plugins like extract, copypath, and sudo toggle
**Depends on**: Phase 8
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, PORT-03, PORT-04
**Success Criteria** (what must be TRUE):
  1. User can press Tab after `git ch` and see branch-aware completions; the top 20 commands (git, docker, npm, kubectl, ssh, aws, etc.) have hand-crafted completions
  2. Completion providers are async with a 1-second timeout -- slow providers never block typing; results are cached for repeated queries
  3. User can install a plugin that provides Fig-style declarative completion specs, and those specs drive Tab behavior for that command
  4. When no native completion is available, Tab falls back to bash/zsh compgen so the user always gets some completion
  5. Utility plugins work cross-platform: extract handles common archives, sudo toggle prepends sudo with a keystroke, copypath copies the current path
**Plans:** 3 plans

Plans:
- [x] 09-01-PLAN.md — Completion types, TTL cache, compgen fallback, and Fig-style spec parser
- [x] 09-02-PLAN.md — Completion engine dispatcher, plugin manifest extension, and shell.ts wiring
- [x] 09-03-PLAN.md — Top 20 command completion specs and utility plugin ports

### Phase 10: Auto-Suggestions & History Search
**Goal**: Users see fish-like ghost text suggestions from history as they type, accepted with right-arrow
**Depends on**: Phase 9
**Requirements**: SUGG-01, SUGG-02, SUGG-03, SUGG-04, SUGG-05
**Success Criteria** (what must be TRUE):
  1. As user types, dim ghost text appears showing the most recent matching history entry; pressing right-arrow accepts the full suggestion
  2. Typing at normal speed (>5 chars/sec) feels instant with no visible lag -- keypress handling is debounced appropriately
  3. Suggestions never expose commands containing API keys, passwords, or tokens -- sensitive patterns are filtered from history search
  4. User can independently disable auto-suggestions in config without affecting other features
**Plans:** 2 plans

Plans:
- [ ] 10-01-PLAN.md — History search with sensitive filtering, ghost text renderer, and config extension
- [ ] 10-02-PLAN.md — Keypress handler with debounce, facade module, and shell.ts integration

### Phase 11: Syntax Highlighting, Profiles & Plugin Management
**Goal**: Users see real-time colored input as they type, can select a curated plugin profile at first run, and manage plugins through an interactive CLI
**Depends on**: Phase 10
**Requirements**: HLGT-01, HLGT-02, HLGT-03, HLGT-04, PROF-01, PROF-02, PROF-03, PROF-04, MGMT-01, MGMT-02, MGMT-03, MGMT-04, MGMT-05, MGMT-06, PORT-06
**Success Criteria** (what must be TRUE):
  1. As user types a command, valid commands appear green, invalid ones red, strings are quoted in yellow, and flags are colored distinctly -- all without affecting rl.line (output-only rendering)
  2. At first run (or via `plugin profile`), user picks from an interactive menu of profiles (core, developer, devops, cloud, ai-engineer) and gets a curated set of plugins enabled automatically; profiles are additive
  3. User can run `plugin install user/repo` to install from git, `plugin enable/disable` to toggle, `plugin search` to find, and `plugin doctor` to diagnose -- all without restarting the shell (hot-reload)
  4. All plugin configuration uses interactive selection menus consistent with existing `theme` and `model` builtins
  5. Syntax highlighting is independently disablable in config; rendering stays within a 16ms frame budget to prevent typing lag
**Plans**: TBD
**UI hint**: yes

### Phase 12: Batch Port, Migration & Discovery
**Goal**: All ~300 OMZ plugins are available in Nesh, existing OMZ users can migrate seamlessly, and AI helps users discover relevant plugins
**Depends on**: Phase 11
**Requirements**: PORT-01, PORT-05, MIG-01, MIG-02, MIG-03
**Success Criteria** (what must be TRUE):
  1. All ~300 oh-my-zsh plugins have Nesh equivalents with matching user-facing behavior -- alias, completion, utility, and hook/widget categories all ported
  2. User with an existing oh-my-zsh installation can run migration detection and see which of their OMZ plugins have Nesh equivalents, with enable suggestions
  3. User can describe what they need in natural language (e.g., "I work with kubernetes and terraform") and AI suggests relevant plugins from the catalog
  4. Plugin themes integrate with Nesh's existing prompt template system via the segment registration API
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 8 -> 9 -> 10 -> 11 -> 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Shell Foundation | v1.0 | 4/4 | Complete | - |
| 2. AI Integration | v1.0 | 3/3 | Complete | - |
| 3. Distribution & Platform | v1.0 | 2/2 | Complete | - |
| 4. Sessions & Chat Mode | v2.0 | 3/3 | Complete | - |
| 5. Pipe & Unix Integration | v2.0 | 3/3 | Complete | - |
| 6. Context & Permissions | v2.0 | 3/3 | Complete | - |
| 7. PTY & Polish | v2.0 | 2/2 | Complete | 2026-04-02 |
| 8. Plugin Engine & Alias System | v3.0 | 0/3 | Planned | - |
| 9. Completion Engine & Utility Plugins | v3.0 | 0/3 | Planned | - |
| 10. Auto-Suggestions & History Search | v3.0 | 0/2 | Planned | - |
| 11. Syntax Highlighting, Profiles & Plugin Management | v3.0 | 0/? | Not started | - |
| 12. Batch Port, Migration & Discovery | v3.0 | 0/? | Not started | - |
