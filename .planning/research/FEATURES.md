# Feature Landscape

**Domain:** AI-powered interactive terminal shell
**Researched:** 2026-03-31

## Competitive Context

The AI CLI space has distinct tiers in 2025-2026:
- **Full terminal replacements:** Warp (GPU-rendered, agents, blocks, teams)
- **Agentic coding CLIs:** Claude Code, GitHub Copilot CLI, Gemini CLI (full autonomy, file editing)
- **AI shell assistants:** aichat, shell-gpt, ai-shell (natural language to command translation)

ClaudeShell sits in a unique gap: a **shell wrapper that embeds Claude's full agent capabilities** via the `a` prefix. Not a terminal emulator, not a standalone coding agent, not just a command translator.

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `a <prompt>` invokes AI | Core UX promise. This IS the product. | Medium | Route to Claude Agent SDK `query()`, stream response back |
| Standard command pass-through | Shell must still be a shell. `ls`, `cd`, `git`, pipes must work. | Medium | `cd` is special (changes process cwd). Everything else via `spawn('bash', ['-c', cmd])` |
| Streaming AI output | Claude Code, Copilot CLI, Warp all stream. Users will not wait for full response. | Low | Claude SDK supports streaming natively via async generator |
| Command history | Every shell has up-arrow history. Missing = broken. | Low | `readline` has built-in history. Persist to `~/.claudeshell_history` |
| Working directory tracking | `cd` must actually change the shell's cwd. AI must know where user is. | Low | `process.chdir()` on `cd` commands. Show cwd in prompt. |
| Signal handling (Ctrl+C) | Must cancel running AI query or child process gracefully, NOT exit shell | Medium | SIGINT handler + AbortController for SDK query |
| API key configuration | User needs to set `ANTHROPIC_API_KEY` | Low | Check env var, `.env` file, or config file. Show helpful error if missing. |
| Colored/formatted output | AI responses should be readable with markdown formatting. Plain text feels broken. | Low | `marked-terminal` for markdown, `picocolors` for prompt/status |
| File read/write via AI | Claude Code, Copilot CLI, Gemini CLI all read and modify files. Expected for agent-class tools. | Medium | Claude SDK provides Read/Write/Edit tools natively |
| Error explanation | When a command fails, AI should be able to explain. Warp, ai-shell do this. | Low | Capture stderr, offer explanation via AI on non-zero exit |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `a` prefix as single-character AI invocation | Shortest possible friction. No mode switching, no special terminal, no separate app. | Low | Parse first token, route accordingly |
| Persistent conversation context | ai-shell and shell-gpt are stateless. ClaudeShell remembers: "a find tests" then "a now run them" | Medium | SDK session support via `sessionId` |
| Tool use visibility | Show when Claude reads files, runs commands in real-time | Low | SDK streams tool-use messages. Display inline. |
| Pipe-friendly AI output | `cat log.txt | a summarize` or `a generate csv | head -5`. AI as a Unix citizen. | High | Detect non-TTY stdout, output plain text. Handle stdin piping. |
| Automatic error recovery | Command fails -> AI diagnoses -> offers fix. Not just "explain" but "fix it." | Medium | Detect non-zero exit, capture stderr, offer AI-assisted retry |
| Permission control | User approves/denies file edits, command execution | Medium | SDK `permissionMode` + `canUseTool` callback |
| Project context awareness | Detect project type (package.json, Cargo.toml) and tailor responses | Medium | Scan cwd for project markers, include in system prompt |
| Smart typo correction | `gti status` -> suggests `git status` with AI-enhanced alternatives | Low | Low effort, high delight. thefuck-style but AI-powered |
| Configurable AI model | Switch between Haiku (quick), Sonnet (balanced), Opus (complex) | Low | Pass `model` option to SDK `query()` |
| Cost/token display | Show token usage after each AI response | Low | SDK result messages include token counts |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full terminal emulator | Warp does this with massive investment. We run inside terminals, not replace them. | Work inside any existing terminal (iTerm2, Alacritty, Kitty, Warp) |
| Multi-model support | aichat already supports 20+ providers. Multi-model dilutes Claude-native advantage. | Claude-only. SDK tools are the differentiator. |
| GUI/TUI panels | Conflicts with "feels like a shell" value prop. TUI complexity alienates shell purists. | Inline text only. Markdown rendering. No curses/blessed UI. |
| Plugin/theme system | Massive scope creep. Users already have terminal customized. | Support loading user's shell config (aliases, PATH). Config file for options. |
| Cloud sync | Privacy concerns with AI command history. Infrastructure overhead. | Local-first. Users sync config via dotfiles repo. |
| Autonomous agent mode | Shell commands are destructive. Autonomous execution is risky without guard rails. | AI suggests, user approves. Opt-in auto-execute for safe commands only. |
| Full bash/zsh compatibility | Impossible to replicate. Shell syntax parsing is enormously complex. | Pass commands to `bash -c`. Let bash parse bash. |
| Built-in code editor | Claude Code already does this. Don't reinvent. | AI edits files via SDK tools. User uses vim/vscode for manual editing. |
| Team collaboration | B2B feature requiring accounts, servers, permissions. Way out of scope. | Single-user tool. Share config via git. |

