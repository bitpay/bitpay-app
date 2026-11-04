#!/bin/bash
#
# Memory per tab: cold start, settle, then visit Home → Shop → Bills →
# Settings → Home → Shop, taking a dumpsys meminfo snapshot at each stop.
#
#   perf/loop/memtabs.sh [--repeats N] [--settle S] > out.tsv
#
# Prints TSV rows: repeat, stop, total_pss_mb, java_mb, native_mb,
# graphics_mb, unknown_mb. Measures the installed APK; never run it on the
# first launch after an install (one-off work there inflates every number).
# Tab coordinates are for a 1080×2400 screen (tab bar at y≈2256).

set -uo pipefail
APP_ID=com.bitpay.wallet
REPEATS=3
SETTLE=30
while [ $# -gt 0 ]; do
  case "$1" in
    --repeats) REPEATS="$2"; shift ;;
    --settle) SETTLE="$2"; shift ;;
    *) echo "unknown option: $1" >&2; exit 64 ;;
  esac
  shift
done

snap() {
  adb shell dumpsys meminfo $APP_ID | awk -v R="$1" -v L="$2" '
    /TOTAL PSS:/ {p = $3}
    /Java Heap:/ {j = $3}
    /Native Heap:/ {n = $3}
    /Graphics:/ {g = $2}
    /^ +Unknown / {u = $3}
    END {printf "%s\t%s\t%d\t%d\t%d\t%d\t%d\n", R, L, p/1024, j/1024, n/1024, g/1024, u/1024}'
}
tap() { adb shell input tap "$1" 2256; sleep "$2"; }

adb shell svc power stayon usb
adb shell input keyevent KEYCODE_WAKEUP
printf "repeat\tstop\tpss_mb\tjava_mb\tnative_mb\tgraphics_mb\tunknown_mb\n"
for r in $(seq 1 "$REPEATS"); do
  adb shell am force-stop $APP_ID
  sleep 2
  adb shell am start -n "$APP_ID/.LaunchActivity" > /dev/null
  sleep "$SETTLE"
  snap "$r" home
  tap 324 8; snap "$r" shop
  tap 756 8; snap "$r" bills
  tap 972 5; snap "$r" settings
  tap 108 5; snap "$r" home2
  tap 324 8; snap "$r" shop2
done
