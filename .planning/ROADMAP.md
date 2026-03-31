# Roadmap: ClaudeShell

## Overview

ClaudeShell delivers an AI-native shell in three phases: first a rock-solid interactive REPL with full shell passthrough, then the Claude Agent SDK integration that delivers the core `a` command value proposition, and finally packaging and platform hardening for distribution. Each phase produces a usable artifact -- Phase 1 is a working shell, Phase 2 adds the AI differentiator, Phase 3 makes it installable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Shell Foundation** - Interactive REPL with command passthrough, history, signals, and directory tracking
- [ ] **Phase 2: AI Integration** - Claude Agent SDK wired into the shell with streaming, tool visibility, config, and error handling
- [ ] **Phase 3: Distribution & Platform** - npm packaging, config file support, and cross-platform validation

## Phase Details

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
- [ ] 02-01-PLAN.md — Type contracts, config module, classifier update, passthrough stderr capture
- [ ] 02-02-PLAN.md — AI module (SDK wrapper) and streaming renderer
- [ ] 02-03-PLAN.md — Shell REPL integration and end-to-end verification

### Phase 3: Distribution & Platform
**Goal**: Users can install ClaudeShell via npm and use it reliably on macOS and Linux
**Depends on**: Phase 2
**Requirements**: CONF-03, PLAT-01, PLAT-02, PLAT-03
**Success Criteria** (what must be TRUE):
  1. User can run `npm install -g claudeshell` and the `claudeshell` command is available system-wide
  2. User can configure shell behavior via a `~/.claudeshell/config` file
  3. All Phase 1 and Phase 2 functionality works identically on both macOS and Linux
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Shell Foundation | 4/4 | Complete | - |
| 2. AI Integration | 0/3 | Planning complete | - |
| 3. Distribution & Platform | 0/? | Not started | - |
