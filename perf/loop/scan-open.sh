#!/bin/bash
# First-Scan-open latency: cold start, settle, tap the Home scan button, and
# time from a log marker written just before the tap to the camera preview
# streaming (VisionCamera's invokeOnPreviewStarted). Prints ms per repeat.
#   perf/loop/scan-open.sh [repeats]
set -uo pipefail
APP_ID=com.bitpay.wallet
for r in $(seq 1 "${1:-3}"); do
  adb shell am force-stop $APP_ID; sleep 2
  adb shell am start -n "$APP_ID/.LaunchActivity" > /dev/null; sleep 15
  adb logcat -c
  adb shell log -t BPTEST scan-tap
  adb shell input tap 72 187
  sleep 6
  adb logcat -d -v epoch | awk '
    /BPTEST/ && /scan-tap/ {t0 = $1}
    /invokeOnPreviewStarted/ && !t1 {t1 = $1}
    END {if (t0 && t1) printf "%d\n", (t1 - t0) * 1000; else print "no-preview"}'
  adb shell input keyevent KEYCODE_BACK; sleep 1
done
