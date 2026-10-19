#!/bin/bash
#
# Builds a release APK with in-app performance instrumentation enabled.
#
# This is a RELEASE build in every respect that matters for measurement —
# same Hermes bytecode, same minification, same proguard settings — with
# IS_PERF=true so `src/perf/PerfMonitor.ts` stops no-opping. Measuring a debug
# build would tell you nothing about what users experience.
#
# `@env` is resolved at build time by the react-native-dotenv babel plugin from
# .env.production, so the flag has to be present in that file while metro
# bundles. The file is restored on exit, including on failure or Ctrl-C.

set -euo pipefail

# Absolute paths throughout: the restore trap must work regardless of the
# working directory at the time it fires. (A previous version used relative
# paths and ran gradle via `cd android`, so the trap silently found nothing and
# left IS_PERF=true in .env.production for the next production build.)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# babel.config.js picks the env file from NODE_ENV at bundle time:
#   NODE_ENV=production -> .env.production, otherwise -> .env.development
#
# `yarn set:prod` exports NODE_ENV only inside its own subshell, so it does NOT
# reach the gradle/metro process that actually resolves `@env`. Rather than
# guess which file will be read, IS_PERF is written to BOTH and NODE_ENV is
# exported here so it propagates to every child process. Getting this wrong
# fails silently — the build succeeds, instrumentation is simply absent.
export NODE_ENV=production

ENV_FILES=("$REPO_ROOT/.env.production" "$REPO_ROOT/.env.development")

if [ ! -f "$REPO_ROOT/.env.production" ]; then
  echo "error: .env.production not found. Run 'yarn set:prod' first." >&2
  exit 1
fi

restore_env() {
  for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file.perf-backup" ]; then
      mv "$env_file.perf-backup" "$env_file"
      echo "Restored $(basename "$env_file")"
    fi
  done
}
trap restore_env EXIT INT TERM

for env_file in "${ENV_FILES[@]}"; do
  [ -f "$env_file" ] || continue
  cp "$env_file" "$env_file.perf-backup"
  # Strip any stale value before appending so repeated runs don't accumulate.
  grep -v -E '^IS_PERF=' "$env_file.perf-backup" > "$env_file" || true
  echo "IS_PERF=true" >> "$env_file"
done

echo "Building instrumented release APK (IS_PERF=true)..."
# Subshell so the cd cannot leak into the trap's execution context.
# Perf builds are signed with the repo's debug keystore, never the Play upload
# key: they are throwaway artifacts, and one consistent signer means
# `adb install -r` keeps app data (the imported wallet) between iterations.
# Override PERF_ABI to build other ABIs; one ABI roughly halves build time.
PERF_ABI="${PERF_ABI:-arm64-v8a}"
# Perf bundles must never reach Sentry: their source maps would be
# attributed to a real release version.
export SENTRY_DISABLE_AUTO_UPLOAD=true
( cd "$REPO_ROOT/android" && ./gradlew app:assembleRelease \
    -PreactNativeArchitectures="$PERF_ABI" \
    -PperfBuild=true \
    -PAPP_UPLOAD_STORE_FILE=debug.keystore \
    -PAPP_UPLOAD_STORE_PASSWORD=android \
    -PAPP_UPLOAD_KEY_ALIAS=androiddebugkey \
    -PAPP_UPLOAD_KEY_PASSWORD=android )

echo ""
echo "Instrumented APKs:"
find "$REPO_ROOT/android/app/build/outputs/apk/release" -maxdepth 1 -name '*.apk' 2>/dev/null || true
echo ""
echo "Run against one with:"
echo "  yarn perf:run --artifact android/app/build/outputs/apk/release/app-release.apk"
