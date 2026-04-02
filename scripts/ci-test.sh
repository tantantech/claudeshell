#!/usr/bin/env bash
set -euo pipefail

echo "=== Nesh CI Test Suite ==="
echo ""

# 1. Clean install
echo "--- Step 1: npm ci ---"
npm ci
echo "PASS: npm ci succeeded"
echo ""

# 2. Build
echo "--- Step 2: npm run build ---"
npm run build
echo "PASS: build succeeded"
echo ""

# 3. Tests
echo "--- Step 3: npm run test ---"
npm run test
echo "PASS: tests passed"
echo ""

# 4. Verify dist/cli.js exists
echo "--- Step 4: Verify dist/cli.js exists ---"
if [ ! -f dist/cli.js ]; then
  echo "FAIL: dist/cli.js not found"
  exit 1
fi
echo "PASS: dist/cli.js exists"
echo ""

# 5. Verify shebang line
echo "--- Step 5: Verify shebang ---"
FIRST_LINE=$(head -n 1 dist/cli.js)
if [[ "$FIRST_LINE" != "#!/usr/bin/env node" ]]; then
  echo "FAIL: shebang not found. First line: $FIRST_LINE"
  exit 1
fi
echo "PASS: shebang is #!/usr/bin/env node"
echo ""

# 6. Verify executable permission
echo "--- Step 6: Verify executable permission ---"
if [ ! -x dist/cli.js ]; then
  echo "FAIL: dist/cli.js is not executable"
  exit 1
fi
echo "PASS: dist/cli.js is executable"
echo ""

# 7. Verify npm pack includes dist/cli.js
echo "--- Step 7: Verify npm pack contents ---"
PACK_OUTPUT=$(npm pack --dry-run 2>&1)
if ! echo "$PACK_OUTPUT" | grep -q "dist/cli.js"; then
  echo "FAIL: dist/cli.js not in npm pack output"
  echo "$PACK_OUTPUT"
  exit 1
fi
echo "PASS: npm pack includes dist/cli.js"
echo ""

# 8. Verify --version output
echo "--- Step 8: Verify --version ---"
VERSION_OUTPUT=$(node dist/cli.js --version)
if ! echo "$VERSION_OUTPUT" | grep -qE "^nesh v[0-9]+\.[0-9]+\.[0-9]+"; then
  echo "FAIL: unexpected --version output: $VERSION_OUTPUT"
  exit 1
fi
echo "PASS: --version output: $VERSION_OUTPUT"
echo ""

echo "=== All CI checks passed ==="
