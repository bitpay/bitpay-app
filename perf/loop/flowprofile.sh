#!/bin/bash
#
# Symbolicated JS CPU profiles of an interaction flow (a Maestro scenario),
# not of startup: cold start, let startup settle (its own trace is dumped and
# sampling stops), then restart the Hermes sampler, run the flow, dump.
#
#   perf/loop/flowprofile.sh --flow trade_swap.yaml [--runs N] [--no-build]
#
# Needs a PROFILING perf build (BP_PERF_PROFILE=1), whose PerfMarks registers
# the PERF_JS_PROFILE broadcast receiver used here. Each run's spans and
# transitions become the phase marks for jsprofile.js, so samples are
# grouped as e.g. "nav_start:SwapCryptoRoot → span_end:SwapCurrencies".

set -uo pipefail
# Hold the shared phone for the whole run (see device-lock.sh).
if [ -z "${BP_DEVICE_LOCKED:-}" ]; then
  export BP_DEVICE_LOCKED=1
  exec "$(dirname "${BASH_SOURCE[0]}")/device-lock.sh" "$0" "$@"
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE="$ROOT/perf/loop/state"
APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
APP_ID=com.bitpay.wallet
REMOTE="/sdcard/Android/data/$APP_ID/files/bp-flow-profile.json"
ACTION=com.bitpay.wallet.PERF_JS_PROFILE

FLOW=""
RUNS=3
BUILD=1
while [ $# -gt 0 ]; do
  case "$1" in
    --flow) FLOW="$2"; shift ;;
    --runs) RUNS="$2"; shift ;;
    --no-build) BUILD=0 ;;
    *) echo "unknown option: $1" >&2; exit 64 ;;
  esac
  shift
done
[ -n "$FLOW" ] || { echo "--flow <scenario.yaml> is required" >&2; exit 64; }

cd "$ROOT"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$STATE/flowprofile-$STAMP-${FLOW%.yaml}"
mkdir -p "$OUT"

if [ "$BUILD" = 1 ]; then
  echo "▸ profiling build"
  if ! BP_PERF_PROFILE=1 yarn -s build:android:perf > "$OUT/build.log" 2>&1; then
    echo "BUILD FAILED — see $OUT/build.log" >&2
    exit 1
  fi
fi
cp android/app/build/generated/sourcemaps/react/release/index.android.bundle.map "$OUT/bundle.map"
adb install -r "$APK" > /dev/null
if [ "${BP_PERF_COMPILE:-}" != none ]; then
  adb shell am broadcast -a androidx.profileinstaller.action.INSTALL_PROFILE \
    -n "$APP_ID/androidx.profileinstaller.ProfileInstallReceiver" > /dev/null
  adb shell cmd package compile -m speed-profile -f "$APP_ID" > /dev/null
fi

adb shell svc power stayon usb
adb shell input keyevent KEYCODE_WAKEUP
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0

for i in $(seq 1 "$RUNS"); do
  echo "▸ run $i/$RUNS"
  adb shell am force-stop $APP_ID
  adb shell rm -f "$REMOTE"
  sleep 2
  adb shell am start -n "$APP_ID/.LaunchActivity" > /dev/null
  # Startup settles ~10 s after the splash; its trace is dumped then.
  sleep 25
  adb logcat -c
  adb shell am broadcast -a $ACTION --es cmd start > /dev/null
  maestro --device "$(adb get-serialno)" test "perf/scenarios/$FLOW" > "$OUT/maestro-$i.log" 2>&1 \
    || echo "  flow failed — see $OUT/maestro-$i.log" >&2
  sleep 3   # let the 2 s navigation flush emit the last spans
  adb shell am broadcast -a $ACTION --es cmd dump > /dev/null
  sleep 2
  if ! adb pull "$REMOTE" "$OUT/trace-$i.json" > /dev/null 2>&1; then
    echo "  no trace: $(adb logcat -d -s BitPayPerf:* | grep 'flow profile' | tail -1)" >&2
    continue
  fi
  # Navigation/span measures → phase marks for jsprofile.js.
  node -e "
    const c = require('$ROOT/perf/collector');
    const entries = [];
    c.collect().filter(p => p.kind === 'navigation').forEach(p =>
      (p.entries || []).forEach(e => {
        const name = e.name.replace(/^bp_nav:/, '');
        entries.push({name: 'bp_start ' + name, entryType: 'mark', startTime: e.startTime});
        entries.push({name: 'bp_end ' + name, entryType: 'mark', startTime: e.startTime + e.duration});
      }));
    require('fs').writeFileSync('$OUT/marks-$i.json', JSON.stringify({entries}));
    require('fs').writeFileSync('$OUT/spans-$i.json', JSON.stringify(entries));
  "
done

adb shell settings put global window_animation_scale 1
adb shell settings put global transition_animation_scale 1
adb shell settings put global animator_duration_scale 1

node "$ROOT/perf/loop/jsprofile.js" "$OUT" --top 15
