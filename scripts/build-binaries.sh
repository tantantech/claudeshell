#!/usr/bin/env bash
set -euo pipefail

# ClaudeShell - Node.js SEA Binary Builder
# Builds a standalone binary using Node.js Single Executable Applications (SEA).
# Requires Node.js 22+ and postject.

echo "=== ClaudeShell SEA Binary Builder ==="

# Detect platform and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin) PLATFORM="macos" ;;
  Linux)  PLATFORM="linux" ;;
  *)      echo "ERROR: Unsupported OS: $OS"; exit 1 ;;
esac

case "$ARCH" in
  arm64|aarch64) ARCH_NAME="arm64" ;;
  x86_64)        ARCH_NAME="x64" ;;
  *)             echo "ERROR: Unsupported architecture: $ARCH"; exit 1 ;;
esac

BINARY_NAME="claudeshell-${PLATFORM}-${ARCH_NAME}"
SEA_CONFIG="sea-config.json"
SEA_BLOB="sea-prep.blob"

echo "Platform: ${PLATFORM} (${ARCH_NAME})"
echo "Output:   ${BINARY_NAME}"
echo ""

# Step 1: Build fully self-contained CJS bundle for SEA
# Node.js SEA requires CommonJS and its require() only supports built-in modules,
# so ALL dependencies (picocolors, marked, marked-terminal) must be inlined.
# We use esbuild --bundle for this (tsdown externalizes node_modules by default).
echo "--- Step 1: Build CJS bundle for SEA ---"
SEA_ENTRY="dist/sea-cli.cjs"
VERSION=$(node -e "console.log(require('./package.json').version)")

# Define inline version so the binary doesn't need package.json at runtime
npx esbuild src/cli.ts \
  --bundle \
  --format=cjs \
  --platform=node \
  --target=node22 \
  --outfile="$SEA_ENTRY" \
  --define:"import.meta.url"="'file:///claudeshell'" \
  --log-level=warning

# Patch the package.json require to use an inline object
# SEA binaries have no filesystem access to ../package.json
# esbuild may rename createRequire to require2/require3/etc, so match broadly
sed -i.bak "s|require[0-9]*(\"../package.json\")|/* SEA patched */ ({ version: \"${VERSION}\", name: \"claudeshell\" })|" "$SEA_ENTRY"
rm -f "${SEA_ENTRY}.bak"
echo "DONE: ${SEA_ENTRY} built (fully bundled CJS for SEA)"
echo ""

# Step 2: Generate SEA config
echo "--- Step 2: Generate SEA config ---"
cat > "$SEA_CONFIG" <<EOF
{
  "main": "${SEA_ENTRY}",
  "output": "${SEA_BLOB}",
  "disableExperimentalSEAWarning": true,
  "useSnapshot": false,
  "useCodeCache": true
}
EOF
echo "DONE: ${SEA_CONFIG} created"
echo ""

# Step 3: Generate SEA blob
echo "--- Step 3: Generate SEA blob ---"
node --experimental-sea-config "$SEA_CONFIG"
echo "DONE: ${SEA_BLOB} generated"
echo ""

# Step 4: Copy node binary
echo "--- Step 4: Copy node binary ---"
NODE_BIN="$(command -v node)"
cp "$NODE_BIN" "$BINARY_NAME"
echo "DONE: Copied ${NODE_BIN} -> ${BINARY_NAME}"
echo ""

# Step 5: Remove existing codesign on macOS (required before injection)
if [ "$PLATFORM" = "macos" ]; then
  echo "--- Step 5a: Remove existing codesign (macOS) ---"
  codesign --remove-signature "$BINARY_NAME"
  echo "DONE: Signature removed"
  echo ""
fi

# Step 6: Inject SEA blob with postject
echo "--- Step 6: Inject SEA blob ---"
# Detect the actual SEA fuse sentinel from the node binary (varies by Node version)
SEA_FUSE=$(strings "$BINARY_NAME" | grep -o 'NODE_SEA_FUSE_[a-f0-9]*' | head -1)
if [ -z "$SEA_FUSE" ]; then
  echo "ERROR: Could not find NODE_SEA_FUSE sentinel in node binary."
  echo "       Your Node.js build may not support Single Executable Applications."
  exit 1
fi
echo "Detected fuse: ${SEA_FUSE}"
POSTJECT_ARGS=(
  "$BINARY_NAME"
  NODE_SEA_BLOB
  "$SEA_BLOB"
  --sentinel-fuse "${SEA_FUSE}"
)

if [ "$PLATFORM" = "macos" ]; then
  POSTJECT_ARGS+=(--macho-segment-name NODE_SEA)
fi

npx postject "${POSTJECT_ARGS[@]}"
echo "DONE: SEA blob injected"
echo ""

# Step 7: Codesign on macOS
if [ "$PLATFORM" = "macos" ]; then
  echo "--- Step 7: Codesign binary (macOS) ---"
  codesign --sign - "$BINARY_NAME"
  echo "DONE: Binary signed"
  echo ""
fi

# Step 8: Clean up temp files
echo "--- Step 8: Clean up ---"
rm -f "$SEA_CONFIG" "$SEA_BLOB" "$SEA_ENTRY"
echo "DONE: Removed temp files"
echo ""

# Final output
BINARY_SIZE=$(du -h "$BINARY_NAME" | cut -f1)
echo "=== Build complete ==="
echo "Binary: $(pwd)/${BINARY_NAME}"
echo "Size:   ${BINARY_SIZE}"
