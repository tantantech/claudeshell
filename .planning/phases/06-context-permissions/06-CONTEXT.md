# Phase 6: Context & Permissions - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Add project context awareness (auto-detect project type, enrich AI system prompt), permission control for AI file/command actions (configurable modes with inline approval), and per-project configuration overrides via `.claudeshell.json`.

</domain>

<decisions>
## Implementation Decisions

### Project Context Detection
- **D-01:** Create `src/context.ts` module that scans cwd for project marker files
- **D-02:** Marker files: `package.json` (Node.js), `Cargo.toml` (Rust), `go.mod` (Go), `pyproject.toml`/`requirements.txt` (Python), `Gemfile` (Ruby), `pom.xml`/`build.gradle` (Java), `Makefile`, `docker-compose.yml`
- **D-03:** Extract key info from detected markers: project name, language, framework hints
- **D-04:** For `package.json`: read name, scripts keys, main dependencies (first 10)
- **D-05:** For other markers: just detect presence and language — don't parse complex formats
- **D-06:** Build a `ProjectContext` object: `{ type: string, name?: string, markers: string[], summary: string }`
- **D-07:** Include project context in AI system prompt: "You are in a [type] project called [name]. Key deps: [list]."
- **D-08:** Re-detect on `cd` (project context may change when navigating directories)
- **D-09:** Cache detection result per directory — don't re-scan every `a` command

### Permission Control
- **D-10:** Three permission modes: `"auto"` (approve all — current behavior), `"ask"` (prompt per action), `"deny"` (block all file/command actions)
- **D-11:** Default mode: `"auto"` (matches current v1 behavior with `acceptEdits`)
- **D-12:** Config field: `"permissions": "auto"` in global and per-project config
- **D-13:** In "ask" mode, use SDK `permissionMode: "default"` which triggers `canUseTool` callback
- **D-14:** Display format: `Claude wants to [action] [target]. Allow? (y/n) ` — inline, single line
- **D-15:** For file edits: show `edit src/types.ts`. For commands: show `run npm test`
- **D-16:** User types `y`/`n`/`yes`/`no` — anything else repeats the question
- **D-17:** In "deny" mode, use SDK `permissionMode: "plan"` — AI can suggest but not execute
- **D-18:** Permission mode stored in ShellState, changeable via `/permissions <mode>` in chat mode

### Per-Project Config
- **D-19:** Check for `.claudeshell.json` in current working directory
- **D-20:** Per-project config merges over global: `{ ...globalConfig, ...projectConfig }`
- **D-21:** Supported overrides: `model`, `prefix`, `permissions`, `api_key`
- **D-22:** Re-load per-project config on `cd` (same trigger as project context re-detection)
- **D-23:** Per-project config is optional — shell works without it
- **D-24:** Invalid JSON in `.claudeshell.json`: warn to stderr, use global config only
- **D-25:** Create `loadProjectConfig()` in `src/config.ts` — returns partial config or null

### Claude's Discretion
- Exact system prompt template for project context
- Whether to show "Detected: Node.js project" on shell startup
- How verbose the permission prompt should be (show full file path vs relative)
- Whether to support `.claudeshell.json` in parent directories (walking up)

</decisions>

<canonical_refs>
## Canonical References

### Existing Implementation
- `src/config.ts` — extend with permissions field, loadProjectConfig()
- `src/ai.ts` — change permissionMode based on config, add canUseTool callback, inject project context into system prompt
- `src/shell.ts` — re-detect context on cd, reload project config on cd
- `src/builtins.ts` — executeCd — trigger context/config reload
- `src/types.ts` — ShellState — add projectContext, permissionMode fields

### Research
- `.planning/research/STACK.md` — SDK permission modes (5 modes + canUseTool)
- `.planning/research/ARCHITECTURE.md` — Project context and per-project config patterns
- `.planning/research/PITFALLS.md` — Permission escalation via session resume

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/config.ts`: `loadConfig()` pattern — extend with `loadProjectConfig()` using same JSON parse + validate approach
- `src/builtins.ts`: `executeCd()` — hook for re-detection triggers
- `src/ai.ts`: `executeAI()` — already has Options object, add permissionMode + system prompt

### Established Patterns
- Config validation with type guards (config.ts pattern)
- Immutable state: `{ ...state, projectContext: newContext }`
- Module-per-concern: new `src/context.ts` for project detection
- stderr for meta-info

### Integration Points
- `src/shell.ts`: Initialize project context on startup, refresh on cd
- `src/ai.ts`: Pass project context string + permission mode to SDK options
- `src/config.ts`: Merge global + project config
- `src/chat.ts`: Add `/permissions` slash command

</code_context>

<specifics>
## Specific Ideas

- Project detection should be silent by default — just enrich AI responses, don't announce
- Permission prompts should be fast — one line, y/n, no explanation unless user asks
- Per-project config enables teams to share shell settings via git (`.claudeshell.json` in repo)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-context-permissions*
*Context gathered: 2026-04-02*
