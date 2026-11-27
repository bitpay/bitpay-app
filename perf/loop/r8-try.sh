#!/bin/bash
# One R8 iteration: build with shrinking, install, cold launch, and print the
# first fatal/critical exception (or "launched OK" with a screenshot path).
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
S="$ROOT/perf/loop/state"; mkdir -p "$S"
cd "$ROOT"
PERF_GRADLE_ARGS=-PenableR8=true yarn -s build:android:perf > "$S/build-r8.log" 2>&1 || { grep -E "What went wrong|R8:|ERROR" -A3 "$S/build-r8.log" | head -20; exit 1; }
adb install -r android/app/build/outputs/apk/release/app-release.apk > /dev/null
adb shell svc power stayon usb; adb shell input keyevent KEYCODE_WAKEUP; adb shell wm dismiss-keyguard
adb logcat -c; adb shell am force-stop com.bitpay.wallet
adb shell am start -n com.bitpay.wallet/.LaunchActivity > /dev/null; sleep 14
adb exec-out screencap -p > "$S/r8-launch.png"
adb logcat -d | grep -E "FATAL EXCEPTION|AndroidRuntime: |RuntimeException|NoSuchMethod|NoSuchField|ClassNotFound|NoClassDefFound|JavascriptException|Unable to instantiate" \
  | grep -v ComponentDiscovery | head -14
adb shell dumpsys activity activities | grep -E "mResumedActivity" | head -1
adb logcat -d -s BitPayPerf:I | grep -q '|startup|' && echo "JS startup payload: yes" || echo "JS startup payload: no"
echo "screenshot: $S/r8-launch.png"
