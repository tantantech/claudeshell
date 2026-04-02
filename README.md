# Nesh

**[nesh.sh](https://nesh.sh)** — An AI-native terminal shell.

Type regular commands as usual. Prefix with `a` to invoke Claude with full filesystem and terminal access.

```
  nesh   ~/Projects   main  ❯ ls
README.md  package.json  src/  tests/

  nesh   ~/Projects   main  ❯ a find all typescript files larger than 100 lines
  → Reading src/...
  → Running wc -l src/*.ts...

Found 3 TypeScript files over 100 lines:
  src/shell.ts    163 lines
  src/ai.ts       179 lines
  src/config.ts   106 lines
```

Built on the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) — Claude can read files, run commands, and edit code, all streamed in real-time from a single `a` prefix.

## Install

```bash
npm install -g nesh
```

Requires Node.js 22+ and an [Anthropic API key](https://console.anthropic.com/).

## Setup

Set your API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Or save it to the config file:

```bash
mkdir -p ~/.nesh
echo '{"api_key": "sk-ant-..."}' > ~/.nesh/config.json
```

Then launch:

```bash
nesh
```

## Usage

### Regular commands

Everything works as expected — commands are passed directly to `bash`:

```
❯ git status
❯ docker ps
❯ cat package.json | grep version
```

Pipes, redirects, globs, and all shell syntax work because Nesh delegates to your system shell.

### AI commands

Prefix with `a` to ask Claude:

```
❯ a what does the main function in src/cli.ts do
❯ a refactor src/utils.ts to use async/await
❯ a write a test for the login handler
❯ a explain this error
```

Claude can read files, write files, and run commands as part of its response. You'll see what it's doing in real-time:

```
  → Reading src/handler.ts...
  → Running npm test...
```

### Chat mode

Type `a` with no prompt to enter persistent chat mode:

```
❯ a
Entering chat mode — /exit to return to shell

chat › write tests for the handler
  → Reading src/handler.ts...
  → Writing tests/handler.test.ts...

chat › /exit
```

### Model selection

Choose a model per query with flags:

```
❯ a --opus explain the architecture of this project
❯ a --haiku summarize this file
```

### Error recovery

When a command fails, Nesh analyzes the error and suggests a fix:

```
❯ npm run build
error TS2345: Argument of type 'string' is not assignable...
[exit: 1]
Suggested fix: npx tsc --noEmit. Type 'a fix' to run it.

❯ a fix
```

### Pipe mode

Nesh works as a Unix pipe citizen:

```bash
cat log.txt | nesh "summarize this"
nesh "generate a csv of US states" | head -5
```

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+C` | Cancel running command or AI response |
| `Ctrl+D` | Exit the shell |
| `Up/Down` | Navigate command history |

## Configuration

Config file at `~/.nesh/config.json`:

```json
{
  "api_key": "sk-ant-...",
  "model": "claude-sonnet-4-5-20250514",
  "history_size": 1000,
  "prefix": "a",
  "permissions": "auto"
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `api_key` | — | Anthropic API key (env var `ANTHROPIC_API_KEY` takes precedence) |
| `model` | `claude-sonnet-4-5-20250514` | Default model for AI commands |
| `history_size` | `1000` | Max history entries |
| `prefix` | `a` | AI command prefix |
| `permissions` | `auto` | Tool permission mode: `auto`, `ask`, or `deny` |

### Per-project config

Drop a `.nesh.json` in any project directory to override global settings:

```json
{
  "model": "claude-sonnet-4-5-20250514",
  "permissions": "ask",
  "prefix": "ai"
}
```

### Prompt themes

Type `theme` to choose from 5 built-in prompt styles:

- **Minimal** — Clean and simple
- **Classic** — Box-drawing with cyan accents
- **Powerline** — Orange segments with arrows (requires Nerd Font)
- **Hacker** — Green-on-black two-line
- **Pastel** — Soft colored sections

## Architecture

```
cli.ts → shell.ts → classify.ts ─┬─▸ builtins.ts
                                  ├─▸ passthrough.ts
                                  └─▸ ai.ts
                                       └─▸ renderer.ts
```

12 modules, ~650 lines of TypeScript. Each module has a single responsibility:

| Module | Purpose |
|--------|---------|
| `shell.ts` | REPL loop, immutable state management |
| `classify.ts` | Routes input to builtin, passthrough, or AI |
| `ai.ts` | Claude Agent SDK wrapper, streaming, cancellation |
| `renderer.ts` | Markdown rendering (TTY) or plain text (piped) |
| `passthrough.ts` | Executes shell commands via `bash -c` |
| `builtins.ts` | cd, export, exit/quit, clear, theme |
| `config.ts` | Config file and API key resolution |
| `prompt.ts` | Powerline-style prompt with git branch |
| `templates.ts` | 5 prompt themes |
| `history.ts` | Persistent command history |
| `context.ts` | Project type detection |
| `cost.ts` | Token usage and cost tracking |

## Development

```bash
git clone https://github.com/tantantech/nesh.git
cd nesh
npm install
npm run dev        # Run with tsx (no build needed)
npm test           # Run tests (225 tests)
npm run build      # Bundle to dist/cli.js
```

## License

ISC
