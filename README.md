# Nesh

An AI-native shell for your terminal. Type regular commands as usual — prefix with `a` to invoke Claude.

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

Nesh wraps the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) to give Claude full access to your filesystem and terminal — reading files, running commands, and editing code — all from a single `a` prefix.

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

### Error explanation

When a command fails, Nesh offers to explain:

```
❯ npm run build
error TS2345: Argument of type 'string' is not assignable...
Command failed [exit: 1]. Type 'a explain' to ask AI about the error.

❯ a explain
The TypeScript compiler found a type mismatch...
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
  "history_size": 1000
}
```

All fields are optional. Environment variable `ANTHROPIC_API_KEY` takes precedence over the config file.

## Development

```bash
git clone https://github.com/tantantech/nesh.git
cd nesh
npm install
npm run dev        # Run with tsx (no build needed)
npm test           # Run tests (111 tests)
npm run build      # Bundle to dist/cli.js
```

## Architecture

```
cli.ts → shell.ts → classify input → route to:
                       ├── builtins.ts    (cd, export, exit, clear)
                       ├── passthrough.ts (spawn bash -c)
                       └── ai.ts          (Claude Agent SDK)
                            └── renderer.ts (markdown output)
```

12 modules, ~650 lines of TypeScript. Each module has a single responsibility:

- **shell.ts** — REPL loop with immutable state management
- **classify.ts** — Routes input to builtin, passthrough, or AI handler
- **ai.ts** — Claude Agent SDK wrapper with streaming and cancellation
- **renderer.ts** — Markdown rendering (TTY) or plain text (piped)
- **passthrough.ts** — Executes shell commands via `bash -c`
- **builtins.ts** — cd, export, exit/quit, clear
- **config.ts** — Config file and API key resolution
- **prompt.ts** — Powerline-style prompt with git branch
- **history.ts** — Persistent command history

## How it works

1. You type a command
2. Nesh classifies it: builtin, regular command, or AI request
3. **Builtins** (cd, export) run in-process to modify shell state
4. **Regular commands** spawn `bash -c "your command"` — full shell syntax supported
5. **AI commands** (prefixed with `a`) send your prompt to Claude via the Agent SDK, streaming the response with markdown formatting and real-time tool visibility

The Claude Agent SDK is lazy-loaded on first `a` command so shell startup stays fast.

## License

ISC
