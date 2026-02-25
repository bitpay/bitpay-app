#!/bin/bash
# inject-bundle-hash.sh
# Calculates SHA256 hash of the React Native bundle and patches the hash into
# the compiled Mach-O binary by replacing a known placeholder string.
#
# This script runs as an Xcode Build Phase after "Bundle React Native code and images".
# Code Signing runs automatically after all build phases, so the patched binary
# gets properly signed.

set -e

# Only inject the hash for Release builds. Debug builds skip the runtime check
# entirely (#if DEBUG in AppDelegate), so patching the binary is unnecessary and
# would break incremental builds (the placeholder gets replaced, then on the next
# build BundleHash.swift isn't recompiled, and the placeholder is missing).
if [ "${CONFIGURATION}" != "Release" ]; then
    echo "Skipping bundle hash injection for ${CONFIGURATION} build"
    exit 0
fi

BUNDLE_PATH="${BUILT_PRODUCTS_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/main.jsbundle"
BINARY_PATH="${BUILT_PRODUCTS_DIR}/${EXECUTABLE_PATH}"
PLACEHOLDER="__RN_BUNDLE_HASH_PLACEHOLDER_00000000000000000000000000000000000"

if [ ! -f "$BUNDLE_PATH" ]; then
    echo "error: Bundle not found at $BUNDLE_PATH — cannot inject hash for release build"
    exit 1
fi

# Calculate SHA256 hash of the bundle
BUNDLE_HASH=$(shasum -a 256 "$BUNDLE_PATH" | awk '{print $1}')

# Verify hash length matches placeholder length (both must be 64 chars)
if [ ${#BUNDLE_HASH} -ne 64 ]; then
    echo "error: Unexpected hash length: ${#BUNDLE_HASH} (expected 64)"
    exit 1
fi

# Log hash length only — avoid leaking the full hash into CI build logs.
echo "Bundle hash computed (${#BUNDLE_HASH} chars)"

# --- Patch the Mach-O binary ---
if [ ! -f "$BINARY_PATH" ]; then
    echo "error: Binary not found at $BINARY_PATH"
    exit 1
fi

# Verify the placeholder exists in the binary before replacing
if ! grep -q "$PLACEHOLDER" "$BINARY_PATH"; then
    echo "error: Placeholder string not found in binary — was BundleHash.swift compiled?"
    exit 1
fi

# Replace the placeholder with the real hash in the compiled binary.
# Both strings are exactly 64 bytes of ASCII, so the binary layout is preserved.
LC_ALL=C sed -i '' "s|${PLACEHOLDER}|${BUNDLE_HASH}|g" "$BINARY_PATH"

# Verify the replacement succeeded
if grep -q "$PLACEHOLDER" "$BINARY_PATH"; then
    echo "error: Placeholder still present after replacement"
    exit 1
fi

echo "Injected bundle hash into compiled binary"
