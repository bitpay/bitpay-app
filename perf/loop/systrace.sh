#!/bin/bash
#
# Capture system traces (Perfetto) of cold starts and summarise the threads
# that matter — the UI thread, the JS thread, and what the process was doing
# before any app code ran.
#
#   perf/loop/systrace.sh [--launches N]
#
# The JS profiler (jsprofile.sh) sees only JavaScript; when it reports a phase
# as "idle/native", this is the tool that says what the UI thread or the
# system was doing instead. Uses the device's built-in perfetto (Android 9+)
# and the official trace_processor (downloaded once to ~/.bitpay-perf/tools).
# Works on the installed APK as-is; no rebuild.

set -uo pipefail
# Hold the shared phone for the whole run (see device-lock.sh).
if [ -z "${BP_DEVICE_LOCKED:-}" ]; then
  export BP_DEVICE_LOCKED=1
  exec "$(dirname "${BASH_SOURCE[0]}")/device-lock.sh" "$0" "$@"
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE="$ROOT/perf/loop/state"
APP_ID=com.bitpay.wallet
TOOLS="$HOME/.bitpay-perf/tools"
TP="$TOOLS/trace_processor"
LAUNCHES=3
while [ $# -gt 0 ]; do
  case "$1" in
    --launches) LAUNCHES="$2"; shift ;;
    *) echo "unknown option: $1" >&2; exit 64 ;;
  esac
  shift
done

mkdir -p "$TOOLS"
if [ ! -x "$TP" ]; then
  curl -sSL -o "$TP" https://get.perfetto.dev/trace_processor && chmod +x "$TP"
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$STATE/systrace-$STAMP"
mkdir -p "$OUT"

CONFIG=$(cat <<EOF
buffers { size_kb: 131072 fill_policy: RING_BUFFER }
buffers { size_kb: 4096 fill_policy: RING_BUFFER }
data_sources {
  config {
    name: "linux.ftrace"
    target_buffer: 0
    ftrace_config {
      ftrace_events: "sched/sched_switch"
      ftrace_events: "sched/sched_wakeup"
      ftrace_events: "sched/sched_wakeup_new"
      ftrace_events: "sched/sched_blocked_reason"
      ftrace_events: "power/cpu_frequency"
      ftrace_events: "task/task_newtask"
      ftrace_events: "task/task_rename"
      atrace_categories: "am"
      atrace_categories: "wm"
      atrace_categories: "view"
      atrace_categories: "gfx"
      atrace_categories: "input"
      atrace_categories: "dalvik"
      atrace_categories: "res"
      atrace_categories: "binder_driver"
      atrace_categories: "aidl"
      atrace_categories: "ss"
      atrace_apps: "$APP_ID"
      buffer_size_kb: 16384
      drain_period_ms: 250
    }
  }
}
data_sources {
  config {
    name: "linux.process_stats"
    target_buffer: 1
    process_stats_config { scan_all_processes_on_start: true }
  }
}
duration_ms: 14000
EOF
)

adb shell svc power stayon usb
adb shell input keyevent KEYCODE_WAKEUP
for i in $(seq 1 "$LAUNCHES"); do
  echo "▸ launch $i/$LAUNCHES"
  adb shell am force-stop $APP_ID
  sleep 3
  REMOTE="/data/misc/perfetto-traces/bp-startup-$i.pftrace"
  echo "$CONFIG" | adb shell perfetto --txt -c - -o "$REMOTE" --background > /dev/null
  sleep 1.5
  adb shell am start -n "$APP_ID/.LaunchActivity" -a android.intent.action.MAIN \
    -c android.intent.category.LAUNCHER > /dev/null
  sleep 14
  for _ in $(seq 1 20); do
    adb shell pidof perfetto > /dev/null || break
    sleep 1
  done
  adb pull "$REMOTE" "$OUT/trace-$i.pftrace" > /dev/null || echo "  pull failed" >&2
done

node "$ROOT/perf/loop/systrace-report.js" "$OUT"
