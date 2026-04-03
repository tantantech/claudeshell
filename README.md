<p align="center">
  <img src="https://nesh.sh/logo.svg" alt="Nesh" width="120" />
</p>

<h1 align="center">Nesh</h1>

<p align="center">
  <strong>Your terminal, now with AI superpowers.</strong><br />
  Type commands normally. Prefix with <code>a</code> to talk to AI.<br />
  That's it. That's the whole interface.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/nesh"><img src="https://img.shields.io/npm/v/nesh?color=orange&label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/nesh"><img src="https://img.shields.io/npm/dm/nesh?color=blue" alt="downloads" /></a>
  <a href="https://github.com/tantantech/nesh/actions"><img src="https://img.shields.io/github/actions/workflow/status/tantantech/nesh/ci.yml?label=tests" alt="tests" /></a>
  <a href="https://nesh.sh"><img src="https://img.shields.io/badge/docs-nesh.sh-blueviolet" alt="docs" /></a>
  <a href="https://github.com/tantantech/nesh/blob/main/LICENSE"><img src="https://img.shields.io/github/license/tantantech/nesh" alt="license" /></a>
</p>

<br />

<p align="center">
  <img src="https://nesh.sh/demo.gif" alt="Nesh in action" width="700" />
</p>

---

## Why Nesh?

Your terminal is the most powerful tool on your computer. But every time you need AI help, you switch to a browser, paste context, wait, copy the answer back.

**Nesh removes that friction entirely.** AI lives inside your shell. It sees your files, runs your commands, and writes code — all without leaving the terminal.

```
❯ git status
❯ docker ps
❯ a find all TODO comments and create a summary
  → Reading src/...
  → Running grep -rn "TODO" src/...

Found 7 TODOs across 4 files:
  src/auth.ts:42    TODO: add rate limiting
  src/db.ts:18      TODO: connection pooling
  ...
```

One keystroke. Zero context-switching.

## Features

### 30+ Models, 15 Providers — One Interface

Switch between any model with a single command. No config files, no API wrapper headaches.

```
❯ a --opus explain the architecture        # Claude Opus 4.6
❯ a --haiku summarize this file            # Claude Haiku 4.5
❯ a --gpt-4o review my code               # GPT-4o
❯ a --gemini-pro analyze this dataset      # Gemini 2.5 Pro
❯ a --grok-4 what does this regex do       # Grok 4
❯ model                                    # Interactive model picker
```

<details>
<summary><strong>Full provider list (15 providers)</strong></summary>

| Tier | Provider | Models |
|------|----------|--------|
| **Big Tech** | Anthropic | Claude Opus 4.6, Sonnet 4.5, Haiku 4.5 |
| | OpenAI | GPT-4o, GPT-4.5, o3, o4-mini |
| | Google | Gemini 2.5 Pro, Gemini 2.5 Flash |
| **Major AI** | xAI | Grok 4, Grok 3 |
| | DeepSeek | Chat, Reasoner |
| | Mistral | Large, Codestral, Small |
| | Cohere | Command R+, Command R |
| | MiniMax | M2.5, M2.7 |
| **Fast Inference** | Groq | Llama 3.3 70B, Mixtral 8x7B, Gemma 2 |
| | Together AI | Llama 3.3 70B, Qwen 2.5 Coder |
| | Fireworks | Llama 3.3 70B |
| **Aggregators** | OpenRouter | Any model on OpenRouter |
| | Ollama | Any local model |
| | Perplexity | Sonar Pro, Sonar |

</details>

### Full Agent Capabilities

This isn't a chatbot pasted into a terminal. Nesh gives AI **real tools** — file read/write, command execution, and streaming output. Powered by the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk).

```
❯ a refactor auth.ts to use async/await and add error handling
  → Reading src/auth.ts...
  → Writing src/auth.ts...
  → Running npm test...

Done. Refactored 3 functions, all 24 tests passing.
```

### Chat Mode

Type `a` alone to enter a persistent conversation:

```
❯ a
Entering chat mode — /exit to return to shell

chat › explain the database schema
The schema has 4 tables: users, posts, comments, and tags...

chat › now add a migration for soft deletes
  → Writing migrations/add_soft_delete.sql...
  → Running npm run db:migrate...

Migration applied successfully.

chat › /exit
```

### Smart Error Recovery

When a command fails, Nesh captures the error and offers an AI-powered fix:

```
❯ npm run build
error TS2345: Argument of type 'string' is not assignable...
[exit: 1]
Suggested fix: npx tsc --noEmit. Type 'a fix' to apply.

❯ a fix
  → Reading src/handler.ts...
  → Writing src/handler.ts...

Fixed: added type assertion on line 42. Build now passes.
```

### Unix Pipe Citizen

Nesh plays nicely with the Unix philosophy:

