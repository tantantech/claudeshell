# Feature Landscape

**Domain:** AI-powered interactive terminal shell (v2 features)
**Researched:** 2026-03-31
**Focus:** Session management, pipe-friendly AI, PTY integration, permission control, project context, model selection, token/cost display, error recovery, configurable prefix, per-project config

## Competitive Context

The v1 features (REPL, `a` prefix, streaming, history, config, markdown rendering, prompt templates, error explanation) are already built. The v2 features move ClaudeShell from "AI shell wrapper" to "power-user AI development environment." Here is how the competition handles these same features:

| Feature | Claude Code CLI | aichat | Gemini CLI | Warp | shell-gpt |
|---------|----------------|--------|------------|------|-----------|
| Session persistence | Yes (JSONL files, `--continue`, `--resume`) | Yes (named sessions) | Yes (hierarchical context) | Yes (blocks model) | No |
| Pipe/stdin support | Limited (`--print` flag) | Yes (first-class, `cat x \| aichat`) | Yes | N/A (terminal) | Yes (`sgpt --chat`) |
| PTY for interactive cmds | Yes (built into Claude Code) | No (not a shell) | No (not a shell) | Yes (is a terminal) | No |
| Permission control | Yes (5 modes + hooks) | No (no tool use) | Limited | No | No |
| Project context | Yes (CLAUDE.md files) | No | Yes (GEMINI.md) | Yes (auto-detect) | No |
| Model selection | Yes (per-session) | Yes (per-query prefix) | Limited | N/A | Yes (config) |
| Token/cost display | Yes (after response) | No | No | N/A | No |
| Error recovery | Partial (manual) | No | No | Yes (AI suggestions) | No |

ClaudeShell's advantage: all of these in a single `a` prefix UX, with full Claude Agent SDK tool use. No one else combines pipe-friendly AI + session context + PTY + permission control in a shell wrapper.

## Table Stakes

Features that v2 users will consider baseline for a "session-aware AI shell."

| Feature | Why Expected | Complexity | Implementation Path |
|---------|--------------|------------|---------------------|
| AI session context | Claude Code and Gemini CLI both persist context. "a find tests" then "a now run them" must work. Without this, each `a` command is isolated and feels broken. | Medium | SDK `resume` option with session ID. Store session ID in ShellState. `continue: true` for auto-resume. Sessions stored as JSONL under `~/.claudeshell/sessions/`. |
| Fresh context (`/new`) | Users need to reset when switching tasks. Claude Code has `--no-continue`. Every session tool has this. | Low | Clear session ID in ShellState. Add `/new` or `/fresh` slash command to builtins. |
| Model selection | Haiku for quick questions, Sonnet for code, Opus for architecture. aichat, shell-gpt, Claude Code all support this. Users expect it. | Low | `a --model haiku "quick question"` or `/model haiku` to set session default. Map short names to full model IDs. Store in config + session state. SDK `query()` accepts `model` option. |
| Token/cost display | Claude Code shows this. Users want to know what each query costs, especially with Opus. Transparency builds trust. | Low | SDK result message provides `total_cost_usd`, `usage.input_tokens`, `usage.output_tokens`. Display dim line after each response: `[tokens: 1.2k in / 450 out | $0.0034]`. |
| Pipe-friendly output | `cat error.log \| a summarize` is the killer Unix integration. aichat does this well. Without it, ClaudeShell is not a Unix citizen. | Medium | Detect `!process.stdin.isTTY` for piped input -- read stdin, prepend to prompt. Detect `!process.stdout.isTTY` for piped output -- suppress markdown/colors, output plain text. Must handle both directions independently. |
| Permission control | Claude SDK has tools that write files and run commands. Users MUST be able to control this. Claude Code's permission modes set the bar. | Medium | Use SDK `permissionMode` option. Default to `"default"` (ask for everything). Implement `canUseTool` callback that prompts user Y/n for destructive ops. Add `/permissions` command to toggle modes. Support `acceptEdits` for trusted sessions. |
| Configurable AI prefix | Some users want `ai` or `claude` instead of `a`. Power users want customization. | Low | Add `ai_prefix` to config file. Update classifier to check against configured prefix. Default remains `a`. |

## Differentiators

Features that go beyond what competitors offer. Not expected, but create "wow" moments.

