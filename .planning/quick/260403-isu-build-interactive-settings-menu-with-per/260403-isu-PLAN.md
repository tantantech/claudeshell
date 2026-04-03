---
phase: quick
plan: 260403-isu
type: execute
wave: 1
depends_on: []
files_modified:
  - src/settings.ts
  - src/types.ts
  - src/classify.ts
  - src/shell.ts
  - tests/settings.test.ts
autonomous: true
requirements: [SETTINGS-MENU]

must_haves:
  truths:
    - "User types 'settings' and sees a numbered main menu with all config categories"
    - "User can navigate to Theme, Model, Keys, Prefix, Permissions, and History Size sub-menus"
    - "Each sub-menu delegates to existing handlers (theme/model/keys) or provides inline editing"
    - "Changes persist to ~/.nesh/config.json via existing saveConfig"
    - "Pressing Enter or invalid input at main menu cancels gracefully"
  artifacts:
    - path: "src/settings.ts"
      provides: "Settings menu entry point and inline editors for prefix/permissions/history_size"
      exports: ["executeSettings"]
    - path: "src/types.ts"
      provides: "Updated BuiltinName union including 'settings'"
    - path: "src/classify.ts"
      provides: "Updated BUILTINS set including 'settings'"
    - path: "src/shell.ts"
      provides: "Settings builtin case wired in switch"
  key_links:
    - from: "src/settings.ts"
      to: "src/builtins.ts"
      via: "imports executeTheme"
      pattern: "import.*executeTheme.*from.*builtins"
    - from: "src/settings.ts"
      to: "src/model-switcher.ts"
      via: "imports executeModelSwitcher"
      pattern: "import.*executeModelSwitcher.*from.*model-switcher"
    - from: "src/settings.ts"
      to: "src/key-manager.ts"
      via: "imports executeKeyManager"
      pattern: "import.*executeKeyManager.*from.*key-manager"
    - from: "src/settings.ts"
      to: "src/config.ts"
      via: "loadConfig + saveConfig for persistent changes"
      pattern: "saveConfig"
    - from: "src/shell.ts"
      to: "src/settings.ts"
      via: "case 'settings' in builtin switch"
      pattern: "case 'settings'"
---

<objective>
Create a unified `settings` builtin command that displays a numbered main menu with all configuration categories (Theme, Model, API Keys, Prefix, Permissions, History Size). Selecting a category either delegates to the existing interactive handler (theme, model, keys) or provides a simple inline editor for scalar values (prefix, permissions, history_size). All changes persist via saveConfig.

Purpose: Single entry point for all Nesh configuration instead of remembering individual commands.
Output: `src/settings.ts` with menu logic, wired into shell as a new builtin.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@src/config.ts (NeshConfig, loadConfig, saveConfig)
@src/builtins.ts (executeTheme pattern)
@src/model-switcher.ts (executeModelSwitcher pattern)
@src/key-manager.ts (executeKeyManager pattern)
@src/types.ts (BuiltinName, ShellState)
@src/classify.ts (BUILTINS set)
@src/shell.ts (builtin switch dispatch)

<interfaces>
From src/config.ts:
```typescript
export interface NeshConfig {
  readonly api_key?: string
  readonly model?: string
  readonly history_size?: number
  readonly prompt_template?: string
  readonly prefix?: string
  readonly permissions?: 'auto' | 'ask' | 'deny'
  readonly interactive_commands?: readonly string[]
  readonly keys?: ProviderKeys
}
export function loadConfig(): NeshConfig
export function saveConfig(config: NeshConfig): void
```

From src/builtins.ts:
```typescript
export async function executeTheme(rl: readline.Interface): Promise<string | undefined>
```

From src/model-switcher.ts:
```typescript
export async function executeModelSwitcher(rl: readline.Interface, currentModel: string | undefined): Promise<string | undefined>
```

From src/key-manager.ts:
```typescript
export async function executeKeyManager(rl: readline.Interface): Promise<void>
```

From src/types.ts:
```typescript
export type BuiltinName = 'cd' | 'exit' | 'quit' | 'clear' | 'export' | 'theme' | 'model' | 'keys'
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create settings menu with inline editors and tests</name>
  <files>src/settings.ts, tests/settings.test.ts</files>
  <behavior>
    - Test 1: executeSettings displays numbered menu with 6 options (Theme, Model, API Keys, Prefix, Permissions, History Size)
    - Test 2: Invalid/empty input at main menu returns without error (cancels gracefully)
    - Test 3: Selecting prefix option prompts for new value, saves via saveConfig, returns updated prefix
    - Test 4: Selecting permissions option shows 3 choices (auto/ask/deny), saves selection
    - Test 5: Selecting history size option prompts for number, validates positive integer, saves
    - Test 6: Selecting theme/model/keys delegates to existing handlers (mock them)
  </behavior>
  <action>
Create `src/settings.ts` exporting:

```typescript
interface SettingsResult {
  readonly templateName?: string   // from theme picker
  readonly model?: string          // from model switcher
  readonly prefix?: string         // from inline prefix editor
  readonly permissions?: 'auto' | 'ask' | 'deny'  // from inline permissions editor
  readonly historySize?: number    // from inline history editor
}

