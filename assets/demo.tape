Output assets/demo.gif

Set Shell bash
Set FontFamily "JetBrains Mono"
Set FontSize 15
Set Width 900
Set Height 520
Set Padding 16
Set Theme "TokyoNight"
Set TypingSpeed 50ms
Set CursorBlink true

# Simulated nesh prompt (powerline style approximated)
Hide
Type `export PS1='\033[48;5;208m\033[38;5;15m\033[1m nesh \033[0m\033[38;5;208m\033[48;5;166m\033[0m\033[48;5;166m\033[38;5;15m\033[1m ~/Projects \033[0m\033[38;5;166m\033[48;5;240m\033[0m\033[48;5;240m\033[38;5;15m main \033[0m\033[38;5;240m\033[0m \033[38;5;208m❯\033[0m '`
Enter
Sleep 300ms
Show

# 1. Normal command — works like any shell
Sleep 600ms
Type "git log --oneline -3"
Sleep 300ms
Enter
Sleep 1s

# 2. AI command — the money shot
Sleep 800ms
Type "a find large typescript files and summarize them"
Sleep 500ms
Enter
Sleep 400ms

Hide
Type "printf '\033[2m  → Reading src/*.ts...\033[0m\n'; sleep 1; printf '\033[2m  → Running wc -l src/*.ts | sort -rn...\033[0m\n'; sleep 0.8; echo ''; echo 'Found 5 files over 100 lines:'; echo ''; printf '  \033[36msrc/shell.ts\033[0m      248 lines — REPL loop, state management\n'; printf '  \033[36msrc/ai.ts\033[0m         179 lines — Claude Agent SDK streaming\n'; printf '  \033[36msrc/classify.ts\033[0m   163 lines — Input routing (builtin/shell/AI)\n'; printf '  \033[36msrc/renderer.ts\033[0m   142 lines — Markdown rendering for TTY\n'; printf '  \033[36msrc/config.ts\033[0m     106 lines — Config and API key resolution\n'; echo ''; printf '\033[2mtokens: 1.2k in / 0.4k out | cost: \$0.0018\033[0m\n'"
Enter
Show
Sleep 5s

# 3. Model switching
Sleep 800ms
Type "a --gpt-4o explain this error"
Sleep 300ms
Enter
Sleep 400ms

Hide
Type "printf '\033[2m  Using GPT-4o via OpenAI\033[0m\n'; sleep 0.5; echo 'The error on line 42 is a type mismatch...'; echo ''; printf '\033[2mtokens: 0.8k in / 0.3k out | cost: \$0.0006\033[0m\n'"
Enter
Show
Sleep 4s

# 4. Pipe mode
Sleep 800ms
Type "echo 'SELECT * FORM users' | nesh 'fix this SQL'"
Sleep 300ms
Enter
Sleep 200ms

Hide
Type "echo 'SELECT * FROM users'"
Enter
Show
Sleep 2.5s

Sleep 1.5s
