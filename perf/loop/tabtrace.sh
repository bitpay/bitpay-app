#!/bin/bash
# Perfetto traces of tab switching on the installed app: cold start, settle,
# then Home → Shop → Bills → Settings → Home by adb taps (no Maestro, so it
# can run while Maestro is busy elsewhere). Summarised by systrace-report.js.
#   perf/loop/tabtrace.sh [--runs N] [--out dir]
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_ID=com.bitpay.wallet
RUNS=2
OUT="$ROOT/perf/loop/state/tabtrace-$(date +%Y%m%d-%H%M%S)"
while [ $# -gt 0 ]; do
  case "$1" in
    --runs) RUNS="$2"; shift ;;
    --out) OUT="$2"; shift ;;
    *) echo "unknown option: $1" >&2; exit 64 ;;
  esac
  shift
done
mkdir -p "$OUT"
CONFIG=$(sed -n '/^CONFIG=\$(cat <<EOF/,/^EOF/p' "$ROOT/perf/loop/systrace.sh" | sed '1d;$d' \
  | sed "s/\$APP_ID/$APP_ID/; s/duration_ms: 14000/duration_ms: 22000/")
adb shell svc power stayon usb
adb shell input keyevent KEYCODE_WAKEUP
for i in $(seq 1 "$RUNS"); do
  adb shell am force-stop $APP_ID; sleep 2
  adb shell am start -n "$APP_ID/.LaunchActivity" > /dev/null; sleep 25
  echo "$CONFIG" | adb shell perfetto --txt -c - -o /data/misc/perfetto-traces/bp-tabs.pftrace --background > /dev/null
  sleep 2
  adb shell input tap 324 2256; sleep 5   # Shop
  adb shell input tap 756 2256; sleep 5   # Bills
  adb shell input tap 972 2256; sleep 4   # Settings
  adb shell input tap 108 2256; sleep 6   # Home
  adb pull /data/misc/perfetto-traces/bp-tabs.pftrace "$OUT/trace-$i.pftrace" > /dev/null
done
node "$ROOT/perf/loop/systrace-report.js" "$OUT" --until-ms 30000 | grep -E "═══|frames:|long frames|median"