| Feature | Value Proposition | Complexity | Implementation Path |
|---------|-------------------|------------|---------------------|
| PTY integration for interactive commands | `vim`, `ssh`, `less`, `htop` work properly. No other AI shell wrapper handles this. spawn with `stdio: 'inherit'` breaks readline. PTY solves it. | High | Use `node-pty` to fork a pseudo-terminal for interactive commands. Detect interactive commands (known list: vim, nano, ssh, less, man, htop, top, docker exec -it) and route through PTY instead of spawn. Restore readline after PTY child exits. This is the hardest v2 feature. |
| Automatic error recovery | Command fails -> AI diagnoses -> offers concrete fix -> user approves -> fix runs. Not just "explain" but a full recovery loop. | Medium | On non-zero exit: capture stderr + command, prompt user "Want AI to fix this? [Y/n]". If yes, send to `query()` with system prompt instructing to suggest a fix command. Display suggested command, ask for confirmation before executing. Cap recovery loop at 3 attempts. |
| Project context awareness | Auto-detect project type and inject context. "a run tests" just works in a Node project or a Rust project or a Python project. | Medium | Scan cwd for marker files: `package.json` (Node), `Cargo.toml` (Rust), `pyproject.toml`/`setup.py` (Python), `go.mod` (Go), `Gemfile` (Ruby), `pom.xml`/`build.gradle` (Java), `Makefile`, `docker-compose.yml`, `.git`. Extract project name, dependencies, scripts. Include summary in system prompt. Cache per-directory, invalidate on file change. |
| Per-project config overrides | `.claudeshell.json` in project root overrides global config (model, permissions, system prompt, allowed tools). | Low | On directory change or AI invocation, walk up from cwd looking for `.claudeshell.json`. Merge with global config (project wins). Support: `model`, `permission_mode`, `system_prompt`, `allowed_tools`, `disallowed_tools`, `ai_prefix`. |
| Session cost accumulator | Track cumulative cost across all `a` commands in a session. Show running total. No competitor does this well. | Low | Maintain `sessionCost` in ShellState. Add each `result.total_cost_usd` to it. Display in prompt or via `/cost` command. Reset on `/new`. |
| Model-per-query shorthand | `a! quick question` for Haiku, `a* complex problem` for Opus, `a` for default (Sonnet). Zero-friction model switching. | Low | Classify `a!` and `a*` as AI actions with model override. Map to haiku/opus. Keep `a` as configured default. Distinctive, memorable, fast. |
| Smart stdin detection | When piped input is large (>50KB), auto-truncate with notice. When piped input is a known format (JSON, CSV, YAML), mention format in prompt context. | Low | Check `Buffer.byteLength(stdin)`. If >50KB, truncate and append "[truncated, showing first 50KB of X KB]". Detect format by first bytes/line patterns. |

## Anti-Features

Features to explicitly NOT build for v2.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full conversation replay UI | TUI complexity, scope creep. Users have terminal scrollback. | `/history` command shows recent AI interactions as plain text. Session files are human-readable JSONL. |
| Autonomous error recovery | Running fix commands without user approval is dangerous. `rm -rf` incident (Claude Code) proves this. | Always show proposed fix, require explicit approval. Never auto-execute. |
| Multi-model (GPT, Gemini) | Dilutes Claude-native advantage. aichat already does this with 20+ models. | Claude-only. The SDK tool-use integration is the moat. |
| Streaming cost display | Showing cost mid-stream is noisy and the SDK only reports cost on result message. | Show cost once, after response completes, in a dim status line. |
| Session sharing/export | Cloud sync, multi-device -- out of scope for local-first tool. | Sessions are local JSONL files. Users can copy/share manually. |
| PTY for ALL commands | Using node-pty for every command adds latency and complexity. Most commands work fine with spawn. | PTY only for known interactive commands. Spawn for everything else. Provide `/pty <command>` escape hatch for edge cases. |
| AI-powered tab completion | Extremely complex (readline integration, latency concerns, UX competing with shell completion). | Let system shell handle completion. Focus on the `a` prefix experience. |
| Background AI tasks | Running AI in background while user types -- concurrency nightmare with readline. | One AI query at a time. User can cancel and start new one. |

## Feature Dependencies

```
v1 (already built)
  |
  +-- Session management
  |     |-- Session context (SDK resume)
  |     |-- Fresh context (/new command)
  |     +-- Session cost accumulator
  |
  +-- Pipe-friendly AI
  |     |-- Stdin detection (isTTY check)
  |     |-- Stdout plain-text mode (no markdown when piped)
  |     +-- Smart stdin detection (format, truncation)
  |
  +-- PTY integration
  |     +-- node-pty for interactive commands (independent of AI features)
  |
  +-- Permission control
  |     |-- SDK permissionMode
  |     +-- canUseTool callback (user prompt)
  |
  +-- Model selection
  |     |-- Config-level default
  |     |-- Per-query flag (--model)
  |     +-- Shorthand prefixes (a!, a*)
  |
  +-- Token/cost display
  |     +-- SDK result message parsing
  |
  +-- Error recovery
  |     |-- Existing error capture (lastError) 
  |     +-- AI-assisted fix suggestion + approval
  |
  +-- Project context awareness
  |     |-- Marker file scanning
  |     +-- System prompt injection
  |
  +-- Per-project config
  |     |-- .claudeshell.json detection
  |     +-- Config merge with global
  |
  +-- Configurable prefix
        +-- Classifier update to use config value
```

