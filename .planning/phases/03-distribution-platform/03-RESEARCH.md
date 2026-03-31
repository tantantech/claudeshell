# Phase 3: Distribution & Platform - Research

**Researched:** 2026-03-31
**Domain:** npm packaging, config file management, cross-platform Node.js CLI
**Confidence:** HIGH

## Summary

Phase 3 packages ClaudeShell for npm global installation, extends the config file to support a full schema, and validates Linux compatibility. The codebase is already well-positioned: ESM is configured, tsdown is in devDeps and builds successfully, all path operations use `os.homedir()` with `path.join()`, and no macOS-specific APIs exist.

The main technical risk is the **build output filename mismatch**: tsdown with `--format esm` produces `dist/cli.mjs` but `package.json` `bin` field points to `dist/cli.js`. This must be resolved either by configuring tsdown to output `.js` (since `"type": "module"` is set, `.js` files are treated as ESM) or by updating the `bin` field to point to `dist/cli.mjs`.

**Primary recommendation:** Fix the `.mjs` vs `.js` output filename, add `files` and `prepublishOnly` fields to package.json, extend `config.ts` to load the full config schema, and add a `--version` flag. No new dependencies required.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Package name: `claudeshell` (check npm registry availability)
- **D-02:** Binary name: `claudeshell` via `"bin": { "claudeshell": "./dist/cli.js" }` in package.json
- **D-03:** Build with `tsdown` (already in devDeps) to produce `dist/` directory
- **D-04:** Add `"files": ["dist"]` to package.json to ship only built output
- **D-05:** Add `build` script: `"build": "tsdown src/cli.ts --format esm --out-dir dist"`
- **D-06:** Add `prepublishOnly` script that runs build + tests
- **D-07:** Set `"type": "module"` (already set from Phase 1)
- **D-08:** Ensure shebang `#!/usr/bin/env node` is preserved in dist/cli.js after build
- **D-09:** Config location: `~/.claudeshell/config.json` (JSON format)
- **D-10:** Config schema: `{ "api_key"?: string, "model"?: string, "history_size"?: number }`
- **D-11:** Extend existing `src/config.ts` to handle full config file (not just API key)
- **D-12:** Create config directory on first write if it doesn't exist
- **D-13:** Config file is optional -- shell works without it using env vars and defaults
- **D-14:** Invalid JSON in config file: warn and use defaults (don't crash)
- **D-15:** Audit all path operations for OS-agnostic `path.join()` / `path.resolve()` usage
- **D-16:** Verify `process.env.HOME` works on both macOS and Linux (it does)
- **D-17:** Test bash spawn works on Linux (bash is standard on both)
- **D-18:** No macOS-specific APIs used (already verified -- pure Node.js stdlib + npm packages)
- **D-19:** Add a CI-style test script that can run on Linux containers

### Claude's Discretion
- Exact tsdown configuration flags beyond the basics
- Whether to add a `--version` flag to the CLI
- README content and npm description
- Whether to add a postinstall welcome message

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONF-03 | User can configure settings via a `~/.claudeshell/config` file | Extend `src/config.ts` from single `resolveApiKey()` to full config loader with schema `{ api_key?, model?, history_size? }`. Config path changes from `~/.claudeshell/config` to `~/.claudeshell/config.json`. |
| PLAT-01 | Works on macOS (primary platform) | Already complete. All path ops use `os.homedir()` + `path.join()`. Build produces executable output with shebang. |
| PLAT-02 | Works on Linux | Audit confirms no macOS-specific APIs. All paths use `os.homedir()`. bash spawn is standard on both platforms. CI test script validates. |
| PLAT-03 | Installable via npm (`npm install -g claudeshell`) | Package name available on npm. Add `bin`, `files`, `prepublishOnly` to package.json. Fix `.mjs` output filename issue. |

</phase_requirements>

## Standard Stack

### Core (no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tsdown` | 0.21.7 | Build CLI to dist/ | Already in devDeps. Produces single ESM bundle with shebang preservation and execute permission. |
| `vitest` | 4.1.2 | Testing | Already in devDeps. Runs existing test suite. |
| `node:fs` | (built-in) | Config file I/O | Sync reads for config at startup. `mkdirSync` with `recursive: true` for directory creation. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw JSON config | cosmiconfig | Over-engineered for a single known config path. cosmiconfig searches multiple locations -- we know exactly where config lives. |
| Manual JSON parse | zod validation | Could add zod for config schema validation but it adds weight for 3 optional fields. Simple type narrowing is sufficient. |
| `--out-extension .js` | Rename `bin` to `.mjs` | `.js` output is cleaner since `"type": "module"` already makes `.js` = ESM. Changing bin path works too but `.js` is more conventional. |

**Installation:** No new packages needed. All dependencies are already present.

## Architecture Patterns

### Build Pipeline
```
src/cli.ts  -->  tsdown --format esm  -->  dist/cli.js
                                            #!/usr/bin/env node
                                            (executable, single file)
```

### Config Resolution Order
```
1. Environment variable (ANTHROPIC_API_KEY) -- highest priority
2. Config file (~/.claudeshell/config.json) -- fallback
3. Built-in defaults -- lowest priority
```

### Config Module Structure
```typescript
// src/config.ts -- extended pattern

interface ClaudeShellConfig {
  readonly api_key?: string
  readonly model?: string
  readonly history_size?: number
}

const DEFAULTS: ClaudeShellConfig = {
  model: undefined,      // uses SDK default
  history_size: 1000,
}

function loadConfig(): ClaudeShellConfig {
  // 1. Read ~/.claudeshell/config.json
  // 2. Parse JSON, warn on invalid, return defaults
  // 3. Merge with defaults (config overrides defaults)
}

function resolveApiKey(config: ClaudeShellConfig): string | undefined {
  // env var takes priority over config file
  return process.env.ANTHROPIC_API_KEY ?? config.api_key
}
```

### package.json Changes
```json
{
  "name": "claudeshell",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/cli.js",
  "bin": { "claudeshell": "dist/cli.js" },
  "files": ["dist"],
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsdown src/cli.ts --format esm --out-dir dist",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build && npm run test"
  }
}
```

### Anti-Patterns to Avoid
- **Bundling node_modules into dist**: tsdown should externalize dependencies (default behavior for Node targets). npm handles dependency installation.
- **Postinstall scripts**: Avoid -- they are slow, can break installs, and are a security concern. The shell should work immediately after install.
- **Config file creation on install**: Config is optional. Only create `~/.claudeshell/` directory when the user first writes to config (if ever).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON config parsing | Custom parser | `JSON.parse()` with try/catch | JSON is the format. Catch `SyntaxError`, warn, use defaults. |
| Directory creation | Manual `stat` + `mkdir` | `fs.mkdirSync(dir, { recursive: true })` | Handles existing dirs, nested creation, race conditions. |
| Version display | Manual string | Read from `package.json` at build time or `--version` flag | tsdown can inline version. Or use `createRequire` to read package.json. |
| Shebang handling | Manual file prepend | tsdown built-in shebang detection | tsdown detects `#!/usr/bin/env node` in source and preserves it in output. Already verified working. |

## Common Pitfalls

### Pitfall 1: ESM Output Extension Mismatch
**What goes wrong:** tsdown with `--format esm` produces `.mjs` files by default. The `bin` field in package.json points to `dist/cli.js` which does not exist.
**Why it happens:** tsdown uses `.mjs` extension for ESM format to be explicit about module type.
**How to avoid:** Use `--out-extension .js` flag in the build command OR rename `bin` target to `dist/cli.mjs`. Since `"type": "module"` is set, `.js` files are already treated as ESM, so `--out-extension .js` is the cleaner approach.
**Warning signs:** `npm install -g` succeeds but running `claudeshell` gives "Cannot find module" or shebang errors.

### Pitfall 2: Config File Path Migration
**What goes wrong:** Existing users (from Phase 2 dev) have `~/.claudeshell/config` (no extension). Phase 3 changes to `~/.claudeshell/config.json`.
**Why it happens:** CONTEXT.md decision D-09 specifies `.json` extension.
**How to avoid:** The old path was only used internally during development. Since this is pre-release (v0.1.0), no migration is needed. Just update the path. Optionally check both paths and prefer `.json`.
**Warning signs:** API key stops working after upgrade for anyone who set up config during dev.

### Pitfall 3: Dependencies Not Externalized
**What goes wrong:** tsdown bundles `@anthropic-ai/claude-agent-sdk` into the output, making it 10MB+ and potentially breaking native modules.
**Why it happens:** Bundlers default to bundling everything for browser targets.
**How to avoid:** tsdown with Node.js target (auto-detected from `engines` field) externalizes `node_modules` by default. Verify the output size stays small (~13KB currently). If not, add `--external` flags explicitly.
**Warning signs:** `dist/cli.mjs` grows from ~13KB to several MB.

### Pitfall 4: Missing `files` Field Ships Entire Repo
**What goes wrong:** Without `"files": ["dist"]`, npm packs the entire project including `src/`, `tests/`, `.planning/`, etc.
**Why it happens:** npm defaults to including everything not in `.npmignore` or `.gitignore`.
**How to avoid:** Add `"files": ["dist"]` to package.json. Verify with `npm pack --dry-run` before publishing.
**Warning signs:** Package tarball is unexpectedly large.

### Pitfall 5: Shebang Not Executable on Linux
**What goes wrong:** The built file has the shebang but lacks execute permission. Works on macOS (npm handles it) but may fail on some Linux setups.
**Why it happens:** File permissions not preserved through build step.
**How to avoid:** tsdown already sets execute permission (verified: `dist/cli.mjs` has `-rwxr-xr-x`). Additionally, npm sets execute permission on `bin` entries during install. Double coverage.
**Warning signs:** `Permission denied` when running `claudeshell` after global install.

### Pitfall 6: `--version` Reading package.json at Runtime
**What goes wrong:** After npm install, the relative path to `package.json` from `dist/cli.js` is different than from `src/cli.ts`.
**Why it happens:** Build moves the entry point from `src/` to `dist/`.
**How to avoid:** Inject version at build time using tsdown's `define` option, or use `createRequire(import.meta.url)` to resolve package.json relative to the built file. The define approach is simpler: `--define.VERSION="\"0.1.0\""`.
**Warning signs:** "Cannot find module '../package.json'" at runtime.

## Code Examples

### Fix Build Output Extension
```bash
# In package.json scripts
"build": "tsdown src/cli.ts --format esm --out-dir dist --out-extension .js"
```

### Full Config Loader Pattern
```typescript
// src/config.ts
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface ClaudeShellConfig {
  readonly api_key?: string
  readonly model?: string
  readonly history_size?: number
}

const CONFIG_DIR = path.join(os.homedir(), '.claudeshell')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

const DEFAULTS: ClaudeShellConfig = {
  history_size: 1000,
}

export function loadConfig(): ClaudeShellConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      ...DEFAULTS,
      ...(typeof parsed.api_key === 'string' ? { api_key: parsed.api_key } : {}),
      ...(typeof parsed.model === 'string' ? { model: parsed.model } : {}),
      ...(typeof parsed.history_size === 'number' ? { history_size: parsed.history_size } : {}),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      process.stderr.write(`Warning: Could not read config at ${CONFIG_PATH}: ${(error as Error).message}\n`)
    }
    return { ...DEFAULTS }
  }
}

export function resolveApiKey(config?: ClaudeShellConfig): string | undefined {
  const envKey = process.env.ANTHROPIC_API_KEY
  if (envKey) return envKey
  return config?.api_key
}

export function ensureConfigDir(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
}
```

### npm Pack Verification
```bash
# Before publishing, verify package contents
npm pack --dry-run
# Should show only: dist/cli.js, package.json, README.md
```

### Version Flag Pattern
```typescript
// In src/cli.ts
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  // Use createRequire to load package.json
  import { createRequire } from 'node:module'
  const require = createRequire(import.meta.url)
  const pkg = require('../package.json') as { version: string }
  console.log(`claudeshell v${pkg.version}`)
  process.exit(0)
}
```

### CI Test Script for Linux
```bash
#!/usr/bin/env bash
# scripts/ci-test.sh -- run on Linux CI containers
set -euo pipefail

npm ci
npm run build
npm run test

# Verify build output
test -f dist/cli.js || { echo "FAIL: dist/cli.js not found"; exit 1; }
head -1 dist/cli.js | grep -q "#!/usr/bin/env node" || { echo "FAIL: missing shebang"; exit 1; }
test -x dist/cli.js || { echo "FAIL: not executable"; exit 1; }

# Verify package contents
npm pack --dry-run 2>&1 | grep -q "dist/cli.js" || { echo "FAIL: cli.js not in package"; exit 1; }

echo "All CI checks passed"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tsup for bundling | tsdown (Rolldown-powered) | 2025 | tsup unmaintained; tsdown is spiritual successor |
| `.npmignore` for package contents | `"files"` field in package.json | Long-standing best practice | Whitelist approach is safer than blacklist |
| `chalk` for colors | `picocolors` | 2023+ | Already using picocolors -- no change needed |

## Open Questions

1. **tsdown `--out-extension` flag**
   - What we know: tsdown produces `.mjs` by default with `--format esm`. The `--out-extension` flag should control this.
   - What's unclear: Exact flag syntax (might be `--out-extension .js` or `--outExtension .js` or via config file).
   - Recommendation: Test the flag during implementation. Fallback: update `bin` field to point to `dist/cli.mjs` if the flag does not work.

2. **Version injection at build time**
   - What we know: tsdown supports `--define` for compile-time constants. `createRequire` works for runtime package.json reading.
   - What's unclear: Whether `createRequire('../package.json')` resolves correctly from `dist/cli.js` after global npm install.
   - Recommendation: Test `createRequire` approach first (simpler). Fall back to `--define` if path resolution fails.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v22.12.0 | -- |
| npm | Publishing | Yes | (bundled with Node) | -- |
| tsdown | Build | Yes | 0.21.7 | -- |
| vitest | Testing | Yes | 4.1.2 | -- |
| bash | Shell spawn | Yes | (macOS default) | -- |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

## Project Constraints (from CLAUDE.md)

- Immutable patterns: config objects should use `readonly` properties and spread for updates
- Small files: config.ts should stay focused (<200 lines)
- Error handling: always handle errors explicitly (config parse failures warn, don't crash)
- No console.log in production code (use `process.stderr.write` for warnings)
- Commit after every code change
- Run dev environment when starting work

## Sources

### Primary (HIGH confidence)
- `package.json` -- current package configuration, verified bin/build/deps
- `src/config.ts` -- current config implementation (7 lines of logic)
- `dist/cli.mjs` -- verified build output: shebang present, executable, ~13KB
- npm registry check -- `claudeshell` name is available (404 Not Found)

### Secondary (MEDIUM confidence)
- tsdown v0.21.7 docs -- `--out-extension` flag behavior needs runtime verification
- npm `bin` field behavior -- well-documented but global install path resolution needs verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all tools already in use and verified
- Architecture: HIGH -- patterns are straightforward (JSON config, package.json fields)
- Pitfalls: HIGH -- build output mismatch found and verified by running actual build

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable domain, no fast-moving dependencies)