```bash
cat error.log | nesh "what went wrong?"
nesh "generate 10 test emails as CSV" > test-data.csv
git diff | nesh "write a commit message for this"
```

### Cost Tracking

Every AI call shows token usage and cost. No surprises on your bill.

```
tokens: 1.2k in / 0.8k out | cost: $0.0034
session: $0.0521 (12 messages)
```

### 5 Prompt Themes

```
❯ theme
```

| Theme | Style |
|-------|-------|
| **Minimal** | `nesh ~/Projects > ` |
| **Classic** | `[nesh] ─ ~/Projects (main) ─▸ ` |
| **Powerline** | ` nesh  ~/Projects  main  ❯ ` |
| **Hacker** | `┌─[nesh]─[~/Projects]─[main]` |
| **Pastel** | `● nesh │ ~/Projects │ main ❯ ` |

## Install

```bash
npm install -g nesh
```

> **Requirements:** Node.js 24+ and at least one AI provider API key.

## Quick Start

```bash
# 1. Install
npm install -g nesh

# 2. Set an API key (any provider works)
export ANTHROPIC_API_KEY=sk-ant-...    # or
export OPENAI_API_KEY=sk-...           # or
export GOOGLE_API_KEY=...              # or any of 15 providers

# 3. Launch
nesh

# 4. Use it
❯ ls                          # normal command
❯ a what does main.ts do      # AI command
```

## Configuration

Config file at `~/.nesh/config.json`:

```json
{
  "api_key": "sk-ant-...",
  "model": "claude-sonnet",
  "history_size": 1000,
  "prefix": "a",
  "permissions": "auto"
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `model` | `claude-sonnet` | Default model (any shorthand from the model list) |
| `history_size` | `1000` | Max command history entries |
| `prefix` | `a` | AI trigger prefix (customizable) |
| `permissions` | `auto` | Tool permissions: `auto`, `ask`, or `deny` |

### Per-Project Config

Drop a `.nesh.json` in any project root to override settings per project:

```json
{
  "model": "gpt-4o",
  "permissions": "ask"
}
```

### API Key Management

```
❯ keys                 # See configured providers
❯ keys add openai      # Add a provider key
❯ keys remove openai   # Remove a provider key
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+C` | Cancel running command or AI response |
| `Ctrl+D` | Exit the shell |
| `Up/Down` | Navigate command history |

## Architecture

Nesh is intentionally small — 27 modules, ~4,800 lines of TypeScript, 282 tests.

```
cli.ts → shell.ts → classify.ts ─┬─▸ builtins.ts      (cd, export, exit, theme)
                                  ├─▸ passthrough.ts    (spawn bash -c)
                                  └─▸ ai.ts             (Agent SDK streaming)
                                       ├─▸ renderer.ts  (markdown in TTY, plain in pipes)
                                       └─▸ providers/   (15 providers, unified interface)
```

## Development

```bash
git clone https://github.com/tantantech/nesh.git
cd nesh
npm install
npm run dev        # Run with tsx (no build step)
npm test           # 282 tests
npm run build      # Bundle to dist/cli.js
```

## How It Works

1. **You type a command.** Nesh classifies it as a builtin (`cd`, `exit`), a regular shell command, or an AI command (starts with `a`).
2. **Regular commands** are passed directly to `bash -c`. Pipes, redirects, globs — everything works.
3. **AI commands** are sent to your chosen model via the Claude Agent SDK (or OpenAI/Gemini SDK). The AI can read files, write files, and run commands as part of its response. You see everything streamed in real-time.

## Comparison

| | Nesh | ChatGPT / Claude.ai | GitHub Copilot CLI | Warp AI |
|---|:---:|:---:|:---:|:---:|
| Runs in your terminal | :white_check_mark: | :x: | :white_check_mark: | :white_check_mark: |
| Full file read/write | :white_check_mark: | :x: | :x: | :x: |
| Runs commands for you | :white_check_mark: | :x: | :x: | :x: |
| 30+ model choices | :white_check_mark: | :x: | :x: | :x: |
| Unix pipes | :white_check_mark: | :x: | :white_check_mark: | :x: |
| Local models (Ollama) | :white_check_mark: | :x: | :x: | :x: |
| Open source | :white_check_mark: | :x: | :x: | :x: |
| Cost tracking | :white_check_mark: | :x: | :x: | :x: |

## Contributing

```bash
git clone https://github.com/tantantech/nesh.git
cd nesh
npm install
npm test          # Make sure tests pass
```

PRs welcome. Please include tests for new features.

## License

[MIT](LICENSE)

---

<p align="center">
  <strong><a href="https://nesh.sh">nesh.sh</a></strong> · Built by <a href="https://github.com/tantantech">tantantech</a>
</p>
