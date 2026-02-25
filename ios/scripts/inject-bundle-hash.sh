#!/bin/bash
# inject-bundle-hash.sh
# Calculates SHA256 hash of the React Native bundle and injects it into the build settings
# This script should be added as a Build Phase in Xcode, running after "Bundle React Native code and images"

set -e

BUNDLE_PATH="${BUILT_PRODUCTS_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/main.jsbundle"

if [ ! -f "$BUNDLE_PATH" ]; then
    echo "warning: Bundle not found at $BUNDLE_PATH - skipping hash injection"
    exit 0
fi

# Calculate SHA256 hash of the bundle
BUNDLE_HASH=$(shasum -a 256 "$BUNDLE_PATH" | awk '{print $1}')

echo "Bundle hash: $BUNDLE_HASH"

# Update the Info.plist in the built product with the hash
PLIST_PATH="${BUILT_PRODUCTS_DIR}/${INFOPLIST_PATH}"

if [ -f "$PLIST_PATH" ]; then
    /usr/libexec/PlistBuddy -c "Set :RNBundleHash $BUNDLE_HASH" "$PLIST_PATH" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :RNBundleHash string $BUNDLE_HASH" "$PLIST_PATH"
    echo "Injected bundle hash into $PLIST_PATH"
else
    echo "warning: Info.plist not found at $PLIST_PATH"
fi
