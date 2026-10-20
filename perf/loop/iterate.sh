#!/bin/bash
#
# One iteration of the performance loop: build the working tree as an
# instrumented release APK, measure it on the device, compare against the
# accepted run.
#
#   perf/loop/iterate.sh [--target metric,metric] [--runs N] [--scenarios a,b]
#                        [--no-build] [--accept]
#
# --accept promotes this run to the accepted baseline (do that only after
# committing the change it measured). The accepted run is local state, kept in
# perf/loop/state/ (gitignored); LEDGER.md is the committed record.
#
# Exit code is compare.js's verdict: 0 KEEP, 2 NEUTRAL, 1 REJECT.

set -uo pipefail
# Hold the shared phone for the whole run (see device-lock.sh).
if [ -z "${BP_DEVICE_LOCKED:-}" ]; then
  export BP_DEVICE_LOCKED=1
  exec "$(dirname "${BASH_SOURCE[0]}")/device-lock.sh" "$0" "$@"
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE="$ROOT/perf/loop/state"
APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
mkdir -p "$STATE"

RUNS=10
SCENARIOS=startup-load
TARGET=""
BUILD=1
ACCEPT=0
while [ $# -gt 0 ]; do
  case "$1" in
    --runs) RUNS="$2"; shift ;;
    --scenarios) SCENARIOS="$2"; shift ;;
    --target) TARGET="$2"; shift ;;
    --no-build) BUILD=0 ;;
    --accept) ACCEPT=1 ;;
    *) echo "unknown option: $1" >&2; exit 64 ;;
  esac
  shift
done

cd "$ROOT"
STAMP="$(date +%Y%m%d-%H%M%S)"
SHA="$(git rev-parse --short HEAD)$(git diff --quiet HEAD -- . ':!perf/loop' || echo '-dirty')"

if [ "$BUILD" = 1 ]; then
  echo "▸ build ($SHA)"
  if ! yarn -s build:android:perf > "$STATE/build-$STAMP.log" 2>&1; then
    echo "BUILD FAILED — see $STATE/build-$STAMP.log" >&2
    tail -30 "$STATE/build-$STAMP.log" >&2
    exit 1
  fi
fi

echo "▸ measure: $SCENARIOS × $RUNS"
yarn -s perf:run --artifact "$APK" --scenarios "$SCENARIOS" --runs "$RUNS" \
  --baseline false > "$STATE/run-$STAMP.log" 2>&1
RUN_EXIT=$?
RESULT="$(ls -t "$ROOT"/perf/results/android-*.json | head -1)"
cp "$RESULT" "$STATE/run-$STAMP-$SHA.json"
grep -E 'WARN|FAILED|failed' "$STATE/run-$STAMP.log" | head -5
if [ $RUN_EXIT -ne 0 ]; then
  echo "MEASURE FAILED — see $STATE/run-$STAMP.log" >&2
  exit 1
fi

if [ -f "$STATE/accepted.json" ]; then
  node "$ROOT/perf/loop/compare.js" "$STATE/accepted.json" "$STATE/run-$STAMP-$SHA.json" \
    ${TARGET:+--target "$TARGET"}
  VERDICT=$?
else
  echo "No accepted run yet — this run becomes the first."
  ACCEPT=1
  VERDICT=0
fi

if [ "$ACCEPT" = 1 ]; then
  cp "$STATE/run-$STAMP-$SHA.json" "$STATE/accepted.json"
  echo "$STAMP $SHA" >> "$STATE/accepted.log"
  echo "▸ accepted run-$STAMP-$SHA.json"
fi

echo "▸ result: $STATE/run-$STAMP-$SHA.json"
exit $VERDICT
