#!/bin/bash
#
# Regenerate android/app/src/main/baseline-prof.txt from what ART recorded on
# the device.
#
#   perf/loop/baseline-profile.sh
#
# Run it after the app has been exercised on the onboarded test wallet with
# the current build (a startup-load run plus nav-tabs / scroll-home is
# enough): ART's runtime profile then holds the startup path and the main tab
# journeys. The dump is converted by baseline-profile.js. Review the diff
# before committing; methods that no longer exist are ignored by the build.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_ID=com.bitpay.wallet
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

adb shell cmd package dump-profiles "$APP_ID"
adb shell cat "/data/misc/profman/$APP_ID-primary.prof.txt" > "$TMP/dump.txt"
node "$ROOT/perf/loop/baseline-profile.js" "$TMP/dump.txt" \
  > "$ROOT/android/app/src/main/baseline-prof.txt"
echo "wrote android/app/src/main/baseline-prof.txt"
