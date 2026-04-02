# Requirements: ClaudeShell v2.0

**Defined:** 2026-04-02
**Core Value:** Running AI-assisted commands feels as natural and fast as running normal shell commands

## v2.0 Requirements

### Sessions & Chat Mode

- [x] **SESS-01**: AI remembers context across multiple `a` commands in the same session (conversation continues)
- [x] **SESS-02**: User can type `/new` to start a fresh AI context without restarting the shell
- [x] **SESS-03**: User can select AI model per query (`a --haiku`, `a --opus`) or set default in config
- [x] **SESS-04**: User can enter "chat mode" by typing `a` with no prompt — enters a continuous conversation with Claude where every line goes to AI until user types `/exit` or `/shell` to return
- [x] **SESS-05**: Chat mode and shell mode transitions are instant (no delay, no context loss)
- [x] **SESS-06**: Chat mode shows a distinct prompt (e.g., `ai >`) so user always knows which mode they're in

### Pipe & Unix Integration

- [x] **PIPE-01**: User can pipe input to AI (`cat log.txt | a summarize`) — stdin is passed as context
- [x] **PIPE-02**: When stdout is piped, AI output is plain text without colors or markdown formatting
- [x] **PIPE-03**: User can chain AI output into other commands (`a generate csv | head -5`)

### Error Recovery

- [x] **ERR-04**: When a command fails, AI automatically offers a suggested fix (not just explain — actionable fix)
- [x] **ERR-05**: User can type `a fix` to let AI attempt to fix the last failed command automatically

### Project Context

- [x] **CTX-01**: Shell detects project type from markers (package.json, Cargo.toml, go.mod, etc.) and includes project context in AI system prompt
- [x] **CTX-02**: User can place a `.claudeshell.json` in any directory for per-project config overrides (model, prefix, permissions)

### Permission Control

- [ ] **PERM-01**: User can configure permission mode (auto-approve, ask-each-time, or deny-all) for AI file edits
- [ ] **PERM-02**: When permission mode is "ask", user sees what Claude wants to do and can approve/deny inline
- [ ] **PERM-03**: Permission mode is configurable globally and per-project

### Visibility & Cost

- [x] **VIS-01**: After each AI response, show token count and estimated cost
- [x] **VIS-02**: In chat mode, show cumulative session cost

### Interactive Commands

- [ ] **PTY-01**: Interactive commands (vim, ssh, less, htop) work correctly via PTY passthrough
- [ ] **PTY-02**: Shell prompt restores cleanly after interactive command exits

### Configuration

- [x] **CFG-01**: User can configure a custom AI command prefix (not just `a`) via config
- [x] **CFG-02**: Per-project `.claudeshell.json` overrides global config when present

## v1.0 Validated

- ✓ SHELL-01 through SHELL-09: Interactive REPL, passthrough, cd, pipes, signals, history — v1.0
- ✓ AI-01 through AI-07: Claude Agent SDK streaming, tool visibility, markdown rendering — v1.0
- ✓ CONF-01, CONF-02, CONF-03: API key config, error messages, config file — v1.0
- ✓ ERR-01, ERR-02, ERR-03: Error explanation, SDK errors, crash resilience — v1.0
- ✓ PLAT-01, PLAT-02, PLAT-03: macOS, Linux, npm install — v1.0

## Future Requirements

### Advanced Sessions

- **ADV-01**: Session history browser (list past sessions, resume old ones)
- **ADV-02**: Session export/sharing (save conversation to file)
- **ADV-03**: Multi-model conversations within a session

### Ecosystem

- **ECO-01**: Tab completion for `a` commands using AI
- **ECO-02**: Shell plugin system for custom commands
- **ECO-03**: Integration with git hooks

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full bash/zsh compatibility | Delegate to system shell |
| GUI or TUI with panels | Terminal-native, inline only |
| Multi-provider support (GPT, Gemini) | Claude-first, SDK is the differentiator |
| Cloud sync | Local-first for privacy |
| Autonomous agent mode | AI suggests, user approves |
| Team collaboration | Single-user tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SESS-01 | Phase 4 | Complete |
| SESS-02 | Phase 4 | Complete |
| SESS-03 | Phase 4 | Complete |
| SESS-04 | Phase 4 | Complete |
| SESS-05 | Phase 4 | Complete |
| SESS-06 | Phase 4 | Complete |
| PIPE-01 | Phase 5 | Complete |
| PIPE-02 | Phase 5 | Complete |
| PIPE-03 | Phase 5 | Complete |
| ERR-04 | Phase 5 | Complete |
| ERR-05 | Phase 5 | Complete |
| CTX-01 | Phase 6 | Complete |
| CTX-02 | Phase 6 | Complete |
| PERM-01 | Phase 6 | Pending |
| PERM-02 | Phase 6 | Pending |
| PERM-03 | Phase 6 | Pending |
| VIS-01 | Phase 4 | Complete |
| VIS-02 | Phase 4 | Complete |
| PTY-01 | Phase 7 | Pending |
| PTY-02 | Phase 7 | Pending |
| CFG-01 | Phase 5 | Complete |
| CFG-02 | Phase 6 | Complete |

**Coverage:**
- v2.0 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-03-31 after v2.0 roadmap creation*