## Feature Dependencies

```
Shell passthrough (core REPL) --> Everything else depends on a working shell

Shell passthrough --> Working directory tracking --> Project context awareness
Shell passthrough --> Command history
Shell passthrough --> Signal handling

API key config --> a <prompt> command (needs key to work)
a <prompt> --> Streaming AI output (output must stream)
a <prompt> --> Signal handling (must be cancellable)
a <prompt> --> File read/write via AI (SDK tools)
Streaming AI output --> Colored/formatted output (format what streams)
Tool use visibility --> Permission control (show what, then ask permission)
Error explanation --> Automatic error recovery (explain first, then fix)
```

## MVP Recommendation

**Phase 1 -- Working Shell:**
1. REPL loop with readline (prompt, history, line editing)
2. Standard command pass-through (`spawn('bash', ['-c', cmd])`)
3. Working directory tracking (`cd` as builtin)
4. Signal handling (Ctrl+C at prompt clears line, during command sends to child)
5. Exit/quit/Ctrl+D

**Phase 2 -- AI Integration:**
1. `a <prompt>` routes to Claude Agent SDK `query()`
2. Streaming AI output to terminal
3. API key configuration (env var + .env + helpful error)
4. Ctrl+C cancels AI query via AbortController
5. Basic output formatting (markdown rendering)
6. Error explanation ("command failed, want AI to explain?")

**Phase 3 -- Polish & UX:**
1. Tool use visibility (show file reads, command runs inline)
2. Colored/formatted output refinement
3. Token/cost display after responses
4. Pipe-friendly output (detect non-TTY)
5. Session conversation context

**Phase 4 -- Power Features:**
1. Permission control (approve/deny edits)
2. Project context awareness
3. Model selection
4. Custom system prompts per project
5. Automatic error recovery loop
6. Smart typo correction

**Defer indefinitely:** Multi-model, GUI/TUI, plugins, cloud sync, teams, autonomous mode.

## Sources

- [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) - SDK capabilities
- [Claude Agent SDK Permissions](https://platform.claude.com/docs/en/agent-sdk/permissions) - Permission modes
- [Claude Agent SDK Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions) - Session management
- [aichat](https://github.com/sigoden/aichat) - Competitor: multi-model AI CLI (29k+ stars)
- [ai-shell](https://github.com/BuilderIO/ai-shell) - Competitor: natural language to shell commands
- [Warp](https://www.warp.dev/) - Competitor: AI-native terminal emulator
- [GitHub Copilot CLI](https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/) - Competitor
