# ClaudeShell

## What This Is

An AI-native shell that wraps Claude Code SDK to provide intelligent command-line assistance directly in the terminal. Users type an `a` command (e.g., `a find all large files`) and Claude processes the request in the background — no separate Claude Code UI needed. It behaves like a standard shell (zsh/bash replacement) but with AI superpowers baked in.

## Core Value

Running AI-assisted commands feels as natural and fast as running normal shell commands — zero context switching, zero UI overhead.

## Requirements

### Validated

- ✓ Shell launches as interactive REPL with standard commands — v1.0
- ✓ `a` prefix routes input to Claude Code SDK — v1.0
- ✓ Claude responses stream back in real-time — v1.0
- ✓ Standard shell commands pass through to system shell — v1.0
- ✓ Shell maintains session context (cwd, env vars) — v1.0
- ✓ Claude has filesystem and command execution access — v1.0
- ✓ History management with persistence — v1.0
- ✓ Configurable API key (env var + config file) — v1.0
- ✓ Works on macOS and Linux — v1.0
- ✓ npm global install (`npm install -g claudeshell`) — v1.0
- ✓ Markdown rendering of AI responses — v1.0
- ✓ Interactive prompt template selector (5 themes) — v1.0

### Active

- [ ] AI session context across multiple `a` commands
- [ ] Fresh context slash command
- [ ] Model selection (Haiku/Sonnet/Opus) per query or session
- [ ] Pipe-friendly AI output (`cat log.txt | a summarize`)
- [ ] Automatic error recovery (diagnose + offer fix)
- [ ] Project context awareness (package.json, Cargo.toml, etc.)
- [ ] Permission control for AI file edits and command execution
- [ ] Token/cost display after each AI response
- [ ] Interactive command support via PTY (vim, ssh, less)
- [ ] Per-project configuration overrides
- [ ] Configurable AI command prefix

## Current Milestone: v2.0 Sessions & Power Features

**Goal:** Make ClaudeShell a power-user tool with persistent AI context, pipe-friendly output, and smart error recovery.

### Out of Scope

- Full zsh/bash compatibility (plugin systems, oh-my-zsh themes) — too complex, delegate to system shell
- GUI or TUI with panels/splits — terminal-native shell, not a terminal emulator
- Multi-model support (GPT, Gemini, etc.) — Claude-first, SDK tools are the differentiator
- Cloud sync of history/config — local-first for simplicity

## Context

- Claude Code SDK (TypeScript) provides programmatic access to Claude's capabilities including tool use, file operations, and command execution
- The user wants to avoid opening Claude Code as a separate application — the shell IS the interface
- Similar to how GitHub Copilot CLI or aichat work, but deeper integration as the actual shell
- Target user: developers who use the terminal daily and want AI assistance without leaving their workflow
- The `a` command prefix is the key UX innovation — minimal friction to invoke AI

## Constraints

- **Tech Stack**: TypeScript/Node.js — Claude Code SDK is TypeScript-based
- **SDK**: Must use Claude Code SDK (not raw Anthropic API) for full tool-use capabilities
- **Platform**: macOS primary, Linux secondary — no Windows for v1
- **Shell**: Must be usable as a login shell or launched from existing shell
- **Performance**: AI commands should start streaming within 2-3 seconds
- **Authentication**: Must support existing Claude/Anthropic API key setup

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use `a` as AI command prefix | Shortest possible prefix, easy to type, memorable | ✓ Good |
| TypeScript implementation | Matches Claude Code SDK language, rich ecosystem | ✓ Good |
| Claude Code SDK over raw API | Full tool-use, file access, command execution built-in | ✓ Good |
| Shell replacement vs wrapper | Start as wrapper (launched from zsh/bash), can evolve | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-02 after milestone v2.0 start*
