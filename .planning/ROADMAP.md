# Roadmap: ClaudeShell

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped)
- 🚧 **v2.0 Sessions & Power Features** - Phases 4-7 (in progress)

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

### v2.0 Sessions & Power Features (In Progress)

**Milestone Goal:** Make ClaudeShell a power-user tool with persistent AI context, pipe-friendly output, smart error recovery, and project awareness.

**Phase Numbering:**
- Integer phases (4, 5, 6, 7): Planned milestone work
- Decimal phases (4.1, 5.1): Urgent insertions (marked with INSERTED)

- [ ] **Phase 4: Sessions & Chat Mode** - Persistent AI context, chat mode, model selection, and cost visibility
- [ ] **Phase 5: Pipe & Unix Integration** - Pipe-friendly AI, automatic error recovery, and configurable prefix
- [ ] **Phase 6: Context & Permissions** - Project awareness, permission control, and per-project config
- [ ] **Phase 7: PTY & Polish** - Interactive command support via PTY passthrough

## Phase Details

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
- [ ] 05-01-PLAN.md — Pipe mode: stdin detection, pipe.ts module, cli.ts wiring
- [ ] 05-02-PLAN.md — Error recovery: auto-fix suggestions and `a fix` command
- [ ] 05-03-PLAN.md — Configurable AI command prefix

### Phase 6: Context & Permissions
**Goal**: Users can trust ClaudeShell to understand their project and respect their boundaries on what AI can modify
**Depends on**: Phase 4
**Requirements**: CTX-01, CTX-02, PERM-01, PERM-02, PERM-03, CFG-02
**Success Criteria** (what must be TRUE):
  1. When inside a project directory, ClaudeShell auto-detects the project type (Node.js, Rust, Go, etc.) and Claude's responses reflect that context
  2. User can place a `.claudeshell.json` in any directory and its settings (model, permissions, prefix) override global config for that project
  3. User can configure permission mode (auto-approve, ask-each-time, or deny-all) for AI file edits globally and per-project
  4. When permission mode is "ask", user sees exactly what Claude wants to do (file path, action) and can approve or deny inline before it happens
**Plans**: TBD

### Phase 7: PTY & Polish
**Goal**: Interactive terminal programs work correctly inside ClaudeShell without visual glitches or broken input
**Depends on**: Phase 5, Phase 6
**Requirements**: PTY-01, PTY-02
**Success Criteria** (what must be TRUE):
  1. User can run interactive commands (vim, ssh, less, htop) and they display and accept input correctly
  2. After an interactive command exits, the shell prompt restores cleanly with no visual artifacts or broken input state
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 4 -> 5 -> 6 -> 7
(Phases 5 and 6 both depend on Phase 4 but not on each other; Phase 7 depends on both)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Shell Foundation | v1.0 | 4/4 | Complete | - |
| 2. AI Integration | v1.0 | 3/3 | Complete | - |
| 3. Distribution & Platform | v1.0 | 2/2 | Complete | - |
| 4. Sessions & Chat Mode | v2.0 | 0/3 | Planned | - |
| 5. Pipe & Unix Integration | v2.0 | 0/3 | Planned | - |
| 6. Context & Permissions | v2.0 | 0/0 | Not started | - |
| 7. PTY & Polish | v2.0 | 0/0 | Not started | - |
