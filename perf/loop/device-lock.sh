#!/bin/bash
#
# Serialise use of the test phone between loops (one Maestro session, one
# set of cold starts at a time).
#
#   perf/loop/device-lock.sh <command...>   run a command holding the lock
#
# The lock is a directory under ~/.bitpay-perf; it records the holder's pid
# and label and is cleared if that process is gone. Waits up to 3 h.

set -uo pipefail
LOCK="$HOME/.bitpay-perf/device.lock"
mkdir -p "$HOME/.bitpay-perf"
LABEL="${BP_LOCK_LABEL:-$(basename "$PWD")}"
deadline=$(( $(date +%s) + 3 * 3600 ))
while ! mkdir "$LOCK" 2>/dev/null; do
  holder=$(cat "$LOCK/pid" 2>/dev/null || echo "")
  if [ -n "$holder" ] && ! kill -0 "$holder" 2>/dev/null; then
    rm -rf "$LOCK"; continue
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "device-lock: gave up waiting for $(cat "$LOCK/label" 2>/dev/null)" >&2
    exit 75
  fi
  sleep 20
done
echo $$ > "$LOCK/pid"; echo "$LABEL" > "$LOCK/label"
trap 'rm -rf "$LOCK"' EXIT
"$@"
