Output assets/demo.gif

Set Shell "bash"
Set FontFamily "JetBrains Mono"
Set FontSize 16
Set Width 800
Set Height 500
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms
Set CursorBlink false

# Setup: source init, then clear screen so recording starts clean
Hide
Type "source /Users/tald/Projects/claudeshell/assets/demo-init.sh"
Enter
Sleep 500ms
Type "clear"
Enter
Sleep 300ms
Show

# ── Scene 1: Regular shell command ──
Sleep 600ms
Type "ls -la src/"
Sleep 200ms
Enter
Sleep 1.5s

# ── Scene 2: AI command ──
Sleep 500ms
Type "a find large files and summarize them"
Sleep 300ms
Enter
Sleep 5s

# ── Scene 3: Pipe mode ──
Sleep 500ms
Type "git diff | nesh 'write a commit message'"
Sleep 300ms
Enter
Sleep 4s

Sleep 1s
