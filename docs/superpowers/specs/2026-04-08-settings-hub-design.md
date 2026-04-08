# Unified Settings Hub — Design Spec

**Date:** 2026-04-08
**Status:** Approved
**Scope:** Consolidate all settings, themes, model switching, key management, plugin management, and alias management into a single `settings` command with grouped navigation.

---

## Problem

The current nesh configuration UX has several issues:

1. **Redundancy** — model, theme, and permissions are accessible from 2-3 different places with different behavior (standalone commands, settings menu, chat slash commands)
2. **Inconsistent navigation** — no "back" button, quit mechanisms differ (q vs out-of-range vs invalid input), up to 4 levels deep in some flows
3. **Plugin UX mismatch** — plugins use subcommand syntax (`plugin list`) while everything else uses interactive numbered menus
4. **Missing features** — no alias management, `plugin list` incomplete, `plugin info` missing, model menu has no current indicator
5. **Chat mode state drift** — `/model` and `/permissions` in chat mode don't persist to config

## Solution

One unified `settings` hub with 4 grouped categories, consistent back-navigation at every level, and removal of all standalone configuration commands.

---

## Menu Structure

```
settings
├── [1] Appearance
│   ├── [1] Theme Wizard    — full guided 12-step setup
│   ├── [2] Template        — pick prompt layout
│   ├── [3] Colors          — pick color scheme
│   └── [4] Segments        — toggle info segments & icons
├── [2] AI
│   ├── [1] Model           — provider-grouped model picker with (current) marker
│   ├── [2] API Keys        — view / add / remove keys
│   └── [3] Permissions     — auto / ask / deny selection
├── [3] Plugins
│   ├── [1] List            — show all plugins with status and aliases
│   ├── [2] Enable/Disable  — toggle a specific plugin
│   ├── [3] Install         — install from git repository
│   ├── [4] Remove          — uninstall a plugin
│   ├── [5] Search          — search plugin catalog
│   ├── [6] Profile         — apply preset (developer, devops, cloud, etc.)
│   └── [7] Doctor          — run plugin health check
└── [4] Shell
    ├── [1] AI Prefix       — change the AI trigger prefix
    ├── [2] History Size    — set history line limit
    └── [3] Aliases         — view / add / remove custom aliases
```

### Aliases Submenu Detail

```
Aliases
├── [1] List All      — grouped by source (user-defined / plugin), shows alias → expansion
├── [2] Add Alias     — prompt for name + expansion, saves to user config
├── [3] Remove Alias  — pick from user-defined aliases to delete
```

- Only **user-defined** aliases can be added/removed
- Plugin-provided aliases are displayed read-only with their source plugin name
- Aliases persist to `~/.nesh/config.json` under a `user_aliases` key

---

## Navigation Rules

1. Every screen shows `q` to go back one level
2. `q` at category level returns to main menu
3. `q` at main menu exits to shell
4. After any configuration change, return to the **category** menu (not main menu)
5. Consistent prompt everywhere: `Select (1-N) or q: `
6. Invalid input re-prompts silently (no "Selection cancelled" messages)
7. Wizard steps use `q` to cancel the entire wizard (existing behavior, unchanged)

---

## Removed Commands

These commands are removed from the builtin dispatcher in `classify.ts` / `shell.ts`:

| Removed Command | Replacement |
|----------------|-------------|
| `theme` | Settings > Appearance |
| `model` | Settings > AI > Model |
| `keys` | Settings > AI > API Keys |
| `plugin` (all subcommands) | Settings > Plugins |
| `aliases` | Settings > Shell > Aliases |

Typing any removed command is treated as a passthrough (sent to bash). No hint or redirect.

### Chat Mode Changes

| Removed | Replacement |
|---------|-------------|
| `/model [name]` | `/settings` opens hub |
| `/permissions [mode]` | `/settings` opens hub |

Retained chat commands: `/exit`, `/shell`, `/new`

Added: `/settings` — opens the same unified hub from within chat mode.

---

## Bug Fixes Integrated

These known QA bugs are fixed as part of this redesign:

### Plugin System Fixes

1. **`plugin list` only shows git** — Rewrite list renderer to query the full plugin registry, showing all enabled plugins with version, status, and aliases
2. **`plugin info` not implemented** — Enhanced list view shows per-plugin details (no separate `info` subcommand needed)
3. **`plugin enable/disable` doesn't persist to runtime** — Enable/disable operations update both config file AND live registry, then trigger hot-reload
4. **`alias` command no output** — Aliases displayed in both Plugins > List (per-plugin) and Shell > Aliases (unified view)

### Model Switcher Fix

5. **Model menu no current indicator** — Add `(current)` marker next to the active model in the picker

### Shell Fixes

6. **`$?` not propagated** — Store last exit code from passthrough commands and inject into shell environment for subsequent `$?` references
7. **`sessionId` pre-generated UUID rejected** — Don't pre-generate session ID; start as `undefined`, let the SDK return one after the first AI call. Guard auto-error-analysis to not trigger during shell exit.

---

## Architecture

### File Changes

| File | Change |
|------|--------|
| `src/settings.ts` | **Major rewrite** — becomes the hub with category routing, back-navigation, and all sub-screens |
| `src/shell.ts` | Remove builtin cases for `theme`, `model`, `keys`, `plugin`, `aliases`. Keep only `cd`, `export`, `exit`, `quit`, `clear`, `settings`. |
| `src/classify.ts` | Remove `theme`, `model`, `keys`, `plugin`, `aliases` from builtin list |
| `src/builtins.ts` | Remove `executeTheme`, `executeAliases`. Theme logic moves into settings.ts |
| `src/model-switcher.ts` | Add `(current)` marker. Called by settings hub, no longer by shell.ts directly |
| `src/key-manager.ts` | Called by settings hub, no longer by shell.ts directly |
| `src/plugin-manager.ts` | Convert from subcommand parser to menu-driven functions callable by settings hub. Fix list/enable/disable bugs. |
| `src/chat.ts` | Remove `/model` and `/permissions` slash commands. Add `/settings` command. |
| `src/passthrough.ts` | Fix `$?` propagation |
| `src/prompt-config.ts` | Called by settings hub for segments configuration |
| `src/wizard.ts` | No changes (called by settings hub Appearance > Theme Wizard) |
| `src/onboarding.ts` | No changes (first-run only, separate from hub) |

### New: Settings Hub Flow

```
executeSettings(rl, state) → SettingsResult
  ├── showMainMenu()        → category selection
  ├── showAppearance(rl)    → theme wizard / template / colors / segments
  ├── showAI(rl, state)     → model / keys / permissions
  ├── showPlugins(rl, ctx)  → list / toggle / install / remove / search / profile / doctor
  └── showShell(rl, state)  → prefix / history / aliases
```

Each `show*` function returns to main menu on `q`. Each sub-option returns to its category on `q` or after completing a change.

### Config Schema Addition

```typescript
interface NeshConfig {
  // ... existing fields ...
  user_aliases?: Record<string, string>  // NEW: user-defined aliases
}
```

User aliases are expanded alongside plugin aliases in the classify/expand pipeline, with user aliases taking precedence over plugin aliases on name collision.

---

## Testing Requirements

- Unit tests for each menu screen (navigation, selection, back)
- Unit tests for alias CRUD operations
- Integration test: `settings` command opens hub and `q` exits cleanly
- Verify all removed commands pass through to bash
- Verify plugin list shows full registry
- Verify plugin enable/disable persists and hot-reloads
- Verify model picker shows `(current)` marker
- Verify `$?` propagation with `false && echo $?`
- Verify chat `/settings` opens hub
- 80%+ test coverage target