Key dependency chains:
- **Session management** depends on nothing new -- SDK provides `resume`/`continue`
- **Token/cost display** depends on nothing new -- SDK provides `total_cost_usd`
- **Pipe-friendly AI** depends on nothing new -- `process.stdin.isTTY` and `process.stdout.isTTY` are Node builtins
- **PTY integration** requires `node-pty` (native addon, adds build complexity)
- **Permission control** depends on SDK `canUseTool` callback (already available)
- **Error recovery** builds on existing `lastError` capture in ShellState
- **Project context** and **per-project config** are independent but complement each other

## Implementation Complexity Matrix

| Feature | Code Complexity | Risk | SDK Support | Priority |
|---------|----------------|------|-------------|----------|
| Session context | Medium | Low (SDK handles storage) | `resume`, `continue` options | P0 |
| Fresh context `/new` | Low | None | Clear session ID | P0 |
| Token/cost display | Low | None | `total_cost_usd` on result | P0 |
| Model selection | Low | None | `model` option on `query()` | P0 |
| Pipe-friendly AI | Medium | Medium (edge cases with binary data, encoding) | N/A (Node stdio) | P0 |
| Configurable prefix | Low | None | N/A (classifier change) | P1 |
| Permission control | Medium | Low (SDK provides infrastructure) | `permissionMode`, `canUseTool` | P1 |
| Error recovery | Medium | Low | Existing `lastError` + new `query()` | P1 |
| Project context | Medium | Low | System prompt injection | P1 |
| Per-project config | Low | Low | N/A (config merge) | P2 |
| PTY integration | High | High (native addon, platform differences, readline conflict) | N/A (node-pty) | P2 |
| Session cost accumulator | Low | None | `total_cost_usd` accumulation | P2 |
| Model shorthand (a!, a*) | Low | None | Classifier extension | P2 |

## Phase Recommendation for v2

### Phase 1: Session & Visibility (P0 features, low risk)
1. Session context via SDK `resume`/`continue`
2. `/new` command to reset session
3. Token/cost display after responses
4. Model selection (`/model`, `--model` flag, config default)

**Rationale:** These are the highest-value, lowest-risk features. They transform ClaudeShell from stateless to stateful and give users cost visibility. All rely on well-documented SDK capabilities.

### Phase 2: Unix Integration (P0-P1, medium risk)
1. Pipe-friendly AI (stdin/stdout TTY detection)
2. Error recovery loop (diagnose + suggest fix + approve)
3. Configurable AI prefix

**Rationale:** Pipe support makes ClaudeShell a Unix citizen -- the single most differentiating feature for shell users. Error recovery builds on existing `lastError`. Prefix config is trivial.

### Phase 3: Context & Control (P1, medium complexity)
1. Permission control (SDK modes + canUseTool callback)
2. Project context awareness (marker file scanning)
3. Per-project config (`.claudeshell.json` overrides)

**Rationale:** These features make ClaudeShell project-aware and safe. Permission control is critical for trust. Project context makes AI responses smarter without user effort.

### Phase 4: Advanced (P2, high complexity)
1. PTY integration for interactive commands
2. Session cost accumulator
3. Model shorthand prefixes (a!, a*)

**Rationale:** PTY is the hardest feature and benefits fewer users (most commands work fine with spawn). Cost accumulator and shorthands are polish.

## Sources

- [Claude Agent SDK Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions) - Session resume/continue/fork options (HIGH confidence)
- [Claude Agent SDK Cost Tracking](https://platform.claude.com/docs/en/agent-sdk/cost-tracking) - `total_cost_usd`, `modelUsage`, per-step token tracking (HIGH confidence)
- [Claude Agent SDK Permissions](https://platform.claude.com/docs/en/agent-sdk/permissions) - 5 permission modes, `canUseTool` callback, allow/deny rules (HIGH confidence)
- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) - Full query options including `model`, `resume`, `systemPrompt` (HIGH confidence)
- [aichat](https://github.com/sigoden/aichat) - Competitor: sessions, piping, multi-model, shell assistant (MEDIUM confidence)
- [aichat Command Line Guide](https://github.com/sigoden/aichat/wiki/Command-Line-Guide) - Pipe/stdin patterns (MEDIUM confidence)
- [node-pty](https://github.com/microsoft/node-pty) - PTY bindings for Node.js, used by VS Code terminal (HIGH confidence)
- [Anthropic Claude Code Sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing) - Permission/sandbox architecture (HIGH confidence)
- [ctx CLI](https://dev.to/lakshmisravyavedantham/i-built-a-cli-that-gives-any-ai-instant-context-about-your-project-3ig8) - Project context detection patterns (LOW confidence)
- [Gemini CLI Context Management](https://datalakehousehub.com/blog/2026-03-context-management-gemini-cli/) - Hierarchical context, GEMINI.md (MEDIUM confidence)
- [Claude Code Session Management](https://stevekinney.com/courses/ai-development/claude-code-session-management) - Session persistence patterns (MEDIUM confidence)
