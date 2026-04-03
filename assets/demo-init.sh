#!/usr/bin/env bash
# Init file for VHS demo recording

prompt() {
  printf '\033[1;38;5;208mnesh\033[0m \033[38;5;248m~/projects\033[0m \033[38;5;141mmain\033[0m \033[38;5;208m>\033[0m '
}

export PS1=''
export PROMPT_COMMAND='prompt'

dim() { printf '\033[2m%s\033[0m\n' "$1"; }
cyan() { printf '  \033[36m%-16s\033[0m %s\n' "$1" "$2"; }
bold() { printf '\033[1m%s\033[0m\n' "$1"; }

# Override commands for simulation
ls() {
  if [[ "$*" == "-la src/" ]]; then
    printf 'total 48\n'
    printf 'drwxr-xr-x  8 user staff   256 Apr  3 10:22 .\n'
    printf '-rw-r--r--  1 user staff  1842 Apr  3 10:22 shell.ts\n'
    printf '-rw-r--r--  1 user staff  1204 Apr  3 09:15 ai.ts\n'
    printf '-rw-r--r--  1 user staff   963 Apr  3 09:15 classify.ts\n'
    printf '-rw-r--r--  1 user staff   742 Apr  2 18:30 renderer.ts\n'
    printf '-rw-r--r--  1 user staff   506 Apr  2 18:30 config.ts\n'
    printf '-rw-r--r--  1 user staff   284 Apr  2 16:10 cli.ts\n'
  else
    command ls "$@"
  fi
}

a() {
  local input="$*"
  if [[ "$input" == "find large files and summarize them" ]]; then
    sleep 0.3
    dim "  Reading src/shell.ts..."
    sleep 0.5
    dim "  Running wc -l src/*.ts | sort -rn"
    sleep 0.7
    echo ""
    bold "Found 6 TypeScript files sorted by size:"
    echo ""
    cyan "shell.ts"     "248 lines  REPL loop and state management"
    cyan "ai.ts"        "179 lines  Claude Agent SDK streaming"
    cyan "classify.ts"  "163 lines  Input routing"
    cyan "renderer.ts"  "142 lines  Markdown rendering for TTY"
    cyan "config.ts"    "106 lines  Config and API key resolution"
    cyan "cli.ts"       " 84 lines  Entry point"
    echo ""
    dim "tokens: 1.2k in / 0.4k out  cost: \$0.002"
  fi
}

git() {
  if [[ "$1" == "diff" ]]; then
    # Output gets piped to nesh
    printf 'diff content\n'
  else
    command git "$@"
  fi
}

nesh() {
  if [[ "$1" == "write a commit message" ]]; then
    sleep 0.3
    echo ""
    printf 'feat: add streaming support to renderer\n'
    echo ""
    printf 'Enable real-time markdown rendering during AI\n'
    printf 'responses instead of buffering until completion.\n'
    echo ""
    dim "tokens: 0.8k in / 0.2k out  cost: \$0.001"
  fi
}

export -f dim cyan bold nesh