export async function executeSettings(
  rl: readline.Interface,
  currentModel: string | undefined,
): Promise<SettingsResult>
```

The function:
1. Displays main menu using process.stdout.write (matching existing pattern from key-manager.ts):
   ```
   Nesh Settings

     [1] Theme
     [2] Model
     [3] API Keys
     [4] Prefix
     [5] Permissions
     [6] History Size
   ```
2. Reads selection via `rl.question('Select (1-6): ')`
3. For options 1-3: delegates to executeTheme/executeModelSwitcher/executeKeyManager respectively, returns their result in SettingsResult
4. For option 4 (Prefix): shows current prefix from loadConfig, prompts for new value, validates no whitespace (reuse logic from config.ts validatePrefix pattern), saves via saveConfig, returns { prefix }
5. For option 5 (Permissions): shows numbered list of auto/ask/deny with current marked via green asterisk (matching model-switcher pattern), saves via saveConfig, returns { permissions }
6. For option 6 (History Size): shows current value, prompts for number, validates positive integer >= 100, saves via saveConfig, returns { historySize }
7. Invalid/empty input returns empty object (cancelled)

Use picocolors for styling consistent with model-switcher.ts and key-manager.ts patterns (pc.dim for headers, pc.bold for labels, pc.green for current marker).

For tests: mock readline.Interface with a question method that returns pre-configured answers. Mock the delegate functions (executeTheme, etc.) to verify they get called. Mock loadConfig/saveConfig to verify persistence.
  </action>
  <verify>
    <automated>cd /Users/tald/Projects/claudeshell && npx vitest run tests/settings.test.ts</automated>
  </verify>
  <done>executeSettings displays menu, delegates to existing handlers for theme/model/keys, provides inline editing for prefix/permissions/history_size with validation and persistence, all tests pass</done>
</task>

<task type="auto">
  <name>Task 2: Wire settings builtin into shell</name>
  <files>src/types.ts, src/classify.ts, src/shell.ts</files>
  <action>
Three small edits to wire the new command:

1. **src/types.ts** — Add 'settings' to BuiltinName union:
   ```typescript
   export type BuiltinName = 'cd' | 'exit' | 'quit' | 'clear' | 'export' | 'theme' | 'model' | 'keys' | 'settings'
   ```

2. **src/classify.ts** — Add 'settings' to BUILTINS set:
   ```typescript
   const BUILTINS: ReadonlySet<string> = new Set(['cd', 'exit', 'quit', 'clear', 'export', 'theme', 'model', 'keys', 'settings'])
   ```

3. **src/shell.ts** — Add import and case:
   - Import: `import { executeSettings } from './settings.js'`
   - Add case in the builtin switch (after 'keys' case):
   ```typescript
   case 'settings': {
     const settingsResult = await executeSettings(rl, state.currentModel)
     if (settingsResult.templateName) {
       currentTemplate = settingsResult.templateName
       saveConfig({ ...loadConfig(), prompt_template: settingsResult.templateName })
       process.stdout.write(`Theme set to: ${settingsResult.templateName}\n`)
     }
     if (settingsResult.model) {
       state = { ...state, currentModel: settingsResult.model }
     }
     if (settingsResult.prefix) {
       prefix = settingsResult.prefix
     }
     if (settingsResult.permissions) {
       state = { ...state, permissionMode: settingsResult.permissions }
     }
     break
   }
   ```
   Note: historySize takes effect on next shell start (already read from config at init). Theme save follows the exact pattern from the existing 'theme' case. Model/prefix/permissions update live state.
  </action>
  <verify>
    <automated>cd /Users/tald/Projects/claudeshell && npx tsc --noEmit && npx vitest run tests/classify.test.ts</automated>
  </verify>
  <done>Typing 'settings' in nesh classifies as builtin, dispatches to executeSettings, results update live shell state (model, prefix, permissions, template) and persist to config.json</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no type errors
- `npx vitest run` passes all tests including new settings tests
- `npm run build` produces dist/cli.js without errors
</verification>

<success_criteria>
- `settings` command shows a 6-option menu
- Selecting Theme/Model/Keys delegates to existing interactive handlers
- Selecting Prefix/Permissions/History Size provides inline editing with validation
- All changes persist to ~/.nesh/config.json
- Live shell state (model, prefix, permissions, template) updates immediately
</success_criteria>

<output>
After completion, create `.planning/quick/260403-isu-build-interactive-settings-menu-with-per/260403-isu-SUMMARY.md`
</output>
