# Requirements: ClaudeShell

**Defined:** 2026-03-31
**Core Value:** Running AI-assisted commands feels as natural and fast as running normal shell commands

## v1 Requirements

### Shell Foundation

- [x] **SHELL-01**: User can launch ClaudeShell as an interactive REPL with a visible prompt showing current directory
- [x] **SHELL-02**: User can type standard shell commands (ls, git, npm, etc.) and they execute via system shell
- [x] **SHELL-03**: User can use `cd` to change working directory and the prompt updates accordingly
- [x] **SHELL-04**: User can use pipes, redirects, and shell syntax in standard commands (delegated to bash)
- [x] **SHELL-05**: User can press Ctrl+C to cancel a running command without exiting the shell
- [x] **SHELL-06**: User can press Ctrl+D or type `exit` to quit the shell
- [x] **SHELL-07**: User can navigate command history with up/down arrows
- [x] **SHELL-08**: Command history persists across shell sessions
- [x] **SHELL-09**: Environment variables from user's shell profile are inherited

### AI Integration

- [ ] **AI-01**: User can type `a <prompt>` to send a request to Claude via Claude Agent SDK
- [ ] **AI-02**: Claude's response streams back to the terminal in real-time (not waiting for full response)
- [ ] **AI-03**: User can press Ctrl+C during an AI response to cancel the streaming query
- [ ] **AI-04**: Claude has access to read and write files in the user's filesystem via SDK tools
- [ ] **AI-05**: Claude can execute shell commands as part of its response via SDK tools
- [ ] **AI-06**: User sees when Claude is using tools (reading files, running commands) in real-time
- [ ] **AI-07**: AI responses are rendered with markdown formatting and syntax highlighting

### Configuration

- [ ] **CONF-01**: User can configure API key via ANTHROPIC_API_KEY environment variable
- [ ] **CONF-02**: Shell shows a helpful error message if API key is missing when `a` command is used
- [ ] **CONF-03**: User can configure settings via a `~/.claudeshell/config` file

### Error Handling

- [ ] **ERR-01**: When a command fails, user can ask AI to explain the error
- [ ] **ERR-02**: SDK errors (rate limits, auth failures, network) show clear user-friendly messages
- [x] **ERR-03**: Shell never crashes from malformed input or unexpected errors

### Platform

- [x] **PLAT-01**: Works on macOS (primary platform)
- [ ] **PLAT-02**: Works on Linux
- [ ] **PLAT-03**: Installable via npm (`npm install -g claudeshell`)

## v2 Requirements

### Sessions & Context

- **SESS-01**: AI remembers context across multiple `a` commands in the same session
- **SESS-02**: User can start a fresh AI context with a slash command
- **SESS-03**: User can select AI model (Haiku/Sonnet/Opus) per query or session

### Power Features

- **PWR-01**: Pipe-friendly AI output (`cat log.txt | a summarize`)
- **PWR-02**: Automatic error recovery (AI diagnoses failure and offers fix)
- **PWR-03**: Project context awareness (detects package.json, Cargo.toml, etc.)
- **PWR-04**: Permission control for AI file edits and command execution
- **PWR-05**: Token/cost display after each AI response
- **PWR-06**: Interactive command support via PTY (vim, ssh, less)
- **PWR-07**: Per-project configuration overrides
- **PWR-08**: Configurable AI command prefix (not just `a`)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full bash/zsh compatibility (plugins, themes, oh-my-zsh) | Impossible to replicate; delegate to system shell instead |
| GUI or TUI with panels/splits | Conflicts with "feels like a shell" value prop |
| Multi-model support (GPT, Gemini, etc.) | Claude-first; SDK tools are the differentiator |
| Cloud sync of history/config | Privacy concerns; local-first for simplicity |
| Terminal emulator | We run inside terminals, not replace them |
| Plugin/theme system | Massive scope creep; users already customize their terminal |
| Autonomous agent mode | Shell commands are destructive; AI suggests, user approves |
| Team collaboration | Requires accounts/servers; single-user tool |
| Built-in code editor | Claude Code already does this; AI edits via SDK tools |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | Phase 1 | Complete |
| SHELL-02 | Phase 1 | Complete |
| SHELL-03 | Phase 1 | Complete |
| SHELL-04 | Phase 1 | Complete |
| SHELL-05 | Phase 1 | Complete |
| SHELL-06 | Phase 1 | Complete |
| SHELL-07 | Phase 1 | Complete |
| SHELL-08 | Phase 1 | Complete |
| SHELL-09 | Phase 1 | Complete |
| AI-01 | Phase 2 | Pending |
| AI-02 | Phase 2 | Pending |
| AI-03 | Phase 2 | Pending |
| AI-04 | Phase 2 | Pending |
| AI-05 | Phase 2 | Pending |
| AI-06 | Phase 2 | Pending |
| AI-07 | Phase 2 | Pending |
| CONF-01 | Phase 2 | Pending |
| CONF-02 | Phase 2 | Pending |
| CONF-03 | Phase 3 | Pending |
| ERR-01 | Phase 2 | Pending |
| ERR-02 | Phase 2 | Pending |
| ERR-03 | Phase 1 | Complete |
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 3 | Pending |
| PLAT-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after roadmap creation*
