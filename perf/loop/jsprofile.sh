#!/bin/bash
#
# Capture symbolicated JS CPU profiles of cold startup on the device.
#
#   perf/loop/jsprofile.sh [--launches N] [--no-build]
#
# Builds a PROFILING perf APK (BP_PERF_PROFILE=1: Hermes sampling profiler on
# from the first module), cold-launches it N times, pulls each trace and the
# launch's startup marks, then summarises with jsprofile.js. Profiles explain
# where JS time goes; the loop's numbers always come from unprofiled builds,
# so the next iterate.sh rebuilds without the profiler.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE="$ROOT/perf/loop/state"
APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
APP_ID=com.bitpay.wallet
REMOTE="/sdcard/Android/data/$APP_ID/files/bp-startup-profile.json"
mkdir -p "$STATE"

LAUNCHES=3
BUILD=1
while [ $# -gt 0 ]; do
  case "$1" in
    --launches) LAUNCHES="$2"; shift ;;
    --no-build) BUILD=0 ;;
    *) echo "unknown option: $1" >&2; exit 64 ;;
  esac
  shift
done

cd "$ROOT"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$STATE/jsprofile-$STAMP"
mkdir -p "$OUT"

if [ "$BUILD" = 1 ]; then
  echo "▸ profiling build"
  if ! BP_PERF_PROFILE=1 yarn -s build:android:perf > "$OUT/build.log" 2>&1; then
    echo "BUILD FAILED — see $OUT/build.log" >&2
    exit 1
  fi
fi
cp android/app/build/generated/sourcemaps/react/release/index.android.bundle.map "$OUT/bundle.map"
cp perf/build/module-map.json "$OUT/module-map.json" 2>/dev/null || true
adb install -r "$APK" > /dev/null

adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard

for i in $(seq 1 "$LAUNCHES"); do
  echo "▸ launch $i/$LAUNCHES"
  adb shell am force-stop $APP_ID
  adb shell rm -f "$REMOTE"
  sleep 2
  adb logcat -c
  adb shell am start -n "$APP_ID/.LaunchActivity" -a android.intent.action.MAIN \
    -c android.intent.category.LAUNCHER > /dev/null
  for _ in $(seq 1 40); do
    if adb logcat -d -s BitPayPerf:I | grep -q '|profile|'; then
      break
    fi
    sleep 1
  done
  sleep 2
  if ! adb pull "$REMOTE" "$OUT/trace-$i.json" > /dev/null 2>&1; then
    echo "  no trace (profile payload: $(adb logcat -d -s BitPayPerf:I | grep '|profile|' | tail -1))" >&2
    continue
  fi
  node -e "
    const c = require('$ROOT/perf/collector');
    const p = c.collect();
    require('fs').writeFileSync('$OUT/marks-$i.json',
      JSON.stringify(p.find(x => x.kind === 'startup') || {}));
  "
done

adb shell settings put global window_animation_scale 1
adb shell settings put global transition_animation_scale 1
adb shell settings put global animator_duration_scale 1

node "$ROOT/perf/loop/jsprofile.js" "$OUT"
